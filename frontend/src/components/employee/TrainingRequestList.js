// src/components/employee/TrainingRequestList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Space, Row, Col, Typography, Modal,
  message, Switch, Empty,
} from 'antd';
import { PlusOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import { useCurrency } from '../../context/CurrencyContext';

const { Title } = Typography;

const STATUS_CONFIG = {
  draft:            { label: 'Brouillon',           color: 'default' },
  submitted:        { label: 'Soumis',              color: 'processing' },
  approved_manager: { label: 'Approuvé N+1',        color: 'blue' },
  approved_hr:      { label: 'Approuvé RH',         color: 'cyan' },
  approved_finance: { label: 'Approuvé Finance',    color: 'success' },
  rejected:         { label: 'Rejeté',              color: 'error' },
  completed:        { label: 'Terminé',             color: 'success' },
};

const ACTIVE_STATUSES = ['draft', 'submitted', 'approved_manager', 'approved_hr'];

const TrainingRequestList = () => {
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [actionModal, setActionModal] = useState({ open: false, action: null, record: null });

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (!showHistory) {
        params.status__in = ACTIVE_STATUSES.join(',');
      }
      const resp = await axios.get('/api/hr/training-plans/', { params });
      setPlans(extractResultsFromResponse(resp));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [showHistory]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleAction = async () => {
    const { action, record } = actionModal;
    try {
      if (action === 'submit') {
        await axios.post(`/api/hr/training-plans/${record.id}/submit/`);
        message.success('Plan soumis pour approbation.');
      } else if (action === 'cancel') {
        await axios.post(`/api/hr/training-plans/${record.id}/cancel/`);
        message.success('Plan annulé.');
      }
      setActionModal({ open: false, action: null, record: null });
      fetchPlans();
    } catch (err) {
      message.error(err.response?.data?.error || "Erreur lors de l'action.");
    }
  };

  const columns = [
    { title: 'Année', dataIndex: 'year', key: 'year', width: 80 },
    {
      title: 'Objectifs',
      dataIndex: 'objectives',
      key: 'objectives',
      ellipsis: true,
      render: v => v || '-',
    },
    {
      title: 'Formations',
      key: 'count',
      width: 100,
      render: (_, r) => r.training_items ? r.training_items.length : 0,
    },
    {
      title: 'Coût total',
      key: 'total_cost',
      width: 120,
      render: (_, r) => `${Number(r.total_cost || 0).toLocaleString('fr-FR')} ${currencySymbol}`,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: s => {
        const c = STATUS_CONFIG[s] || { label: s, color: 'default' };
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    {
      title: 'Approbations',
      key: 'approvals',
      width: 200,
      render: (_, r) => {
        if (!r.approvals) return '-';
        return (
          <Space size={4}>
            <Tag color={r.approvals.manager ? 'success' : 'default'}>N+1</Tag>
            <Tag color={r.approvals.hr ? 'success' : 'default'}>RH</Tag>
            <Tag color={r.approvals.finance ? 'success' : 'default'}>Finance</Tag>
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space size="small">
          {r.status === 'draft' && (
            <>
              <Button size="small" onClick={() => navigate(`/my-space/training/${r.id}/edit`)}>
                Modifier
              </Button>
              {(r.training_items?.length || 0) > 0 && (
                <Button size="small" type="primary" icon={<SendOutlined />}
                  onClick={() => setActionModal({ open: true, action: 'submit', record: r })}>
                  Soumettre
                </Button>
              )}
            </>
          )}
          {['draft', 'submitted'].includes(r.status) && (
            <Button size="small" danger icon={<CloseOutlined />}
              onClick={() => setActionModal({ open: true, action: 'cancel', record: r })}>
              Annuler
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={3} style={{ margin: 0 }}>Mes plans de formation</Title></Col>
        <Col>
          <Space>
            <Switch
              checked={showHistory}
              onChange={setShowHistory}
              checkedChildren="Historique"
              unCheckedChildren="Actifs"
            />
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => navigate('/my-space/training/new')}>
              Nouvelle demande
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={plans}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 15 }}
        locale={{ emptyText: <Empty description="Aucun plan de formation" /> }}
      />

      <Modal
        title={actionModal.action === 'submit' ? 'Soumettre le plan' : 'Annuler le plan'}
        open={actionModal.open}
        onOk={handleAction}
        onCancel={() => setActionModal({ open: false, action: null, record: null })}
        okText="Confirmer"
        cancelText="Fermer"
      >
        <p>
          {actionModal.action === 'submit'
            ? 'Confirmer la soumission de ce plan de formation pour approbation ?'
            : 'Confirmer l\'annulation de ce plan de formation ?'}
        </p>
      </Modal>
    </div>
  );
};

export default TrainingRequestList;
