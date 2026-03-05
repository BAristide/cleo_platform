// src/components/hr/ComplaintManagement.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, Tag, Button, Card, Typography, Space, Row, Col,
  Select, Modal, Input, message, Empty, Tooltip
} from 'antd';
import { PlusOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const STATUS_TAG = {
  open:          { label: 'Ouverte',              color: 'error' },
  investigating: { label: "En cours d'investigation", color: 'processing' },
  resolved:      { label: 'Resolue',              color: 'success' },
  closed:        { label: 'Fermee',               color: 'default' },
};

const CATEGORY_LABEL = {
  harassment:     'Harcèlement',
  discrimination: 'Discrimination',
  workload:       'Charge de travail',
  management:     'Comportement managerial',
  other:          'Autre',
};

const ComplaintManagement = () => {
  const [complaints, setComplaints]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [isHR, setIsHR]               = useState(false);
  const [statusModal, setStatusModal] = useState({ open: false, id: null, current: '' });
  const [newStatus, setNewStatus]     = useState('');
  const [hrNotes, setHrNotes]         = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    axios.get('/api/hr/employees/me/')
      .then(r => setIsHR(r.data.is_hr || false))
      .catch(() => setIsHR(true));
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const resp = await axios.get('/api/hr/complaints/');
      setComplaints(extractResultsFromResponse(resp));
    } catch {
      message.error('Impossible de charger les doleances.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      await axios.post(`/api/hr/complaints/${statusModal.id}/update_status/`, {
        status: newStatus,
        hr_notes: hrNotes,
        resolution_notes: resolutionNotes,
      });
      message.success('Statut mis a jour.');
      setStatusModal({ open: false, id: null, current: '' });
      setHrNotes(''); setResolutionNotes(''); setNewStatus('');
      fetchComplaints();
    } catch {
      message.error('Erreur lors de la mise a jour.');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  const columns = [
    {
      title: 'Employé',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (v, r) => (
        <Space>
          {r.is_anonymous && <Tooltip title="Doléance anonyme"><LockOutlined style={{ color: '#aaa' }} /></Tooltip>}
          <Text>{v}</Text>
        </Space>
      ),
    },
    {
      title: 'Catégorie',
      dataIndex: 'category',
      key: 'category',
      render: (v) => CATEGORY_LABEL[v] || v,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (v) => v.length > 80 ? v.slice(0, 80) + '...' : v,
    },
    {
      title: 'Soumise le',
      dataIndex: 'created_at',
      key: 'created_at',
      render: formatDate,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const m = STATUS_TAG[s] || { label: s, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => isHR && r.status !== 'closed' ? (
        <Button size="small" icon={<EditOutlined />}
          onClick={() => {
            setStatusModal({ open: true, id: r.id, current: r.status });
            setNewStatus(r.status);
            setHrNotes(r.hr_notes || '');
            setResolutionNotes(r.resolution_notes || '');
          }}>
          Gerer
        </Button>
      ) : null,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={2} style={{ margin: 0 }}>Doléances</Title></Col>
        <Col>
          <Link to="/hr/complaints/new">
            <Button type="primary" icon={<PlusOutlined />}>Nouvelle doleance</Button>
          </Link>
        </Col>
      </Row>

      <Card>
        {complaints.length === 0 && !loading ? (
          <Empty description="Aucune doleance" />
        ) : (
          <Table dataSource={complaints} columns={columns} rowKey="id"
            loading={loading} size="small" pagination={{ pageSize: 10 }} />
        )}
      </Card>

      <Modal title="Gerer la doleance" open={statusModal.open}
        onOk={handleUpdateStatus} onCancel={() => setStatusModal({ open: false, id: null, current: '' })}
        okText="Enregistrer" width={560}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Text strong>Nouveau statut :</Text>
            <Select value={newStatus} onChange={setNewStatus} style={{ width: '100%', marginTop: 4 }}>
              <Option value="open">Ouverte</Option>
              <Option value="investigating">En cours d'investigation</Option>
              <Option value="resolved">Resolue</Option>
              <Option value="closed">Fermee</Option>
            </Select>
          </div>
          <div>
            <Text strong>Notes RH (privees) :</Text>
            <TextArea rows={3} value={hrNotes} onChange={e => setHrNotes(e.target.value)}
              style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text strong>Notes de resolution :</Text>
            <TextArea rows={3} value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)} style={{ marginTop: 4 }} />
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default ComplaintManagement;
