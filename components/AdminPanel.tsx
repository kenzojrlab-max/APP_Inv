import React, { useState, useMemo } from 'react';
import { User, Log, AppConfig, CustomField, CustomFieldType, Asset } from '../types';
import { Shield, Users, Database, FileText, Trash2, Plus, Save, Edit2, List, CheckSquare, X, RotateCcw, EyeOff, Eye, Image as ImageIcon, Settings, UserCog, Lock, ArchiveRestore, AlertTriangle, Loader2 } from 'lucide-react';

interface AdminPanelProps {
  users: User[];
  logs: Log[];
  assets: Asset[];
  config: AppConfig;
  onUpdateConfig: (cfg: AppConfig) => void;
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onRestoreAsset: (id: string) => void;
  onPermanentDeleteAsset: (id: string) => void;
  onEmptyTrash: () => Promise<void>; // Nouvelle prop pour vider la corbeille
}

type MainTab = 'identity' | 'structure' | 'users' | 'logs' | 'trash';
type StructureSubTab = 'fields' | 'lists';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  users, 
  logs, 
  assets, 
  config, 
  onUpdateConfig, 
  onAddUser, 
  onUpdateUser, 
  onDeleteUser,
  onRestoreAsset,
  onPermanentDeleteAsset,
  onEmptyTrash
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('identity');
  const [structureSubTab, setStructureSubTab] = useState<StructureSubTab>('fields');
  
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // État pour le loading suppression massive
  
  // States for Lists Management
  const [newLocation, setNewLocation] = useState('');
  const [newState, setNewState] = useState('');
  const [newHolderPresence, setNewHolderPresence] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState<string>(Object.keys(config.categories)[0] || '');
  const [newCatItem, setNewCatItem] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // States for Fields Management
  const [newField, setNewField] = useState<Partial<CustomField>>({ label: '', type: 'text', options: [] });
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldData, setEditFieldData] = useState<Partial<CustomField>>({});
  const [editOptionsStr, setEditOptionsStr] = useState('');

  // States for List Editing
  const [editingListType, setEditingListType] = useState<'location'|'state'|'presence'|'catItem'|'catDesc'|null>(null);
  const [editingListKey, setEditingListKey] = useState<string>('');
  const [editingListValue, setEditingListValue] = useState<string>('');

  // State for Core Field Editing
  const [editingCoreFieldId, setEditingCoreFieldId] = useState<string | null>(null);
  const [editCoreLabel, setEditCoreLabel] = useState('');

  // User Management States
  const [newUser, setNewUser] = useState<Partial<User>>({
    firstName: '', lastName: '', email: '', password: '',
    permissions: {
      canViewDashboard: true, canReadList: true, canCreate: false, canUpdate: false,
      canDelete: false, canExport: false, isAdmin: false
    }
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserPassword, setEditUserPassword] = useState('');

  // --- FILTRE CORBEILLE ---
  const archivedAssets = useMemo(() => assets.filter(a => a.isArchived), [assets]);

  const handleEmptyTrashClick = async () => {
    if (archivedAssets.length === 0) return;
    if (confirm(`ATTENTION : Vous êtes sur le point de supprimer définitivement ${archivedAssets.length} éléments.\nCette action est irréversible.\n\nConfirmer ?`)) {
        setIsDeleting(true);
        await onEmptyTrash();
        setIsDeleting(false);
    }
  };

  const handleCreateUser = () => {
    if (!newUser.firstName || !newUser.email || !newUser.password) return alert("Remplir les champs obligatoires");
    onAddUser({
      id: Date.now().toString(),
      firstName: newUser.firstName!,
      lastName: newUser.lastName || '',
      email: newUser.email!,
      password: newUser.password!,
      permissions: newUser.permissions!
    });
    setNewUserOpen(false);
    setNewUser({ firstName: '', lastName: '', email: '', password: '', permissions: { canViewDashboard: true, canReadList: true, canCreate: false, canUpdate: false, canDelete: false, canExport: false, isAdmin: false }});
  };

  const startEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserPassword('');
  };

  const saveUserEdit = () => {
    if (!editingUser) return;
    const finalPassword = editUserPassword.trim() ? editUserPassword : (users.find(u => u.id === editingUser.id)?.password || editingUser.password);
    onUpdateUser({
      ...editingUser,
      password: finalPassword
    });
    setEditingUser(null);
    setEditUserPassword('');
  };

  const handleConfigChange = (key: keyof AppConfig, val: any) => {
    onUpdateConfig({ ...config, [key]: val });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleConfigChange('companyLogo', reader.result);
      reader.readAsDataURL(file);
    }
  };

  // --- LISTS ACTIONS ---
  const addLocation = () => {
    if (newLocation && !config.locations.includes(newLocation)) {
      handleConfigChange('locations', [...config.locations, newLocation.toUpperCase()]);
      setNewLocation('');
    }
  };
  const removeLocation = (loc: string) => {
    if (confirm(`Supprimer la localisation ${loc} ?`)) {
      handleConfigChange('locations', config.locations.filter(l => l !== loc));
    }
  };

  const addState = () => {
    if (newState && !config.states.includes(newState)) {
      handleConfigChange('states', [...config.states, newState]);
      setNewState('');
    }
  };
  const removeState = (s: string) => {
    if (confirm(`Supprimer l'état ${s} ?`)) {
       handleConfigChange('states', config.states.filter(item => item !== s));
    }
  };

  const addHolderPresence = () => {
    if (newHolderPresence && !config.holderPresences.includes(newHolderPresence)) {
      handleConfigChange('holderPresences', [...config.holderPresences, newHolderPresence]);
      setNewHolderPresence('');
    }
  };
  const removeHolderPresence = (p: string) => {
    if (confirm(`Supprimer le statut ${p} ?`)) {
       handleConfigChange('holderPresences', config.holderPresences.filter(item => item !== p));
    }
  };

  const addCategory = () => {
    if (newCatCode && newCatDesc) {
      const code = newCatCode.toUpperCase();
      if (config.categories[code]) return alert('Code catégorie existe déjà');
      onUpdateConfig({
        ...config,
        categories: { ...config.categories, [code]: [] },
        categoriesDescriptions: { ...config.categoriesDescriptions, [code]: newCatDesc }
      });
      setNewCatCode('');
      setNewCatDesc('');
    }
  };

  const addItemToCategory = () => {
    if (selectedCategory && newCatItem) {
      const currentItems = config.categories[selectedCategory] || [];
      if (!currentItems.includes(newCatItem)) {
        onUpdateConfig({
          ...config,
          categories: {
            ...config.categories,
            [selectedCategory]: [...currentItems, newCatItem].sort()
          }
        });
        setNewCatItem('');
      }
    }
  };

  const removeCategoryItem = (cat: string, item: string) => {
    if (confirm(`Supprimer "${item}" de la catégorie ${cat} ?`)) {
       onUpdateConfig({
         ...config,
         categories: {
           ...config.categories,
           [cat]: config.categories[cat].filter(i => i !== item)
         }
       });
    }
  };

  // --- EDIT LIST ITEMS LOGIC ---
  const startEditingList = (type: 'location'|'state'|'presence'|'catItem'|'catDesc', key: string, initialValue: string) => {
    setEditingListType(type);
    setEditingListKey(key);
    setEditingListValue(initialValue);
  };

  const saveListEdit = () => {
    if (!editingListValue.trim()) return;

    if (editingListType === 'location') {
       const newLocs = config.locations.map(l => l === editingListKey ? editingListValue.toUpperCase() : l);
       handleConfigChange('locations', newLocs);
    } else if (editingListType === 'state') {
       const newStates = config.states.map(s => s === editingListKey ? editingListValue : s);
       handleConfigChange('states', newStates);
    } else if (editingListType === 'presence') {
       const newPresences = config.holderPresences.map(p => p === editingListKey ? editingListValue : p);
       handleConfigChange('holderPresences', newPresences);
    } else if (editingListType === 'catDesc') {
       const newDescs = { ...config.categoriesDescriptions, [editingListKey]: editingListValue };
       handleConfigChange('categoriesDescriptions', newDescs);
    } else if (editingListType === 'catItem') {
       const [catCode, oldItem] = editingListKey.split('|---|');
       if (catCode && oldItem) {
            const newItems = config.categories[catCode].map(i => i === oldItem ? editingListValue : i);
            onUpdateConfig({
               ...config,
               categories: {
                   ...config.categories,
                   [catCode]: newItems
               }
            });
       }
    }
    setEditingListType(null);
    setEditingListKey('');
    setEditingListValue('');
  };

  const cancelListEdit = () => {
    setEditingListType(null);
    setEditingListKey('');
    setEditingListValue('');
  };

  // --- FIELDS ACTIONS ---
  const addCustomField = () => {
    if (!newField.label || !newField.type) return;
    const id = `field_${Date.now()}`;
    const fieldToAdd: CustomField = {
      id,
      label: newField.label,
      type: newField.type as any,
      isArchived: false
    };
    if (newField.type === 'select') {
        fieldToAdd.options = (newField.options as any as string || '').split(',').map((s:string) => s.trim());
    }
    onUpdateConfig({
      ...config,
      customFields: [...(config.customFields || []), fieldToAdd]
    });
    setNewField({ label: '', type: 'text', options: [] });
  };

  const startEditingField = (field: CustomField) => {
    setEditingFieldId(field.id);
    setEditFieldData({
      label: field.label,
      type: field.type,
    });
    setEditOptionsStr(field.options ? field.options.join(', ') : '');
  };

  const cancelEditingField = () => {
    setEditingFieldId(null);
    setEditFieldData({});
    setEditOptionsStr('');
  };

  const saveFieldChanges = () => {
    if (!editingFieldId) return;
    const originalField = config.customFields.find(f => f.id === editingFieldId);
    if (!originalField) return;

    const newType = editFieldData.type || originalField.type;
    const newLabel = editFieldData.label || originalField.label;
    let newOptions = originalField.options;
   
    if (newType === 'select') {
         newOptions = editOptionsStr ? editOptionsStr.split(',').map(s => s.trim()).filter(s => s !== '') : (newOptions || []);
    } else {
         newOptions = undefined;
    }

    const updatedFields = config.customFields.map(f => {
      if (f.id === editingFieldId) {
        const updatedField: CustomField = {
          ...f,
          label: newLabel,
          type: newType,
        };
        if (newType === 'select' && newOptions) {
            updatedField.options = newOptions;
        } else {
            delete updatedField.options;
        }
        return updatedField;
      }
      return f;
    });

    onUpdateConfig({ ...config, customFields: updatedFields });
    setEditingFieldId(null);
    setEditFieldData({});
    setEditOptionsStr('');
  };

  const toggleFieldArchive = (id: string) => {
    const updatedFields = config.customFields.map(f =>
      f.id === id ? { ...f, isArchived: !f.isArchived } : f
    );
    onUpdateConfig({ ...config, customFields: updatedFields });
  };

  const deleteFieldPermanently = (id: string) => {
    if(confirm("ATTENTION : SUPPRESSION DÉFINITIVE.\n\nCe champ sera totalement effacé de la configuration.\nLes données associées dans les fiches actifs ne seront plus visibles.\n\nPour masquer un champ tout en conservant les données, utilisez 'Désactiver'.\n\nVoulez-vous vraiment continuer ?")) {
       onUpdateConfig({ ...config, customFields: config.customFields.filter(f => f.id !== id)});
    }
  };

  // --- CORE FIELDS ACTIONS ---
  const startEditingCoreField = (fieldKey: string, currentLabel: string) => {
     setEditingCoreFieldId(fieldKey);
     setEditCoreLabel(currentLabel);
  };

  const saveCoreField = (fieldKey: string) => {
    const updatedCore = config.coreFields || [];
    const existingIndex = updatedCore.findIndex(f => f.key === fieldKey);
   
    if (existingIndex >= 0) {
        updatedCore[existingIndex] = { ...updatedCore[existingIndex], label: editCoreLabel };
    } else {
        updatedCore.push({ key: fieldKey, label: editCoreLabel, isVisible: true, type: 'Texte' });
    }
    onUpdateConfig({ ...config, coreFields: updatedCore });
    setEditingCoreFieldId(null);
  };

  const toggleCoreFieldVisibility = (fieldKey: string) => {
      const updatedCore = (config.coreFields || []).map(f => {
          if (f.key === fieldKey) {
              return { ...f, isVisible: !f.isVisible };
          }
          return f;
      });
      onUpdateConfig({ ...config, coreFields: updatedCore });
  };

  return (
    <div className="p-3 md:p-6 bg-transparent min-h-screen">
      <h2 className="text-xl md:text-2xl font-bold text-edc-blue mb-4 md:mb-6">Paramètres</h2>
      
      {/* Main Tabs Navigation */}
      <div className="flex flex-nowrap overflow-x-auto gap-2 border-b mb-6 pb-2 no-scrollbar">
        <button
            onClick={() => setActiveTab('identity')}
            className={`whitespace-nowrap pb-2 px-4 transition-colors flex-shrink-0 ${activeTab === 'identity' ? 'border-b-2 border-edc-orange text-edc-orange font-bold' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <ImageIcon size={18} className="inline mr-2"/> Identité
        </button>

        <button
            onClick={() => setActiveTab('structure')}
            className={`whitespace-nowrap pb-2 px-4 transition-colors flex-shrink-0 ${activeTab === 'structure' ? 'border-b-2 border-edc-orange text-edc-orange font-bold' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Database size={18} className="inline mr-2"/> Structure
        </button>

        <button
            onClick={() => setActiveTab('users')}
            className={`whitespace-nowrap pb-2 px-4 transition-colors flex-shrink-0 ${activeTab === 'users' ? 'border-b-2 border-edc-orange text-edc-orange font-bold' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={18} className="inline mr-2"/> Utilisateurs
        </button>

        <button
            onClick={() => setActiveTab('logs')}
            className={`whitespace-nowrap pb-2 px-4 transition-colors flex-shrink-0 ${activeTab === 'logs' ? 'border-b-2 border-edc-orange text-edc-orange font-bold' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FileText size={18} className="inline mr-2"/> Logs
        </button>

        <button
            onClick={() => setActiveTab('trash')}
            className={`whitespace-nowrap pb-2 px-4 transition-colors flex-shrink-0 ${activeTab === 'trash' ? 'border-b-2 border-red-500 text-red-600 font-bold' : 'text-gray-500 hover:text-red-500'}`}
        >
          <Trash2 size={18} className="inline mr-2"/> Corbeille ({archivedAssets.length})
        </button>
      </div>

      {/* ================= GESTION DE L'IDENTITÉ ================= */}
      {activeTab === 'identity' && (
         <div className="animate-fade-in bg-white p-4 md:p-6 rounded shadow max-w-4xl">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Identité Visuelle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Nom de l'application</label>
                <input
                    value={config.companyName}
                    onChange={e => handleConfigChange('companyName', e.target.value)}
                    className="w-full border p-3 rounded focus:ring-2 focus:ring-edc-blue outline-none"
                    placeholder="Entrez le nom de l'entreprise"
                />
                </div>
                <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Logo de l'entreprise</label>
                <div className="flex items-center gap-6">
                    <div className="border p-2 rounded bg-gray-50 h-24 w-24 flex items-center justify-center shrink-0">
                        <img src={config.companyLogo} className="max-h-20 max-w-20 object-contain" alt="Logo" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        <p className="text-xs text-gray-500 mt-2">Formats: PNG, JPG, SVG. Max 2Mo.</p>
                    </div>
                </div>
                </div>
            </div>
         </div>
      )}

      {/* ================= GESTION STRUCTURELLE ================= */}
      {activeTab === 'structure' && (
          <div className="animate-fade-in space-y-6">
             <div className="flex gap-2 mb-4 bg-gray-200 p-1 rounded w-fit max-w-full overflow-x-auto">
                <button
                    onClick={() => setStructureSubTab('fields')}
                    className={`whitespace-nowrap px-4 py-2 rounded text-sm transition-all ${structureSubTab === 'fields' ? 'bg-white shadow text-edc-blue font-bold' : 'text-gray-600'}`}
                >
                    Gestion des Champs
                </button>
                <button
                    onClick={() => setStructureSubTab('lists')}
                    className={`whitespace-nowrap px-4 py-2 rounded text-sm transition-all ${structureSubTab === 'lists' ? 'bg-white shadow text-edc-blue font-bold' : 'text-gray-600'}`}
                >
                    Gestion des Listes
                </button>
             </div>

             {/* --- FIELDS MANAGEMENT --- */}
             {structureSubTab === 'fields' && (
                 <div className="space-y-8">
                     
                     {/* CORE FIELDS SECTION */}
                     <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border-t-4 border-gray-600">
                         <h4 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
                             <Settings size={24} className="text-gray-600"/> Champs Système (Natifs)
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {config.coreFields?.map((field) => (
                                 <div key={field.key} className={`border rounded p-3 flex justify-between items-center ${!field.isVisible ? 'bg-gray-100 opacity-75' : 'bg-white'}`}>
                                     {editingCoreFieldId === field.key ? (
                                         <div className="flex gap-2 w-full">
                                             <input
                                                 value={editCoreLabel}
                                                 onChange={e => setEditCoreLabel(e.target.value)}
                                                 className="border rounded px-2 py-1 text-sm w-full"
                                                 autoFocus
                                             />
                                             <button onClick={() => saveCoreField(field.key)} className="text-green-600"><Save size={16}/></button>
                                             <button onClick={() => setEditingCoreFieldId(null)} className="text-gray-500"><X size={16}/></button>
                                         </div>
                                     ) : (
                                         <div className="flex flex-col">
                                             <span className="font-bold text-sm">{field.label}</span>
                                             <span className="text-xs text-gray-400 font-mono flex gap-2">
                                                 <span>ID: {field.key}</span>
                                                 <span className="bg-gray-200 px-1 rounded text-gray-600">{field.type}</span>
                                             </span>
                                         </div>
                                     )}
                                     
                                     {!editingCoreFieldId && (
                                         <div className="flex gap-2">
                                             <button onClick={() => startEditingCoreField(field.key, field.label)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Renommer">
                                                 <Edit2 size={16}/>
                                             </button>
                                             <button onClick={() => toggleCoreFieldVisibility(field.key)} className={`${field.isVisible ? 'text-green-600' : 'text-gray-400'} hover:bg-gray-100 p-1 rounded`} title={field.isVisible ? "Masquer" : "Afficher"}>
                                                 {field.isVisible ? <Eye size={16}/> : <EyeOff size={16}/>}
                                             </button>
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* CUSTOM FIELDS CREATOR */}
                     <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border-t-4 border-green-500">
                        <h4 className="font-bold text-lg mb-4 text-green-700 flex items-center gap-2">
                            <Plus className="bg-green-100 p-1 rounded-full w-8 h-8"/> Créer un nouveau champ personnalisé
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nom du champ</label>
                            <input
                                value={newField.label}
                                onChange={(e) => setNewField({...newField, label: e.target.value})}
                                className="border-2 border-gray-200 p-2.5 rounded w-full focus:border-green-500 outline-none transition"
                                placeholder="Ex: Date de garantie"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Type de donnée</label>
                            <select
                                value={newField.type}
                                onChange={(e) => setNewField({...newField, type: e.target.value as any})}
                                className="border-2 border-gray-200 p-2.5 rounded w-full focus:border-green-500 outline-none transition bg-white"
                            >
                                <option value="text">Texte</option>
                                <option value="number">Nombre</option>
                                <option value="date">Date</option>
                                <option value="select">Liste déroulante</option>
                                <option value="boolean">Oui/Non</option>
                            </select>
                        </div>
                        {newField.type === 'select' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Options (virgule)</label>
                                <input
                                    value={newField.options as any}
                                    onChange={(e) => setNewField({...newField, options: e.target.value as any})}
                                    className="border-2 border-gray-200 p-2.5 rounded w-full focus:border-green-500 outline-none transition"
                                    placeholder="Rouge, Bleu, Vert"
                                />
                            </div>
                        )}
                        <button onClick={addCustomField} className="bg-green-600 text-white p-2.5 rounded hover:bg-green-700 font-bold shadow-sm flex justify-center items-center gap-2">
                            <Plus size={20}/> Ajouter
                        </button>
                        </div>
                     </div>

                     {/* CUSTOM FIELDS MANAGER */}
                     <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border-t-4 border-edc-blue">
                        <h4 className="font-bold text-lg mb-6 text-edc-blue flex items-center gap-2">
                            <List className="bg-blue-100 p-1 rounded-full w-8 h-8"/> Gérer les champs personnalisés
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse min-w-[600px]">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th className="p-4 text-left border-b w-1/4">Nom du Champ</th>
                                    <th className="p-4 text-left border-b w-1/6">Type</th>
                                    <th className="p-4 text-left border-b w-1/4">Détails / Options</th>
                                    <th className="p-4 text-center border-b w-24">État</th>
                                    <th className="p-4 text-right border-b">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(config.customFields || []).map(field => {
                                    const isEditing = editingFieldId === field.id;
                                    const rowClass = isEditing ? 'bg-blue-50' : 'hover:bg-gray-50';
                                    return (
                                        <tr key={field.id} className={`border-b ${rowClass}`}>
                                        {isEditing ? (
                                            <>
                                                <td className="p-4">
                                                    <input
                                                        value={editFieldData.label || ''}
                                                        onChange={(e) => setEditFieldData({...editFieldData, label: e.target.value})}
                                                        className="border border-blue-300 rounded p-2 w-full focus:ring-2 focus:ring-blue-200"
                                                        autoFocus
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        value={editFieldData.type || 'text'}
                                                        onChange={(e) => setEditFieldData({...editFieldData, type: e.target.value as CustomFieldType})}
                                                        className="border border-blue-300 rounded p-2 w-full"
                                                    >
                                                        <option value="text">Texte</option>
                                                        <option value="number">Nombre</option>
                                                        <option value="date">Date</option>
                                                        <option value="select">Liste</option>
                                                        <option value="boolean">Oui/Non</option>
                                                    </select>
                                                </td>
                                                <td className="p-4">
                                                    {editFieldData.type === 'select' && (
                                                        <input
                                                            value={editOptionsStr}
                                                            onChange={(e) => setEditOptionsStr(e.target.value)}
                                                            className="border border-blue-300 rounded p-2 w-full text-xs"
                                                            placeholder="Option1, Option2..."
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-xs font-bold text-blue-600 animate-pulse">Édition...</span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={saveFieldChanges} className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 shadow font-medium">
                                                        <Save size={16}/> Valider
                                                        </button>
                                                        <button onClick={cancelEditingField} className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-400 text-white hover:bg-gray-500 shadow font-medium">
                                                        <X size={16}/> Annuler
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-4 font-bold text-gray-800">{field.label}</td>
                                                <td className="p-4 capitalize">
                                                    <span className="bg-gray-200 px-2 py-1 rounded text-xs">{field.type}</span>
                                                </td>
                                                <td className="p-4 text-gray-500 text-xs">
                                                    {field.type === 'select' ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {field.options?.map((o,i) => <span key={i} className="border px-1 rounded">{o}</span>)}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1
                                                        ${field.isArchived ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                                        {field.isArchived ? <EyeOff size={12}/> : <Eye size={12}/>}
                                                        {field.isArchived ? 'Masqué' : 'Actif'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => startEditingField(field)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-semibold hover:underline">
                                                            <Edit2 size={16}/> Modifier
                                                        </button>
                                                        <div className="h-4 w-px bg-gray-300 mx-1"></div>
                                                        <button
                                                            onClick={() => toggleFieldArchive(field.id)}
                                                            className={`flex items-center gap-1 text-sm font-semibold hover:underline ${field.isArchived ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}
                                                        >
                                                            {field.isArchived ? <><RotateCcw size={16}/> Réactiver</> : <><EyeOff size={16}/> Désactiver</>}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteFieldPermanently(field.id)}
                                                            className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-semibold hover:underline ml-2"
                                                            title="Suppression Définitive"
                                                        >
                                                            <Trash2 size={16}/> Détruire
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                            </table>
                        </div>
                     </div>
                 </div>
             )}

             {/* --- LISTS MANAGEMENT --- */}
             {structureSubTab === 'lists' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {/* Localisations */}
                     <div className="bg-white p-4 rounded shadow">
                         <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><List size={18}/> Localisations</h3>
                         <div className="flex gap-2 mb-3">
                            <input value={newLocation} onChange={(e) => setNewLocation(e.target.value.toUpperCase())} placeholder="Code (ex: OUEST)" className="border p-2 rounded w-full uppercase" />
                            <button onClick={addLocation} className="bg-green-600 text-white px-3 rounded hover:bg-green-700"><Plus size={18}/></button>
                         </div>
                         <div className="border rounded max-h-48 overflow-y-auto">
                            {config.locations.map(loc => (
                               <div key={loc} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-50">
                                  {editingListType === 'location' && editingListKey === loc ? (
                                      <div className="flex gap-2 w-full">
                                          <input value={editingListValue} onChange={(e) => setEditingListValue(e.target.value.toUpperCase())} className="border p-1 rounded w-full text-sm uppercase" />
                                          <button onClick={saveListEdit} className="text-green-600"><CheckSquare size={16}/></button>
                                          <button onClick={cancelListEdit} className="text-gray-400"><X size={16}/></button>
                                      </div>
                                  ) : (
                                      <>
                                          <span>{loc}</span>
                                          <div className="flex gap-2">
                                              <button onClick={() => startEditingList('location', loc, loc)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16}/></button>
                                              <button onClick={() => removeLocation(loc)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                          </div>
                                      </>
                                  )}
                               </div>
                            ))}
                         </div>
                     </div>
                     {/* États */}
                     <div className="bg-white p-4 rounded shadow">
                         <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><List size={18}/> États</h3>
                         <div className="flex gap-2 mb-3">
                            <input value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="Ex: En réparation" className="border p-2 rounded w-full" />
                            <button onClick={addState} className="bg-green-600 text-white px-3 rounded hover:bg-green-700"><Plus size={18}/></button>
                         </div>
                         <div className="border rounded max-h-48 overflow-y-auto">
                            {config.states.map(s => (
                               <div key={s} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-50">
                                  {editingListType === 'state' && editingListKey === s ? (
                                      <div className="flex gap-2 w-full">
                                          <input value={editingListValue} onChange={(e) => setEditingListValue(e.target.value)} className="border p-1 rounded w-full text-sm" />
                                          <button onClick={saveListEdit} className="text-green-600"><CheckSquare size={16}/></button>
                                          <button onClick={cancelListEdit} className="text-gray-400"><X size={16}/></button>
                                      </div>
                                  ) : (
                                      <>
                                          <span>{s}</span>
                                          <div className="flex gap-2">
                                              <button onClick={() => startEditingList('state', s, s)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16}/></button>
                                              <button onClick={() => removeState(s)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                          </div>
                                      </>
                                  )}
                               </div>
                            ))}
                         </div>
                     </div>
                     {/* Présences */}
                     <div className="bg-white p-4 rounded shadow">
                         <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><List size={18}/> Présence Détenteur</h3>
                         <div className="flex gap-2 mb-3">
                            <input value={newHolderPresence} onChange={(e) => setNewHolderPresence(e.target.value)} placeholder="Ex: En mission" className="border p-2 rounded w-full" />
                            <button onClick={addHolderPresence} className="bg-green-600 text-white px-3 rounded hover:bg-green-700"><Plus size={18}/></button>
                         </div>
                         <div className="border rounded max-h-48 overflow-y-auto">
                            {config.holderPresences.map(p => (
                               <div key={p} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-50">
                                   {editingListType === 'presence' && editingListKey === p ? (
                                      <div className="flex gap-2 w-full">
                                          <input value={editingListValue} onChange={(e) => setEditingListValue(e.target.value)} className="border p-1 rounded w-full text-sm" />
                                          <button onClick={saveListEdit} className="text-green-600"><CheckSquare size={16}/></button>
                                          <button onClick={cancelListEdit} className="text-gray-400"><X size={16}/></button>
                                      </div>
                                  ) : (
                                      <>
                                          <span>{p}</span>
                                          <div className="flex gap-2">
                                              <button onClick={() => startEditingList('presence', p, p)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16}/></button>
                                              <button onClick={() => removeHolderPresence(p)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                          </div>
                                      </>
                                  )}
                               </div>
                            ))}
                         </div>
                     </div>
                     {/* Catégories */}
                     <div className="bg-white p-4 rounded shadow">
                         <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><List size={18}/> Catégories & Items</h3>
                         <div className="flex gap-2 mb-4 bg-gray-50 p-2 rounded flex-wrap">
                            <input value={newCatCode} onChange={(e) => setNewCatCode(e.target.value.toUpperCase())} placeholder="Code (ex: ZZ)" className="border p-1 rounded w-20 uppercase text-sm" />
                            <input value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} placeholder="Description" className="border p-1 rounded w-full sm:w-auto flex-1 text-sm" />
                            <button onClick={addCategory} className="bg-edc-blue text-white px-3 rounded text-sm hover:bg-blue-800">Ajouter</button>
                         </div>
                         <div className="mb-2">
                            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full border p-2 rounded mt-1 bg-gray-50 font-semibold text-sm">
                               {Object.keys(config.categories).map(k => (
                                  <option key={k} value={k}>{k} - {config.categoriesDescriptions[k]}</option>
                               ))}
                            </select>
                         </div>
                         {selectedCategory && (
                            <div className="flex flex-col">
                               <div className="flex gap-2 mb-2">
                                  <input value={newCatItem} onChange={(e) => setNewCatItem(e.target.value)} placeholder={`Nouvel item pour ${selectedCategory}...`} className="border p-2 rounded w-full" />
                                  <button onClick={addItemToCategory} className="bg-green-600 text-white px-3 rounded"><Plus size={18}/></button>
                               </div>
                               <div className="border rounded overflow-y-auto max-h-64">
                                  {config.categories[selectedCategory]?.map((item, idx) => (
                                     <div key={idx} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-50 text-sm">
                                        {editingListType === 'catItem' && editingListKey === `${selectedCategory}|---|${item}` ? (
                                             <div className="flex gap-2 w-full">
                                              <input value={editingListValue} onChange={(e) => setEditingListValue(e.target.value)} className="border p-1 rounded w-full text-sm" />
                                              <button onClick={saveListEdit} className="text-green-600"><CheckSquare size={16}/></button>
                                              <button onClick={cancelListEdit} className="text-gray-400"><X size={16}/></button>
                                          </div>
                                        ) : (
                                             <>
                                              <span className="break-all mr-2">{item}</span>
                                              <div className="flex gap-2 shrink-0">
                                                  <button onClick={() => startEditingList('catItem', `${selectedCategory}|---|${item}`, item)} className="text-blue-500 hover:text-blue-700"><Edit2 size={14}/></button>
                                                  <button onClick={() => removeCategoryItem(selectedCategory, item)} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                                              </div>
                                             </>
                                        )}
                                     </div>
                                  ))}
                               </div>
                            </div>
                         )}
                      </div>
                  </div>
             )}
         </div>
      )}

      {/* ================= GESTION DES UTILISATEURS ================= */}
      {activeTab === 'users' && (
        <div className="animate-fade-in">
          <button onClick={() => setNewUserOpen(!newUserOpen)} className="mb-4 bg-edc-blue text-white px-4 py-2 rounded flex items-center gap-2">
            <Plus size={18}/> Nouvel Utilisateur
          </button>
         
          {newUserOpen && (
            <div className="bg-white p-4 rounded shadow mb-6 border-l-4 border-edc-blue">
              <h3 className="font-bold mb-2">Création Utilisateur</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <input placeholder="Prénom" className="border p-2 rounded" value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} />
                <input placeholder="Nom" className="border p-2 rounded" value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} />
                <input placeholder="Email" className="border p-2 rounded" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                <input placeholder="Mot de passe" type="password" className="border p-2 rounded" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div className="mb-4">
                <p className="font-semibold mb-2">Permissions:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {Object.keys(newUser.permissions!).map((perm) => (
                    <label key={perm} className="flex items-center space-x-2">
                      <input type="checkbox" checked={(newUser.permissions as any)[perm]} onChange={(e) => setNewUser({...newUser, permissions: {...newUser.permissions!, [perm]: e.target.checked}})} />
                      <span>{perm.replace('can', '')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleCreateUser} className="bg-green-600 text-white px-4 py-1 rounded">Sauvegarder</button>
            </div>
          )}

          <div className="bg-white rounded shadow overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Rôle</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, index) => (
                  <tr key={u.id || index} className="border-t">
                    <td className="p-3">{u.firstName} {u.lastName}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      {u.permissions.isAdmin ? <span className="bg-purple-100 text-purple-800 px-2 rounded-full text-xs">ADMIN</span> : 'Utilisateur'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEditUser(u)} className="text-blue-600 hover:text-blue-800" title="Modifier"><Edit2 size={18} /></button>
                        {!u.permissions.isAdmin && (
                            <button onClick={() => onDeleteUser(u.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* EDIT USER MODAL */}
          {editingUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><UserCog size={24}/> Modifier Utilisateur</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div><label className="block text-sm font-medium">Prénom</label><input value={editingUser.firstName} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} className="w-full border p-2 rounded"/></div>
                      <div><label className="block text-sm font-medium">Nom</label><input value={editingUser.lastName} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} className="w-full border p-2 rounded"/></div>
                      <div className="sm:col-span-2"><label className="block text-sm font-medium">Email</label><input value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full border p-2 rounded"/></div>
                      <div className="sm:col-span-2 bg-yellow-50 p-3 rounded border border-yellow-200"><label className="block text-sm font-medium flex items-center gap-2"><Lock size={16}/> Réinitialiser le mot de passe</label><input type="password" placeholder="Laisser vide pour conserver le mot de passe actuel" value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white"/></div>
                  </div>
                  <div className="mb-6"><p className="font-semibold mb-2 text-sm">Permissions</p><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">{Object.keys(editingUser.permissions).map(perm => (<label key={perm} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded"><input type="checkbox" disabled={perm === 'isAdmin' && editingUser.id === 'admin-001'} checked={(editingUser.permissions as any)[perm]} onChange={e => setEditingUser({...editingUser, permissions: { ...editingUser.permissions, [perm]: e.target.checked }})}/><span>{perm.replace('can', '')}</span></label>))}</div></div>
                  <div className="flex justify-end gap-3"><button onClick={() => setEditingUser(null)} className="px-4 py-2 border rounded text-gray-600">Annuler</button><button onClick={saveUserEdit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enregistrer</button></div>
                </div>
              </div>
          )}
        </div>
      )}

      {/* ================= CORBEILLE ================= */}
      {activeTab === 'trash' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex justify-between items-center bg-red-50 p-4 rounded-lg border border-red-200">
             <div className="flex items-start gap-3">
               <AlertTriangle className="text-red-500 mt-1" />
               <div>
                  <h4 className="font-bold text-red-800">Gestion de la Corbeille</h4>
                  <p className="text-sm text-red-700">
                    Les éléments ci-dessous sont archivés (soft delete). 
                    Vous pouvez les <strong>restaurer</strong> ou les <strong>supprimer définitivement</strong>.
                  </p>
               </div>
             </div>
             
             {archivedAssets.length > 0 && (
                <button 
                  onClick={handleEmptyTrashClick}
                  disabled={isDeleting}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-md transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {isDeleting ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18} />}
                   {isDeleting ? 'Suppression...' : 'Vider la Corbeille'}
                </button>
             )}
          </div>

          <div className="bg-white rounded shadow overflow-hidden overflow-x-auto">
             <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">Nom</th>
                    <th className="p-3 text-left">Catégorie</th>
                    <th className="p-3 text-left">Localisation</th>
                    <th className="p-3 text-left">État</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {archivedAssets.length === 0 ? (
                     <tr>
                       <td colSpan={6} className="p-8 text-center text-gray-500">
                         La corbeille est vide.
                       </td>
                     </tr>
                   ) : (
                     archivedAssets.map(asset => (
                       <tr key={asset.id} className="border-t hover:bg-red-50/30">
                          <td className="p-3 font-mono font-bold">{asset.code}</td>
                          <td className="p-3">{asset.name}</td>
                          <td className="p-3">{asset.category}</td>
                          <td className="p-3">{asset.location}</td>
                          <td className="p-3">
                             <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-bold">
                               {asset.state}
                             </span>
                          </td>
                          <td className="p-3 text-right">
                             <div className="flex justify-end gap-3">
                                <button 
                                  onClick={() => onRestoreAsset(asset.id)}
                                  className="flex items-center gap-1 text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded transition-colors font-medium text-xs border border-green-200"
                                  title="Restaurer l'actif"
                                >
                                   <ArchiveRestore size={16} /> Restaurer
                                </button>
                                <button 
                                  onClick={() => onPermanentDeleteAsset(asset.id)}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors font-medium text-xs border border-red-200"
                                  title="Supprimer définitivement"
                                >
                                   <Trash2 size={16} /> Supprimer
                                </button>
                             </div>
                          </td>
                       </tr>
                     ))
                   )}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* ================= LOGS ================= */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded shadow overflow-hidden animate-fade-in overflow-x-auto">
           <table className="w-full text-sm min-w-[600px]">
             <thead className="bg-gray-100">
               <tr>
                 <th className="p-3 text-left">Date</th>
                 <th className="p-3 text-left">Utilisateur</th>
                 <th className="p-3 text-left">Action</th>
                 <th className="p-3 text-left">Cible</th>
                 <th className="p-3 text-left">Détails</th>
               </tr>
             </thead>
             <tbody>
               {logs.slice().reverse().map((log, index) => (
                 <tr key={log.id || index} className="border-t hover:bg-gray-50">
                   <td className="p-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                   <td className="p-3">{log.userEmail}</td>
                   <td className="p-3">
                     <span className={`px-2 py-0.5 rounded text-xs font-bold
                       ${log.action === 'UPDATE' ? 'bg-orange-100 text-orange-800' :
                         log.action === 'DELETE' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {log.action}
                     </span>
                   </td>
                   <td className="p-3 font-mono">{log.targetCode || '-'}</td>
                   <td className="p-3 max-w-xs truncate" title={log.description}>
                      {log.description}
                      {log.changes && (
                        <div className="text-xs text-gray-500 mt-1">
                          {log.changes.map((c, i) => (
                            <div key={i}>{c.field}: {String(c.before)} &rarr; {String(c.after)}</div>
                          ))}
                        </div>
                      )}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;