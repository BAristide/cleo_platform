// src/components/employee/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Descriptions, Typography, Spin, Alert,
  Tag, Table, Button, Tabs, Avatar, Space, Empty
} from 'antd';
import {
  CarOutlined, CalendarOutlined,
  BookOutlined, FileTextOutlined, PlusOutlined,
  IdcardOutlined, BankOutlined, PhoneOutlined, MailOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import LeaveBalanceDashboard from './LeaveBalanceDashboard';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import { useCurrency } from '../../context/CurrencyContext';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MISSION_STATUS = {
  draft: { label: 'Brouillon', color: 'default' },
  submitted: { label: 'Soumise', color: 'processing' },
  approved_manager: { label: 'Approuvée N+1', color: 'processing' },
  approved_hr: { label: 'Approuvée RH', color: 'processing' },
  approved_finance: { label: 'Approuvée Finance', color: 'success' },
  rejected: { label: 'Rejetée', color: 'error' },
  cancelled: { label: 'Annulée', color: 'default' },
  completed: { label: 'Terminée', color: 'success' },
};

const AVAILABILITY_STATUS = {
  requested: { label: 'En attente', color: 'processing' },
  approved: { label: 'Approuvée', color: 'success' },
  rejected: { label: 'Rejetée', color: 'error' },
  cancelled: { label: 'Annulée', color: 'default' },
};

const EmployeeDashboard = () => {
  const { currencySymbol } = useCurrency();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [missions, setMissions] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const empResp = await axios.get('/api/hr/employees/me/');
        const emp = empResp.data;
        setEmployee(emp);

        const [missionsResp, availResp, trainingResp] = await Promise.all([
          axios.get(`/api/hr/employees/${emp.id}/missions/`),
          axios.get(`/api/hr/employees/${emp.id}/availabilities/`),
          axios.get(`/api/hr/employees/${emp.id}/training_plans/`),
        ]);

        setMissions(extractResultsFromResponse(missionsResp));
        setAvailabilities(extractResultsFromResponse(availResp));
        setTrainingPlans(extractResultsFromResponse(trainingResp));

        try {
          const payslipResp = await axios.get('/api/payroll/payslips/', {
            params: { employee: emp.id }
          });
          setPayslips(extractResultsFromResponse(payslipResp));
        } catch {
          // Module paie optionnel
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Aucun dossier employé n'est associé à votre compte. Contactez les RH.");
        } else {
          setError("Impossible de charger votre espace employé.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const missionColumns = [
    {
      title: 'Mission',
      dataIndex: 'title',
      key: 'title',
    },
    { title: 'Lieu', dataIndex: 'location', key: 'location' },
    { title: 'Début', dataIndex: 'start_date', key: 'start_date' },
    { title: 'Fin', dataIndex: 'end_date', key: 'end_date' },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const m = MISSION_STATUS[s] || { label: s, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
  ];

  const availabilityColumns = [
    { title: 'Type', dataIndex: 'type_display', key: 'type_display' },
    { title: 'Début', dataIndex: 'start_date', key: 'start_date' },
    { title: 'Fin', dataIndex: 'end_date', key: 'end_date' },
    { title: 'Durée (jours)', dataIndex: 'duration_days', key: 'duration_days' },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const m = AVAILABILITY_STATUS[s] || { label: s, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
  ];

  const trainingColumns = [
    { title: 'Année', dataIndex: 'year', key: 'year' },
    { title: 'Objectifs', dataIndex: 'objectives', key: 'objectives' },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag>{s}</Tag>,
    },
  ];

  const payslipColumns = [
    { title: 'Période', dataIndex: 'period_display', key: 'period_display' },
    {
      title: 'Salaire brut',
      dataIndex: 'gross_salary',
      key: 'gross_salary',
      render: (v) => v ? `${Number(v).toLocaleString('fr-FR')} ${currencySymbol}` : '-',
    },
    {
      title: 'Salaire net',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: (v) => v ? `${Number(v).toLocaleString('fr-FR')} ${currencySymbol}` : '-',
    },
    {
      title: 'Bulletin',
      key: 'pdf',
      render: (_, record) =>
        record.id ? (
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() =>
              window.open(`/api/payroll/payslips/${record.id}/download_pdf/`, '_blank')
            }
          >
            Télécharger
          </Button>
        ) : null,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="Espace employé" description={error} type="warning" showIcon />
      </div>
    );
  }

  const initials = employee
    ? `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase()
    : '?';

  return (
    <div>
      <Title level={2}>Mon espace employé</Title>

      {/* Carte identité */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col flex="none">
            <Avatar size={72} style={{ backgroundColor: '#0F172A', fontSize: 28 }}>
              {initials}
            </Avatar>
          </Col>
          <Col flex="auto">
            <Title level={3} style={{ marginBottom: 4 }}>
              {employee.first_name} {employee.last_name}
            </Title>
            <Space wrap>
              {employee.job_title?.name && (
                <Text type="secondary">
                  <IdcardOutlined /> {employee.job_title.name}
                </Text>
              )}
              {employee.department?.name && (
                <Text type="secondary">
                  <BankOutlined /> {employee.department.name}
                </Text>
              )}
              {employee.email && (
                <Text type="secondary">
                  <MailOutlined /> {employee.email}
                </Text>
              )}
              {employee.phone && (
                <Text type="secondary">
                  <PhoneOutlined /> {employee.phone}
                </Text>
              )}
            </Space>
          </Col>
          <Col flex="none">
            <Tag color={employee.is_active ? 'success' : 'error'}>
              {employee.is_active ? 'Actif' : 'Inactif'}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* Informations contrat */}
      {(employee.contract_type || employee.contract_start_date) && (
        <Card title="Informations contractuelles" style={{ marginBottom: 24 }}>
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
            {employee.contract_type && (
              <Descriptions.Item label="Type de contrat">
                {typeof employee.contract_type === 'object'
                  ? employee.contract_type.name
                  : employee.contract_type_name || employee.contract_type}
              </Descriptions.Item>
            )}
            {employee.hire_date && (
              <Descriptions.Item label="Date d'embauche">
                {employee.hire_date}
              </Descriptions.Item>
            )}
            {employee.contract_start_date && (
              <Descriptions.Item label="Début contrat">
                {employee.contract_start_date}
              </Descriptions.Item>
            )}
            {employee.contract_end_date && (
              <Descriptions.Item label="Fin contrat">
                {employee.contract_end_date}
              </Descriptions.Item>
            )}
            {employee.probation_end_date && (
              <Descriptions.Item label="Fin période d'essai">
                {employee.probation_end_date}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* Onglets */}
      <Tabs defaultActiveKey="leaves">
        <TabPane tab={<span><CalendarOutlined /> Congés</span>} key="leaves">
          <LeaveBalanceDashboard />
        </TabPane>

        <TabPane tab={<span><CarOutlined /> Missions ({missions.length})</span>} key="missions">
          {missions.length === 0 ? (
            <Empty description="Aucune mission" />
          ) : (
            <Table
              dataSource={missions}
              columns={missionColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          )}
        </TabPane>

        <TabPane tab={<span><CalendarOutlined /> Disponibilités ({availabilities.length})</span>} key="availabilities">
          {availabilities.length === 0 ? (
            <Empty description="Aucune demande de disponibilité" />
          ) : (
            <Table
              dataSource={availabilities}
              columns={availabilityColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          )}
        </TabPane>

        <TabPane tab={<span><BookOutlined /> Formations ({trainingPlans.length})</span>} key="training">
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => navigate('/my-space/training/new')}>
              Demander une formation
            </Button>
          </div>
          {trainingPlans.length === 0 ? (
            <Empty description="Aucun plan de formation" />
          ) : (
            <Table
              dataSource={trainingPlans}
              columns={trainingColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          )}
        </TabPane>

        <TabPane tab={<span><FileTextOutlined /> Bulletins de paie ({payslips.length})</span>} key="payslips">
          {payslips.length === 0 ? (
            <Empty description="Aucun bulletin de paie disponible" />
          ) : (
            <Table
              dataSource={payslips}
              columns={payslipColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 12 }}
            />
          )}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default EmployeeDashboard;
