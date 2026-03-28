// src/components/common/ApprovalDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Space, Row, Col, Typography,
  Statistic, Modal, Input, message, Empty, Spin, Badge, Tabs,
} from 'antd';
import {
  CalendarOutlined, WalletOutlined, BookOutlined,
  CarOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { TabPane } = Tabs;

const ApprovalDashboard = () => {
  const [summary, setSummary] = useState({ leaves: 0, expenses: 0, training: 0, missions: 0, total: 0 });
  const [leaves, setLeaves] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [training, setTraining] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState({ open: false, type: null, action: null, record: null });
  const [notes, setNotes] = useState('');
  const [employeeInfo, setEmployeeInfo] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sumResp, empResp] = await Promise.all([
        axios.get('/api/hr/pending-approvals-summary/'),
        axios.get('/api/hr/employees/me/'),
      ]);
      setSummary(sumResp.data);
      setEmployeeInfo(empResp.data);

      // Charger les listes en parallele
      const [lResp, eResp, tResp, mResp] = await Promise.all([
        axios.get('/api/hr/leave-requests/pending_approvals/'),
        axios.get('/api/hr/expense-reports/pending_approvals/'),
        axios.get('/api/hr/training-plans/', { params: { status: 'submitted' } }),
        axios.get('/api/hr/missions/', { params: { status: 'submitted' } }),
      ]);
      setLeaves(Array.isArray(lResp.data) ? lResp.data : (lResp.data.results || []));
      setExpenses(Array.isArray(eResp.data) ? eResp.data : (eResp.data.results || []));
      setTraining(extractResultsFromResponse(tResp));
      setMissions(extractResultsFromResponse(mResp));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async () => {
    const { type, action, record } = actionModal;
    try {
      const base = type === 'leave' ? 'leave-requests'
        : type === 'expense' ? 'expense-reports'
        : type === 'training' ? 'training-plans'
        : 'missions';
      await axios.post(`/api/hr/${base}/${record.id}/${action}/`, {
        notes,
        ...(action === 'reject' ? { rejected_by: employeeInfo?.is_hr ? 'hr' : employeeInfo?.is_finance ? 'finance' : 'manager' } : {}),
      });
      message.success('Action effectuée.');
      setActionModal({ open: false, type: null, action: null, record: null });
      setNotes('');
      fetchAll();
    } catch (err) {
      message.error(err.response?.data?.error || "Erreur lors de l'action.");
    }
  };

  const openAction = (type, action, record) =>
    setActionModal({ open: true, type, action, record });

  const leaveColumns = [
    { title: 'Employé', dataIndex: 'employee_name', key: 'e' },
    { title: 'Type', dataIndex: 'leave_type_name', key: 't' },
    { title: 'Début', dataIndex: 'start_date', key: 's' },
    { title: 'Fin', dataIndex: 'end_date', key: 'f' },
    { title: 'Jours', dataIndex: 'nb_days', key: 'j', render: v => `${v} j` },
    {
      title: 'Actions', key: 'a',
      render: (_, r) => {
        const isHR = employeeInfo?.is_hr;
        const approveAction = r.status === 'submitted' ? 'approve_manager' : 'approve_hr';
        return (
          <Space size="small">
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => openAction('leave', approveAction, r)}>
              {r.status === 'submitted' ? 'Approuver (N+1)' : 'Valider (RH)'}
            </Button>
            <Button size="small" danger icon={<CloseOutlined />}
              onClick={() => openAction('leave', 'reject', r)}>Rejeter</Button>
          </Space>
        );
      },
    },
  ];

  const expenseColumns = [
    { title: 'Titre', dataIndex: 'title', key: 't' },
    { title: 'Employé', dataIndex: 'employee_name', key: 'e' },
    { title: 'Montant', dataIndex: 'total_amount', key: 'm',
      render: v => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) },
    {
      title: 'Actions', key: 'a',
      render: (_, r) => {
        const action = r.status === 'submitted' ? 'approve_manager' : 'approve_finance';
        return (
          <Space size="small">
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => openAction('expense', action, r)}>
              {r.status === 'submitted' ? 'Approuver (N+1)' : 'Approuver (Finance)'}
            </Button>
            <Button size="small" danger icon={<CloseOutlined />}
              onClick={() => openAction('expense', 'reject', r)}>Rejeter</Button>
          </Space>
        );
      },
    },
  ];

  const trainingColumns = [
    { title: 'Employé', key: 'e', render: (_, r) => `${r.employee_data?.first_name} ${r.employee_data?.last_name}` },
    { title: 'Année', dataIndex: 'year', key: 'y' },
    { title: 'Formations', key: 'c', render: (_, r) => r.training_items?.length || 0 },
    {
      title: 'Actions', key: 'a',
      render: (_, r) => {
        const action = r.status === 'submitted' ? 'approve_manager'
          : r.status === 'approved_manager' ? 'approve_hr' : 'approve_finance';
        const label = r.status === 'submitted' ? 'N+1'
          : r.status === 'approved_manager' ? 'RH' : 'Finance';
        return (
          <Space size="small">
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => openAction('training', action, r)}>
              Approuver ({label})
            </Button>
            <Button size="small" danger icon={<CloseOutlined />}
              onClick={() => openAction('training', 'reject', r)}>Rejeter</Button>
          </Space>
        );
      },
    },
  ];

  const missionColumns = [
    { title: 'Employé', dataIndex: 'employee_name', key: 'e' },
    { title: 'Mission', dataIndex: 'title', key: 't' },
    { title: 'Lieu', dataIndex: 'location', key: 'l' },
    { title: 'Début', dataIndex: 'start_date', key: 's' },
    {
      title: 'Actions', key: 'a',
      render: (_, r) => {
        const action = r.status === 'submitted' ? 'approve_manager'
          : r.status === 'approved_manager' ? 'approve_hr' : 'approve_finance';
        const label = r.status === 'submitted' ? 'N+1'
          : r.status === 'approved_manager' ? 'RH' : 'Finance';
        return (
          <Space size="small">
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => openAction('mission', action, r)}>
              Approuver ({label})
            </Button>
            <Button size="small" danger icon={<CloseOutlined />}
              onClick={() => openAction('mission', 'reject', r)}>Rejeter</Button>
          </Space>
        );
      },
    },
  ];

  const tableProps = { size: 'small', pagination: false, locale: { emptyText: <Empty description="Aucune demande" image={Empty.PRESENTED_IMAGE_SIMPLE} /> } };
  const needsNotes = actionModal.action && ['approve_manager', 'approve_hr', 'approve_finance', 'reject'].includes(actionModal.action);

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  return (
    <div>
      <Title level={3}>Mes approbations en attente</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Congés" value={summary.leaves} prefix={<CalendarOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Notes de frais" value={summary.expenses} prefix={<WalletOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Formations" value={summary.training} prefix={<BookOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Missions" value={summary.missions} prefix={<CarOutlined />} /></Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="leaves">
        <TabPane tab={<Badge count={summary.leaves} offset={[10, 0]}><span><CalendarOutlined /> Congés</span></Badge>} key="leaves">
          <Table {...tableProps} columns={leaveColumns} dataSource={leaves} rowKey="id" />
        </TabPane>
        <TabPane tab={<Badge count={summary.expenses} offset={[10, 0]}><span><WalletOutlined /> Notes de frais</span></Badge>} key="expenses">
          <Table {...tableProps} columns={expenseColumns} dataSource={expenses} rowKey="id" />
        </TabPane>
        <TabPane tab={<Badge count={summary.training} offset={[10, 0]}><span><BookOutlined /> Formations</span></Badge>} key="training">
          <Table {...tableProps} columns={trainingColumns} dataSource={training} rowKey="id" />
        </TabPane>
        <TabPane tab={<Badge count={summary.missions} offset={[10, 0]}><span><CarOutlined /> Missions</span></Badge>} key="missions">
          <Table {...tableProps} columns={missionColumns} dataSource={missions} rowKey="id" />
        </TabPane>
      </Tabs>

      <Modal
        title={actionModal.action === 'reject' ? 'Rejeter la demande' : 'Approuver la demande'}
        open={actionModal.open}
        onOk={handleAction}
        onCancel={() => { setActionModal({ open: false, type: null, action: null, record: null }); setNotes(''); }}
        okText="Confirmer" cancelText="Annuler"
      >
        {needsNotes && (
          <Input.TextArea rows={3}
            placeholder={actionModal.action === 'reject' ? 'Motif de rejet' : 'Notes (optionnel)'}
            value={notes} onChange={e => setNotes(e.target.value)} />
        )}
      </Modal>
    </div>
  );
};

export default ApprovalDashboard;
