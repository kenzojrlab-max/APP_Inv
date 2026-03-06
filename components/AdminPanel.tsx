import React, { useState, useMemo } from 'react';
import { User, Log, AppConfig, CustomField, CustomFieldType, Asset } from '../types';
import {
  Database, FileText, Trash2, Plus, Save, Edit2, List,
  CheckSquare, X, RotateCcw, EyeOff, Eye, Image as ImageIcon, Settings,
  Users
} from 'lucide-react';
import UsersTab from './admin/UsersTab';
import LogsTab from './admin/LogsTab';
import TrashTab from './admin/TrashTab';
import ConfirmDialog from './shared/ConfirmDialog';
import { useToast } from '../hooks/useToast';

interface AdminPanelProps {
  users: User[];
  logs: Log[];
  assets: Asset[];
  config: AppConfig;
  onUpdateConfig: (cfg: AppConfig) => void;
  onAddUser: (u: User, password: string) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onRestoreAsset: (id: string) => void;
  onPermanentDeleteAsset: (id: string) => void;
  onEmptyTrash: () => Promise<void>;
}

type MainTab = 'identity' | 'structure' | 'users' | 'logs' | 'trash';
type StructureSubTab = 'fields' | 'lists';

const AdminPanel: React.FC<AdminPanelProps> = ({
  users, logs, assets, config, onUpdateConfig, onAddUser, onUpdateUser, onDeleteUser,
  onRestoreAsset, onPermanentDeleteAsset, onEmptyTrash
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<MainTab>('identity');
  const [structureSubTab, setStructureSubTab] = useState<StructureSubTab>('fields');

  // States for Lists Management
  const [newLocation, setNewLocation] = useState('');
  const [newState, setNewState] = useState('');
  const [newHolderPresence, setNewHolderPresence] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(Object.keys(config.categories)[0] || '');
  const [newCatItem, setNewCatItem] = useState('');

  // States for inline editing of list items
  const [editingListType, setEditingListType] = useState<'location'|'state'|'presence'|'catItem'|'catDesc'|null>(null);
  const [editingListKey, setEditingListKey] = useState('');
  const [editingListValue, setEditingListValue] = useState('');

  // States for Fields Management
  const [newField, setNewField] = useState<{label: string; type: CustomFieldType; options: string}>({ label: '', type: 'text', options: '' });
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldData, setEditFieldData] = useState<Partial<CustomField>>({});
  const [editOptionsStr, setEditOptionsStr] = useState('');

  // States for Core Fields
  const [editingCoreFieldId, setEditingCoreFieldId] = useState<string | null>(null);
  const [editCoreLabel, setEditCoreLabel] = useState('');

  // Generic confirm dialog state (replaces native confirm())
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'warning' = 'warning') => {
    setConfirmState({ isOpen: true, title, message, onConfirm: () => { setConfirmState(prev => ({ ...prev, isOpen: false })); onConfirm(); }, variant });
  };

  const archivedAssets = useMemo(() => assets.filter(a => a.isArchived), [assets]);

  const handleConfigChange = (key: keyof AppConfig, val: AppConfig[keyof AppConfig]) => {
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
    showConfirm('Supprimer la localisation', `Supprimer la localisation ${loc} ?`, () => {
      handleConfigChange('locations', config.locations.filter(l => l !== loc));
    });
  };
  const addState = () => {
    if (newState && !config.states.includes(newState)) {
      handleConfigChange('states', [...config.states, newState]);
      setNewState('');
    }
  };
  const removeState = (s: string) => {
    showConfirm('Supprimer l\'etat', `Supprimer l'etat ${s} ?`, () => {
      handleConfigChange('states', config.states.filter(item => item !== s));
    });
  };
  const addHolderPresence = () => {
    if (newHolderPresence && !config.holderPresences.includes(newHolderPresence)) {
      handleConfigChange('holderPresences', [...config.holderPresences, newHolderPresence]);
      setNewHolderPresence('');
    }
  };
  const removeHolderPresence = (p: string) => {
    showConfirm('Supprimer le statut', `Supprimer le statut ${p} ?`, () => {
      handleConfigChange('holderPresences', config.holderPresences.filter(item => item !== p));
    });
  };
  const addCategory = () => {
    if (newCatCode && newCatDesc) {
      const code = newCatCode.toUpperCase();
      if (config.categories[code]) { toast.warning('Ce code categorie existe deja.'); return; }
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
          categories: { ...config.categories, [selectedCategory]: [...currentItems, newCatItem].sort() }
        });
        setNewCatItem('');
      }
    }
  };
  const removeCategoryItem = (cat: string, item: string) => {
    showConfirm('Supprimer l\'element', `Supprimer "${item}" de la categorie ${cat} ?`, () => {
      onUpdateConfig({
        ...config,
        categories: { ...config.categories, [cat]: config.categories[cat].filter(i => i !== item) }
      });
    });
  };

  // --- EDIT LIST ITEMS ---
  const startEditingList = (type: 'location'|'state'|'presence'|'catItem'|'catDesc', key: string, initialValue: string) => {
    setEditingListType(type);
    setEditingListKey(key);
    setEditingListValue(initialValue);
  };
  const saveListEdit = () => {
    if (!editingListValue.trim()) return;
    if (editingListType === 'location') {
      handleConfigChange('locations', config.locations.map(l => l === editingListKey ? editingListValue.toUpperCase() : l));
    } else if (editingListType === 'state') {
      handleConfigChange('states', config.states.map(s => s === editingListKey ? editingListValue : s));
    } else if (editingListType === 'presence') {
      handleConfigChange('holderPresences', config.holderPresences.map(p => p === editingListKey ? editingListValue : p));
    } else if (editingListType === 'catDesc') {
      handleConfigChange('categoriesDescriptions', { ...config.categoriesDescriptions, [editingListKey]: editingListValue });
    } else if (editingListType === 'catItem') {
      const [catCode, oldItem] = editingListKey.split('|---|');
      if (catCode && oldItem) {
        onUpdateConfig({
          ...config,
          categories: { ...config.categories, [catCode]: config.categories[catCode].map(i => i === oldItem ? editingListValue : i) }
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
    const fieldToAdd: CustomField = { id, label: newField.label, type: newField.type, isArchived: false };
    if (newField.type === 'select') {
      fieldToAdd.options = newField.options.split(',').map(s => s.trim()).filter(s => s !== '');
    }
    onUpdateConfig({ ...config, customFields: [...(config.customFields || []), fieldToAdd] });
    setNewField({ label: '', type: 'text', options: '' });
  };
  const startEditingField = (field: CustomField) => {
    setEditingFieldId(field.id);
    setEditFieldData({ label: field.label, type: field.type });
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
        const updatedField: CustomField = { ...f, label: newLabel, type: newType };
        if (newType === 'select' && newOptions) { updatedField.options = newOptions; } else { delete updatedField.options; }
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
    const updatedFields = config.customFields.map(f => f.id === id ? { ...f, isArchived: !f.isArchived } : f);
    onUpdateConfig({ ...config, customFields: updatedFields });
  };
  const deleteFieldPermanently = (id: string) => {
    showConfirm(
      'Suppression definitive',
      "Ce champ sera totalement efface de la configuration. Les donnees associees ne seront plus visibles. Pour masquer un champ tout en conservant les donnees, utilisez 'Desactiver'.",
      () => { onUpdateConfig({ ...config, customFields: config.customFields.filter(f => f.id !== id) }); },
      'danger'
    );
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
    const updatedCore = (config.coreFields || []).map(f => f.key === fieldKey ? { ...f, isVisible: !f.isVisible } : f);
    onUpdateConfig({ ...config, coreFields: updatedCore });
  };

  return (
    <div className="p-3 md:p-6 bg-transparent min-h-screen">
      <h2 className="text-xl md:text-2xl font-bold text-edc-blue mb-4 md:mb-6">Parametres</h2>

      {/* Main Tabs Navigation */}
      <div className="flex flex-nowrap overflow-x-auto gap-2 border-b mb-6 pb-2 no-scrollbar">
        <button onClick={() => setActiveTab('identity')}
          className={`whitespace-nowrap pb-2 px-4 transition-colors flex-shrink-0 ${activeTab === 'identity' ? 'border-b-2 border-edc-orange text-edc-orange font-bold' : 'text-gray-500 hover:text-gray-700'}`}>
          <ImageIcon size={18} className="inline mr-2"/> Identite
        </button>
        <button onClick={() => setActiveTab('structure')}
          className={`whitespace-nowrap pb-2 px-4 transition-colors flex-shrink-0 ${activeTab === 'structure' ? 'border-b-2 border-edc-orange text-edc-orange font-bold' : 'text-gray-500 hover:text-gray-700'}`}>
          <Database size={18} className="inline mr-2"/> Structure
        </button>
        <button onClick={() => setActiveTab('users')}
          className={`whitespace-nowrap pb-2 px-4 transition-colors flex-shrink-0 ${activeTab === 'users' ? 'border-b-2 border-edc-orange text-edc-orange font-bold' : 'text-gray-500 hover:text-gray-700'}`}>
          <Users size={18} className="inline mr-2"/> Utilisateurs
        </button>
        <button onClick={() => setActiveTab('logs')}
          className={`whitespace-nowrap pb-2 px-4 transition-colors flex-shrink-0 ${activeTab === 'logs' ? 'border-b-2 border-edc-orange text-edc-orange font-bold' : 'text-gray-500 hover:text-gray-700'}`}>
          <FileText size={18} className="inline mr-2"/> Logs
        </button>
        <button onClick={() => setActiveTab('trash')}
          className={`whitespace-nowrap pb-2 px-4 transition-colors flex-shrink-0 ${activeTab === 'trash' ? 'border-b-2 border-red-500 text-red-600 font-bold' : 'text-gray-500 hover:text-red-500'}`}>
          <Trash2 size={18} className="inline mr-2"/> Corbeille ({archivedAssets.length})
        </button>
      </div>

      {/* ================= IDENTITY ================= */}
      {activeTab === 'identity' && (
        <div className="animate-fade-in bg-white p-4 md:p-6 rounded shadow max-w-4xl">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Identite Visuelle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Nom de l'application</label>
              <input value={config.companyName} onChange={e => handleConfigChange('companyName', e.target.value)}
                className="w-full border p-3 rounded focus:ring-2 focus:ring-edc-blue outline-none" placeholder="Entrez le nom de l'entreprise" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Logo de l'entreprise</label>
              <div className="flex items-center gap-6">
                <div className="border p-2 rounded bg-gray-50 h-24 w-24 flex items-center justify-center shrink-0">
                  <img src={config.companyLogo} className="max-h-20 max-w-20 object-contain" alt="Logo" loading="lazy" />
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

      {/* ================= STRUCTURE ================= */}
      {activeTab === 'structure' && (
        <div className="animate-fade-in space-y-6">
          <div className="flex gap-2 mb-4 bg-gray-200 p-1 rounded w-fit max-w-full overflow-x-auto">
            <button onClick={() => setStructureSubTab('fields')}
              className={`whitespace-nowrap px-4 py-2 rounded text-sm transition-all ${structureSubTab === 'fields' ? 'bg-white shadow text-edc-blue font-bold' : 'text-gray-600'}`}>
              Gestion des Champs
            </button>
            <button onClick={() => setStructureSubTab('lists')}
              className={`whitespace-nowrap px-4 py-2 rounded text-sm transition-all ${structureSubTab === 'lists' ? 'bg-white shadow text-edc-blue font-bold' : 'text-gray-600'}`}>
              Gestion des Listes
            </button>
          </div>

          {/* --- FIELDS MANAGEMENT --- */}
          {structureSubTab === 'fields' && (
            <div className="space-y-8">
              {/* CORE FIELDS */}
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border-t-4 border-gray-600">
                <h4 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
                  <Settings size={24} className="text-gray-600"/> Champs Systeme (Natifs)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {config.coreFields?.map((field) => (
                    <div key={field.key} className={`border rounded p-3 flex justify-between items-center ${!field.isVisible ? 'bg-gray-100 opacity-75' : 'bg-white'}`}>
                      {editingCoreFieldId === field.key ? (
                        <div className="flex gap-2 w-full">
                          <input value={editCoreLabel} onChange={e => setEditCoreLabel(e.target.value)} className="border rounded px-2 py-1 text-sm w-full" autoFocus />
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
                          <button onClick={() => startEditingCoreField(field.key, field.label)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Renommer"><Edit2 size={16}/></button>
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
                  <Plus className="bg-green-100 p-1 rounded-full w-8 h-8"/> Creer un nouveau champ personnalise
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nom du champ</label>
                    <input value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})}
                      className="border-2 border-gray-200 p-2.5 rounded w-full focus:border-green-500 outline-none transition" placeholder="Ex: Date de garantie" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type de donnee</label>
                    <select value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as CustomFieldType})}
                      className="border-2 border-gray-200 p-2.5 rounded w-full focus:border-green-500 outline-none transition bg-white">
                      <option value="text">Texte</option>
                      <option value="number">Nombre</option>
                      <option value="date">Date</option>
                      <option value="select">Liste deroulante</option>
                      <option value="boolean">Oui/Non</option>
                    </select>
                  </div>
                  {newField.type === 'select' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Options (virgule)</label>
                      <input value={newField.options} onChange={e => setNewField({...newField, options: e.target.value})}
                        className="border-2 border-gray-200 p-2.5 rounded w-full focus:border-green-500 outline-none transition" placeholder="Rouge, Bleu, Vert" />
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
                  <List className="bg-blue-100 p-1 rounded-full w-8 h-8"/> Gerer les champs personnalises
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[600px]">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-4 text-left border-b w-1/4">Nom du Champ</th>
                        <th className="p-4 text-left border-b w-1/6">Type</th>
                        <th className="p-4 text-left border-b w-1/4">Details / Options</th>
                        <th className="p-4 text-center border-b w-24">Etat</th>
                        <th className="p-4 text-right border-b">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(config.customFields || []).map(field => {
                        const isEditing = editingFieldId === field.id;
                        return (
                          <tr key={field.id} className={`border-b ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            {isEditing ? (
                              <>
                                <td className="p-4">
                                  <input value={editFieldData.label || ''} onChange={e => setEditFieldData({...editFieldData, label: e.target.value})}
                                    className="border border-blue-300 rounded p-2 w-full focus:ring-2 focus:ring-blue-200" autoFocus />
                                </td>
                                <td className="p-4">
                                  <select value={editFieldData.type || 'text'} onChange={e => setEditFieldData({...editFieldData, type: e.target.value as CustomFieldType})}
                                    className="border border-blue-300 rounded p-2 w-full">
                                    <option value="text">Texte</option>
                                    <option value="number">Nombre</option>
                                    <option value="date">Date</option>
                                    <option value="select">Liste</option>
                                    <option value="boolean">Oui/Non</option>
                                  </select>
                                </td>
                                <td className="p-4">
                                  {editFieldData.type === 'select' && (
                                    <input value={editOptionsStr} onChange={e => setEditOptionsStr(e.target.value)}
                                      className="border border-blue-300 rounded p-2 w-full text-xs" placeholder="Option1, Option2..." />
                                  )}
                                </td>
                                <td className="p-4 text-center"><span className="text-xs font-bold text-blue-600 animate-pulse">Edition...</span></td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={saveFieldChanges} className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 shadow font-medium"><Save size={16}/> Valider</button>
                                    <button onClick={cancelEditingField} className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-400 text-white hover:bg-gray-500 shadow font-medium"><X size={16}/> Annuler</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-4 font-bold text-gray-800">{field.label}</td>
                                <td className="p-4 capitalize"><span className="bg-gray-200 px-2 py-1 rounded text-xs">{field.type}</span></td>
                                <td className="p-4 text-gray-500 text-xs">
                                  {field.type === 'select' ? (
                                    <div className="flex flex-wrap gap-1">{field.options?.map((o, i) => <span key={i} className="border px-1 rounded">{o}</span>)}</div>
                                  ) : '-'}
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${field.isArchived ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                    {field.isArchived ? <EyeOff size={12}/> : <Eye size={12}/>}
                                    {field.isArchived ? 'Masque' : 'Actif'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex justify-end gap-3">
                                    <button onClick={() => startEditingField(field)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-semibold hover:underline"><Edit2 size={16}/> Modifier</button>
                                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                                    <button onClick={() => toggleFieldArchive(field.id)}
                                      className={`flex items-center gap-1 text-sm font-semibold hover:underline ${field.isArchived ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}>
                                      {field.isArchived ? <><RotateCcw size={16}/> Reactiver</> : <><EyeOff size={16}/> Desactiver</>}
                                    </button>
                                    <button onClick={() => deleteFieldPermanently(field.id)}
                                      className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-semibold hover:underline ml-2" title="Suppression Definitive">
                                      <Trash2 size={16}/> Detruire
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
                  <input value={newLocation} onChange={e => setNewLocation(e.target.value.toUpperCase())} placeholder="Code (ex: OUEST)" className="border p-2 rounded w-full uppercase" />
                  <button onClick={addLocation} className="bg-green-600 text-white px-3 rounded hover:bg-green-700"><Plus size={18}/></button>
                </div>
                <div className="border rounded max-h-48 overflow-y-auto">
                  {config.locations.map(loc => (
                    <div key={loc} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-50">
                      {editingListType === 'location' && editingListKey === loc ? (
                        <div className="flex gap-2 w-full">
                          <input value={editingListValue} onChange={e => setEditingListValue(e.target.value.toUpperCase())} className="border p-1 rounded w-full text-sm uppercase" />
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

              {/* Etats */}
              <div className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><List size={18}/> Etats</h3>
                <div className="flex gap-2 mb-3">
                  <input value={newState} onChange={e => setNewState(e.target.value)} placeholder="Ex: En reparation" className="border p-2 rounded w-full" />
                  <button onClick={addState} className="bg-green-600 text-white px-3 rounded hover:bg-green-700"><Plus size={18}/></button>
                </div>
                <div className="border rounded max-h-48 overflow-y-auto">
                  {config.states.map(s => (
                    <div key={s} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-50">
                      {editingListType === 'state' && editingListKey === s ? (
                        <div className="flex gap-2 w-full">
                          <input value={editingListValue} onChange={e => setEditingListValue(e.target.value)} className="border p-1 rounded w-full text-sm" />
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

              {/* Presences */}
              <div className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><List size={18}/> Presence Detenteur</h3>
                <div className="flex gap-2 mb-3">
                  <input value={newHolderPresence} onChange={e => setNewHolderPresence(e.target.value)} placeholder="Ex: En mission" className="border p-2 rounded w-full" />
                  <button onClick={addHolderPresence} className="bg-green-600 text-white px-3 rounded hover:bg-green-700"><Plus size={18}/></button>
                </div>
                <div className="border rounded max-h-48 overflow-y-auto">
                  {config.holderPresences.map(p => (
                    <div key={p} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-50">
                      {editingListType === 'presence' && editingListKey === p ? (
                        <div className="flex gap-2 w-full">
                          <input value={editingListValue} onChange={e => setEditingListValue(e.target.value)} className="border p-1 rounded w-full text-sm" />
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

              {/* Categories */}
              <div className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><List size={18}/> Categories & Items</h3>
                <div className="flex gap-2 mb-4 bg-gray-50 p-2 rounded flex-wrap">
                  <input value={newCatCode} onChange={e => setNewCatCode(e.target.value.toUpperCase())} placeholder="Code (ex: ZZ)" className="border p-1 rounded w-20 uppercase text-sm" />
                  <input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description" className="border p-1 rounded w-full sm:w-auto flex-1 text-sm" />
                  <button onClick={addCategory} className="bg-edc-blue text-white px-3 rounded text-sm hover:bg-blue-800">Ajouter</button>
                </div>
                <div className="mb-2">
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full border p-2 rounded mt-1 bg-gray-50 font-semibold text-sm">
                    {Object.keys(config.categories).map(k => (
                      <option key={k} value={k}>{k} - {config.categoriesDescriptions[k]}</option>
                    ))}
                  </select>
                </div>
                {selectedCategory && (
                  <div className="flex flex-col">
                    <div className="flex gap-2 mb-2">
                      <input value={newCatItem} onChange={e => setNewCatItem(e.target.value)} placeholder={`Nouvel item pour ${selectedCategory}...`} className="border p-2 rounded w-full" />
                      <button onClick={addItemToCategory} className="bg-green-600 text-white px-3 rounded"><Plus size={18}/></button>
                    </div>
                    <div className="border rounded overflow-y-auto max-h-64">
                      {config.categories[selectedCategory]?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-50 text-sm">
                          {editingListType === 'catItem' && editingListKey === `${selectedCategory}|---|${item}` ? (
                            <div className="flex gap-2 w-full">
                              <input value={editingListValue} onChange={e => setEditingListValue(e.target.value)} className="border p-1 rounded w-full text-sm" />
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

      {/* ================= USERS (delegated) ================= */}
      {activeTab === 'users' && (
        <UsersTab users={users} onAddUser={onAddUser} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} />
      )}

      {/* ================= LOGS (delegated) ================= */}
      {activeTab === 'logs' && (
        <LogsTab logs={logs} />
      )}

      {/* ================= TRASH (delegated) ================= */}
      {activeTab === 'trash' && (
        <TrashTab archivedAssets={archivedAssets} onRestoreAsset={onRestoreAsset} onPermanentDeleteAsset={onPermanentDeleteAsset} onEmptyTrash={onEmptyTrash} />
      )}

      {/* Generic Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant || 'warning'}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminPanel;
