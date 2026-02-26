import React from 'react';
import { Card, Table, Tag } from 'antd';
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const OverdueInvoicesWidget = ({ invoices = [], total = '0' }) => {
  const columns = [
    {
      title: 'N°', dataIndex: 'number', key: 'number',
      render: (text, record) => (
        <Link to={`/sales/invoices/${record.id}`} style={{ fontFamily: 'monospace', fontWeight: 600 }}>{text}</Link>
      ),
    },
    { title: 'Client', dataIndex: 'client', key: 'client' },
    {
      title: 'Montant dû', dataIndex: 'due', key: 'due', align: 'right',
      render: (val) => <span style={{ fontWeight: 600, color: '#e53e3e' }}>{parseFloat(val).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</span>,
    },
    {
      title: 'Échéance', dataIndex: 'due_date', key: 'due_date',
      render: (val) => val ? new Date(val).toLocaleDateString('fr-FR') : '—',
    },
    {
      title: 'Retard', dataIndex: 'days_overdue', key: 'days_overdue',
      render: (days) => {
        let color = days > 60 ? 'red' : days > 30 ? 'orange' : 'gold';
        return <Tag color={color}>{days}j</Tag>;
      },
    },
  ];

  return (
    <Card
      title={<span><WarningOutlined style={{ color: '#e53e3e', marginRight: 8 }} />Factures échues — {parseFloat(total).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</span>}
      style={{ borderRadius: 12 }}
    >
      <Table columns={columns} dataSource={invoices} rowKey="id" pagination={false} size="small"
        locale={{ emptyText: <span><CheckCircleOutlined style={{ marginRight: 6, color: '#38a169' }} />Aucune facture échue</span> }}
      />
    </Card>
  );
};

export default OverdueInvoicesWidget;
