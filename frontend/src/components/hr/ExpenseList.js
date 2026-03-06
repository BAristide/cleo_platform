// src/components/hr/ExpenseList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Space, Select, Row, Col,
  Typography, Modal, Input, message, Tabs,
} from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const STATUS_CONFIG = {
  draft:            { label: 'Brouillon',          color: 'default' },
  submitted:        { label: 'Soumise',             color: 'processing' },
  approved_manager: { label: 'Approuvée N+1',      color: 'blue' },
  approved_finance: { label: 'Approuvée Finance',  color: 'cyan' },
  reimbursed:       { label: 'Remboursée',         color: 'success' },
  rejected:         { label: 'Rejetée',            color: 'error' },
  cancelled:        { label: 'Annulée',            color: 'default' },
};

const ExpenseList = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [actionModal, setActionModal] = useState({ open: false, action: null, record: null });
  const [notes, setNotes] = useState('');

  const isManager = (employeeInfo?.subordinates?.length || 0) > 0;
  const isFinance = employeeInfo?.is_finance;

  const fetchReports = useCallback(async (statusVal = '') => {
    setLoading(true);
    try {
      const params = {};
      if (statusVal) params.status = statusVal;
      const resp = await axios.get('/api/hr/expense-reports/', { params });
      setReports(extractResultsFromResponse(resp));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const resp = await axios.get('/api/hr/expense-reports/pending_approvals/');
      const data = resp.data;
      setPendingApprovals(Array.isArray(data) ? data : (data.results || []));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    axios.get('/api/hr/employees/me/').then(r => setEmployeeInfo(r.data)).catch(() => {});
    fetchReports(statusFilter);
    fetchPending();
  }, [statusFilter, fetchReports, fetchPending]);

  const handleAction = async () => {
    const { action, record } = actionModal;
    try {
      if (action === 'submit') {
        await axios.post(`/api/hr/expense-reports/${record.id}/submit/`);
      } else if (action === 'approve_manager') {
        await axios.post(`/api/hr/expense-reports/${record.id}/approve_manager/`, { notes });
      } else if (action === 'approve_finance') {
        await axios.post(`/api/hr/expense-reports/${record.id}/approve_finance/`, { notes });
      } else if (action === 'reimburse') {
        await axios.post(`/api/hr/expense-reports/${record.id}/reimburse/`);
      } else if (action === 'reject') {
        await axios.post(`/api/hr/expense-reports/${record.id}/reject/`, {
          notes,
          rejected_by: isFinance ? 'finance' : 'manager',
        });
      } else if (action === 'cancel') {
        await axios.post(`/api/hr/expense-reports/${record.id}/cancel/`);
      }
      message.success('Action effectuée avec succès.');
      setActionModal({ open: false, action: null, record: null });
      setNotes('');
      fetchReports(statusFilter);
      fetchPending();
    } catch (err) {
      message.error(err.response?.data?.error || "Erreur lors de l'action.");
    }
  };

  const openAction = (action, record) =>
    setActionModal({ open: true, action, record });

  const renderActions = (record) => {
    const isMine = record.employee === employeeInfo?.id;
    return (
      <Space size="small">
        {isMine && record.status === 'draft' && (
          <>
            <Button
              size="small"
              onClick={() => navigate(`/hr/expenses/${record.id}/edit`)}
            >
              Modifier
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => openAction('submit', record)}
            >
              Soumettre
            </Button>
          </>
        )}
        {isMine && ['draft', 'submitted'].includes(record.status) && (
          <Button size="small" danger onClick={() => openAction('cancel', record)}>
            Annuler
          </Button>
        )}
        {isManager && record.status === 'submitted' && (
          <>
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => openAction('approve_manager', record)}
            >
              Approuver
            </Button>
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => openAction('reject', record)}
            >
              Rejeter
            </Button>
          </>
        )}
        {isFinance && record.status === 'approved_manager' && (
          <>
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => openAction('approve_finance', record)}
            >
              Approuver
            </Button>
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => openAction('reject', record)}
            >
              Rejeter
            </Button>
          </>
        )}
        {isFinance && record.status === 'approved_finance' && (
          <Button
            size="small"
            type="primary"
            onClick={() => openAction('reimburse', record)}
          >
            Rembourser
          </Button>
        )}
      </Space>
    );
  };

  const columns = [
    { title: 'Titre', dataIndex: 'title', key: 'title' },
    { title: 'Employé', dataIndex: 'employee_name', key: 'employee_name' },
    { title: 'Période', dataIndex: 'period_month', key: 'period_month' },
    {
      title: 'Montant total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: v => `${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: s => {
        const c = STATUS_CONFIG[s] || { label: s, color: 'default' };
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    { title: 'Actions', key: 'actions', render: (_, r) => renderActions(r) },
  ];

  const actionLabels = {
    submit:           'Soumettre la note',
    approve_manager:  'Approbation N+1',
    approve_finance:  'Approbation Finance',
    reimburse:        'Marquer comme remboursée',
    reject:           'Rejeter la note',
    cancel:           'Annuler la note',
  };

  const needsNotes = ['approve_manager', 'approve_finance', 'reject'].includes(actionModal.action);
  const needsConfirm = ['submit', 'reimburse', 'cancel'].includes(actionModal.action);

  const tableProps = {
    columns,
    rowKey: 'id',
    loading,
    size: 'small',
    pagination: { pageSize: 15 },
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={3} style={{ margin: 0 }}>Notes de frais</Title></Col>
        <Col>
          <Space>
            <Select
              placeholder="Filtrer par statut"
              allowClear
              style={{ width: 220 }}
              value={statusFilter || undefined}
              onChange={v => setStatusFilter(v || '')}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Option key={k} value={k}>{v.label}</Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/hr/expenses/new')}
            >
              Nouvelle note
            </Button>
          </Space>
        </Col>
      </Row>

      {(isManager || isFinance) ? (
        <Tabs defaultActiveKey="mine">
          <TabPane tab="Mes notes de frais" key="mine">
            <Table {...tableProps} dataSource={reports} />
          </TabPane>
          <TabPane
            tab={`Approbations en attente${pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ''}`}
            key="pending"
          >
            <Table {...tableProps} dataSource={pendingApprovals} loading={false} />
          </TabPane>
        </Tabs>
      ) : (
        <Table {...tableProps} dataSource={reports} />
      )}

      <Modal
        title={actionLabels[actionModal.action] || ''}
        open={actionModal.open}
        onOk={handleAction}
        onCancel={() => {
          setActionModal({ open: false, action: null, record: null });
          setNotes('');
        }}
        okText="Confirmer"
        cancelText="Annuler"
      >
        {needsNotes && (
          <Input.TextArea
            rows={3}
            placeholder={actionModal.action === 'reject' ? 'Motif de rejet (obligatoire)' : 'Notes (optionnel)'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        )}
        {needsConfirm && <p>Confirmer cette action ?</p>}
      </Modal>
    </div>
  );
};

export default ExpenseList;
