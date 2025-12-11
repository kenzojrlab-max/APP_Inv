import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Asset } from '../types';
import { BarChart3 } from 'lucide-react';

interface DashboardProps {
  assets: Asset[];
}

// RÈGLES DE COULEURS STRICTES (Palette demandée)
const STATE_COLORS: Record<string, string> = {
  'Bon état': '#2563EB',       // Bleu
  'Défectueux': '#10B981',     // Vert
  'Déprécié': '#F59E0B',       // Orange
  'En maintenance': '#8B5CF6', // Violet
  'Retiré': '#EF4444'          // Rouge
};

// Couleurs génériques pour les autres catégories (Localisation, etc.)
const GENERIC_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
  '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57',
  '#404040', '#A0A0A0'
];

const STATE_ORDER = ['Bon état', 'Défectueux', 'En maintenance', 'Déprécié', 'Retiré'];
const DEFAULT_COLOR = '#9CA3AF';

// Options disponibles pour le graphique dynamique
const AXIS_OPTIONS = [
  { value: 'location', label: 'Localisation' },
  { value: 'category', label: 'Catégorie' },
  { value: 'acquisitionYear', label: "Année d'acquisition" },
  { value: 'state', label: 'État' },
  { value: 'holderPresence', label: 'Présence Détenteur' },
];

