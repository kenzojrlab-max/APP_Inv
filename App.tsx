import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Asset, User, Log, AppConfig, Theme } from './types';
import { INITIAL_CONFIG } from './constants';
import Dashboard from './components/Dashboard';
import AssetManager from './components/AssetManager';
import AdminPanel from './components/AdminPanel';
import AiAssistant from './components/AiAssistant';
import ConfirmDialog from './components/shared/ConfirmDialog';
import { useToast } from './hooks/useToast';
import { getUserDisplayName } from './utils/formatters';
import { getFirebaseErrorMessage } from './utils/firebaseErrors';
import * as assetService from './services/assetService';
import * as userService from './services/userService';
import { saveConfig } from './services/configService';
import {
  LayoutDashboard, Box, Settings, LogOut, Menu, Palette, Check, Moon, Leaf, Monitor,
  Briefcase, Lock, Mail, ChevronRight, Loader2, AlertCircle, Zap, Activity, Fan
} from 'lucide-react';

import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

const THEMES: { id: Theme; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'enterprise', name: 'Entreprise', icon: <Briefcase size={14}/>, color: '#003366' },
  { id: 'dark', name: 'Dark Mode', icon: <Moon size={14}/>, color: '#1F2937' },
  { id: 'material', name: 'Material', icon: <Box size={14}/>, color: '#6200EE' },
  { id: 'green', name: 'RSE / Green', icon: <Leaf size={14}/>, color: '#2D6A4F' },
  { id: 'modern', name: 'Modern SaaS', icon: <Monitor size={14}/>, color: '#0F172A' },
];

