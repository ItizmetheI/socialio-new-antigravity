import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

const data = [
  { name: 'Q1', revenue: 800 },
  { name: 'Q2', revenue: 2400 },
  { name: 'Q3', revenue: 5100 },
  { name: 'Q4', revenue: 8900 },
  { name: 'Q1', revenue: 13200 },
  { name: 'Q2', revenue: 18000 },
];

export default function StatsGraph() {
  return (
    <div className="h-full min-h-[300px] w-full bg-surface-container rounded-2xl border border-white/5 p-6 relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary/20 transition-colors" />
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <div>
          <h3 className="font-display font-bold text-lg text-white">Content Output Over Time</h3>
          <p className="text-on-surface-variant text-xs">Cumulative pieces delivered across all active clients</p>
        </div>
        <div className="font-mono text-primary text-xs uppercase tracking-widest font-bold px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
          Live Data
        </div>
      </div>
      
      <div className="w-full relative z-10 mt-4" style={{ height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#888', fontSize: 10 }}
              dy={10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(10, 10, 10, 0.9)', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}
              itemStyle={{ color: '#fff', fontWeight: 'bold' }}
              labelStyle={{ color: '#888', marginBottom: '4px', fontSize: '12px' }}
              formatter={(value: any) => [`${value.toLocaleString()} pieces`, 'Delivered']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#8B5CF6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
