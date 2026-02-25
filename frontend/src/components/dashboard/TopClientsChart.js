import React from 'react';
import { Card } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

const TopClientsChart = ({ data = [] }) => {
  const chartData = data.map(d => ({
    name: (d.name || 'Divers').length > 20 ? d.name.substring(0, 18) + '…' : d.name,
    fullName: d.name || 'Divers',
    revenue: parseFloat(d.revenue) || 0,
    invoices: d.invoices || 0,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '1px solid #e8e8e8' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{d.fullName}</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#10b981' }}>
          CA : {d.revenue.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#718096' }}>{d.invoices} facture(s)</p>
      </div>
    );
  };

  return (
    <Card title="Top 5 Clients" style={{ borderRadius: 12 }}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: '#718096' }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#4a5568' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={24}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default TopClientsChart;