const App: React.FC = () => {
  const toast = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);

  const [currentView, setCurrentView] = useState<'dashboard' | 'assets' | 'admin'>('dashboard');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Import loading state (P2-17)
  const [isImporting, setIsImporting] = useState(false);

  // Confirm dialog for permanent delete (replaces confirm() in App.tsx)
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // --- 1. AUTH & CONFIG LOADING ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('edc-theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser({ ...userData, id: firebaseUser.uid } as User);
          if (userData.preferences?.theme) {
            document.documentElement.setAttribute('data-theme', userData.preferences.theme);
            localStorage.setItem('edc-theme', userData.preferences.theme);
          }
        }
      } else {
        setUser(null);
        setLoginEmail('');
        setLoginPass('');
        setLoginError('');
      }
      setLoading(false);
      setIsLoggingIn(false);
    });

    const unsubscribeConfig = onSnapshot(doc(db, 'parametre', 'system_config'), (docSnap) => {
      if (docSnap.exists()) setConfig(docSnap.data() as AppConfig);
    });

    return () => { unsubscribeAuth(); unsubscribeConfig(); };
  }, []);

  // --- 2. DATA LOADING ---
  useEffect(() => {
    if (!user) return;

    const unsubscribeAssets = onSnapshot(collection(db, 'assets'), (snapshot) => {
      setAssets(snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as Asset));
    });

    let unsubscribeUsers = () => {};
    let unsubscribeLogs = () => {};

    if (user.permissions.isAdmin) {
      unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as User));
      });
      const logsQuery = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
      unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
        setLogs(snapshot.docs.map(d => d.data() as Log));
      });
    }

    return () => { unsubscribeAssets(); unsubscribeUsers(); unsubscribeLogs(); };
  }, [user]);

  useEffect(() => {
    document.title = user ? `${user.firstName} - EDC Panorama` : 'Connexion - EDC Panorama';
  }, [user]);

  // --- HANDLERS ---
  const handleThemeChange = async (newTheme: Theme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('edc-theme', newTheme);
    if (user) {
      const updatedUser = { ...user, preferences: { ...user.preferences, theme: newTheme } };
      setUser(updatedUser);
      setThemeMenuOpen(false);
      await updateDoc(doc(db, 'users', user.id), { 'preferences.theme': newTheme });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPass);
    } catch (error: unknown) {
      setIsLoggingIn(false);
      setLoginError(getFirebaseErrorMessage(error));
    }
  };

  const handleLogout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const handleSaveAsset = useCallback(async (assetData: Asset, isNew: boolean, reason?: string) => {
    if (!user) return;
    try {
      await assetService.saveAsset(assetData, isNew, user, assets, reason);
      toast.success(isNew ? 'Actif cree avec succes.' : 'Actif modifie avec succes.');
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err));
    }
  }, [user, assets, toast]);

  const handleDeleteAsset = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await assetService.archiveAsset(id, user, assets);
      toast.success('Actif archive.');
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err));
    }
  }, [user, assets, toast]);

  const handleRestoreAsset = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await assetService.restoreAsset(id, user, assets);
      toast.success('Actif restaure.');
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err));
    }
  }, [user, assets, toast]);

  const handlePermanentDeleteAsset = useCallback((id: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset || !user) return;
    setConfirmState({
      isOpen: true,
      title: 'Suppression definitive',
      message: `Supprimer DEFINITIVEMENT l'actif ${asset.code} ? Cette action est irreversible.`,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          await assetService.permanentDeleteAsset(id, user, assets);
          toast.success('Actif supprime definitivement.');
        } catch (err: unknown) {
          toast.error(getFirebaseErrorMessage(err));
        }
      },
    });
  }, [user, assets, toast]);

  const handleEmptyTrash = useCallback(async () => {
    if (!user || !user.permissions.isAdmin) return;
    try {
      const count = await assetService.emptyTrash(user, assets);
      if (count > 0) toast.success(`Corbeille videe (${count} elements supprimes).`);
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err));
    }
  }, [user, assets, toast]);

  const handleBulkImport = useCallback(async (importedAssets: Partial<Asset>[]) => {
    if (!user) return;
    setIsImporting(true);
    try {
      const count = await assetService.bulkImport(importedAssets, assets, user);
      toast.success(`${count} actifs importes avec succes.`);
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err));
    } finally {
      setIsImporting(false);
    }
  }, [user, assets, toast]);

  const handleUpdateConfig = useCallback(async (newConfig: AppConfig) => {
    try {
      await saveConfig(newConfig);
      setConfig(newConfig);
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err));
    }
  }, [toast]);

  const handleAddUser = useCallback(async (u: User, password: string) => {
    try {
      await userService.createUser(u, password);
      toast.success(`Utilisateur ${u.firstName} cree avec succes.`);
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err));
    }
  }, [toast]);

  const handleUpdateUser = useCallback(async (u: User) => {
    try {
      await userService.updateUser(u);
      toast.success('Utilisateur modifie.');
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err));
    }
  }, [toast]);

  const handleDeleteUser = useCallback(async (id: string) => {
    try {
      await userService.deleteUser(id);
      toast.success('Utilisateur supprime.');
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err));
    }
  }, [toast]);

  // --- LOADING SCREEN ---
  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center bg-[var(--edc-bg)]" role="status" aria-label="Chargement de l'application">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 border-4 border-gray-200 rounded-full border-t-edc-orange animate-spin"></div>
        <Fan size={64} className="text-edc-blue animate-[spin_1s_linear_infinite]" strokeWidth={2.5} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-bold text-[var(--edc-text)] tracking-widest animate-pulse uppercase">Initialisation...</p>
    </div>
  );

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center font-sans relative overflow-hidden transition-all duration-500">
        <div className="absolute inset-0 z-0 bg-[var(--edc-blue)] transition-colors duration-700 overflow-hidden">
          <div className="absolute -top-20 -right-20 opacity-10 animate-[spin_60s_linear_infinite]" aria-hidden="true">
            <Settings size={600} className="text-white" strokeWidth={0.5}/>
          </div>
          <div className="absolute bottom-0 -left-20 opacity-10 animate-[spin_80s_linear_infinite_reverse]" aria-hidden="true">
            <Settings size={500} className="text-white" strokeWidth={0.5}/>
          </div>
          <div className="absolute inset-0 opacity-20" style={{backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '50px 50px'}} aria-hidden="true"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--edc-blue)]/80 via-[var(--edc-blue)]/50 to-[var(--edc-light)]/90"></div>
        </div>

        <div className="w-full max-w-[340px] px-4 z-10 animate-fade-in">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden group ring-1 ring-white/40 transition-all duration-500 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] hover:scale-[1.02]" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)' }}>
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" aria-hidden="true"></div>

            <div className="text-center mb-6 relative z-10">
              <div className="relative inline-block mb-2">
                <div className="absolute inset-0 bg-[var(--edc-orange)] blur-2xl opacity-30 rounded-full" aria-hidden="true"></div>
                <img src="/logo.png" alt="Logo EDC" className="w-20 h-20 object-contain relative drop-shadow-2xl transform transition-transform duration-500 hover:rotate-3" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-white tracking-widest uppercase mb-1 drop-shadow-lg">Connexion</h2>
              <div className="flex items-center justify-center gap-1.5 text-white/90 text-[9px] uppercase tracking-[0.2em] font-bold">
                <Activity size={10} className="text-[var(--edc-orange)]" aria-hidden="true"/> EDC Panorama <Zap size={10} className="text-[var(--edc-orange)]" aria-hidden="true"/>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 relative z-10" autoComplete="off">
              {loginError && (
                <div className="bg-red-500/30 border border-red-400/50 text-white px-3 py-2 rounded-xl relative flex items-center gap-2 text-xs animate-pulse backdrop-blur-md shadow-inner" role="alert">
                  <AlertCircle size={14} className="shrink-0 text-red-200" aria-hidden="true" />
                  <span className="font-medium leading-tight">{loginError}</span>
                </div>
              )}
              <div className="space-y-1.5 group">
                <label htmlFor="login-email" className="text-[10px] font-bold text-blue-50 uppercase tracking-wider flex items-center gap-1.5 drop-shadow-md group-focus-within:text-[var(--edc-orange)] transition-colors duration-300">
                  <Mail size={12} aria-hidden="true"/> Email
                </label>
                <input id="login-email" type="email" required autoComplete="off" placeholder="nom@edc.cm"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-[var(--edc-orange)] focus:border-white/30 transition-all shadow-inner hover:bg-black/30"
                  value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setLoginError(''); }} disabled={isLoggingIn} />
              </div>
              <div className="space-y-1.5 group">
                <label htmlFor="login-password" className="text-[10px] font-bold text-blue-50 uppercase tracking-wider flex items-center gap-1.5 drop-shadow-md group-focus-within:text-[var(--edc-orange)] transition-colors duration-300">
                  <Lock size={12} aria-hidden="true"/> Mot de passe
                </label>
                <input id="login-password" type="password" required autoComplete="new-password" placeholder="........"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-[var(--edc-orange)] focus:border-white/30 transition-all shadow-inner hover:bg-black/30"
                  value={loginPass} onChange={e => { setLoginPass(e.target.value); setLoginError(''); }} disabled={isLoggingIn} />
              </div>
              <button type="submit" disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-[var(--edc-orange)] to-orange-600 text-white font-bold py-3 rounded-xl shadow-xl flex items-center justify-center gap-2 mt-6 transition-all transform hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0 hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden relative text-sm">
                {isLoggingIn ? (<><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Connexion...</>) : (<>ENTRER <ChevronRight size={16} strokeWidth={3} aria-hidden="true"/></>)}
              </button>
            </form>
            <div className="mt-6 text-center text-[9px] text-white/40 font-medium pt-4 border-t border-white/10 leading-tight">
              &copy; {new Date().getFullYear()} Electricity Development Corporation.<br/>Systeme Securise.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-edc-light font-sans transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-edc-blue text-[var(--edc-sidebar-text)] shadow-xl transition-colors duration-300">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded bg-white object-contain p-1" />
          <span className="font-bold text-lg leading-tight">{config.companyName}</span>
        </div>
        <nav className="flex-1 p-4 space-y-2" aria-label="Navigation principale">
          {user.permissions.canViewDashboard && (
            <button onClick={() => setCurrentView('dashboard')}
              className={`flex items-center w-full px-4 py-3 rounded transition-colors ${currentView === 'dashboard' ? 'bg-edc-orange text-white font-semibold' : 'hover:bg-white/10'}`}
              aria-current={currentView === 'dashboard' ? 'page' : undefined}>
              <LayoutDashboard className="mr-3" size={20} aria-hidden="true" /> Tableau de Bord
            </button>
          )}
          {user.permissions.canReadList && (
            <button onClick={() => setCurrentView('assets')}
              className={`flex items-center w-full px-4 py-3 rounded transition-colors ${currentView === 'assets' ? 'bg-edc-orange text-white font-semibold' : 'hover:bg-white/10'}`}
              aria-current={currentView === 'assets' ? 'page' : undefined}>
              <Box className="mr-3" size={20} aria-hidden="true" /> Immobilisations
            </button>
          )}
          {user.permissions.isAdmin && (
            <button onClick={() => setCurrentView('admin')}
              className={`flex items-center w-full px-4 py-3 rounded transition-colors ${currentView === 'admin' ? 'bg-edc-orange text-white font-semibold' : 'hover:bg-white/10'}`}
              aria-current={currentView === 'admin' ? 'page' : undefined}>
              <Settings className="mr-3" size={20} aria-hidden="true" /> Parametre
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-white/10 relative">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-edc-orange flex items-center justify-center font-bold text-white shrink-0" aria-hidden="true">{user.firstName[0]}</div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{getUserDisplayName(user)}</p>
                <p className="text-xs opacity-70 truncate">{user.permissions.isAdmin ? 'Administrateur' : 'Utilisateur'}</p>
              </div>
            </div>
            <div className="relative" ref={themeMenuRef}>
              <button onClick={() => setThemeMenuOpen(!themeMenuOpen)} className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Changer de theme" aria-expanded={themeMenuOpen}>
                <Palette size={18} aria-hidden="true" />
              </button>
              {themeMenuOpen && (
                <div className="absolute bottom-10 left-0 ml-10 w-48 bg-[var(--edc-card-bg)] text-[var(--edc-text)] rounded-lg shadow-xl border border-[var(--edc-border)] py-1 z-50" role="menu">
                  <p className="px-3 py-2 text-xs font-semibold opacity-70 uppercase tracking-wider border-b border-[var(--edc-border)]">Choisir un theme</p>
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => handleThemeChange(t.id)} role="menuitem"
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-black/5 transition-colors ${(user.preferences?.theme || 'enterprise') === t.id ? 'text-edc-orange font-bold' : ''}`}>
                      <span className="w-4 h-4 rounded-full border border-gray-400" style={{ backgroundColor: t.color }} aria-hidden="true"></span>
                      <span className="flex-1">{t.name}</span>
                      {(user.preferences?.theme || 'enterprise') === t.id && <Check size={14} aria-hidden="true"/>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center text-red-300 hover:text-white w-full text-sm mt-2 pt-2 border-t border-white/10" aria-label="Se deconnecter">
            <LogOut size={16} className="mr-2" aria-hidden="true" /> Deconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-edc-light/50">
        {/* Mobile header */}
        <div className="md:hidden bg-edc-blue text-white p-3 flex justify-between items-center sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded bg-white object-contain p-1" />
            <span className="font-bold text-lg leading-tight">EDC</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1 rounded hover:bg-white/10" aria-label="Ouvrir le menu" aria-expanded={mobileMenuOpen}>
            <Menu size={28} aria-hidden="true" />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-edc-blue text-white fixed top-14 right-0 bottom-0 w-64 z-50 shadow-xl flex flex-col overflow-y-auto border-l border-white/10" role="dialog" aria-label="Menu mobile">
            <div className="p-4 bg-black/20 border-b border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-edc-orange flex items-center justify-center text-white font-bold text-lg shrink-0 border-2 border-white/20" aria-hidden="true">{user.firstName[0]}</div>
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{getUserDisplayName(user)}</p>
                <p className="text-xs text-blue-200 truncate">{user.email}</p>
              </div>
            </div>
            <nav className="p-2" aria-label="Navigation mobile">
              <button onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }} className="flex items-center px-4 py-3 w-full text-left hover:bg-white/5 rounded">
                <LayoutDashboard size={18} className="mr-3 opacity-70" aria-hidden="true"/> Dashboard
              </button>
              <button onClick={() => { setCurrentView('assets'); setMobileMenuOpen(false); }} className="flex items-center px-4 py-3 w-full text-left hover:bg-white/5 rounded">
                <Box size={18} className="mr-3 opacity-70" aria-hidden="true"/> Immobilisations
              </button>
              {user.permissions.isAdmin && (
                <button onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }} className="flex items-center px-4 py-3 w-full text-left hover:bg-white/5 rounded">
                  <Settings size={18} className="mr-3 opacity-70" aria-hidden="true"/> Parametre
                </button>
              )}
            </nav>
            <div className="border-t border-white/10 p-2">
              <p className="px-4 py-2 text-xs font-semibold opacity-50 uppercase tracking-wider">Theme</p>
              <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar pb-2">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => handleThemeChange(t.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                      (user.preferences?.theme || 'enterprise') === t.id
                        ? 'border-white scale-110 shadow-md'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: t.color }}
                    aria-label={`Theme ${t.name}`}>
                    {(user.preferences?.theme || 'enterprise') === t.id && <Check size={14} className="text-white drop-shadow-md" aria-hidden="true"/>}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleLogout} className="p-4 w-full text-left text-red-300 hover:text-red-200 bg-red-900/20 flex items-center justify-center font-semibold border-t border-white/10" aria-label="Se deconnecter">
              <LogOut size={18} className="mr-2" aria-hidden="true"/> Deconnexion
            </button>
          </div>
        )}

        <div className="animate-fade-in h-full">
          {currentView === 'dashboard' && <Dashboard assets={assets} />}
          {currentView === 'assets' && (
            <AssetManager
              assets={assets} config={config} user={user}
              onSave={handleSaveAsset} onImport={handleBulkImport} onDelete={handleDeleteAsset}
              isImporting={isImporting}
            />
          )}
          {currentView === 'admin' && user.permissions.isAdmin && (
            <AdminPanel
              users={users} logs={logs} assets={assets} config={config}
              onUpdateConfig={handleUpdateConfig} onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser}
              onRestoreAsset={handleRestoreAsset} onPermanentDeleteAsset={handlePermanentDeleteAsset}
              onEmptyTrash={handleEmptyTrash}
            />
          )}
        </div>
      </main>

      <AiAssistant assets={assets} config={config} />

      {/* Global ConfirmDialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default App;