const Dashboard: React.FC<DashboardProps> = ({ assets }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  // --- STATES POUR LE GRAPHIQUE DYNAMIQUE ---
  const [customXAxis, setCustomXAxis] = useState<string>('location');
  const [customGroupBy, setCustomGroupBy] = useState<string>('state');

  useEffect(() => {
    setIsMounted(true);
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  
  const pieRadius = {
    inner: 60,
    outer: 80
  };
  
  const activeAssets = useMemo(() => assets.filter(a => !a.isArchived), [assets]);
  
  // KPI Calculs
  const kpis = useMemo(() => {
      const totalAssets = activeAssets.length;
      const goodCondition = activeAssets.filter(a => a.state === 'Bon état').length;
      const badCondition = activeAssets.filter(a => ['Défectueux', 'Déprécié', 'Retiré'].includes(a.state)).length;

      const totalValue = activeAssets.reduce((sum, asset) => {
        if (asset.amount !== undefined && asset.amount !== null) {
             return sum + Number(asset.amount);
        }
        let val = 0;
        if (asset.customAttributes) {
             const amountKey = Object.keys(asset.customAttributes).find(k => 
                /prix|valeur|montant|cout|cost|price|value/i.test(k)
             );
             if (amountKey) {
                 const raw = String(asset.customAttributes[amountKey]);
                 const clean = raw.replace(/[^0-9.,-]/g, '').replace(',', '.');
                 val = parseFloat(clean);
             }
        }
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      return { totalAssets, goodCondition, badCondition, totalValue };
  }, [activeAssets]);

  // --- DONNÉES STATIQUES (HAUT DE PAGE) ---
  const dataByState = useMemo(() => {
    const byState = activeAssets.reduce((acc, curr) => {
      acc[curr.state] = (acc[curr.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(byState)
      .map(k => ({ name: k, value: byState[k] }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [activeAssets]);

  const dataByYear = useMemo(() => {
    const byYear = activeAssets.reduce((acc, curr) => {
      acc[curr.acquisitionYear] = (acc[curr.acquisitionYear] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(byYear).sort().map(k => ({ name: k, count: byYear[k] }));
  }, [activeAssets]);

  // --- DONNÉES DYNAMIQUES (GRAPHIQUE PERSONNALISÉ) ---
  const customChartData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const groupKeys = new Set<string>();

    activeAssets.forEach(asset => {
        const xValue = (asset as any)[customXAxis] || 'Non défini';
        const groupValue = (asset as any)[customGroupBy] || 'Non défini';

        if (!map[xValue]) map[xValue] = {};
        map[xValue][groupValue] = (map[xValue][groupValue] || 0) + 1;
        groupKeys.add(groupValue);
    });

    const data = Object.keys(map).sort().map(xKey => {
        const item: any = { name: xKey };
        groupKeys.forEach(gKey => {
            item[gKey] = map[xKey][gKey] || 0;
        });
        return item;
    });

    let sortedKeys = Array.from(groupKeys);
    if (customGroupBy === 'state') {
        sortedKeys = STATE_ORDER.filter(s => groupKeys.has(s));
        const others = Array.from(groupKeys).filter(k => !STATE_ORDER.includes(k));
        sortedKeys = [...sortedKeys, ...others];
    } else {
        sortedKeys.sort();
    }

    return { data, keys: sortedKeys };
  }, [activeAssets, customXAxis, customGroupBy]);

  if (!isMounted) return <div className="w-full h-screen flex items-center justify-center text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-6 animate-fade-in p-3 md:p-6 bg-transparent min-h-screen">
      <h2 className="text-xl md:text-2xl font-bold text-edc-blue border-b pb-2 border-edc-orange">Tableau de Bord</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-edc-blue min-w-0">
          <p className="text-gray-500 text-sm uppercase">Total Immobilisations</p>
          <p className="text-3xl font-bold text-gray-800">{kpis.totalAssets}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500 min-w-0 break-words">
          <p className="text-gray-500 text-sm uppercase">Valeur Patrimoine</p>
          <p className="text-xl md:text-2xl lg:text-2xl font-bold text-yellow-600 leading-tight whitespace-normal">
             {new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(kpis.totalValue)} 
             <span className="text-sm text-gray-500 ml-1">FCFA</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500 min-w-0">
          <p className="text-gray-500 text-sm uppercase">Bon État</p>
          <p className="text-3xl font-bold text-green-600">{kpis.goodCondition}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500 min-w-0">
          <p className="text-gray-500 text-sm uppercase">Mauvais État</p>
          <p className="text-3xl font-bold text-red-600">{kpis.badCondition}</p>
        </div>
      </div>

      {/* --- GRAPHIQUES STATIQUES --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DONUT - MODIFIÉ AVEC LÉGENDE À DROITE */}
        <div className="bg-white p-4 rounded-lg shadow-md min-w-0 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-center text-gray-800">Vue Globale par État</h3>
          
          <div className="flex flex-col sm:flex-row items-center h-full min-h-[300px]">
            {/* Zone Graphique */}
            <div className="flex-1 w-full h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie 
                    data={dataByState} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false} // Désactivation des lignes
                    label={false}     // Désactivation des textes sur le chart
                    innerRadius={pieRadius.inner} 
                    outerRadius={pieRadius.outer} 
                    paddingAngle={2} 
                    dataKey="value"
                  >
                    {dataByState.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATE_COLORS[entry.name] || DEFAULT_COLOR} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} actifs`, 'Quantité']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Zone Légende Latérale */}
            <div className="w-full sm:w-48 flex flex-col justify-center gap-3 p-4 sm:border-l border-gray-100">
               {dataByState.map((entry) => (
                 <div key={entry.name} className="flex items-center gap-3">
                    <span 
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm" 
                      style={{ backgroundColor: STATE_COLORS[entry.name] || DEFAULT_COLOR }}
                    ></span>
                    <div className="flex flex-col">
                       <span className="text-sm font-semibold text-gray-700">{entry.name}</span>
                       <span className="text-xs text-gray-500 font-medium">
                         {((entry.value / kpis.totalAssets) * 100).toFixed(1)}% <span className="text-gray-400">({entry.value})</span>
                       </span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* LINE CHART ACQUISITION */}
        <div className="bg-white p-4 rounded-lg shadow-md min-w-0">
          <h3 className="text-lg font-semibold mb-4 text-center text-gray-800">Évolution des acquisitions</h3>
          <div className="w-full relative overflow-hidden" style={{ height: '300px', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataByYear} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#6B7280'}} axisLine={{stroke: '#D1D5DB'}} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7280'}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="count" name="Acquisitions" stroke="#FF6600" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6, strokeWidth: 0}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SECTION DYNAMIQUE --- */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mt-8">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
            <h3 className="text-lg font-bold text-edc-blue flex items-center gap-2">
               <BarChart3 className="text-edc-orange" /> Analyseur Dynamique
            </h3>
            
            <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-200 w-full md:w-auto">
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Axe X :</span>
                  <select 
                    value={customXAxis} 
                    onChange={(e) => setCustomXAxis(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-edc-blue outline-none"
                  >
                     {AXIS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} disabled={opt.value === customGroupBy}>{opt.label}</option>
                     ))}
                  </select>
               </div>

               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Grouper par :</span>
                  <select 
                    value={customGroupBy} 
                    onChange={(e) => setCustomGroupBy(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-edc-blue outline-none"
                  >
                     {AXIS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} disabled={opt.value === customXAxis}>{opt.label}</option>
                     ))}
                  </select>
               </div>
            </div>
         </div>

         <div className="w-full relative overflow-hidden" style={{ height: '400px', minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={customChartData.data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{fontSize: 11, fill: '#6B7280'}} />
                  <YAxis tick={{fontSize: 11, fill: '#6B7280'}} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '15px'}}/>
                  
                  {customChartData.keys.map((key, index) => {
                      const color = customGroupBy === 'state' && STATE_COLORS[key] 
                          ? STATE_COLORS[key] 
                          : GENERIC_COLORS[index % GENERIC_COLORS.length];

                      return (
                          <Bar 
                            key={key} 
                            dataKey={key} 
                            stackId="a" 
                            fill={color} 
                            maxBarSize={60} 
                            animationDuration={1000}
                          />
                      );
                  })}
               </BarChart>
            </ResponsiveContainer>
         </div>
         <p className="text-center text-xs text-gray-400 mt-2 italic">
            Visualisation de la répartition par <strong>{AXIS_OPTIONS.find(o => o.value === customXAxis)?.label}</strong> segmentée par <strong>{AXIS_OPTIONS.find(o => o.value === customGroupBy)?.label}</strong>.
         </p>
      </div>

    </div>
  );
};

export default Dashboard;