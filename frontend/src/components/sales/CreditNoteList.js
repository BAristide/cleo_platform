import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Card, Typography, Tag, Space, Input, DatePicker, Button, Row, Col } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const CreditNoteList = () => {
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchCreditNotes = async () => {
    setLoading(true);
    try {
      const params = { type: 'credit_note', page: pagination.current, page_size: pagination.pageSize };
      if (searchText) params.search = searchText;
      const response = await axios.get('/api/sales/invoices/', { params });
      const data = extractResultsFromResponse(response);
      setCreditNotes(Array.isArray(data) ? data : data.results || []);
      setPagination(prev => ({ ...prev, total: data.count || (Array.isArray(data) ? data.length : 0) }));
    } catch (error) {
      console.error('Erreur chargement avoirs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCreditNotes(); }, [pagination.current, pagination.pageSize, searchText]);

  const columns = [
    {
      title: 'Numéro', dataIndex: 'number', key: 'number',
      render: (text, record) => <Link to={`/sales/invoices/${record.id}`}><strong>{text}</strong></Link>,
    },
    {
      title: 'Date', dataIndex: 'date', key: 'date',
      render: d => d ? new Date(d).toLocaleDateString('fr-FR') : '—',
    },
    {
      title: 'Client', dataIndex: 'company_name', key: 'company',
    },
    {
      title: 'Facture origine', dataIndex: 'parent_invoice_number', key: 'parent',
      render: (text, record) => record.parent_invoice ? (
        <Link to={`/sales/invoices/${record.parent_invoice}`}>{text || '#' + record.parent_invoice}</Link>
      ) : '—',
    },
    {
      title: 'Montant', dataIndex: 'total', key: 'total',
      render: (total, record) => (
        <span style={{ color: '#e53e3e', fontWeight: 600 }}>
          {parseFloat(total).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} {record.currency_code}
        </span>
      ),
    },
    {
      title: 'Motif', dataIndex: 'credit_note_reason', key: 'reason', ellipsis: true,
      render: text => text || '—',
    },
    {
      title: 'Statut', dataIndex: 'payment_status', key: 'status',
      render: status => {
        const config = {
          'unpaid': { color: 'orange', text: 'Non réglé' },
          'paid': { color: 'green', text: 'Réglé' },
          'cancelled': { color: 'default', text: 'Annulé' },
        };
        const c = config[status] || { color: 'default', text: status };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3}><FileTextOutlined /> Avoirs clients</Title>
      </div>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Rechercher par numéro, client..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={creditNotes}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `${total} avoir(s)`,
            onChange: (page, pageSize) => setPagination(prev => ({ ...prev, current: page, pageSize })),
          }}
        />
      </Card>
    </div>
  );
};

export default CreditNoteList;
