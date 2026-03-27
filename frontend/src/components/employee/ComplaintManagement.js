// src/components/employee/ComplaintManagement.js
// Version employé — sans actions admin (update_status)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Tag, Button, Card, Typography, Space, Row, Col, Empty, Tooltip, message } from 'antd';
import { PlusOutlined, LockOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;

const STATUS_TAG = {
  open: { label: 'Ouverte', color: 'error' },
  investigating: { label: "En cours d'investigation", color: 'processing' },
  resolved: { label: 'Résolue', color: 'success' },
  closed: { label: 'Fermée', color: 'default' },
};
const CATEGORY_LABEL = {
  harassment: 'Harcèlement', discrimination: 'Discrimination',
  workload: 'Charge de travail', management: 'Comportement managérial', other: 'Autre',
};

const ComplaintManagement = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchComplaints(); }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try { const resp = await axios.get('/api/hr/complaints/'); setComplaints(extractResultsFromResponse(resp)); }
    catch { message.error('Impossible de charger les doléances.'); }
    finally { setLoading(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  const columns = [
    {
      title: 'Catégorie', dataIndex: 'category', key: 'category',
      render: (v) => CATEGORY_LABEL[v] || v,
    },
    {
      title: 'Description', dataIndex: 'description', key: 'description',
      render: (v) => v.length > 80 ? v.slice(0, 80) + '...' : v,
    },
    { title: 'Soumise le', dataIndex: 'created_at', key: 'created_at', render: formatDate },
    {
      title: 'Statut', dataIndex: 'status', key: 'status',
      render: (s) => { const m = STATUS_TAG[s] || { label: s, color: 'default' }; return <Tag color={m.color}>{m.label}</Tag>; },
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={2} style={{ margin: 0 }}>Doléances</Title></Col>
        <Col><Link to="/my-space/complaints/new"><Button type="primary" icon={<PlusOutlined />}>Nouvelle doléance</Button></Link></Col>
      </Row>
      <Card>
        {complaints.length === 0 && !loading ? (<Empty description="Aucune doléance" />) : (
          <Table dataSource={complaints} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }} />
        )}
      </Card>
    </div>
  );
};

export default ComplaintManagement;
