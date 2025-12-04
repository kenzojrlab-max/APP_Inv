import React, { useState, useEffect, useRef } from 'react';
import { Asset, User, Log, AppConfig, Theme } from './types';
import { INITIAL_CONFIG } from './constants';
import Dashboard from './components/Dashboard';
import AssetManager from './components/AssetManager';
import AdminPanel from './components/AdminPanel';
import { LayoutDashboard, Box, Settings, LogOut, Menu, Palette, Check, Moon, Leaf, Monitor, Briefcase, Lock, Mail, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

// --- IMPORT FIREBASE ---
import { db, auth, firebaseConfig } from './firebase'; 
import { initializeApp, deleteApp } from "firebase/app";
import { 
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, getAuth as getAuthUtils
} from 'firebase/auth';

const THEMES: { id: Theme; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'enterprise', name: 'Entreprise', icon: <Briefcase size={14}/>, color: '#003366' },
  { id: 'dark', name: 'Dark Mode', icon: <Moon size={14}/>, color: '#1F2937' },
  { id: 'material', name: 'Material', icon: <Box size={14}/>, color: '#6200EE' },
  { id: 'green', name: 'RSE / Green', icon: <Leaf size={14}/>, color: '#2D6A4F' },
  { id: 'modern', name: 'Modern SaaS', icon: <Monitor size={14}/>, color: '#0F172A' },
];

