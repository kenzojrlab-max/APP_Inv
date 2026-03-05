import React, { useRef, useEffect, useState } from 'react';
import { Asset, AppConfig, User } from '../../types';
import { Edit, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface AssetTableProps {
  paginatedAssets: Asset[];
  filteredAssetsCount: number;
  config: AppConfig;
  user: User;
  fields: Record<string, { label: string; isVisible: boolean }>;
  // Selection
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleSelection: (id: string) => void;
  // Pagination
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  // Actions
  onView: (asset: Asset) => void;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
}

const AssetTable: React.FC<AssetTableProps> = ({
  paginatedAssets, filteredAssetsCount, config, user, fields,
  selectedIds, isAllSelected, isIndeterminate, onSelectAll, onToggleSelection,
  currentPage, totalPages, itemsPerPage, onPageChange,
  onView, onEdit, onDelete,
}) => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  useEffect(() => {
    if (tableContainerRef.current) {
      setTableScrollWidth(tableContainerRef.current.scrollWidth);
    }
  }, [paginatedAssets]);

  const handleSyncScroll = (source: React.RefObject<HTMLDivElement>, target: React.RefObject<HTMLDivElement>) => {
    if (source.current && target.current) {
      target.current.scrollLeft = source.current.scrollLeft;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-edc-border flex flex-col relative">
      {/* Top scroll bar */}
      <div ref={topScrollRef} className="overflow-x-auto border-b border-gray-100 no-scrollbar-vertical"
        onScroll={() => handleSyncScroll(topScrollRef, tableContainerRef)}>
        <div style={{ width: tableScrollWidth }} className="h-1 pt-1"></div>
      </div>

      {/* Table */}
      <div ref={tableContainerRef} className="overflow-auto max-h-[70vh]"
        onScroll={() => handleSyncScroll(tableContainerRef, topScrollRef)}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-left w-10 sticky top-0 bg-gray-100 z-20">
                <input type="checkbox" className="rounded border-gray-300 text-edc-blue focus:ring-edc-blue cursor-pointer h-4 w-4"
                  checked={isAllSelected}
                  ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                  onChange={onSelectAll} />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-100 z-20">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-100 z-20">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-100 z-20">Categorie</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-100 z-20">Loc</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-100 z-20">Unite</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-100 z-20">Montant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-100 z-20">Etat</th>
              {fields.holder?.isVisible && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-100 z-20">{fields.holder.label}</th>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-100 z-20">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedAssets.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-8 text-gray-500">
                  {filteredAssetsCount === 0 ? "Aucune immobilisation trouvee." : "Page vide."}
                </td>
              </tr>
            )}
            {paginatedAssets.map(asset => {
              const isSelected = selectedIds.has(asset.id);
              return (
                <tr key={asset.id}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                  onClick={() => onToggleSelection(asset.id)}
                  onDoubleClick={e => { e.stopPropagation(); onView(asset); }}
                  title="Clic pour selectionner, Double-clic pour voir">
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-gray-300 text-edc-blue focus:ring-edc-blue cursor-pointer h-4 w-4"
                      checked={isSelected} onChange={() => onToggleSelection(asset.id)} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-edc-blue">{asset.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">{asset.category}</span>
                    <span className="text-gray-400 text-xs ml-2 hidden lg:inline-block">- {config.categoriesDescriptions[asset.category]}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.unit || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {asset.amount ? new Intl.NumberFormat('fr-FR').format(asset.amount) : '-'} <span className="text-xs text-gray-400">FCFA</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      asset.state === 'Bon etat' || asset.state === 'Bon état' ? 'bg-green-100 text-green-800' :
                      asset.state === 'Defectueux' || asset.state === 'Défectueux' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {asset.state}
                    </span>
                  </td>
                  {fields.holder?.isVisible && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.holder}</td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={e => e.stopPropagation()}>
                    {user.permissions.canUpdate && (
                      <button onClick={() => onEdit(asset)} className="text-indigo-600 hover:text-indigo-900 mr-3" title="Modifier">
                        <Edit size={18} />
                      </button>
                    )}
                    {!user.permissions.canUpdate && (
                      <button onClick={() => onView(asset)} className="text-gray-600 hover:text-gray-900 mr-3" title="Voir details">
                        <Eye size={18} />
                      </button>
                    )}
                    {user.permissions.canDelete && (
                      <button onClick={() => onDelete(asset.id)} className="text-red-600 hover:text-red-900" title="Archiver">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredAssetsCount > itemsPerPage && (
        <div className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 gap-4 mt-auto">
          <div className="flex-1 flex justify-between items-center w-full sm:w-auto">
            <p className="text-sm text-gray-700 text-center sm:text-left">
              <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAssetsCount)}</span> /{' '}
              <span className="font-medium">{filteredAssetsCount}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                className={`relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                <ChevronLeft size={16} /> <span className="hidden sm:inline ml-1">Precedent</span>
              </button>
              <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                <span className="hidden sm:inline mr-1">Suivant</span> <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AssetTable);
