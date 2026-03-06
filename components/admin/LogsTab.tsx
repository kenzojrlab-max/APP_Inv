import React, { useState, useMemo } from 'react';
import { Log } from '../../types';
import { Search, Calendar, RotateCcw } from 'lucide-react';

interface LogsTabProps {
  logs: Log[];
}

const LogsTab: React.FC<LogsTabProps> = ({ logs }) => {
  const [logSearchUser, setLogSearchUser] = useState('');
  const [logSearchDate, setLogSearchDate] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const s = logSearchUser.toLowerCase();
      const matchesUser = log.userEmail.toLowerCase().includes(s) ||
        log.description.toLowerCase().includes(s);
      let matchesDate = true;
      if (logSearchDate) {
        const d = new Date(log.timestamp);
        const logDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        matchesDate = logDateStr === logSearchDate;
      }
      return matchesUser && matchesDate;
    });
  }, [logs, logSearchUser, logSearchDate]);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input type="text" placeholder="Rechercher un utilisateur ou une action..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-1 focus:ring-edc-blue outline-none text-sm"
            value={logSearchUser} onChange={e => setLogSearchUser(e.target.value)} />
        </div>
        <div className="w-full md:w-auto relative">
          <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input type="date" className="w-full md:w-48 pl-10 pr-4 py-2 border rounded-md focus:ring-1 focus:ring-edc-blue outline-none text-sm"
            value={logSearchDate} onChange={e => setLogSearchDate(e.target.value)} />
        </div>
        {(logSearchUser || logSearchDate) && (
          <button onClick={() => { setLogSearchUser(''); setLogSearchDate(''); }}
            className="p-2 text-red-500 hover:bg-red-50 rounded-md" title="Reset">
            <RotateCcw size={18} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Utilisateur</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">Cible</th>
              <th className="p-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Aucun historique trouve.</td></tr>
            ) : (
              filteredLogs.slice().reverse().map((log, index) => (
                <tr key={log.id || index} className="border-t hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap text-gray-600 font-mono text-xs">
                    {new Date(log.timestamp).toLocaleDateString()} <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </td>
                  <td className="p-3 font-medium text-gray-800">{log.userEmail}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      log.action === 'UPDATE' ? 'bg-orange-100 text-orange-800' :
                      log.action === 'DELETE' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-gray-600">{log.targetCode || '-'}</td>
                  <td className="p-3 max-w-xs truncate" title={log.description}>
                    {log.description}
                    {log.changes && (
                      <div className="text-xs text-gray-500 mt-1">
                        {log.changes.map((c, i) => <div key={i}>{c.field}: {String(c.before)} &rarr; {String(c.after)}</div>)}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsTab;
