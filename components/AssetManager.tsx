import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Asset, AppConfig, User } from '../types';
import { Search, Plus, Trash2, FileSpreadsheet, Upload, Download, Filter, RotateCcw, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import AssetTable from './assets/AssetTable';
import AssetFormModal from './assets/AssetFormModal';
import ConfirmDialog from './shared/ConfirmDialog';
import { useToast } from '../hooks/useToast';

interface AssetManagerProps {
  assets: Asset[];
  config: AppConfig;
  user: User;
  onSave: (asset: Asset, isNew: boolean, reason?: string) => void;
  onImport?: (assets: Partial<Asset>[]) => void;
  onDelete: (id: string) => void;
  isImporting?: boolean;
}

const ITEMS_PER_PAGE = 50;

const AssetManager: React.FC<AssetManagerProps> = ({ assets, config, user, onSave, onImport, onDelete, isImporting = false }) => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterState, setFilterState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetToDeleteId, setAssetToDeleteId] = useState<string | null>(null);
  const [modificationReason, setModificationReason] = useState('');
  const [pendingAssetData, setPendingAssetData] = useState<Asset | null>(null);
  const [previewCode, setPreviewCode] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const initialFormState: Partial<Asset> = {
    registrationDate: new Date().toISOString().split('T')[0],
    acquisitionYear: new Date().getFullYear().toString(),
    location: '', category: '', name: '',
    state: config.states[0] || 'Bon etat',
    holderPresence: config.holderPresences[0] || 'Present',
    description: '', door: '', holder: '', observation: '', photoUrl: '',
    unit: '', amount: 0, customAttributes: {}
  };
  const [formData, setFormData] = useState<Partial<Asset>>(initialFormState);

  // --- FILTERING ---
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const s = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        a.code.toLowerCase().includes(s) || a.name.toLowerCase().includes(s) ||
        a.holder.toLowerCase().includes(s) || a.location.toLowerCase().includes(s) ||
        (a.unit && a.unit.toLowerCase().includes(s)) ||
        (a.door && a.door.toLowerCase().includes(s))
      );
      return !a.isArchived && matchesSearch &&
        (!filterLocation || a.location === filterLocation) &&
        (!filterCategory || a.category === filterCategory) &&
        (!filterState || a.state === filterState);
    });
  }, [assets, searchTerm, filterLocation, filterCategory, filterState]);

  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAssets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssets, currentPage]);

  useEffect(() => { setCurrentPage(1); setSelectedIds(new Set()); },
    [searchTerm, filterLocation, filterCategory, filterState]);

  // --- FIELD CONFIG ---
  const getFieldConfig = (key: string, defaultLabel: string) => {
    const field = config.coreFields?.find(f => f.key === key);
    return { label: field?.label || defaultLabel, isVisible: field ? field.isVisible : true };
  };
  const fields = {
    door: getFieldConfig('door', 'Porte'),
    holder: getFieldConfig('holder', 'Detenteur'),
    desc: getFieldConfig('description', 'Description'),
    obs: getFieldConfig('observation', 'Observation'),
    photo: getFieldConfig('photoUrl', 'Photo'),
    regDate: getFieldConfig('registrationDate', "Date d'enregistrement"),
  };

  // --- SELECTION ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? new Set(filteredAssets.map(a => a.id)) : new Set());
  };
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };
  const isAllSelected = filteredAssets.length > 0 && selectedIds.size === filteredAssets.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < filteredAssets.length;

  // --- DELETE ---
  const openDeleteModal = (id: string) => { setAssetToDeleteId(id); setIsDeleteModalOpen(true); };
  const openBulkDeleteModal = () => { if (selectedIds.size > 0) { setAssetToDeleteId(null); setIsDeleteModalOpen(true); } };
  const confirmDelete = () => {
    if (assetToDeleteId) { onDelete(assetToDeleteId); setAssetToDeleteId(null); }
    else { selectedIds.forEach(id => onDelete(id)); setSelectedIds(new Set()); }
    setIsDeleteModalOpen(false);
  };

  // --- CODE GENERATION ---
  useEffect(() => {
    if (!editingAsset && isModalOpen) {
      let code = '';
      if (formData.acquisitionYear) code += formData.acquisitionYear;
      if (formData.location) code += (code ? '-' : '') + formData.location;
      if (formData.category) code += (code ? '-' : '') + formData.category;
      if (formData.acquisitionYear && formData.location && formData.category) {
        const prefix = `${formData.acquisitionYear}-${formData.location}-${formData.category}`;
        const nums = assets.filter(a => a.code.startsWith(prefix))
          .map(a => { const p = a.code.split('-'); return p.length === 4 ? parseInt(p[3], 10) : 0; });
        code += `-${String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
      }
      setPreviewCode(code);
    }
  }, [formData.acquisitionYear, formData.location, formData.category, assets, isModalOpen, editingAsset]);

  // --- MODAL ---
  const openCreateModal = () => { setEditingAsset(null); setFormData(initialFormState); setPreviewCode(''); setIsViewMode(false); setIsModalOpen(true); };
  const openEditModal = (asset: Asset) => { setEditingAsset(asset); setFormData({ ...asset, customAttributes: asset.customAttributes || {} }); setPreviewCode(asset.code); setIsViewMode(false); setIsModalOpen(true); };
  const openViewModal = (asset: Asset) => { setEditingAsset(asset); setFormData({ ...asset, customAttributes: asset.customAttributes || {} }); setPreviewCode(asset.code); setIsViewMode(true); setIsModalOpen(true); };

  const handleInputChange = (field: keyof Asset, value: string | number | boolean) => {
    setFormData(prev => {
      const d = { ...prev, [field]: value };
      if (field === 'category') d.name = '';
      return d;
    });
  };
  const handleCustomAttributeChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, customAttributes: { ...(prev.customAttributes || {}), [key]: value } }));
  };
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const r = new FileReader(); r.onloadend = () => handleInputChange('photoUrl', r.result as string); r.readAsDataURL(file); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!formData.location || !formData.category || !formData.name) {
      toast.warning('Veuillez remplir les champs obligatoires (Localisation, Categorie, Nom)');
      return;
    }
    const toSave = { ...formData };
    if (!editingAsset) {
      if (!formData.acquisitionYear || !formData.location || !formData.category) {
        toast.warning('Impossible de generer le code complet.');
        return;
      }
      toSave.code = previewCode;
    }
    if (editingAsset) {
      const critical: (keyof Asset)[] = ['location', 'acquisitionYear', 'name', 'category', 'door', 'state', 'holderPresence', 'amount', 'unit'];
      if (critical.some(f => formData[f] !== editingAsset[f])) { setPendingAssetData(toSave as Asset); setShowReasonModal(true); return; }
    }
    finalizeSave(toSave as Asset, !editingAsset);
  };
  const finalizeSave = (data: Asset, isNew: boolean, reason?: string) => {
    onSave(data, isNew, reason);
    setIsModalOpen(false); setShowReasonModal(false); setModificationReason(''); setPendingAssetData(null);
  };

  // --- EXCEL EXPORT ---
  const exportToExcel = () => {
    const rows = filteredAssets.map(a => {
      const row: Record<string, string | number> = {
        'Code Inventaire': a.code, 'Nom': a.name,
        'Categorie': `${a.category} - ${config.categoriesDescriptions[a.category] || ''}`,
        'Localisation': a.location, 'Annee Acquisition': a.acquisitionYear,
        'Unite': a.unit || '', 'Montant': a.amount || 0,
        [fields.regDate.label]: a.registrationDate, 'Etat': a.state,
        [fields.holder.label]: a.holder, 'Presence Detenteur': a.holderPresence,
        [fields.door.label]: a.door, [fields.desc.label]: a.description,
        [fields.obs.label]: a.observation,
      };
      config.customFields?.forEach(f => { if (!f.isArchived) row[f.label] = String(a.customAttributes?.[f.id] ?? ''); });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(k => ({ wch: k.length + 10 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaire EDC');
    XLSX.writeFile(wb, `Inventaire_EDC_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadImportTemplate = () => {
    const t: Record<string, string> = {
      'Code Inventaire': '2024-EDC-AA-0001', 'Nom': 'Agrafeuse geante',
      'Categorie': 'AA - Materiel de bureau', 'Localisation': 'EDC',
      'Annee Acquisition': '2024', 'Unite': 'Pce', 'Montant': '15000',
      [fields.regDate.label]: '2024-01-01', 'Etat': 'Bon etat',
      [fields.holder.label]: 'Jean Dupont', 'Presence Detenteur': 'Present',
      [fields.door.label]: '101', [fields.desc.label]: 'Description...',
      [fields.obs.label]: 'Observation...',
    };
    config.customFields?.forEach(f => { if (!f.isArchived) t[f.label] = f.type === 'date' ? '2024-01-01' : ''; });
    const ws = XLSX.utils.json_to_sheet([t]);
    ws['!cols'] = Object.keys(t).map(k => ({ wch: k.length + 5 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modele Import');
    XLSX.writeFile(wb, 'Modele_Import_EDC.xlsx');
  };

  // --- EXCEL IMPORT ---
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isImporting) return; // Prevent double import
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) { toast.warning('Format invalide. Utilisez .xlsx ou .xls'); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'array', cellDates: true });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as Record<string, unknown>[];
        if (!data?.length) { toast.warning('Le fichier semble vide.'); return; }
        processImportedData(data);
      } catch { toast.error('Erreur lors de la lecture du fichier Excel.'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const processImportedData = (data: Record<string, unknown>[]) => {
    const fmtDate = (v: unknown) => v instanceof Date ? v.toISOString().split('T')[0] : (typeof v === 'string' && v.trim() ? v : new Date().toISOString().split('T')[0]);
    const missing = ['Code Inventaire', 'Nom', 'Categorie', 'Localisation'].filter(c => data[0][c] === undefined);
    if (missing.length) { toast.error(`Colonnes manquantes: ${missing.join(', ')}`); return; }
    const errors: string[] = [], seen = new Set<string>(), parsed: Partial<Asset>[] = [];
    let dupes = 0, existing = 0;
    data.forEach((row, i) => {
      const code = row['Code Inventaire'] ? String(row['Code Inventaire']).trim() : '';
      if (!code) return;
      if (seen.has(code)) { dupes++; return; }
      seen.add(code);
      if (assets.some(a => a.code === code)) { existing++; return; }
      const rawCat = row['Categorie'] ? String(row['Categorie']).trim() : '';
      const cc = (rawCat.includes('-') ? rawCat.split('-')[0] : rawCat.includes(' ') ? rawCat.split(' ')[0] : rawCat).trim().toUpperCase();
      if (!config.categories[cc]) errors.push(`Ligne ${i + 2}: Categorie '${cc}' inexistante.`);
      const a: Partial<Asset> = {
        code, name: String(row['Nom'] || ''), category: cc, location: String(row['Localisation'] || ''),
        acquisitionYear: row['Annee Acquisition'] ? String(row['Annee Acquisition']) : '',
        state: String(row['Etat'] || config.states[0]), holderPresence: String(row['Presence Detenteur'] || config.holderPresences[0]),
        registrationDate: fmtDate(row[fields.regDate.label]), holder: String(row[fields.holder.label] || ''),
        door: String(row[fields.door.label] || ''), description: String(row[fields.desc.label] || ''),
        observation: String(row[fields.obs.label] || ''), unit: String(row['Unite'] || ''),
        amount: row['Montant'] ? parseFloat(String(row['Montant']).replace(/[^0-9.-]+/g, '')) : 0,
        customAttributes: {}
      };
      config.customFields?.forEach(f => { if (row[f.label] !== undefined) a.customAttributes![f.id] = String(row[f.label]); });
      parsed.push(a);
    });
    if (errors.length) { toast.error(`Erreurs d'import: ${errors.slice(0, 5).join('; ')}`); return; }
    if (!parsed.length) {
      let m = 'Aucun nouvel actif a importer.';
      if (existing) m += ` ${existing} deja existants.`;
      if (dupes) m += ` ${dupes} doublons.`;
      toast.info(m);
      return;
    }
    onImport?.(parsed);
  };

  const years = Array.from({ length: 2070 - 2007 + 1 }, (_, i) => (2007 + i).toString());

  return (
    <div className="p-3 md:p-6 bg-transparent min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-edc-blue">Gestion des Immobilisations</h2>
          {selectedIds.size > 0 && user.permissions.canDelete && (
            <button onClick={openBulkDeleteModal} aria-label={`Supprimer ${selectedIds.size} actifs selectionnes`}
              className="animate-fade-in flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-300 shadow-sm text-sm font-semibold">
              <Trash2 size={16} aria-hidden="true" /> Supprimer ({selectedIds.size})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {user.permissions.isAdmin && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileImport} hidden accept=".xlsx,.xls" aria-label="Importer un fichier Excel" />
              <button onClick={downloadImportTemplate} aria-label="Telecharger le modele Excel"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 shadow-sm text-xs md:text-sm">
                <Download size={16} aria-hidden="true" /> <span><span className="hidden sm:inline">Modele</span> Excel</span>
              </button>
              <button onClick={() => { if (!isImporting && fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } }}
                disabled={isImporting} aria-label="Importer depuis un fichier Excel"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {isImporting
                  ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Import en cours...</>
                  : <><Upload size={16} aria-hidden="true" /> <span>Import<span className="hidden sm:inline">er</span></span></>
                }
              </button>
            </>
          )}
          {user.permissions.canExport && (
            <button onClick={exportToExcel} aria-label="Exporter en Excel"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm text-xs md:text-sm">
              <FileSpreadsheet size={16} aria-hidden="true" /> <span>Export<span className="hidden sm:inline">er</span></span>
            </button>
          )}
          {user.permissions.canCreate && (
            <button onClick={openCreateModal} aria-label="Creer un nouvel actif"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-edc-orange text-white rounded hover:bg-orange-700 shadow-sm text-xs md:text-sm">
              <Plus size={16} aria-hidden="true" /> Nouveau
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-4 border border-edc-border">
        <div className="flex items-center gap-2 mb-3 text-edc-blue font-bold text-sm uppercase tracking-wide">
          <Filter size={16} aria-hidden="true" /> Filtres
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} aria-hidden="true" />
            <input type="text" placeholder="Code, Nom, Porte, Unite..." aria-label="Rechercher des actifs"
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-1 focus:ring-edc-blue outline-none text-sm"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} aria-label="Filtrer par localisation"
            className={`w-full border rounded-md px-3 py-2 text-sm outline-none ${filterLocation ? 'bg-blue-50 border-blue-300 font-medium' : 'bg-white'}`}>
            <option value="">Toutes Localisations</option>
            {config.locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} aria-label="Filtrer par categorie"
            className={`w-full border rounded-md px-3 py-2 text-sm outline-none ${filterCategory ? 'bg-blue-50 border-blue-300 font-medium' : 'bg-white'}`}>
            <option value="">Toutes Categories</option>
            {Object.keys(config.categories).sort().map(c => <option key={c} value={c}>{c} - {config.categoriesDescriptions[c]}</option>)}
          </select>
          <div className="flex gap-2">
            <select value={filterState} onChange={e => setFilterState(e.target.value)} aria-label="Filtrer par etat"
              className={`flex-1 border rounded-md px-3 py-2 text-sm outline-none ${filterState ? 'bg-blue-50 border-blue-300 font-medium' : 'bg-white'}`}>
              <option value="">Tous Etats</option>
              {config.states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(searchTerm || filterLocation || filterCategory || filterState) && (
              <button onClick={() => { setSearchTerm(''); setFilterLocation(''); setFilterCategory(''); setFilterState(''); }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md" aria-label="Reinitialiser les filtres">
                <RotateCcw size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <AssetTable
        paginatedAssets={paginatedAssets} filteredAssetsCount={filteredAssets.length}
        config={config} user={user} fields={fields}
        selectedIds={selectedIds} isAllSelected={isAllSelected} isIndeterminate={isIndeterminate}
        onSelectAll={handleSelectAll} onToggleSelection={toggleSelection}
        currentPage={currentPage} totalPages={totalPages} itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage} onView={openViewModal} onEdit={openEditModal} onDelete={openDeleteModal}
      />

      {/* Form Modal */}
      <AssetFormModal
        isOpen={isModalOpen} isViewMode={isViewMode} editingAsset={editingAsset}
        formData={formData} previewCode={previewCode} config={config} user={user}
        years={years} fields={fields}
        onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit}
        onInputChange={handleInputChange} onCustomAttributeChange={handleCustomAttributeChange}
        onPhotoUpload={handlePhotoUpload}
      />

      {/* Delete Confirm */}
      <ConfirmDialog isOpen={isDeleteModalOpen} title="Etes-vous sur ?"
        message={assetToDeleteId
          ? "Voulez-vous vraiment archiver cet actif ?"
          : `Archiver ${selectedIds.size} actifs selectionnes ?`}
        onConfirm={confirmDelete} onCancel={() => setIsDeleteModalOpen(false)} />

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" role="dialog" aria-label="Justification de modification">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-red-600 mb-2">Modification Critique</h3>
            <p className="text-sm text-gray-600 mb-4">Justifiez cette modification pour le journal d'audit.</p>
            <label htmlFor="modification-reason" className="sr-only">Motif de la modification</label>
            <textarea id="modification-reason" className="w-full border p-2 rounded mb-4" placeholder="Motif..." value={modificationReason}
              onChange={e => setModificationReason(e.target.value)} rows={3} />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowReasonModal(false)} className="px-3 py-1 text-gray-500">Annuler</button>
              <button disabled={!modificationReason.trim()} onClick={() => finalizeSave(pendingAssetData!, false, modificationReason)}
                className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManager;
