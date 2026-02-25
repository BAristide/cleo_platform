import React from 'react';
import { Card } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const formatAmount = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toFixed(0);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '1px solid #e8e8e8' }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#1a202c' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '2px 0', color: entry.color, fontSize: 13 }}>
          {entry.name} : {parseFloat(entry.value).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
};

const RevenueChart = ({ data = [] }) => {
  const chartData = data.map(d => ({
    ...d,
    revenue: parseFloat(d.revenue) || 0,
    purchases: parseFloat(d.purchases) || 0,
    margin: parseFloat(d.margin) || 0,
  }));

  return (
    <Card title="Évolution CA / Achats / Marge (12 mois)" style={{ borderRadius: 12 }}>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#718096' }} />
          <YAxis tickFormatter={formatAmount} tick={{ fontSize: 12, fill: '#718096' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Area type="monotone" dataKey="revenue" name="Chiffre d'affaires" stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} />
          <Area type="monotone" dataKey="purchases" name="Achats" stroke="#f97316" fill="none" strokeWidth={2} strokeDasharray="5 5" />
          <Area type="monotone" dataKey="margin" name="Marge brute" stroke="#10b981" fill="url(#colorMargin)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default RevenueChart;
