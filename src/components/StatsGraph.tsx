import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

// Ends at 8,415 to match the "Pieces of Content Delivered" counter rendered
// right beside this chart — the two previously disagreed (18,000 vs 8,415).
const data = [
  { name: 'Q1', revenue: 374 },
  { name: 'Q2', revenue: 1122 },
  { name: 'Q3', revenue: 2384 },
  { name: 'Q4', revenue: 4161 },
  { name: 'Q1', revenue: 6171 },
  { name: 'Q2', revenue: 8415 },
];

export default function StatsGraph() {
  return (
    <div className="h-full min-h-[300px] w-full border-t border-white/10 pt-6 relative overflow-hidden group">
      {/* Background glow */}

      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <div>
          <h3 className="hero-display font-bold text-lg text-white">Content Output Over Time</h3>
          <p className="text-on-surface-variant text-xs">Cumulative pieces delivered across all active clients</p>
        </div>
      </div>
      
      <div className="w-full relative z-10 mt-4" style={{ height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
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
                backgroundColor: '#1a1a1a', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '0px',
                color: '#fff',
                boxShadow: 'none'
              }}
              itemStyle={{ color: '#fff', fontWeight: 'bold' }}
              labelStyle={{ color: '#888', marginBottom: '4px', fontSize: '12px' }}
              formatter={(value: any) => [`${value.toLocaleString()} pieces`, 'Delivered']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#ffffff" 
              strokeWidth={1}
              fillOpacity={0} 
              fill="transparent" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
