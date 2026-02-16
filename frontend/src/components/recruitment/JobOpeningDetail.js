// src/components/recruitment/JobOpeningDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, Typography, Descriptions, Tag, Button, Spin, Alert, Row, Col, Space, Divider } from 'antd';
import { EditOutlined, TeamOutlined, MailOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title, Paragraph } = Typography;

const JobOpeningDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobOpening, setJobOpening] = useState(null);
  
  useEffect(() => {
    const fetchJobOpening = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/recruitment/job-openings/${id}/`);
        setJobOpening(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'offre d\'emploi:', error);
        setError('Impossible de charger l\'offre d\'emploi. Veuillez réessayer plus tard.');
        setLoading(false);
      }
    };
    
    fetchJobOpening();
  }, [id]);
  
  const getStatusTag = (status) => {
    const statusMap = {
      'draft': { color: 'default', text: 'Brouillon' },
      'published': { color: 'blue', text: 'Publié' },
      'in_progress': { color: 'processing', text: 'En cours' },
      'interviewing': { color: 'purple', text: 'Entretiens' },
      'closed': { color: 'green', text: 'Clôturé' },
      'cancelled': { color: 'red', text: 'Annulé' },
    };
    
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
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
  
  if (!jobOpening) {
    return (
      <Alert
        message="Offre d'emploi introuvable"
        description="L'offre d'emploi que vous recherchez n'existe pas ou a été supprimée."
        type="warning"
        showIcon
      />
    );
  }
  
  return (
    <div className="job-opening-detail">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>{jobOpening.title}</Title>
          <Space>
            <Tag>Réf: {jobOpening.reference}</Tag>
            {getStatusTag(jobOpening.status)}
          </Space>
        </Col>
        <Col>
          <Space>
            <Button 
              type="default" 
              onClick={() => navigate('/recruitment/job-openings')}
            >
              Retour
            </Button>
            <Link to={`/recruitment/job-openings/${id}/edit`}>
              <Button type="primary" icon={<EditOutlined />}>
                Modifier
              </Button>
            </Link>
            <Link to={`/recruitment/job-openings/${id}/applications`}>
              <Button type="primary" icon={<TeamOutlined />}>
                Candidatures ({jobOpening.applications_count || 0})
              </Button>
            </Link>
          </Space>
        </Col>
      </Row>
      
      <Card title="Informations générales" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Département">{jobOpening.department_name}</Descriptions.Item>
          <Descriptions.Item label="Poste">{jobOpening.job_title_name}</Descriptions.Item>
          <Descriptions.Item label="Type de contrat">{jobOpening.contract_type}</Descriptions.Item>
          <Descriptions.Item label="Lieu">{jobOpening.location}</Descriptions.Item>
          <Descriptions.Item label="Télétravail possible">
            {jobOpening.is_remote ? <CheckOutlined style={{ color: 'green' }} /> : <CloseOutlined style={{ color: 'red' }} />}
          </Descriptions.Item>
          <Descriptions.Item label="Fourchette de salaire">{jobOpening.salary_range || 'Non spécifié'}</Descriptions.Item>
          <Descriptions.Item label="Date d'ouverture">
            {new Date(jobOpening.opening_date).toLocaleDateString()}
          </Descriptions.Item>
          <Descriptions.Item label="Date de clôture">
            {jobOpening.closing_date ? new Date(jobOpening.closing_date).toLocaleDateString() : 'Non spécifiée'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      
      <Row gutter={16}>
        <Col span={24}>
          <Card title="Description du poste" style={{ marginBottom: 16 }}>
            <Paragraph style={{ whiteSpace: 'pre-line' }}>{jobOpening.description}</Paragraph>
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Exigences / Qualifications" style={{ marginBottom: 16 }}>
            <Paragraph style={{ whiteSpace: 'pre-line' }}>{jobOpening.requirements}</Paragraph>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Responsabilités" style={{ marginBottom: 16 }}>
            <Paragraph style={{ whiteSpace: 'pre-line' }}>{jobOpening.responsibilities}</Paragraph>
          </Card>
        </Col>
      </Row>
      
      <Card title="Informations de candidature">
        <Paragraph>
          URL de candidature: <a href={jobOpening.application_url} target="_blank" rel="noopener noreferrer">
            {jobOpening.application_url}
          </a>
        </Paragraph>
      </Card>
    </div>
  );
};

export default JobOpeningDetail;
