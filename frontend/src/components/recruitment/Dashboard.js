// src/components/recruitment/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Typography, Spin, Alert, Divider } from 'antd';
import { 
  FileSearchOutlined, 
  TeamOutlined,
  CheckCircleOutlined,
  ScheduleOutlined 
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    job_openings_count: 0,
    active_job_openings_count: 0,
    applications_count: 0,
    recent_applications: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Pour l'instant, récupérons juste les informations de base
        // car le endpoint du dashboard n'est pas encore implémenté
        const jobOpeningsResponse = await axios.get('/api/recruitment/job-openings/');
        const applicationsResponse = await axios.get('/api/recruitment/applications/');
        
        // Extraire les données
        const jobOpenings = jobOpeningsResponse.data.results || [];
        const applications = applicationsResponse.data.results || [];
        
        // Calculer quelques statistiques simples
        const activeJobOpenings = jobOpenings.filter(job => job.status === 'published');
        const recentApplications = [...applications].sort((a, b) => 
          new Date(b.application_date) - new Date(a.application_date)
        ).slice(0, 5);
        
        setStats({
          job_openings_count: jobOpenings.length,
          active_job_openings_count: activeJobOpenings.length,
          applications_count: applications.length,
          recent_applications: recentApplications
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des données du tableau de bord:', error);
        setError('Impossible de charger les données. Veuillez réessayer plus tard.');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Configuration des colonnes pour la table des candidatures récentes
  const applicationsColumns = [
    {
      title: 'Candidat',
      dataIndex: 'candidate_name',
      key: 'candidate_name',
    },
    {
      title: 'Poste',
      dataIndex: 'job_opening_title',
      key: 'job_opening_title',
    },
    {
      title: 'Date de candidature',
      dataIndex: 'application_date',
      key: 'application_date',
      render: (text) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          'received': { text: 'Reçue' },
          'preselected': { text: 'Présélectionnée' },
          'rejected_screening': { text: 'Rejetée (présélection)' },
          'analysis': { text: 'En analyse' },
          'selected_for_interview': { text: 'Entretien prévu' },
          'rejected_analysis': { text: 'Rejetée (analyse)' },
          'interviewed': { text: 'Entretien effectué' },
          'rejected_interview': { text: 'Rejetée (après entretien)' },
          'selected': { text: 'Sélectionnée' },
          'hired': { text: 'Embauché' },
          'withdrawn': { text: 'Retirée' },
        };
        
        return statusMap[status]?.text || status;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Link to={`/recruitment/applications/${record.id}`}>
          Voir détails
        </Link>
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
      <div>
        <Title level={2}>Tableau de bord de recrutement</Title>
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="recruitment-dashboard">
      <Title level={2}>Tableau de bord de recrutement</Title>
      
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Offres d'emploi"
              value={stats.job_openings_count}
              prefix={<FileSearchOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Offres actives"
              value={stats.active_job_openings_count}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Candidatures"
              value={stats.applications_count}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Entretiens prévus"
              value={stats.recent_applications.filter(app => app.status === 'selected_for_interview').length}
              prefix={<ScheduleOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
      <Card 
        title="Candidatures récentes" 
        extra={<Link to="/recruitment/applications">Voir toutes</Link>}
        style={{ marginBottom: 24 }}
      >
        {stats.recent_applications.length > 0 ? (
          <Table 
            columns={applicationsColumns}
            dataSource={stats.recent_applications}
            rowKey="id"
            pagination={false}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Text type="secondary">Aucune candidature récente</Text>
          </div>
        )}
      </Card>
      
      <Row gutter={16}>
        <Col span={24}>
          <Card title="Démarrage rapide">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card type="inner" title="Créer une offre d'emploi">
                  <p>Créez une nouvelle offre d'emploi pour commencer le processus de recrutement.</p>
                  <Link to="/recruitment/job-openings/new">
                    Créer une offre
                  </Link>
                </Card>
              </Col>
              <Col span={8}>
                <Card type="inner" title="Gérer les candidatures">
                  <p>Consultez et gérez les candidatures reçues pour les offres d'emploi.</p>
                  <Link to="/recruitment/applications">
                    Voir les candidatures
                  </Link>
                </Card>
              </Col>
              <Col span={8}>
                <Card type="inner" title="Voir les statistiques">
                  <p>Consultez les statistiques et indicateurs de performance du recrutement.</p>
                  <Link to="/recruitment/statistics">
                    Voir les statistiques
                  </Link>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
