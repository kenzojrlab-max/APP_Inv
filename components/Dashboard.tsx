import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Asset } from '../types';
import { Settings2, BarChart3 } from 'lucide-react';

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
  const isTiny = windowWidth < 400; 
  
  const pieRadius = {
    inner: isMobile ? 40 : 60,
    outer: isMobile ? 60 : 80
  };
  
  const activeAssets = useMemo(() => assets.filter(a => !a.isArchived), [assets]);
  
  // KPI Calculs
  const kpis = useMemo(() => {
      const totalAssets = activeAssets.length;
      const goodCondition = activeAssets.filter(a => a.state === 'Bon état').length;
      const badCondition = activeAssets.filter(a => ['Défectueux', 'Déprécié', 'Retiré'].includes(a.state)).length;
      const uniqueLocations = new Set(activeAssets.map(a => a.location)).size;

      // CORRECTION ICI : Prise en compte du champ 'amount' natif
      const totalValue = activeAssets.reduce((sum, asset) => {
        // 1. Priorité au champ natif 'amount'
        if (asset.amount !== undefined && asset.amount !== null) {
             return sum + Number(asset.amount);
        }

        // 2. Fallback sur les anciens champs personnalisés (Rétrocompatibilité)
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

      return { totalAssets, goodCondition, badCondition, uniqueLocations, totalValue };
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

  const dataByLocation = useMemo(() => {
    const byLocation = activeAssets.reduce((acc, curr) => {
      acc[curr.location] = (acc[curr.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(byLocation).map(k => ({ name: k, count: byLocation[k] }));
  }, [activeAssets]);

  const dataByYear = useMemo(() => {
    const byYear = activeAssets.reduce((acc, curr) => {
      acc[curr.acquisitionYear] = (acc[curr.acquisitionYear] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(byYear).sort().map(k => ({ name: k, count: byYear[k] }));
  }, [activeAssets]);

  const dataByCategory = useMemo(() => {
    const byCategory = activeAssets.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(byCategory).map(k => ({ name: k, count: byCategory[k] }));
  }, [activeAssets]);


  // --- DONNÉES DYNAMIQUES (GRAPHIQUE PERSONNALISÉ) ---
  const customChartData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const groupKeys = new Set<string>();

    activeAssets.forEach(asset => {
        // Récupération dynamique des valeurs avec typage "any" pour simplifier l'accès dynamique
        const xValue = (asset as any)[customXAxis] || 'Non défini';
        const groupValue = (asset as any)[customGroupBy] || 'Non défini';

        if (!map[xValue]) map[xValue] = {};
        
        map[xValue][groupValue] = (map[xValue][groupValue] || 0) + 1;
        groupKeys.add(groupValue);
    });

    // Transformation en tableau pour Recharts
    const data = Object.keys(map).sort().map(xKey => {
        const item: any = { name: xKey };
        // On remplit toutes les clés de groupe pour que les barres s'empilent correctement
        groupKeys.forEach(gKey => {
            item[gKey] = map[xKey][gKey] || 0;
        });
        return item;
    });

    // Tri des clés de groupe pour un ordre cohérent (ex: ordre des états)
    let sortedKeys = Array.from(groupKeys);
    if (customGroupBy === 'state') {
        sortedKeys = STATE_ORDER.filter(s => groupKeys.has(s));
        // Ajouter les états non standards s'il y en a
        const others = Array.from(groupKeys).filter(k => !STATE_ORDER.includes(k));
        sortedKeys = [...sortedKeys, ...others];
    } else {
        sortedKeys.sort();
    }

    return { data, keys: sortedKeys };
  }, [activeAssets, customXAxis, customGroupBy]);


  const renderCustomLabel = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, outerRadius, fill, payload, percent } = props;
    const isSmallSlice = percent < 0.10;
    const radiusOffset = isMobile ? (isSmallSlice ? 30 : 15) : (isSmallSlice ? 50 : 30);
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius) * cos;
    const sy = cy + (outerRadius) * sin;
    const mx = cx + (outerRadius + radiusOffset) * cos;
    const my = cy + (outerRadius + radiusOffset) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * (isMobile ? 10 : 20);
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    
    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} textAnchor={textAnchor} fill="#374151" fontSize={isMobile ? 10 : 12} fontWeight="600" dy={4}>
          {`${payload.name} (${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };

  if (!isMounted) return <div className="w-full h-screen flex items-center justify-center text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-6 animate-fade-in p-3 md:p-6 bg-transparent min-h-screen">
      <h2 className="text-xl md:text-2xl font-bold text-edc-blue border-b pb-2 border-edc-orange">Tableau de Bord</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-edc-blue min-w-0">
          <p className="text-gray-500 text-sm uppercase">Total Immobilisations</p>
          <p className="text-3xl font-bold text-gray-800">{kpis.totalAssets}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500 min-w-0">
          <p className="text-gray-500 text-sm uppercase">Valeur Patrimoine</p>
          <p className="text-2xl lg:text-3xl font-bold text-yellow-600 truncate" title={`${kpis.totalValue.toLocaleString('fr-FR')} FCFA`}>
             {new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(kpis.totalValue)} <span className="text-sm">FCFA</span>
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
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-edc-orange min-w-0">
          <p className="text-gray-500 text-sm uppercase">Sites Actifs</p>
          <p className="text-3xl font-bold text-orange-600">{kpis.uniqueLocations}</p>
        </div>
      </div>

      {/* --- GRAPHIQUES STATIQUES --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DONUT */}
        <div className="bg-white p-4 rounded-lg shadow-md min-w-0 flex flex-col">
          <h3 className="text-lg font-semibold mb-2 text-center text-gray-800">Vue Globale par État</h3>
          <div className="w-full relative overflow-hidden" style={{ height: '288px', minHeight: '288px' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <PieChart margin={{ top: 20, right: isMobile ? 10 : 40, bottom: 20, left: isMobile ? 10 : 40 }}>
                <Pie data={dataByState} cx="50%" cy="50%" labelLine={false} label={isTiny ? false : renderCustomLabel} innerRadius={pieRadius.inner} outerRadius={pieRadius.outer} paddingAngle={2} dataKey="value" isAnimationActive={true}>
                  {dataByState.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATE_COLORS[entry.name] || DEFAULT_COLOR} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4 px-4 border-t pt-4">
            {STATE_ORDER.map(state => {
              const isPresent = dataByState.some(d => d.name === state);
              return (
                <div key={state} className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded transition-colors ${isPresent ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                  <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: STATE_COLORS[state] || DEFAULT_COLOR }}></span>
                  <span className="text-gray-700">{state}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* LINE CHART ACQUISITION */}
        <div className="bg-white p-4 rounded-lg shadow-md min-w-0">
          <h3 className="text-lg font-semibold mb-4 text-center text-gray-800">Évolution des acquisitions</h3>
          <div className="w-full relative overflow-hidden" style={{ height: '288px', minHeight: '320px' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <LineChart data={dataByYear}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#6B7280'}} axisLine={{stroke: '#D1D5DB'}} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7280'}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="count" name="Acquisitions" stroke="#FF6600" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6, strokeWidth: 0}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SECTION DYNAMIQUE : GÉNÉRATEUR DE GRAPHIQUE --- */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mt-8">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
            <h3 className="text-lg font-bold text-edc-blue flex items-center gap-2">
               <BarChart3 className="text-edc-orange" /> Analyseur Dynamique
            </h3>
            
            {/* CONTRÔLES */}
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

         {/* GRAPHIQUE GÉNÉRÉ */}
         <div className="w-full relative overflow-hidden" style={{ height: '400px', minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
               <BarChart data={customChartData.data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{fontSize: 11, fill: '#6B7280'}} />
                  <YAxis tick={{fontSize: 11, fill: '#6B7280'}} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '15px'}}/>
                  
                  {/* GÉNÉRATION DES BARRES */}
                  {customChartData.keys.map((key, index) => {
                      // Choix de la couleur : Si c'est un état connu -> Couleur d'état, Sinon -> Palette générique
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