import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Asset, AppConfig, User } from '../types';
import { Search, Plus, Edit, Trash2, X, Save, FileSpreadsheet, Eye, AlertTriangle, Upload, Download, ChevronLeft, ChevronRight, Filter, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AssetManagerProps {
  assets: Asset[];
  config: AppConfig;
  user: User;
  onSave: (asset: Asset, isNew: boolean, reason?: string) => void;
  onImport?: (assets: Partial<Asset>[]) => void;
  onDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 50;

const AssetManager: React.FC<AssetManagerProps> = ({ assets, config, user, onSave, onImport, onDelete }) => {
  // --- STATES DE RECHERCHE & FILTRES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterState, setFilterState] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);

  // --- NOUVEAU STATE : MODE LECTURE SEULE ---
  const [isViewMode, setIsViewMode] = useState(false);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetToDeleteId, setAssetToDeleteId] = useState<string | null>(null);
  const [modificationReason, setModificationReason] = useState('');
  const [pendingAssetData, setPendingAssetData] = useState<Asset | null>(null);
  const [previewCode, setPreviewCode] = useState<string>('');

  const initialFormState: Partial<Asset> = {
    registrationDate: new Date().toISOString().split('T')[0],
    acquisitionYear: new Date().getFullYear().toString(),
    location: '',
    category: '',
    name: '',
    state: config.states[0] || 'Bon état',
    holderPresence: config.holderPresences[0] || 'Présent',
    description: '',
    door: '',
    holder: '',
    observation: '',
    photoUrl: '',
    customAttributes: {} 
  };

  const [formData, setFormData] = useState<Partial<Asset>>(initialFormState);

  // --- LOGIQUE DE FILTRAGE AVANCÉE ---
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // 1. Filtre Global (Recherche texte)
      const matchesSearch = !searchTerm || (
        a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.holder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.location.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // 2. Filtres Spécifiques (Menu déroulants)
      const matchesLocation = !filterLocation || a.location === filterLocation;
      const matchesCategory = !filterCategory || a.category === filterCategory;
      const matchesState = !filterState || a.state === filterState;

      // 3. Exclure les archivés + Combinaison ET
      return !a.isArchived && matchesSearch && matchesLocation && matchesCategory && matchesState;
    });
  }, [assets, searchTerm, filterLocation, filterCategory, filterState]);

  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAssets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAssets, currentPage]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterLocation, filterCategory, filterState]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterLocation('');
    setFilterCategory('');
    setFilterState('');
  };

  const getFieldConfig = (key: string, defaultLabel: string) => {
    const field = config.coreFields?.find(f => f.key === key);
    return {
      label: field?.label || defaultLabel,
      isVisible: field ? field.isVisible : true
    };
  };

  const fields = {
     door: getFieldConfig('door', 'Porte'),
     holder: getFieldConfig('holder', 'Détenteur'),
     desc: getFieldConfig('description', 'Description'),
     obs: getFieldConfig('observation', 'Observation'),
     photo: getFieldConfig('photoUrl', 'Photo'),
     regDate: getFieldConfig('registrationDate', 'Date d\'enregistrement'),
  };

  useEffect(() => {
    if (!editingAsset && isModalOpen) {
      let code = "";
      if (formData.acquisitionYear) code += formData.acquisitionYear;
      if (formData.location) code += (code ? "-" : "") + formData.location;
      if (formData.category) code += (code ? "-" : "") + formData.category;

      if (formData.acquisitionYear && formData.location && formData.category) {
        const prefix = `${formData.acquisitionYear}-${formData.location}-${formData.category}`;
        const existingCodes = assets
          .filter(a => a.code.startsWith(prefix))
          .map(a => {
             const parts = a.code.split('-');
             return parts.length === 4 ? parseInt(parts[3], 10) : 0;
          });
        
        const maxSeq = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
        const nextSeq = String(maxSeq + 1).padStart(4, '0');
        code += `-${nextSeq}`;
      }
      setPreviewCode(code);
    }
  }, [formData.acquisitionYear, formData.location, formData.category, assets, isModalOpen, editingAsset]);

  const openCreateModal = () => {
    setEditingAsset(null);
    setFormData(initialFormState);
    setPreviewCode('');
    setIsViewMode(false); // Mode création = édition
    setIsModalOpen(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({ ...asset, customAttributes: asset.customAttributes || {} });
    setPreviewCode(asset.code);
    setIsViewMode(false); // Mode édition explicite
    setIsModalOpen(true);
  };

  // --- NOUVELLE FONCTION POUR LA CONSULTATION ---
  const openViewModal = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({ ...asset, customAttributes: asset.customAttributes || {} });
    setPreviewCode(asset.code);
    setIsViewMode(true); // Mode lecture seule activé
    setIsModalOpen(true);
  };

  const openDeleteModal = (id: string) => {
    setAssetToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (assetToDeleteId) {
      onDelete(assetToDeleteId);
      setIsDeleteModalOpen(false);
      setAssetToDeleteId(null);
    }
  };

  const handleInputChange = (field: keyof Asset, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'category') {
        newData.name = ''; 
      }
      return newData;
    });
  };

  const handleCustomAttributeChange = (key: string, value: any) => {
     setFormData(prev => ({
       ...prev,
       customAttributes: {
           ...(prev.customAttributes || {}),
           [key]: value
       }
     }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleInputChange('photoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return; // Sécurité supplémentaire

    if (!formData.location || !formData.category || !formData.name) {
      alert("Veuillez remplir les champs obligatoires (Localisation, Catégorie, Nom)");
      return;
    }

    const assetToSave = { ...formData };
    
    if (!editingAsset) {
      if (!formData.acquisitionYear || !formData.location || !formData.category) {
        alert("Impossible de générer le code complet. Vérifiez l'année, la localisation et la catégorie.");
        return;
      }
      assetToSave.code = previewCode;
    }

    if (editingAsset) {
      const criticalFields: (keyof Asset)[] = ['location', 'acquisitionYear', 'name', 'category', 'door', 'state', 'holderPresence'];
      const hasCriticalChange = criticalFields.some(field => formData[field] !== editingAsset[field]);

      if (hasCriticalChange) {
        setPendingAssetData(assetToSave as Asset);
        setShowReasonModal(true);
        return;
      }
    }

    finalizeSave(assetToSave as Asset, !editingAsset);
  };

  const finalizeSave = (data: Asset, isNew: boolean, reason?: string) => {
    onSave(data, isNew, reason);
    setIsModalOpen(false);
    setShowReasonModal(false);
    setModificationReason('');
    setPendingAssetData(null);
  };

  const exportToExcel = () => {
    const dataToExport = filteredAssets.map(asset => {
      const row: any = {
        "Code Inventaire": asset.code,
        "Nom": asset.name,
        "Catégorie": `${asset.category} - ${config.categoriesDescriptions[asset.category] || ''}`,
        "Localisation": asset.location,
        "Année Acquisition": asset.acquisitionYear,
        [fields.regDate.label]: asset.registrationDate,
        "État": asset.state,
        [fields.holder.label]: asset.holder,
        "Présence Détenteur": asset.holderPresence,
        [fields.door.label]: asset.door,
        [fields.desc.label]: asset.description,
        [fields.obs.label]: asset.observation,
      };

      if (config.customFields) {
        config.customFields.forEach(field => {
          if (!field.isArchived) {
             row[field.label] = asset.customAttributes?.[field.id] || '';
          }
        });
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const wscols = Object.keys(dataToExport[0] || {}).map(k => ({ wch: k.length + 10 }));
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaire EDC");
    XLSX.writeFile(workbook, `Inventaire_EDC_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const downloadImportTemplate = () => {
      const templateRow: any = {
          "Code Inventaire": "2024-EDC-AA-0001",
          "Nom": "Agrafeuse géante",
          "Catégorie": "AA - Matériel de bureau",
          "Localisation": "EDC",
          "Année Acquisition": "2024",
          [fields.regDate.label]: "2024-01-01",
          "État": "Bon état",
          [fields.holder.label]: "Jean Dupont",
          "Présence Détenteur": "Présent",
          [fields.door.label]: "101",
          [fields.desc.label]: "Description...",
          [fields.obs.label]: "Observation...",
      };

      if (config.customFields) {
          config.customFields.forEach(field => {
              if (!field.isArchived) {
                  templateRow[field.label] = field.type === 'date' ? '2024-01-01' : '';
              }
          });
      }

      const worksheet = XLSX.utils.json_to_sheet([templateRow]);
      const wscols = Object.keys(templateRow).map(k => ({ wch: k.length + 5 }));
      worksheet['!cols'] = wscols;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Modèle Import");
      XLSX.writeFile(workbook, `Modele_Import_EDC.xlsx`);
  };

  const triggerImport = () => {
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const arrayBuffer = evt.target?.result;
            const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            
            if (!data || data.length === 0) {
                alert("Le fichier semble vide ou illisible.");
                return;
            }

            processImportedData(data);
        } catch (error) {
            console.error("Erreur lecture Excel:", error);
            alert("Erreur critique lors de la lecture du fichier Excel.");
        }
    };
    reader.readAsArrayBuffer(file);
  };

  const processImportedData = (data: any[]) => {
      const formatDate = (val: any) => {
         if (val instanceof Date) {
            return val.toISOString().split('T')[0];
         }
         if (typeof val === 'string' && val.trim() !== '') {
            return val;
         }
         return new Date().toISOString().split('T')[0];
      };

      const firstRow = data[0];
      const requiredColumns = ["Code Inventaire", "Nom", "Catégorie", "Localisation"];
      const missingColumns = requiredColumns.filter(col => firstRow[col] === undefined);

      if (missingColumns.length > 0) {
          alert(`ERREUR FORMAT : Le fichier ne correspond pas au modèle attendu.\n\nColonnes manquantes : ${missingColumns.join(', ')}\n\nVeuillez utiliser le bouton "Télécharger un Modèle".`);
          return;
      }

      let validationErrors: string[] = [];
      let duplicateInExcelCount = 0;
      let existingInDbCount = 0;
      const seenCodes = new Set<string>();
      
      const parsedAssets: Partial<Asset>[] = [];

      data.forEach((row: any, index: number) => {
          const code = row["Code Inventaire"] ? String(row["Code Inventaire"]).trim() : "";
          if (!code) return; // Ignore lignes vides

          // 1. Vérification Doublon Interne (Excel)
          if (seenCodes.has(code)) {
              duplicateInExcelCount++;
              return; // Ignore ce doublon
          }
          seenCodes.add(code);

          // 2. Vérification Doublon Externe (Base de données)
          const existsInDb = assets.some(a => a.code === code);
          if (existsInDb) {
              existingInDbCount++;
              return; 
          }

          let rawCategory = row["Catégorie"] ? String(row["Catégorie"]).trim() : "";
          let catCode = "";
          
          if (rawCategory.includes("-")) {
              catCode = rawCategory.split("-")[0].trim();
          } else if (rawCategory.includes(" ")) {
              catCode = rawCategory.split(" ")[0].trim();
          } else {
              catCode = rawCategory;
          }
          catCode = catCode.toUpperCase();

          if (!config.categories[catCode]) {
              validationErrors.push(`Ligne ${index + 2}: La catégorie '${catCode}' n'existe pas.`);
          }

          const asset: Partial<Asset> = {
              code: code,
              name: row["Nom"] || '',
              category: catCode,
              location: row["Localisation"] || '',
              acquisitionYear: row["Année Acquisition"] ? String(row["Année Acquisition"]) : '',
              state: row["État"] || config.states[0],
              holderPresence: row["Présence Détenteur"] || config.holderPresences[0],
              registrationDate: formatDate(row[fields.regDate.label]),
              holder: row[fields.holder.label] || '',
              door: row[fields.door.label] || '',
              description: row[fields.desc.label] || '',
              observation: row[fields.obs.label] || '',
              customAttributes: {}
          };

          if (config.customFields) {
              config.customFields.forEach(field => {
                  if (row[field.label] !== undefined) {
                      asset.customAttributes![field.id] = String(row[field.label]);
                  }
              });
          }
          
          parsedAssets.push(asset);
      });

      if (validationErrors.length > 0) {
          alert(`IMPORTATION ANNULÉE : Erreurs détectées.\n\n${validationErrors.slice(0, 10).join('\n')}`);
          return;
      }

      if (parsedAssets.length === 0) {
          let message = "Aucun NOUVEL actif trouvé.";
          if (existingInDbCount > 0) message += `\n- ${existingInDbCount} actifs existaient déjà.`;
          if (duplicateInExcelCount > 0) message += `\n- ${duplicateInExcelCount} doublons dans le fichier Excel.`;
          alert(message);
          return;
      }

      if (onImport) {
          onImport(parsedAssets);
          alert(`Importation réussie !\n\n- ${parsedAssets.length} actifs ajoutés.\n- ${existingInDbCount} ignorés (déjà existants).\n- ${duplicateInExcelCount} doublons internes ignorés.`);
      }
  };

  const years = Array.from({length: 2070 - 2007 + 1}, (_, i) => (2007 + i).toString());

  return (
    <div className="p-3 md:p-6 bg-transparent min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-edc-blue">Gestion des Immobilisations</h2>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {user.permissions.isAdmin && (
              <>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileImport} 
                    hidden 
                    accept=".xlsx, .xls"
                  />
                  <button onClick={downloadImportTemplate} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 shadow-sm transition-colors text-xs md:text-sm">
                      <Download size={16} /> <span><span className="hidden sm:inline">Modèle</span> Excel</span>
                  </button>
                  <button onClick={triggerImport} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm transition-colors text-xs md:text-sm">
                      <Upload size={16} /> <span>Import<span className="hidden sm:inline">er</span></span>
                  </button>
              </>
          )}

          {user.permissions.canExport && (
            <button onClick={exportToExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm transition-colors text-xs md:text-sm">
              <FileSpreadsheet size={16} /> <span>Export<span className="hidden sm:inline">er</span></span>
            </button>
          )}
          {user.permissions.canCreate && (
            <button onClick={openCreateModal} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-edc-orange text-white rounded hover:bg-orange-700 shadow-sm transition-colors text-xs md:text-sm">
              <Plus size={16} /> Nouveau
            </button>
          )}
        </div>
      </div>

      {/* --- BARRE DE FILTRES MULTI-CRITÈRES --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-4 border border-edc-border">
        <div className="flex items-center gap-2 mb-3 text-edc-blue font-bold text-sm uppercase tracking-wide">
           <Filter size={16} /> Filtres Avancés
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
           {/* Recherche Texte Globale */}
           <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Recherche globale..." 
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-1 focus:ring-edc-blue outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>

           {/* Filtre Localisation */}
           <select 
              value={filterLocation} 
              onChange={(e) => setFilterLocation(e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-edc-blue outline-none ${filterLocation ? 'bg-blue-50 border-blue-300 font-medium' : 'bg-white'}`}
           >
              <option value="">Toutes Localisations</option>
              {config.locations.map(l => <option key={l} value={l}>{l}</option>)}
           </select>

           {/* Filtre Catégorie */}
           <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-edc-blue outline-none ${filterCategory ? 'bg-blue-50 border-blue-300 font-medium' : 'bg-white'}`}
           >
              <option value="">Toutes Catégories</option>
              {Object.keys(config.categories).sort().map(c => (
                 <option key={c} value={c}>{c} - {config.categoriesDescriptions[c]}</option>
              ))}
           </select>

           {/* Filtre État */}
           <div className="flex gap-2">
             <select 
                value={filterState} 
                onChange={(e) => setFilterState(e.target.value)}
                className={`flex-1 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-edc-blue outline-none ${filterState ? 'bg-blue-50 border-blue-300 font-medium' : 'bg-white'}`}
             >
                <option value="">Tous États</option>
                {config.states.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
             
             {/* Bouton Reset */}
             {(searchTerm || filterLocation || filterCategory || filterState) && (
               <button 
                 onClick={resetFilters}
                 className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                 title="Réinitialiser les filtres"
               >
                 <RotateCcw size={18} />
               </button>
             )}
           </div>
        </div>
      </div>

      {/* --- TABLE WITH PAGINATION --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-edc-border">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loc</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">État</th>
                {fields.holder.isVisible && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{fields.holder.label}</th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {paginatedAssets.length === 0 && (
                    <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                            {filteredAssets.length === 0 ? "Aucune immobilisation trouvée." : "Page vide."}
                        </td>
                    </tr>
                )}
                {paginatedAssets.map(asset => (
                <tr 
                    key={asset.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onDoubleClick={() => openViewModal(asset)} // DOUBLE-CLIC : LECTURE SEULE
                    title="Double-cliquer pour voir les détails"
                >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-edc-blue">{asset.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">{asset.category}</span>
                    <span className="text-gray-400 text-xs ml-2 hidden lg:inline-block">
                        - {config.categoriesDescriptions[asset.category]}
                    </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${asset.state === 'Bon état' ? 'bg-green-100 text-green-800' : 
                        asset.state === 'Défectueux' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {asset.state}
                    </span>
                    </td>
                    {fields.holder.isVisible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.holder}</td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.permissions.canUpdate && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); openEditModal(asset); }} 
                            className="text-indigo-600 hover:text-indigo-900 mr-3" 
                            title="Modifier"
                        >
                        <Edit size={18} />
                        </button>
                    )}
                    {!user.permissions.canUpdate && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); openEditModal(asset); }} 
                            className="text-gray-600 hover:text-gray-900 mr-3" 
                            title="Voir détails"
                        >
                        <Eye size={18} />
                        </button>
                    )}
                    {user.permissions.canDelete && (
                        <button 
                        onClick={(e) => { e.stopPropagation(); openDeleteModal(asset.id); }} 
                        className="text-red-600 hover:text-red-900"
                        title="Archiver"
                        >
                        <Trash2 size={18} />
                        </button>
                    )}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        
        {/* Pagination Controls */}
        {filteredAssets.length > ITEMS_PER_PAGE && (
            <div className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 gap-4">
                <div className="flex-1 flex justify-between items-center w-full sm:w-auto">
                    <div>
                        <p className="text-sm text-gray-700 text-center sm:text-left">
                            <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAssets.length)}</span> / <span className="font-medium">{filteredAssets.length}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                           <ChevronLeft size={16} /> <span className="hidden sm:inline ml-1">Précédent</span>
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={`relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                           <span className="hidden sm:inline mr-1">Suivant</span> <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Main Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-[95%] sm:w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 md:p-6 border-b shrink-0">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">
                {editingAsset 
                  ? (isViewMode ? 'Détails Actif' : (user.permissions.canUpdate ? 'Modifier Actif' : 'Détails Actif')) 
                  : 'Nouvel Actif'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 p-1">
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 md:p-6">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className={`md:col-span-2 p-3 rounded border ${editingAsset ? 'bg-gray-100 border-gray-300' : 'bg-blue-50 border-blue-200'}`}>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Code Inventaire</p>
                    <p className={`text-2xl font-bold tracking-wider ${editingAsset ? 'text-gray-600' : 'text-edc-blue'}`}>
                        {editingAsset ? editingAsset.code : (previewCode || "...")}
                    </p>
                </div>

                {/* Basic Info */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Année d'acquisition *</label>
                    <select 
                        disabled={isViewMode || (!user.permissions.canCreate && !editingAsset)}
                        value={formData.acquisitionYear} 
                        onChange={(e) => handleInputChange('acquisitionYear', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Localisation *</label>
                    <select 
                        disabled={isViewMode || (!user.permissions.canCreate && !editingAsset)}
                        value={formData.location} 
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    >
                        <option value="">Sélectionner...</option>
                        {config.locations.map((l, idx) => <option key={`${l}-${idx}`} value={l}>{l}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Catégorie *</label>
                    <select 
                        disabled={isViewMode || (!user.permissions.canCreate && !editingAsset)}
                        value={formData.category} 
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    >
                        <option value="">Sélectionner...</option>
                        {Object.keys(config.categories).sort().map(k => (
                        <option key={k} value={k}>{k} - {config.categoriesDescriptions[k]}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Nom *</label>
                    <select 
                        disabled={isViewMode || (!user.permissions.canCreate && !editingAsset)}
                        value={formData.name} 
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    >
                        <option value="">Sélectionner...</option>
                        {formData.category && config.categories[formData.category]?.map((n, idx) => (
                        <option key={`${n}-${idx}`} value={n}>{n}</option>
                        ))}
                    </select>
                </div>

                {/* Details */}
                {fields.desc.isVisible && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">{fields.desc.label}</label>
                        <textarea 
                            readOnly={isViewMode || (!user.permissions.canUpdate && !!editingAsset)}
                            value={formData.description} 
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 read-only:bg-gray-100 read-only:text-gray-500"
                            rows={2}
                        />
                    </div>
                )}

                {fields.obs.isVisible && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">{fields.obs.label}</label>
                        <textarea 
                            readOnly={isViewMode || (!user.permissions.canUpdate && !!editingAsset)}
                            value={formData.observation} 
                            onChange={(e) => handleInputChange('observation', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 read-only:bg-gray-100 read-only:text-gray-500"
                            rows={2}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">État</label>
                    <select 
                        disabled={isViewMode || (!user.permissions.canUpdate && !!editingAsset)}
                        value={formData.state} 
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    >
                        {config.states.map((s, idx) => <option key={`${s}-${idx}`} value={s}>{s}</option>)}
                    </select>
                </div>

                {fields.door.isVisible && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{fields.door.label}</label>
                        <input 
                            readOnly={isViewMode || (!user.permissions.canUpdate && !!editingAsset)}
                            type="text" 
                            value={formData.door} 
                            onChange={(e) => handleInputChange('door', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 read-only:bg-gray-100 read-only:text-gray-500"
                        />
                    </div>
                )}

                {fields.holder.isVisible && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{fields.holder.label}</label>
                        <input 
                            readOnly={isViewMode || (!user.permissions.canUpdate && !!editingAsset)}
                            type="text" 
                            value={formData.holder} 
                            onChange={(e) => handleInputChange('holder', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 read-only:bg-gray-100 read-only:text-gray-500"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Présence Détenteur</label>
                    <select 
                        disabled={isViewMode || (!user.permissions.canUpdate && !!editingAsset)}
                        value={formData.holderPresence} 
                        onChange={(e) => handleInputChange('holderPresence', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    >
                        {config.holderPresences.map((s, idx) => <option key={`${s}-${idx}`} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* --- DYNAMIC CUSTOM FIELDS RENDERING --- */}
                {config.customFields && config.customFields.filter(f => !f.isArchived).map(field => (
                    <div key={field.id} className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 text-edc-blue">{field.label}</label>
                        {field.type === 'select' ? (
                            <select
                            disabled={isViewMode || (!user.permissions.canUpdate && !!editingAsset)}
                            value={formData.customAttributes?.[field.id] || ''}
                            onChange={(e) => handleCustomAttributeChange(field.id, e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                            >
                            <option value="">Sélectionner...</option>
                            {field.options?.map((opt, idx) => (
                                <option key={`${opt}-${idx}`} value={opt}>{opt}</option>
                            ))}
                            </select>
                        ) : field.type === 'boolean' ? (
                            <select
                            disabled={isViewMode || (!user.permissions.canUpdate && !!editingAsset)}
                            value={formData.customAttributes?.[field.id] || ''}
                            onChange={(e) => handleCustomAttributeChange(field.id, e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                            >
                            <option value="">-</option>
                            <option value="Oui">Oui</option>
                            <option value="Non">Non</option>
                            </select>
                        ) : (
                            <input
                            type={field.type}
                            readOnly={isViewMode || (!user.permissions.canUpdate && !!editingAsset)}
                            value={formData.customAttributes?.[field.id] || ''}
                            onChange={(e) => handleCustomAttributeChange(field.id, e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 read-only:bg-gray-100 read-only:text-gray-500"
                            />
                        )}
                    </div>
                ))}

                {fields.photo.isVisible && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">{fields.photo.label}</label>
                        <input 
                            disabled={isViewMode || (!user.permissions.canUpdate && !!editingAsset)}
                            type="file" 
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed"
                        />
                        {formData.photoUrl && (
                            <img src={formData.photoUrl} alt="Preview" className="mt-2 h-32 object-contain border rounded" />
                        )}
                    </div>
                )}
                </form>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">
                    {isViewMode ? "Fermer" : "Annuler"}
                </button>
                {/* Affiche le bouton Enregistrer seulement si ce n'est PAS le mode lecture ET (soit création, soit modification autorisée) */}
                {!isViewMode && ((!editingAsset && user.permissions.canCreate) || (editingAsset && user.permissions.canUpdate)) && (
                <button onClick={handleSubmit} type="button" className="px-4 py-2 bg-edc-blue text-white rounded hover:bg-blue-800 flex items-center gap-2">
                    <Save size={18} /> Enregistrer
                </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
             <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
               <AlertTriangle className="h-6 w-6 text-red-600" />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Êtes-vous sûr ?</h3>
             <p className="text-sm text-gray-500 mb-6">
               Voulez-vous vraiment archiver cet actif ? Cette action retirera l'actif de la liste principale.
             </p>
             <div className="flex justify-center gap-3">
               <button 
                 onClick={() => setIsDeleteModalOpen(false)} 
                 className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
               >
                 Annuler
               </button>
               <button 
                 onClick={confirmDelete} 
                 className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium shadow-sm"
               >
                 Confirmer
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Reason Modal */}
      {showReasonModal && (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-red-600 mb-2">Modification Critique Détectée</h3>
              <p className="text-sm text-gray-600 mb-4">
                Vous avez modifié des champs sensibles (Localisation, Année, Nom, Catégorie, etc.). 
                Veuillez justifier cette modification pour le journal d'audit.
              </p>
              <textarea 
                className="w-full border p-2 rounded mb-4" 
                placeholder="Motif de la modification..."
                value={modificationReason}
                onChange={(e) => setModificationReason(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowReasonModal(false)} className="px-3 py-1 text-gray-500">Annuler</button>
                <button 
                  disabled={!modificationReason.trim()}
                  onClick={() => finalizeSave(pendingAssetData!, false, modificationReason)} 
                  className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
                >
                  Confirmer
                </button>
              </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AssetManager;