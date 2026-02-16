// src/components/hr/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { Row, Col, Card, Statistic, Typography, Spin, Alert, Progress, Table, Tag } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CarOutlined,
  BankOutlined,
  ToolOutlined,
  BookOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    general: {
      total_employees: 0,
      employees_by_department: [],
      employees_by_job_title: []
    },
    missions: {
      by_status: [],
      upcoming: []
    },
    training: {
      plans_by_status: [],
      items_by_status: []
    },
    skills: {
      total: 0,
      avg_per_employee: 0,
      coverage_by_department: []
    }
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/hr/dashboard/');
        setStats(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des données du dashboard:", error);
        setError("Impossible de charger les données du tableau de bord.");
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Colonnes pour les tableaux de statistiques
  const deptColumns = [
    {
      title: 'Département',
      dataIndex: 'department__name',
      key: 'department__name',
    },
    {
      title: 'Nombre d\'employés',
      dataIndex: 'count',
      key: 'count',
    },
  ];

  const missionStatusColumns = [
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (text) => {
        const statusMap = {
          'draft': { text: 'Brouillon', color: 'default' },
          'submitted': { text: 'Soumise', color: 'processing' },
          'approved_manager': { text: 'Approuvée par N+1', color: 'processing' },
          'approved_hr': { text: 'Approuvée par RH', color: 'processing' },
          'approved_finance': { text: 'Approuvée par Finance', color: 'success' },
          'rejected': { text: 'Rejetée', color: 'error' },
          'cancelled': { text: 'Annulée', color: 'default' },
          'completed': { text: 'Terminée', color: 'success' }
        };
        const status = statusMap[text] || { text, color: 'default' };
        return <Tag color={status.color}>{status.text}</Tag>;
      }
    },
    {
      title: 'Nombre',
      dataIndex: 'count',
      key: 'count',
    },
  ];

  const upcomingMissionsColumns = [
    {
      title: 'Employé',
      dataIndex: 'employee_name',
      key: 'employee_name',
    },
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => <Link to={`/hr/missions/${record.id}`}>{text}</Link>
    },
    {
      title: 'Date de début',
      dataIndex: 'start_date',
      key: 'start_date',
    },
    {
      title: 'Date de fin',
      dataIndex: 'end_date',
      key: 'end_date',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (text) => {
        const statusMap = {
          'draft': { text: 'Brouillon', color: 'default' },
          'submitted': { text: 'Soumise', color: 'processing' },
          'approved_manager': { text: 'Approuvée par N+1', color: 'processing' },
          'approved_hr': { text: 'Approuvée par RH', color: 'processing' },
          'approved_finance': { text: 'Approuvée par Finance', color: 'success' },
          'rejected': { text: 'Rejetée', color: 'error' },
          'cancelled': { text: 'Annulée', color: 'default' },
          'completed': { text: 'Terminée', color: 'success' }
        };
        const status = statusMap[text] || { text, color: 'default' };
        return <Tag color={status.color}>{status.text}</Tag>;
      }
    },
  ];

  const skillCoverageColumns = [
    {
      title: 'Département',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Nombre d\'employés',
      dataIndex: 'employee_count',
      key: 'employee_count',
    },
    {
      title: 'Couverture des compétences',
      dataIndex: 'skill_coverage',
      key: 'skill_coverage',
      render: (text) => (
        <Progress 
          percent={Number(text).toFixed(1)} 
          size="small" 
          status={text < 50 ? 'exception' : text < 80 ? 'normal' : 'success'} 
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="hr-dashboard">
        <Title level={2}>Tableau de bord RH</Title>
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      </div>
    );
  }

  return (
    <div className="hr-dashboard">
      <Title level={2}>Tableau de bord RH</Title>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Effectif total"
              value={stats.general.total_employees}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Missions en cours"
              value={stats.missions.by_status.find(s => s.status === 'approved_finance')?.count || 0}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Compétences"
              value={stats.skills.total}
              prefix={<ToolOutlined />}
              suffix={<Text type="secondary" style={{ fontSize: '14px' }}>{stats.skills.avg_per_employee.toFixed(1)} par employé</Text>}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} md={12}>
          <Card title="Répartition par département">
            <Table 
              dataSource={stats.general.employees_by_department} 
              columns={deptColumns} 
              rowKey="department__name"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Statut des missions">
            <Table 
              dataSource={stats.missions.by_status} 
              columns={missionStatusColumns} 
              rowKey="status"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="Missions à venir" extra={<Link to="/hr/missions">Voir toutes les missions</Link>}>
            <Table 
              dataSource={stats.missions.upcoming} 
              columns={upcomingMissionsColumns} 
              rowKey="id"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="Couverture des compétences par département">
            <Table 
              dataSource={stats.skills.coverage_by_department} 
              columns={skillCoverageColumns} 
              rowKey="department"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title="Bienvenue dans le module Ressources Humaines">
            <p>Ce module vous permet de gérer les employés, les départements, les postes, les missions, les compétences et les formations de votre entreprise.</p>
            <p>Utilisez le menu de gauche pour naviguer entre les différentes fonctionnalités.</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
