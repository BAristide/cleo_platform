// src/components/hr/LeaveList.js
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
  draft:            { label: 'Brouillon',       color: 'default' },
  submitted:        { label: 'Soumise',          color: 'processing' },
  approved_manager: { label: 'Approuvée N+1',   color: 'blue' },
  approved_hr:      { label: 'Approuvée',       color: 'success' },
  rejected:         { label: 'Rejetée',         color: 'error' },
  cancelled:        { label: 'Annulée',         color: 'default' },
};

const LeaveList = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [actionModal, setActionModal] = useState({ open: false, action: null, record: null });
  const [notes, setNotes] = useState('');

  const isHR = employeeInfo?.is_hr;
  const isManager = (employeeInfo?.subordinates?.length || 0) > 0;

  const fetchRequests = useCallback(async (statusVal = '') => {
    setLoading(true);
    try {
      const params = {};
      if (statusVal) params.status = statusVal;
      const resp = await axios.get('/api/hr/leave-requests/', { params });
      setRequests(extractResultsFromResponse(resp));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const resp = await axios.get('/api/hr/leave-requests/pending_approvals/');
      const data = resp.data;
      setPendingApprovals(Array.isArray(data) ? data : (data.results || []));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    axios.get('/api/hr/employees/me/').then(r => setEmployeeInfo(r.data)).catch(() => {});
    fetchRequests(statusFilter);
    fetchPending();
  }, [statusFilter, fetchRequests, fetchPending]);

  const handleAction = async () => {
    const { action, record } = actionModal;
    try {
      if (action === 'submit') {
        await axios.post(`/api/hr/leave-requests/${record.id}/submit/`);
      } else if (action === 'approve_manager') {
        await axios.post(`/api/hr/leave-requests/${record.id}/approve_manager/`, { notes });
      } else if (action === 'approve_hr') {
        await axios.post(`/api/hr/leave-requests/${record.id}/approve_hr/`, { notes });
      } else if (action === 'reject') {
        await axios.post(`/api/hr/leave-requests/${record.id}/reject/`, {
          notes,
          rejected_by: isHR ? 'hr' : 'manager',
        });
      } else if (action === 'cancel') {
        await axios.post(`/api/hr/leave-requests/${record.id}/cancel/`);
      }
      message.success('Action effectuée avec succès.');
      setActionModal({ open: false, action: null, record: null });
      setNotes('');
      fetchRequests(statusFilter);
      fetchPending();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erreur lors de l\'action.');
    }
  };

  const openAction = (action, record) =>
    setActionModal({ open: true, action, record });

  const renderActions = (record) => {
    const isMine = record.employee === employeeInfo?.id;
    return (
      <Space size="small">
        {isMine && record.status === 'draft' && (
          <Button size="small" type="primary" onClick={() => openAction('submit', record)}>
            Soumettre
          </Button>
        )}
        {isMine && ['draft', 'submitted'].includes(record.status) && (
          <Button size="small" danger onClick={() => openAction('cancel', record)}>
            Annuler
          </Button>
        )}
        {isManager && record.status === 'submitted' && (
          <>
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => openAction('approve_manager', record)}>
              Approuver
            </Button>
            <Button size="small" danger icon={<CloseOutlined />}
              onClick={() => openAction('reject', record)}>
              Rejeter
            </Button>
          </>
        )}
        {isHR && record.status === 'approved_manager' && (
          <>
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => openAction('approve_hr', record)}>
              Valider
            </Button>
            <Button size="small" danger icon={<CloseOutlined />}
              onClick={() => openAction('reject', record)}>
              Rejeter
            </Button>
          </>
        )}
      </Space>
    );
  };

  const columns = [
    { title: 'Employé', dataIndex: 'employee_name', key: 'employee_name' },
    {
      title: 'Type',
      key: 'leave_type',
      render: (_, r) => (
        <span>
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
            backgroundColor: r.leave_type_color || '#1890ff', marginRight: 6,
          }} />
          {r.leave_type_name}
        </span>
      ),
    },
    { title: 'Début', dataIndex: 'start_date', key: 'start_date' },
    { title: 'Fin', dataIndex: 'end_date', key: 'end_date' },
    {
      title: 'Jours',
      dataIndex: 'nb_days',
      key: 'nb_days',
      render: v => `${v} j`,
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
    submit: 'Soumettre la demande',
    approve_manager: 'Approbation N+1',
    approve_hr: 'Validation RH',
    reject: 'Rejeter la demande',
    cancel: 'Annuler la demande',
  };

  const needsNotes = ['approve_manager', 'approve_hr', 'reject'].includes(actionModal.action);

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
        <Col><Title level={3} style={{ margin: 0 }}>Congés</Title></Col>
        <Col>
          <Space>
            <Select
              placeholder="Filtrer par statut"
              allowClear
              style={{ width: 200 }}
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
              onClick={() => navigate('/hr/leaves/new')}
            >
              Nouvelle demande
            </Button>
          </Space>
        </Col>
      </Row>

      {(isHR || isManager) ? (
        <Tabs defaultActiveKey="mine">
          <TabPane tab="Mes demandes" key="mine">
            <Table {...tableProps} dataSource={requests} />
          </TabPane>
          <TabPane
            tab={`Approbations en attente${pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ''}`}
            key="pending"
          >
            <Table {...tableProps} dataSource={pendingApprovals} loading={false} />
          </TabPane>
        </Tabs>
      ) : (
        <Table {...tableProps} dataSource={requests} />
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
        {needsNotes ? (
          <Input.TextArea
            rows={3}
            placeholder="Notes (optionnel)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        ) : (
          <p>Confirmer cette action ?</p>
        )}
      </Modal>
    </div>
  );
};

export default LeaveList;
