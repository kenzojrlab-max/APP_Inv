import React, { useState } from 'react';
import { User } from '../../types';
import { Plus, Edit2, Trash2, UserCog, Lock } from 'lucide-react';

interface UsersTabProps {
  users: User[];
  onAddUser: (u: User, password: string) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
}

const UsersTab: React.FC<UsersTabProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    firstName: '', lastName: '', email: '',
    permissions: { canViewDashboard: true, canReadList: true, canCreate: false, canUpdate: false, canDelete: false, canExport: false, isAdmin: false }
  });
  const [newUserPassword, setNewUserPassword] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleCreateUser = () => {
    if (!newUser.firstName || !newUser.email || !newUserPassword) return alert('Remplir les champs obligatoires (Prenom, Email, Mot de passe)');
    onAddUser({
      id: Date.now().toString(),
      firstName: newUser.firstName!, lastName: newUser.lastName || '',
      email: newUser.email!, permissions: newUser.permissions!
    }, newUserPassword);
    setNewUserOpen(false);
    setNewUserPassword('');
    setNewUser({ firstName: '', lastName: '', email: '', permissions: { canViewDashboard: true, canReadList: true, canCreate: false, canUpdate: false, canDelete: false, canExport: false, isAdmin: false } });
  };

  const saveUserEdit = () => {
    if (!editingUser) return;
    onUpdateUser(editingUser);
    setEditingUser(null);
  };

  return (
    <div className="animate-fade-in">
      <button onClick={() => setNewUserOpen(!newUserOpen)} className="mb-4 bg-edc-blue text-white px-4 py-2 rounded flex items-center gap-2">
        <Plus size={18} /> Nouvel Utilisateur
      </button>

      {newUserOpen && (
        <div className="bg-white p-4 rounded shadow mb-6 border-l-4 border-edc-blue">
          <h3 className="font-bold mb-2">Creation Utilisateur</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <input placeholder="Prenom" className="border p-2 rounded" value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} />
            <input placeholder="Nom" className="border p-2 rounded" value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} />
            <input placeholder="Email" className="border p-2 rounded" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            <input placeholder="Mot de passe" type="password" className="border p-2 rounded" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
          </div>
          <div className="mb-4">
            <p className="font-semibold mb-2">Permissions:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.keys(newUser.permissions!).map(perm => (
                <label key={perm} className="flex items-center space-x-2">
                  <input type="checkbox" checked={(newUser.permissions as any)[perm]} onChange={e => setNewUser({ ...newUser, permissions: { ...newUser.permissions!, [perm]: e.target.checked } })} />
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
              <th className="p-3 text-left">Role</th>
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
                    <button onClick={() => setEditingUser(u)} className="text-blue-600 hover:text-blue-800" title="Modifier"><Edit2 size={18} /></button>
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><UserCog size={24} /> Modifier Utilisateur</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-medium">Prenom</label><input value={editingUser.firstName} onChange={e => setEditingUser({ ...editingUser, firstName: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-sm font-medium">Nom</label><input value={editingUser.lastName} onChange={e => setEditingUser({ ...editingUser, lastName: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium">Email</label><input value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div className="sm:col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm text-blue-700 flex items-center gap-2"><Lock size={16} /> Le mot de passe est gere par Firebase Auth. Utilisez la console Firebase pour le reinitialiser.</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="font-semibold mb-2 text-sm">Permissions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {Object.keys(editingUser.permissions).map(perm => (
                  <label key={perm} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded">
                    <input type="checkbox" disabled={perm === 'isAdmin' && editingUser.id === 'admin-001'}
                      checked={(editingUser.permissions as any)[perm]}
                      onChange={e => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions, [perm]: e.target.checked } })} />
                    <span>{perm.replace('can', '')}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 border rounded text-gray-600">Annuler</button>
              <button onClick={saveUserEdit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTab;
