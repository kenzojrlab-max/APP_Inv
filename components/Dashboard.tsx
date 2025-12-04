import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Asset } from '../types';

interface DashboardProps {
  assets: Asset[];
}

// RÈGLES DE COULEURS STRICTES (Palette demandée)
const STATE_COLORS: Record<string, string> = {
  'Bon état': '#2563EB',       // Bleu (Blue-600)
  'Défectueux': '#10B981',     // Vert/Turquoise (Emerald-500)
  'Déprécié': '#F59E0B',       // Orange (Amber-500)
  'En maintenance': '#8B5CF6', // Violet (Violet-500)
  'Retiré': '#EF4444'          // Rouge (Red-500)
};

// Ordre d'affichage souhaité dans la légende
const STATE_ORDER = ['Bon état', 'Défectueux', 'En maintenance', 'Déprécié', 'Retiré'];
const DEFAULT_COLOR = '#9CA3AF'; // Gris pour les états inconnus

const Dashboard: React.FC<DashboardProps> = ({ assets }) => {
  // CORRECTION 1 : État pour vérifier si le composant est monté (Client-side only)
  const [isMounted, setIsMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0); // Initialisé à 0 pour éviter le mismatch SSR/CSR

  useEffect(() => {
    // CORRECTION 1 (Suite) : On confirme que le composant est chargé
    setIsMounted(true);
    setWindowWidth(window.innerWidth);

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive breakpoints
  const isMobile = windowWidth < 640;
  const isTiny = windowWidth < 400; 
  
  // Dynamic Chart Config
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
      return { totalAssets, goodCondition, badCondition, uniqueLocations };
  }, [activeAssets]);

  // Data Aggregation
  const dataByState = useMemo(() => {
    const byState = activeAssets.reduce((acc, curr) => {
      acc[curr.state] = (acc[curr.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const chartData = Object.keys(byState)
      .map(k => ({ name: k, value: byState[k] }))
      .filter(item => item.value > 0);
      
    return chartData.sort((a, b) => b.value - a.value);
  }, [activeAssets]);

  const dataByLocation = useMemo(() => {
    const byLocation = activeAssets.reduce((acc, curr) => {
      acc[curr.location] = (acc[curr.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(byLocation).map(k => ({ name: k, count: byLocation[k] }));
  }, [activeAssets]);

  const dataByCategory = useMemo(() => {
    const byCategory = activeAssets.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(byCategory).map(k => ({ name: k, count: byCategory[k] }));
  }, [activeAssets]);

  const dataByYear = useMemo(() => {
    const byYear = activeAssets.reduce((acc, curr) => {
      acc[curr.acquisitionYear] = (acc[curr.acquisitionYear] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(byYear).sort().map(k => ({ name: k, count: byYear[k] }));
  }, [activeAssets]);

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
    
    const lineLength = isMobile ? 10 : 20;
    const ex = mx + (cos >= 0 ? 1 : -1) * lineLength;
    const ey = my;

    const textAnchor = cos >= 0 ? 'start' : 'end';
    const labelText = `${payload.name} (${(percent * 100).toFixed(0)}%)`;

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text 
          x={ex + (cos >= 0 ? 1 : -1) * 8} 
          y={ey} 
          textAnchor={textAnchor} 
          fill="#374151" 
          fontSize={isMobile ? 10 : 12} 
          fontWeight="600"
          dy={4}
        >
          {labelText}
        </text>
      </g>
    );
  };

  // CORRECTION 1 (Fin) : Si pas monté, on affiche un loader simple ou rien du tout.
  // Cela empêche Recharts de calculer des dimensions sur des divs qui n'existent pas encore.
  if (!isMounted) {
    return <div className="w-full h-screen flex items-center justify-center text-gray-400">Chargement...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in p-3 md:p-6 bg-transparent min-h-screen">
      <h2 className="text-xl md:text-2xl font-bold text-edc-blue border-b pb-2 border-edc-orange">Tableau de Bord</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-edc-blue min-w-0">
          <p className="text-gray-500 text-sm uppercase">Total Immobilisations</p>
          <p className="text-3xl font-bold text-gray-800">{kpis.totalAssets}</p>
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DONUT CHART */}
        <div className="bg-white p-4 rounded-lg shadow-md min-w-0 flex flex-col">
          <h3 className="text-lg font-semibold mb-2 text-center text-gray-800">Répartition par État</h3>
          
          {/* CORRECTION 3 : overflow-hidden + relative */}
          <div className="w-full relative overflow-hidden" style={{ height: '288px', minHeight: '288px' }}>
            {/* CORRECTION 2 : debounce={200} */}
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <PieChart margin={{ top: 20, right: isMobile ? 10 : 40, bottom: 20, left: isMobile ? 10 : 40 }}>
                <Pie
                  data={dataByState}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={isTiny ? false : renderCustomLabel} 
                  innerRadius={pieRadius.inner}
                  outerRadius={pieRadius.outer} 
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={true}
                >
                  {dataByState.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATE_COLORS[entry.name] || DEFAULT_COLOR} 
                      stroke="white" 
                      strokeWidth={2} 
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* LÉGENDE */}
          <div className="mt-4 flex flex-wrap justify-center gap-4 px-4 border-t pt-4">
            {STATE_ORDER.map(state => {
              const isPresent = dataByState.some(d => d.name === state);
              return (
                <div 
                  key={state} 
                  className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded transition-colors
                    ${isPresent ? 'opacity-100' : 'opacity-40 grayscale'}`}
                  title={isPresent ? '' : 'Aucun actif dans cet état'}
                >
                  <span 
                    className="w-3 h-3 rounded-full shadow-sm" 
                    style={{ backgroundColor: STATE_COLORS[state] || DEFAULT_COLOR }}
                  ></span>
                  <span className="text-gray-700">{state}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* BAR CHART LOCATION */}
        <div className="bg-white p-4 rounded-lg shadow-md min-w-0">
          <h3 className="text-lg font-semibold mb-4 text-center text-gray-800">Répartition par Localisation</h3>
          {/* CORRECTION 3 & 2 */}
          <div className="w-full relative overflow-hidden" style={{ height: '320px', minHeight: '320px' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <BarChart data={dataByLocation}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  tick={{fontSize: 11, fill: '#6B7280'}} 
                  axisLine={{stroke: '#D1D5DB'}}
                  tickLine={false}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11, fill: '#6B7280'}}
                />
                <Tooltip 
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                />
                <Bar dataKey="count" name="Nombre d'actifs" fill="#003366" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

       {/* Charts Row 2 */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LINE CHART */}
        <div className="bg-white p-4 rounded-lg shadow-md min-w-0">
          <h3 className="text-lg font-semibold mb-4 text-center text-gray-800">Évolution des acquisitions</h3>
          {/* CORRECTION 3 & 2 */}
          <div className="w-full relative overflow-hidden" style={{ height: '288px', minHeight: '288px' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <LineChart data={dataByYear}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  tick={{fontSize: 11, fill: '#6B7280'}} 
                  axisLine={{stroke: '#D1D5DB'}}
                  tickLine={false}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fontSize: 11, fill: '#6B7280'}}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                />
                <Legend iconType="circle" />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  name="Acquisitions" 
                  stroke="#FF6600" 
                  strokeWidth={3} 
                  dot={{r: 4, strokeWidth: 2, fill: '#fff'}} 
                  activeDot={{r: 6, strokeWidth: 0}} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BAR CHART CATEGORY */}
        <div className="bg-white p-4 rounded-lg shadow-md min-w-0">
          <h3 className="text-lg font-semibold mb-4 text-center text-gray-800">Répartition par Catégorie</h3>
          {/* CORRECTION 3 & 2 */}
          <div className="w-full relative overflow-hidden" style={{ height: '288px', minHeight: '288px' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <BarChart data={dataByCategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={40} 
                  interval={0} 
                  tick={{fontSize: 11, fontWeight: 'bold', fill: '#4B5563'}} 
                  axisLine={false} 
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                />
                <Bar 
                  dataKey="count" 
                  name="Actifs" 
                  fill="#8B5CF6" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                  label={{ position: 'right', fill: '#6B7280', fontSize: 10 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;