const App: React.FC = () => {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]); 
  const [logs, setLogs] = useState<Log[]>([]);
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
    
  const [currentView, setCurrentView] = useState<'dashboard' | 'assets' | 'admin'>('dashboard');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  // NOUVEAUX ÉTATS (Loading & Erreur)
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // --- 1. CHARGEMENT INITIAL & SURVEILLANCE AUTH ---
  useEffect(() => {
    // Cette fonction surveille en permanence l'état de connexion
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // --- UTILISATEUR CONNECTÉ ---
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser({ ...userData, id: firebaseUser.uid } as User);
        }
      } else {
        // --- UTILISATEUR DÉCONNECTÉ (C'est ici que la magie opère) ---
        setUser(null);
        setLoginEmail(''); // Vide forcé de l'email
        setLoginPass('');  // Vide forcé du mot de passe
        setLoginError(''); // Vide des erreurs
      }
      setLoading(false);
      setIsLoggingIn(false); 
    });

    const unsubscribeConfig = onSnapshot(doc(db, "parametre", "system_config"), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as AppConfig);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeConfig();
    };
  }, []); // Le tableau vide [] assure que cela tourne dès le démarrage

  // --- 2. CHARGEMENT DONNÉES ---
  useEffect(() => {
    if (!user) return;

    const unsubscribeAssets = onSnapshot(collection(db, "assets"), (snapshot) => {
      const loadedAssets = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as Asset));
      setAssets(loadedAssets);
    });

    let unsubscribeUsers = () => {};
    let unsubscribeLogs = () => {};

    if (user.permissions.isAdmin) {
       unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
         setUsers(snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as User)));
       });
       unsubscribeLogs = onSnapshot(collection(db, "logs"), (snapshot) => {
         const loadedLogs = snapshot.docs.map(doc => doc.data() as Log);
         setLogs(loadedLogs.sort((a, b) => b.timestamp - a.timestamp));
       });
    }

    if (user.preferences?.theme) {
       document.documentElement.setAttribute('data-theme', user.preferences.theme);
    }

    return () => {
      unsubscribeAssets();
      unsubscribeUsers();
      unsubscribeLogs();
    };
  }, [user]);

  // --- 3. GESTION DU TITRE DE L'ONGLET ---
  useEffect(() => {
    if (user) {
      document.title = `${user.firstName} - EDC Panorama`;
    } else {
      document.title = "Connexion - EDC Panorama";
    }
  }, [user]);

  const handleThemeChange = async (newTheme: Theme) => {
    if (!user) return;
    document.documentElement.setAttribute('data-theme', newTheme);
    const updatedUser = { ...user, preferences: { ...user.preferences, theme: newTheme } };
    setUser(updatedUser);
    setThemeMenuOpen(false);
    await updateDoc(doc(db, "users", user.id), { "preferences.theme": newTheme });
  };

  const addLog = async (action: Log['action'], description: string, targetCode?: string, changes?: any[]) => {
    const safeUserId = user?.id || auth.currentUser?.uid || 'ID_INCONNU';
    const safeUserEmail = user?.email || auth.currentUser?.email || 'email_inconnu';
    
    const userNameDisplay = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Utilisateur';
    const finalUserName = userNameDisplay || 'Utilisateur Inconnu';

    const safeChanges = changes ? changes.map(change => ({
      field: change.field ?? 'Inconnu',
      before: change.before === undefined ? null : change.before,
      after: change.after === undefined ? null : change.after
    })) : null;

    const newLog: any = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      userId: safeUserId,
      userEmail: safeUserEmail,
      userName: finalUserName,
      action: action,
      description: description,
      targetCode: targetCode ?? 'N/A'
    };

    if (safeChanges) newLog.changes = safeChanges;

    try {
      await setDoc(doc(db, "logs", newLog.id), newLog);
    } catch (e: any) {
      console.error("ERREUR CRITIQUE LOG:", e.message);
    }
  };

  // --- FONCTION LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPass);
    } catch (error: any) {
      setIsLoggingIn(false);
      console.error("Erreur Auth:", error.code);
      
      let msg = "Une erreur est survenue lors de la connexion.";
      switch (error.code) {
        case 'auth/invalid-email': msg = "Le format de l'adresse email est invalide."; break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': msg = "Email ou mot de passe incorrect."; break;
        case 'auth/too-many-requests': msg = "Trop de tentatives. Compte temporairement bloqué."; break;
        case 'auth/network-request-failed': msg = "Problème de connexion internet."; break;
        default: msg = "Erreur de connexion (" + error.code + ")";
      }
      setLoginError(msg);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    // Le nettoyage se fait désormais automatiquement dans le useEffect (onAuthStateChanged)
    // Cela garantit que les champs se vident même si la déconnexion est déclenchée ailleurs.
  };

  const handleSaveAsset = async (assetData: Asset, isNew: boolean, reason?: string) => {
    try {
      const actorName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Inconnu';

      if (isNew) {
        const newDocRef = doc(collection(db, "assets"));
        const newAsset = { ...assetData, id: newDocRef.id, isArchived: false };
        await setDoc(newDocRef, newAsset);
        await addLog('CREATE', `Création par ${actorName}`, newAsset.code);
      } else {
        const oldAsset = assets.find(a => a.id === assetData.id);
        const changes: any[] = [];

        if (oldAsset) {
          const fieldsToCheck = ['name', 'location', 'state', 'holder', 'category', 'description'];
          fieldsToCheck.forEach(field => {
            // @ts-ignore
            const oldVal = oldAsset[field];
            // @ts-ignore
            const newVal = assetData[field];
            if (oldVal !== newVal) {
              changes.push({ field: field, before: oldVal, after: newVal });
            }
          });
        }

        await updateDoc(doc(db, "assets", assetData.id), assetData as any);
        await addLog('UPDATE', reason || `Modification par ${actorName}`, assetData.code, changes);
      }
    } catch (err: any) {
      console.error(err);
      alert("Erreur sauvegarde: " + err.message);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (asset && user) {
      try {
        const actorName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
        await updateDoc(doc(db, "assets", id), { isArchived: true, state: 'Retiré' });
        await addLog('DELETE', `Archivage par ${actorName}`, asset.code);
      } catch (error: any) {
        alert("Erreur suppression: " + error.message);
      }
    }
  };

  const handleBulkImport = async (importedAssets: Partial<Asset>[]) => {
      let count = 0;
      for (const asset of importedAssets) {
         if(asset.code) {
             const existing = assets.find(a => a.code === asset.code);
             const newDocRef = existing ? doc(db, "assets", existing.id) : doc(collection(db, "assets"));
             const finalAsset = { 
                 ...asset, 
                 id: newDocRef.id, 
                 isArchived: false,
                 customAttributes: asset.customAttributes || {} 
             } as Asset;
             await setDoc(newDocRef, finalAsset, { merge: true });
             count++;
         }
      }
      alert(`${count} actifs importés.`);
      const actorName = user ? user.firstName : 'Inconnu';
      await addLog('CONFIG', `Import Excel : ${count} éléments par ${actorName}.`);
  };

  const handleUpdateConfig = async (newConfig: AppConfig) => {
    await setDoc(doc(db, "parametre", "system_config"), newConfig);
    setConfig(newConfig);
  };

  const handleAddUser = async (u: User) => {
    const secondaryAppName = `SecondaryApp-${Date.now()}`;
    let secondaryApp: any = null;

    try {
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuthUtils(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, u.email, u.password);
      const newUid = userCredential.user.uid;
      const userToSave = { ...u, id: newUid };
      delete (userToSave as any).password; 
      await setDoc(doc(db, "users", newUid), userToSave);
      alert(`Utilisateur ${u.firstName} créé avec succès !`);
    } catch (error: any) {
      console.error("Erreur création:", error);
      if (error.code === 'auth/email-already-in-use') {
        alert("Cet email est déjà utilisé !");
      } else {
        alert("Erreur création utilisateur : " + error.message);
      }
    } finally {
        if (secondaryApp) { await deleteApp(secondaryApp); }
    }
  };

  const handleUpdateUser = async (u: User) => {
    await setDoc(doc(db, "users", u.id), u);
  };

  const handleDeleteUser = async (id: string) => {
    await deleteDoc(doc(db, "users", id));
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Chargement...</div>;

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center font-sans bg-[#f5f7fa]">
        <div className="w-full max-w-sm px-4 animate-fade-in">
              <div className="bg-[#00509e] rounded-xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="Logo" className="w-20 h-20 mb-4 mx-auto object-contain" />
                    <h2 className="text-2xl font-bold text-white tracking-widest uppercase mb-1">Authentification</h2>
                    <div className="h-1 w-12 bg-edc-gold mx-auto rounded-full"></div>
                </div>
                
                {/* --- FORMULAIRE DE CONNEXION AVEC AUTOCOMPLETE OFF --- */}
                <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
                   
                   {loginError && (
                     <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded relative flex items-center gap-2 text-sm animate-pulse">
                        <AlertCircle size={16} />
                        <span>{loginError}</span>
                     </div>
                   )}

                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-blue-200 uppercase tracking-wider flex items-center gap-2"><Mail size={12}/> Email Professionnel</label>
                      <input 
                        type="email" 
                        required 
                        autoComplete="off" // Empêche l'autocomplétion
                        placeholder="nom@edc.cm" 
                        className={`w-full bg-white border rounded-lg px-4 py-3 text-gray-800 outline-none focus:ring-2 focus:ring-edc-gold ${loginError ? 'border-red-500' : 'border-blue-400'}`}
                        value={loginEmail} 
                        onChange={e => { setLoginEmail(e.target.value); setLoginError(''); }} 
                        disabled={isLoggingIn} 
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-blue-200 uppercase tracking-wider flex items-center gap-2"><Lock size={12}/> Mot de passe</label>
                      <input 
                        type="password" 
                        required 
                        autoComplete="new-password" // Astuce pour forcer le navigateur à ne pas remplir
                        placeholder="••••••••" 
                        className={`w-full bg-white border rounded-lg px-4 py-3 text-gray-800 outline-none focus:ring-2 focus:ring-edc-gold ${loginError ? 'border-red-500' : 'border-blue-400'}`}
                        value={loginPass} 
                        onChange={e => { setLoginPass(e.target.value); setLoginError(''); }} 
                        disabled={isLoggingIn} 
                      />
                   </div>
                   
                   <button type="submit" disabled={isLoggingIn} className={`w-full bg-edc-gold hover:bg-yellow-500 text-[#003366] font-bold py-3.5 rounded-lg shadow-lg flex items-center justify-center gap-2 mt-6 transition-all ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''}`}>
                      {isLoggingIn ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Connexion en cours...
                        </>
                      ) : (
                        <>
                          CONNEXION <ChevronRight size={18} strokeWidth={3}/>
                        </>
                      )}
                   </button>
                   
                </form>
                <div className="mt-6 text-center text-[10px] text-blue-200/60 font-medium pt-4 border-t border-blue-800/30">&copy; EDC Cameroun. Accès réservé.</div>
             </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-edc-light font-sans transition-colors duration-300">
      <aside className="hidden md:flex flex-col w-64 bg-edc-blue text-[var(--edc-sidebar-text)] shadow-xl transition-colors duration-300">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded bg-white object-contain p-1" />
          <span className="font-bold text-lg leading-tight">{config.companyName}</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {user.permissions.canViewDashboard && (
            <button onClick={() => setCurrentView('dashboard')} className={`flex items-center w-full px-4 py-3 rounded transition-colors ${currentView === 'dashboard' ? 'bg-edc-orange text-white font-semibold' : 'hover:bg-white/10'}`}>
              <LayoutDashboard className="mr-3" size={20} /> Tableau de Bord
            </button>
          )}
          {user.permissions.canReadList && (
            <button onClick={() => setCurrentView('assets')} className={`flex items-center w-full px-4 py-3 rounded transition-colors ${currentView === 'assets' ? 'bg-edc-orange text-white font-semibold' : 'hover:bg-white/10'}`}>
              <Box className="mr-3" size={20} /> Immobilisations
            </button>
          )}
          {user.permissions.isAdmin && (
             <button onClick={() => setCurrentView('admin')} className={`flex items-center w-full px-4 py-3 rounded transition-colors ${currentView === 'admin' ? 'bg-edc-orange text-white font-semibold' : 'hover:bg-white/10'}`}>
              <Settings className="mr-3" size={20} /> Paramètre
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-white/10 relative">
          <div className="flex items-center justify-between gap-2 mb-4">
             <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-edc-orange flex items-center justify-center font-bold text-white shrink-0">{user.firstName[0]}</div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-xs opacity-70 truncate">{user.permissions.isAdmin ? 'Administrateur' : 'Utilisateur'}</p>
                </div>
             </div>
             <div className="relative" ref={themeMenuRef}>
               <button onClick={() => setThemeMenuOpen(!themeMenuOpen)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Changer de thème">
                  <Palette size={18} />
               </button>
               {themeMenuOpen && (
                 <div className="absolute bottom-10 left-0 ml-10 w-48 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                    <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">Choisir un thème</p>
                    {THEMES.map(t => (
                      <button key={t.id} onClick={() => handleThemeChange(t.id)} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${(user.preferences?.theme || 'enterprise') === t.id ? 'bg-blue-50 text-blue-700 font-medium' : ''}`}>
                        <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: t.color }}></span>
                        <span className="flex-1">{t.name}</span>
                        {(user.preferences?.theme || 'enterprise') === t.id && <Check size={14} className="text-blue-600"/>}
                      </button>
                    ))}
                 </div>
               )}
             </div>
          </div>
          <button onClick={handleLogout} className="flex items-center text-red-300 hover:text-white w-full text-sm mt-2 pt-2 border-t border-white/10">
            <LogOut size={16} className="mr-2" /> Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-edc-light/50">
         <div className="md:hidden bg-edc-blue text-white p-3 flex justify-between items-center sticky top-0 z-20 shadow-md">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded bg-white object-contain p-1" />
              <span className="font-bold text-lg leading-tight">EDC</span>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1 rounded hover:bg-white/10"><Menu size={28} /></button>
         </div>
         {mobileMenuOpen && (
           <div className="md:hidden bg-blue-900 text-white absolute w-full z-30 shadow-xl flex flex-col">
              <div className="p-4 bg-blue-950 border-b border-white/10 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-edc-orange flex items-center justify-center text-white font-bold text-lg shrink-0 border-2 border-blue-800">{user.firstName[0]}</div>
                 <div className="min-w-0">
                    <p className="font-bold text-white truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-blue-200 truncate">{user.email}</p>
                 </div>
              </div>
              <div className="p-2">
                  <button onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }} className="flex items-center px-4 py-3 w-full text-left hover:bg-white/5 rounded"><LayoutDashboard size={18} className="mr-3 opacity-70"/> Dashboard</button>
                  <button onClick={() => { setCurrentView('assets'); setMobileMenuOpen(false); }} className="flex items-center px-4 py-3 w-full text-left hover:bg-white/5 rounded"><Box size={18} className="mr-3 opacity-70"/> Immobilisations</button>
                  {user.permissions.isAdmin && <button onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }} className="flex items-center px-4 py-3 w-full text-left hover:bg-white/5 rounded"><Settings size={18} className="mr-3 opacity-70"/> Paramètre</button>}
              </div>
              <button onClick={handleLogout} className="p-4 w-full text-left text-red-300 hover:text-red-200 bg-red-900/20 flex items-center justify-center font-semibold"><LogOut size={18} className="mr-2"/> Déconnexion</button>
           </div>
         )}
         <div className="animate-fade-in h-full">
            {currentView === 'dashboard' && <Dashboard assets={assets} />}
            {currentView === 'assets' && (
                <AssetManager 
                  assets={assets} 
                  config={config} 
                  user={user} 
                  onSave={handleSaveAsset} 
                  onImport={handleBulkImport}
                  onDelete={handleDeleteAsset} 
                />
              )}
            {currentView === 'admin' && user.permissions.isAdmin && (
              <AdminPanel 
                users={users} 
                logs={logs} 
                config={config}
                onUpdateConfig={handleUpdateConfig}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}
         </div>
      </main>
    </div>
  );
};

export default App;