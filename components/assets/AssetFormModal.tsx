import React from 'react';
import { Asset, AppConfig, User } from '../../types';
import { X, Save } from 'lucide-react';

interface AssetFormModalProps {
  isOpen: boolean;
  isViewMode: boolean;
  editingAsset: Asset | null;
  formData: Partial<Asset>;
  previewCode: string;
  config: AppConfig;
  user: User;
  years: string[];
  fields: Record<string, { label: string; isVisible: boolean }>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (field: keyof Asset, value: any) => void;
  onCustomAttributeChange: (key: string, value: any) => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen, isViewMode, editingAsset, formData, previewCode, config, user, years, fields,
  onClose, onSubmit, onInputChange, onCustomAttributeChange, onPhotoUpload,
}) => {
  if (!isOpen) return null;

  const isDisabledCreate = isViewMode || (!user.permissions.canCreate && !editingAsset);
  const isDisabledUpdate = isViewMode || (!user.permissions.canUpdate && !!editingAsset);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto" role="dialog" aria-label="Formulaire actif" style={{ touchAction: 'pan-y' }}>
      <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full sm:w-[95%] sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 md:p-6 border-b shrink-0">
          <h3 className="text-lg md:text-xl font-bold text-gray-800">
            {editingAsset
              ? (isViewMode ? 'Details Actif' : (user.permissions.canUpdate ? 'Modifier Actif' : 'Details Actif'))
              : 'Nouvel Actif'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1" aria-label="Fermer le formulaire">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 md:p-6">
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Code Preview */}
            <div className={`md:col-span-2 p-3 rounded border ${editingAsset ? 'bg-gray-100 border-gray-300' : 'bg-blue-50 border-blue-200'}`}>
              <p className="text-sm font-semibold text-gray-700 mb-1">Code Inventaire</p>
              <p className={`text-2xl font-bold tracking-wider ${editingAsset ? 'text-gray-600' : 'text-edc-blue'}`}>
                {editingAsset ? editingAsset.code : (previewCode || "...")}
              </p>
            </div>

            {/* Year */}
            <div>
              <label htmlFor="field-year" className="block text-sm font-medium text-gray-700">Annee d'acquisition *</label>
              <select id="field-year" disabled={isDisabledCreate} value={formData.acquisitionYear} onChange={e => onInputChange('acquisitionYear', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="field-location" className="block text-sm font-medium text-gray-700">Localisation *</label>
              <select id="field-location" disabled={isDisabledCreate} value={formData.location} onChange={e => onInputChange('location', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                <option value="">Selectionner...</option>
                {config.locations.map((l, idx) => <option key={`${l}-${idx}`} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="field-category" className="block text-sm font-medium text-gray-700">Categorie *</label>
              <select id="field-category" disabled={isDisabledCreate} value={formData.category} onChange={e => onInputChange('category', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                <option value="">Selectionner...</option>
                {Object.keys(config.categories).sort().map(k => (
                  <option key={k} value={k}>{k} - {config.categoriesDescriptions[k]}</option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="field-name" className="block text-sm font-medium text-gray-700">Nom *</label>
              <select id="field-name" disabled={isDisabledCreate} value={formData.name} onChange={e => onInputChange('name', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                <option value="">Selectionner...</option>
                {formData.category && config.categories[formData.category]?.map((n, idx) => (
                  <option key={`${n}-${idx}`} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Unite</label>
              <input type="text" disabled={isDisabledCreate} value={formData.unit} onChange={e => onInputChange('unit', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500" />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Montant (FCFA)</label>
              <input type="number" disabled={isDisabledCreate} value={formData.amount} onChange={e => onInputChange('amount', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500" min="0" />
            </div>

            {/* Description */}
            {fields.desc?.isVisible && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{fields.desc.label}</label>
                <textarea readOnly={isDisabledUpdate} value={formData.description} onChange={e => onInputChange('description', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 read-only:bg-gray-100 read-only:text-gray-500" rows={2} />
              </div>
            )}

            {/* Observation */}
            {fields.obs?.isVisible && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{fields.obs.label}</label>
                <textarea readOnly={isDisabledUpdate} value={formData.observation} onChange={e => onInputChange('observation', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 read-only:bg-gray-100 read-only:text-gray-500" rows={2} />
              </div>
            )}

            {/* State */}
            <div>
              <label htmlFor="field-state" className="block text-sm font-medium text-gray-700">Etat</label>
              <select id="field-state" disabled={isDisabledUpdate} value={formData.state} onChange={e => onInputChange('state', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                {config.states.map((s, idx) => <option key={`${s}-${idx}`} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Door */}
            {fields.door?.isVisible && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{fields.door.label}</label>
                <input readOnly={isDisabledUpdate} type="text" value={formData.door} onChange={e => onInputChange('door', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 read-only:bg-gray-100 read-only:text-gray-500" />
              </div>
            )}

            {/* Holder */}
            {fields.holder?.isVisible && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{fields.holder.label}</label>
                <input readOnly={isDisabledUpdate} type="text" value={formData.holder} onChange={e => onInputChange('holder', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 read-only:bg-gray-100 read-only:text-gray-500" />
              </div>
            )}

            {/* Holder Presence */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Presence Detenteur</label>
              <select disabled={isDisabledUpdate} value={formData.holderPresence} onChange={e => onInputChange('holderPresence', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                {config.holderPresences.map((s, idx) => <option key={`${s}-${idx}`} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Custom Fields */}
            {config.customFields?.filter(f => !f.isArchived).map(field => (
              <div key={field.id} className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 text-edc-blue">{field.label}</label>
                {field.type === 'select' ? (
                  <select disabled={isDisabledUpdate} value={String(formData.customAttributes?.[field.id] ?? '')} onChange={e => onCustomAttributeChange(field.id, e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                    <option value="">Selectionner...</option>
                    {field.options?.map((opt, idx) => <option key={`${opt}-${idx}`} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'boolean' ? (
                  <select disabled={isDisabledUpdate} value={String(formData.customAttributes?.[field.id] ?? '')} onChange={e => onCustomAttributeChange(field.id, e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                    <option value="">-</option>
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                ) : (
                  <input type={field.type} readOnly={isDisabledUpdate} value={String(formData.customAttributes?.[field.id] ?? '')} onChange={e => onCustomAttributeChange(field.id, e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 read-only:bg-gray-100 read-only:text-gray-500" />
                )}
              </div>
            ))}

            {/* Photo */}
            {fields.photo?.isVisible && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{fields.photo.label}</label>
                <input disabled={isDisabledUpdate} type="file" accept="image/*" onChange={onPhotoUpload}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed" />
                {formData.photoUrl && <img src={formData.photoUrl} alt="Preview" className="mt-2 h-32 object-contain border rounded" />}
              </div>
            )}
          </form>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">
            {isViewMode ? "Fermer" : "Annuler"}
          </button>
          {!isViewMode && ((!editingAsset && user.permissions.canCreate) || (editingAsset && user.permissions.canUpdate)) && (
            <button onClick={onSubmit} type="button" className="px-4 py-2 bg-edc-blue text-white rounded hover:bg-blue-800 flex items-center gap-2">
              <Save size={18} /> Enregistrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetFormModal;
