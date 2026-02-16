// src/components/recruitment/ApplicationDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, Typography, Descriptions, Tag, Button, Spin, Alert, Row, Col, Space, Timeline, Divider } from 'antd';
import { 
  UserOutlined, 
  FileTextOutlined, 
  MailOutlined, 
  PhoneOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title, Paragraph, Text } = Typography;

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [application, setApplication] = useState(null);
  
  useEffect(() => {
    const fetchApplication = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/recruitment/applications/${id}/`);
        setApplication(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement de la candidature:', error);
        setError('Impossible de charger la candidature. Veuillez réessayer plus tard.');
        setLoading(false);
      }
    };
    
    fetchApplication();
  }, [id]);
  
  const getStatusTag = (status) => {
    const statusMap = {
      'received': { color: 'blue', text: 'Reçue' },
      'preselected': { color: 'cyan', text: 'Présélectionnée' },
      'rejected_screening': { color: 'red', text: 'Rejetée (présélection)' },
      'analysis': { color: 'purple', text: 'En analyse' },
      'selected_for_interview': { color: 'orange', text: 'Entretien prévu' },
      'rejected_analysis': { color: 'red', text: 'Rejetée (analyse)' },
      'interviewed': { color: 'geekblue', text: 'Entretien effectué' },
      'rejected_interview': { color: 'red', text: 'Rejetée (après entretien)' },
      'selected': { color: 'lime', text: 'Sélectionnée' },
      'hired': { color: 'green', text: 'Embauché' },
      'withdrawn': { color: 'grey', text: 'Retirée' },
    };
    
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };
  
  const handlePreselectApplication = async () => {
    try {
      await axios.post(`/api/recruitment/applications/${id}/preselect/`);
      setApplication({ ...application, status: 'preselected' });
    } catch (error) {
      console.error('Erreur lors de la présélection:', error);
    }
  };
  
  const handleRejectApplication = async () => {
    try {
      await axios.post(`/api/recruitment/applications/${id}/reject/`);
      
      // Déterminer le nouveau statut en fonction du statut actuel
      let newStatus;
      if (application.status === 'received') {
        newStatus = 'rejected_screening';
      } else if (['preselected', 'analysis'].includes(application.status)) {
        newStatus = 'rejected_analysis';
      } else if (['selected_for_interview', 'interviewed'].includes(application.status)) {
        newStatus = 'rejected_interview';
      } else {
        newStatus = application.status;
      }
      
      setApplication({ ...application, status: newStatus });
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
    }
  };
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert
        message="Erreur"
        description={error}
        type="error"
        showIcon
      />
    );
  }
  
  if (!application) {
    return (
      <Alert
        message="Candidature introuvable"
        description="La candidature que vous recherchez n'existe pas ou a été supprimée."
        type="warning"
        showIcon
      />
    );
  }
  
  return (
    <div className="application-detail">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>Candidature: {application.candidate_name}</Title>
          <Space>
            {getStatusTag(application.status)}
            <Text type="secondary">Date de candidature: {new Date(application.application_date).toLocaleDateString()}</Text>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button 
              type="default" 
              onClick={() => navigate('/recruitment/applications')}
            >
              Retour
            </Button>
            
            {application.status === 'received' && (
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />}
                onClick={handlePreselectApplication}
              >
                Présélectionner
              </Button>
            )}
            
            {['received', 'preselected', 'analysis', 'selected_for_interview', 'interviewed'].includes(application.status) && (
              <Button 
                danger 
                icon={<CloseCircleOutlined />}
                onClick={handleRejectApplication}
              >
                Rejeter
              </Button>
            )}
            
            {application.status === 'preselected' && (
              <Link to={`/recruitment/applications/${id}/schedule-interview`}>
                <Button type="primary" icon={<ScheduleOutlined />}>
                  Planifier entretien
                </Button>
              </Link>
            )}
          </Space>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={16}>
          <Card title={<><UserOutlined /> Informations du candidat</>} style={{ marginBottom: 16 }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Nom complet">{application.candidate_name}</Descriptions.Item>
              <Descriptions.Item label="Email"><MailOutlined /> {application.candidate_email}</Descriptions.Item>
              <Descriptions.Item label="Téléphone">{application.candidate_phone ? <><PhoneOutlined /> {application.candidate_phone}</> : 'Non spécifié'}</Descriptions.Item>
              <Descriptions.Item label="CV">
                <a href={application.resume} target="_blank" rel="noopener noreferrer">
                  <FileTextOutlined /> Télécharger le CV
                </a>
              </Descriptions.Item>
              {application.cover_letter && (
                <Descriptions.Item label="Lettre de motivation" span={2}>
                  <a href={application.cover_letter} target="_blank" rel="noopener noreferrer">
                    <FileTextOutlined /> Télécharger la lettre de motivation
                  </a>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
          
          <Card title="Poste concerné" style={{ marginBottom: 16 }}>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Titre">
                <Link to={`/recruitment/job-openings/${application.job_opening_id}`}>
                  {application.job_opening_title}
                </Link>
              </Descriptions.Item>
            </Descriptions>
          </Card>
          
          {application.notes && (
            <Card title="Notes" style={{ marginBottom: 16 }}>
              <Paragraph style={{ whiteSpace: 'pre-line' }}>{application.notes}</Paragraph>
            </Card>
          )}
        </Col>
        
        <Col span={8}>
          <Card title="Entretien" style={{ marginBottom: 16 }}>
            {application.interview_date ? (
              <Descriptions bordered column={1}>
                <Descriptions.Item label="Date d'entretien">
                  {new Date(application.interview_date).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Lieu">
                  <EnvironmentOutlined /> {application.interview_location || 'Non spécifié'}
                </Descriptions.Item>
                <Descriptions.Item label="Statut">
                  {application.status === 'selected_for_interview' 
                    ? <Tag color="orange">Entretien prévu</Tag>
                    : application.status === 'interviewed'
                    ? <Tag color="geekblue">Entretien effectué</Tag>
                    : <Tag>Pas d'entretien</Tag>
                  }
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">Aucun entretien planifié</Text>
            )}
          </Card>
          
          <Card title="Évaluations" style={{ marginBottom: 16 }}>
            {application.evaluations_count > 0 ? (
              <p>Ce candidat a reçu {application.evaluations_count} évaluation(s).</p>
            ) : (
              <Text type="secondary">Aucune évaluation pour ce candidat</Text>
            )}
          </Card>
          
          <Card title="Suivi du processus">
            <Timeline>
              <Timeline.Item color="blue">
                <p><strong>Candidature reçue</strong></p>
                <p>{new Date(application.application_date).toLocaleString()}</p>
              </Timeline.Item>
              
              {application.status !== 'received' && application.status !== 'rejected_screening' && (
                <Timeline.Item color="cyan">
                  <p><strong>Présélectionnée</strong></p>
                </Timeline.Item>
              )}
              
              {application.status === 'rejected_screening' && (
                <Timeline.Item color="red">
                  <p><strong>Rejetée (présélection)</strong></p>
                </Timeline.Item>
              )}
              
              {['selected_for_interview', 'interviewed', 'rejected_interview', 'selected', 'hired'].includes(application.status) && (
                <Timeline.Item color="orange">
                  <p><strong>Entretien programmé</strong></p>
                  {application.interview_date && <p>{new Date(application.interview_date).toLocaleString()}</p>}
                </Timeline.Item>
              )}
              
              {['interviewed', 'rejected_interview', 'selected', 'hired'].includes(application.status) && (
                <Timeline.Item color="blue">
                  <p><strong>Entretien effectué</strong></p>
                </Timeline.Item>
              )}
              
              {application.status === 'rejected_interview' && (
                <Timeline.Item color="red">
                  <p><strong>Rejetée (après entretien)</strong></p>
                </Timeline.Item>
              )}
              
              {['selected', 'hired'].includes(application.status) && (
                <Timeline.Item color="lime">
                  <p><strong>Candidat sélectionné</strong></p>
                </Timeline.Item>
              )}
              
              {application.status === 'hired' && (
                <Timeline.Item color="green">
                  <p><strong>Candidat embauché</strong></p>
                </Timeline.Item>
              )}
            </Timeline>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ApplicationDetail;
