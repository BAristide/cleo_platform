// src/components/hr/WorkCertificateList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, Tag, Button, Card, Typography, Space, Row, Col,
  Popconfirm, message, Modal, Input, Empty
} from 'antd';
import {
  PlusOutlined, DownloadOutlined, CheckOutlined, CloseOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_TAG = {
  pending:  { label: 'En attente', color: 'processing' },
  approved: { label: 'Approuvee',  color: 'success' },
  rejected: { label: 'Rejetee',   color: 'error' },
};

const PURPOSE_LABEL = {
  bank:    'Dossier bancaire',
  visa:    'Demande de visa',
  rental:  'Dossier de location',
  other:   'Autre',
};

const WorkCertificateList = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveModal, setApproveModal] = useState({ open: false, id: null });
  const [rejectModal, setRejectModal]  = useState({ open: false, id: null });
  const [hrNotes, setHrNotes] = useState('');

  // --- Détection du rôle ---
  const [isHR, setIsHR] = useState(false);

  useEffect(() => {
    axios.get('/api/hr/employees/me/')
      .then((resp) => { setIsHR(resp.data.is_hr || false); })
      .catch(() => { setIsHR(true); }); // admin sans dossier employé = accès complet
  }, []);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const resp = await axios.get('/api/hr/certificates/');
      setCertificates(extractResultsFromResponse(resp));
    } catch {
      message.error('Impossible de charger les attestations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCertificates(); }, []);

  const handleApprove = async () => {
    try {
      await axios.post(`/api/hr/certificates/${approveModal.id}/approve/`, { hr_notes: hrNotes });
      message.success('Attestation approuvee et PDF genere.');
      setApproveModal({ open: false, id: null });
      setHrNotes('');
      fetchCertificates();
    } catch {
      message.error("Erreur lors de l'approbation.");
    }
  };

  const handleReject = async () => {
    try {
      await axios.post(`/api/hr/certificates/${rejectModal.id}/reject/`, { hr_notes: hrNotes });
      message.success('Demande rejetee.');
      setRejectModal({ open: false, id: null });
      setHrNotes('');
      fetchCertificates();
    } catch {
      message.error('Erreur lors du rejet.');
    }
  };

  const handleDownload = (id) => {
    window.open(`/api/hr/certificates/${id}/download/`, '_blank');
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  const columns = [
    {
      title: 'Employe',
      dataIndex: 'employee_name',
      key: 'employee_name',
    },
    {
      title: 'Objet',
      dataIndex: 'purpose',
      key: 'purpose',
      render: (v) => PURPOSE_LABEL[v] || v,
    },
    {
      title: 'Demandee le',
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
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && isHR && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => { setApproveModal({ open: true, id: record.id }); setHrNotes(''); }}
              >
                Approuver
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => { setRejectModal({ open: true, id: record.id }); setHrNotes(''); }}
              >
                Rejeter
              </Button>
            </>
          )}
          {record.status === 'approved' && record.pdf_file && (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record.id)}
            >
              Telecharger
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={2} style={{ margin: 0 }}>Attestations de travail</Title></Col>
        <Col>
          <Link to="/hr/certificates/new">
            <Button type="primary" icon={<PlusOutlined />}>Nouvelle demande</Button>
          </Link>
        </Col>
      </Row>

      <Card>
        {certificates.length === 0 && !loading ? (
          <Empty description="Aucune demande d'attestation" />
        ) : (
          <Table
            dataSource={certificates}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <Modal
        title="Approuver la demande"
        open={approveModal.open}
        onOk={handleApprove}
        onCancel={() => setApproveModal({ open: false, id: null })}
        okText="Approuver et generer PDF"
        okButtonProps={{ type: 'primary' }}
      >
        <Text>Notes RH (optionnel) :</Text>
        <TextArea
          rows={3}
          value={hrNotes}
          onChange={(e) => setHrNotes(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </Modal>

      <Modal
        title="Rejeter la demande"
        open={rejectModal.open}
        onOk={handleReject}
        onCancel={() => setRejectModal({ open: false, id: null })}
        okText="Confirmer le rejet"
        okButtonProps={{ danger: true }}
      >
        <Text>Motif du rejet :</Text>
        <TextArea
          rows={3}
          value={hrNotes}
          onChange={(e) => setHrNotes(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </Modal>
    </div>
  );
};

export default WorkCertificateList;
