// src/components/crm/Dashboard.js
import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import { Row, Col, Card, Statistic, Typography, Spin, Alert } from 'antd';
import {
  UserOutlined, ShopOutlined, DollarOutlined, FundOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const CRMDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    contacts: 0,
    companies: 0,
    opportunities: 0,
    pipeline: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Récupérer les statistiques du CRM
        const response = await axios.get('/api/crm/dashboard/');
        console.log('Dashboard response:', response); // Pour déboguer
        
        // Pas besoin d'utiliser extractResultsFromResponse ici car l'endpoint dashboard 
        // renvoie directement un objet avec les statistiques
        setStats(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        setError("Impossible de charger les données. Veuillez réessayer plus tard.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="crm-dashboard">
        <Title level={2}>Tableau de bord CRM</Title>
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
    <div className="crm-dashboard">
      <Title level={2}>Tableau de bord CRM</Title>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Contacts"
              value={stats.contacts}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Entreprises"
              value={stats.companies}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Opportunités"
              value={stats.opportunities}
              prefix={<FundOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pipeline"
              value={stats.pipeline}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
              formatter={value => `${value} MAD`}
            />
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title="Bienvenue dans le CRM Cleo">
            <p>Ce module vous permet de gérer vos contacts, entreprises, opportunités et activités commerciales.</p>
            <p>Utilisez le menu de gauche pour naviguer entre les différentes fonctionnalités.</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CRMDashboard;
