import React, { useState } from 'react';
import { Asset } from '../../types';
import { Trash2, AlertTriangle, Loader2, ArchiveRestore } from 'lucide-react';
import ConfirmDialog from '../shared/ConfirmDialog';

interface TrashTabProps {
  archivedAssets: Asset[];
  onRestoreAsset: (id: string) => void;
  onPermanentDeleteAsset: (id: string) => void;
  onEmptyTrash: () => Promise<void>;
}

const TrashTab: React.FC<TrashTabProps> = ({ archivedAssets, onRestoreAsset, onPermanentDeleteAsset, onEmptyTrash }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  const handleEmptyTrash = async () => {
    setShowEmptyConfirm(false);
    setIsDeleting(true);
    await onEmptyTrash();
    setIsDeleting(false);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="bg-red-50 border border-red-200 rounded p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-500 mt-1" />
          <div>
            <h4 className="font-bold text-red-800">Gestion de la Corbeille</h4>
            <p className="text-sm text-red-700">
              Elements archives. Vous pouvez les <strong>restaurer</strong> ou les <strong>supprimer definitivement</strong>.
            </p>
          </div>
        </div>
        {archivedAssets.length > 0 && (
          <button onClick={() => setShowEmptyConfirm(true)} disabled={isDeleting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-md font-bold text-sm disabled:opacity-50">
            {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
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
              <th className="p-3 text-left">Categorie</th>
              <th className="p-3 text-left">Localisation</th>
              <th className="p-3 text-left">Etat</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {archivedAssets.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">La corbeille est vide.</td></tr>
            ) : (
              archivedAssets.map(asset => (
                <tr key={asset.id} className="border-t hover:bg-red-50/30">
                  <td className="p-3 font-mono font-bold">{asset.code}</td>
                  <td className="p-3">{asset.name}</td>
                  <td className="p-3">{asset.category}</td>
                  <td className="p-3">{asset.location}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-bold">{asset.state}</span></td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => onRestoreAsset(asset.id)}
                        className="flex items-center gap-1 text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded font-medium text-xs border border-green-200">
                        <ArchiveRestore size={16} /> Restaurer
                      </button>
                      <button onClick={() => onPermanentDeleteAsset(asset.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded font-medium text-xs border border-red-200">
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

      <ConfirmDialog
        isOpen={showEmptyConfirm}
        title="Vider la Corbeille"
        message={`Supprimer definitivement ${archivedAssets.length} elements ? Cette action est irreversible.`}
        confirmLabel="Supprimer tout"
        variant="danger"
        onConfirm={handleEmptyTrash}
        onCancel={() => setShowEmptyConfirm(false)}
      />
    </div>
  );
};

export default TrashTab;
