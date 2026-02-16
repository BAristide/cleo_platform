// src/components/recruitment/ApplicationList.js
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Card, Input, Select, Space, Typography, Spin, Row, Col, Badge, Divider, Descriptions, Popconfirm, message } from 'antd';
import { SearchOutlined, FileTextOutlined, UserOutlined, MailOutlined, PhoneOutlined, FileSearchOutlined, SendOutlined, CloseCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const ApplicationList = () => {
  const { jobId } = useParams(); // Si on vient d'une offre d'emploi spécifique
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [jobOpening, setJobOpening] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Filtres
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  
  // États de suivi
  const [appliedFilters, setAppliedFilters] = useState({});
  
  // Charger l'offre d'emploi si on a un jobId
  useEffect(() => {
    if (jobId) {
      const fetchJobOpening = async () => {
        try {
          const response = await axios.get(`/api/recruitment/job-openings/${jobId}/`);
          setJobOpening(response.data);
        } catch (error) {
          console.error('Erreur lors du chargement de l\'offre d\'emploi:', error);
        }
      };
      
      fetchJobOpening();
    }
  }, [jobId]);
  
  // Charger les candidatures
  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        let queryParams = `page=${page}&page_size=${pageSize}`;
        
        // Ajouter le filtre par offre d'emploi si on a un jobId
        if (jobId) {
          queryParams += `&job_opening=${jobId}`;
        }
        
        // Ajouter les filtres appliqués
        if (appliedFilters.status) {
          queryParams += `&status=${appliedFilters.status}`;
        }
        if (appliedFilters.search) {
          queryParams += `&search=${appliedFilters.search}`;
        }
        
        const response = await axios.get(`/api/recruitment/applications/?${queryParams}`);
        
        // Extraction des résultats et du total
        const data = response.data;
        const results = extractResultsFromResponse(response);
        
        setApplications(results);
        setTotalItems(data.count || results.length);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des candidatures:', error);
        setLoading(false);
      }
    };
    
    fetchApplications();
  }, [jobId, page, pageSize, appliedFilters]);
  
  // Gestionnaires d'événements
  const handleSearch = () => {
    setPage(1); // Réinitialiser la pagination
    setAppliedFilters({...filters});
  };
  
  const handleReset = () => {
    setFilters({
      status: '',
      search: '',
    });
    setAppliedFilters({});
    setPage(1);
  };
  
  const handleTableChange = (pagination) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };
  
  // Gestion des actions sur les candidatures
  const handlePreselectApplication = async (id) => {
    try {
      await axios.post(`/api/recruitment/applications/${id}/preselect/`);
      message.success('Candidature présélectionnée avec succès');
      
      // Mettre à jour l'état local pour éviter de recharger la page
      setApplications(applications.map(app => 
        app.id === id ? {...app, status: 'preselected'} : app
      ));
    } catch (error) {
      console.error('Erreur lors de la présélection:', error);
      message.error('Erreur lors de la présélection. Veuillez réessayer.');
    }
  };
  
  const handleRejectApplication = async (id) => {
    try {
      await axios.post(`/api/recruitment/applications/${id}/reject/`);
      message.success('Candidature rejetée avec succès');
      
      // Mettre à jour l'état local
      setApplications(applications.map(app => {
        if (app.id === id) {
          // Déterminer le nouveau statut en fonction du statut actuel
          let newStatus;
          if (app.status === 'received') {
            newStatus = 'rejected_screening';
          } else if (['preselected', 'analysis'].includes(app.status)) {
            newStatus = 'rejected_analysis';
          } else if (['selected_for_interview', 'interviewed'].includes(app.status)) {
            newStatus = 'rejected_interview';
          } else {
            newStatus = app.status;
          }
          
          return {...app, status: newStatus};
        }
        return app;
      }));
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      message.error('Erreur lors du rejet. Veuillez réessayer.');
    }
  };
  
  // Configuration des colonnes du tableau
  const columns = [
    {
      title: 'Candidat',
      dataIndex: 'candidate',
      key: 'candidate',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text strong><UserOutlined /> {record.candidate_name}</Text>
          <Text type="secondary"><MailOutlined /> {record.candidate_email}</Text>
          {record.candidate_phone && <Text type="secondary"><PhoneOutlined /> {record.candidate_phone}</Text>}
        </Space>
      ),
    },
    {
      title: 'Poste',
      dataIndex: 'job_opening',
      key: 'job_opening',
      render: (_, record) => (
        !jobId ? (
          <Link to={`/recruitment/job-openings/${record.job_opening_id}`}>
            {record.job_opening_title}
          </Link>
        ) : (
          record.job_opening_title
        )
      ),
    },
    {
      title: 'Date de candidature',
      dataIndex: 'application_date',
      key: 'application_date',
      render: (text) => text ? moment(text).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
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
      },
    },
    {
      title: 'CV',
      key: 'resume',
      render: (_, record) => (
        <Button
          type="link"
          icon={<FileTextOutlined />}
          href={record.resume}
          target="_blank"
        >
          Télécharger
        </Button>
      ),
    },
    {
      title: 'Entretien',
      dataIndex: 'interview_date',
      key: 'interview_date',
      render: (text) => text ? moment(text).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Link to={`/recruitment/applications/${record.id}`}>
            <Button type="primary" size="small" icon={<FileSearchOutlined />}>Détails</Button>
          </Link>
          
          {record.status === 'received' && (
            <Popconfirm
              title="Voulez-vous présélectionner cette candidature?"
              onConfirm={() => handlePreselectApplication(record.id)}
              okText="Oui"
              cancelText="Non"
            >
              <Button size="small" type="default" icon={<CheckCircleOutlined />}>Présélectionner</Button>
            </Popconfirm>
          )}
          
          {['received', 'preselected', 'analysis', 'selected_for_interview', 'interviewed'].includes(record.status) && (
            <Popconfirm
              title="Voulez-vous rejeter cette candidature?"
              onConfirm={() => handleRejectApplication(record.id)}
              okText="Oui"
              cancelText="Non"
            >
              <Button size="small" danger icon={<CloseCircleOutlined />}>Rejeter</Button>
            </Popconfirm>
          )}
          
          {record.status === 'preselected' && (
            <Link to={`/recruitment/applications/${record.id}/schedule-interview`}>
              <Button size="small" type="primary" icon={<SendOutlined />}>Planifier entretien</Button>
            </Link>
          )}
        </Space>
      ),
    },
  ];
  
  return (
    <div className="recruitment-applications">
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col>
          <Title level={2}>
            {jobOpening
              ? `Candidatures pour ${jobOpening.title}`
              : 'Toutes les candidatures'}
          </Title>
        </Col>
        <Col>
          {jobOpening && (
            <Space>
              <Button type="default" onClick={() => navigate('/recruitment/job-openings')}>
                Retour aux offres
              </Button>
              <Link to={`/recruitment/job-openings/${jobId}`}>
                <Button type="primary">Détails de l'offre</Button>
              </Link>
            </Space>
          )}
        </Col>
      </Row>
      
      {jobOpening && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions title="Informations sur l'offre" bordered size="small">
            <Descriptions.Item label="Référence">{jobOpening.reference}</Descriptions.Item>
            <Descriptions.Item label="Département">{jobOpening.department_name}</Descriptions.Item>
            <Descriptions.Item label="Poste">{jobOpening.job_title_name}</Descriptions.Item>
            <Descriptions.Item label="Date d'ouverture">
              {jobOpening.opening_date ? moment(jobOpening.opening_date).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Tag color={jobOpening.status === 'published' ? 'blue' : 'default'}>
                {jobOpening.status === 'published' ? 'Publié' : jobOpening.status}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
      
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Input
              placeholder="Rechercher un candidat..."
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col span={12}>
            <Select
              placeholder="Statut de la candidature"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={value => setFilters({...filters, status: value})}
              allowClear
            >
              <Option value="received">Reçue</Option>
              <Option value="preselected">Présélectionnée</Option>
              <Option value="rejected_screening">Rejetée (présélection)</Option>
              <Option value="analysis">En analyse</Option>
              <Option value="selected_for_interview">Entretien prévu</Option>
              <Option value="rejected_analysis">Rejetée (analyse)</Option>
              <Option value="interviewed">Entretien effectué</Option>
              <Option value="rejected_interview">Rejetée (après entretien)</Option>
              <Option value="selected">Sélectionnée</Option>
              <Option value="hired">Embauché</Option>
              <Option value="withdrawn">Retirée</Option>
            </Select>
          </Col>
        </Row>
        <Row style={{ marginTop: 16 }}>
          <Col>
            <Space>
              <Button type="primary" onClick={handleSearch}>
                Rechercher
              </Button>
              <Button onClick={handleReset}>Réinitialiser</Button>
            </Space>
          </Col>
        </Row>
      </Card>
      
      {loading ? (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={applications}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: totalItems,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} candidatures`,
          }}
          onChange={handleTableChange}
        />
      )}
    </div>
  );
};

export default ApplicationList;
