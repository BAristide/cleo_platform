// src/components/recruitment/JobOpeningList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Tag, Card, Input, Select, DatePicker, Space, Typography, Spin, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const JobOpeningList = () => {
  const [loading, setLoading] = useState(true);
  const [jobOpenings, setJobOpenings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Filtres
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    search: '',
    dateRange: [],
  });
  
  // États de suivi
  const [appliedFilters, setAppliedFilters] = useState({});
  
  useEffect(() => {
    // Charger les départements pour le filtre
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/api/hr/departments/');
        const depts = extractResultsFromResponse(response);
        setDepartments(depts);
      } catch (error) {
        console.error('Erreur lors du chargement des départements:', error);
      }
    };
    
    fetchDepartments();
  }, []);
  
  useEffect(() => {
    // Charger les offres d'emploi avec filtres
    const fetchJobOpenings = async () => {
      setLoading(true);
      try {
        let queryParams = `page=${page}&page_size=${pageSize}`;
        
        // Ajouter les filtres appliqués
        if (appliedFilters.status) {
          queryParams += `&status=${appliedFilters.status}`;
        }
        if (appliedFilters.department) {
          queryParams += `&department=${appliedFilters.department}`;
        }
        if (appliedFilters.search) {
          queryParams += `&search=${appliedFilters.search}`;
        }
        if (appliedFilters.dateRange && appliedFilters.dateRange.length === 2) {
          queryParams += `&opening_date_after=${appliedFilters.dateRange[0].format('YYYY-MM-DD')}`;
          queryParams += `&opening_date_before=${appliedFilters.dateRange[1].format('YYYY-MM-DD')}`;
        }
        
        const response = await axios.get(`/api/recruitment/job-openings/?${queryParams}`);
        
        // Extraction des résultats et du total
        const data = response.data;
        const results = extractResultsFromResponse(response);
        
        setJobOpenings(results);
        setTotalItems(data.count || results.length);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des offres d\'emploi:', error);
        setLoading(false);
      }
    };
    
    fetchJobOpenings();
  }, [page, pageSize, appliedFilters]);
  
  // Gestionnaires d'événements
  const handleSearch = () => {
    setPage(1); // Réinitialiser la pagination
    setAppliedFilters({...filters});
  };
  
  const handleReset = () => {
    setFilters({
      status: '',
      department: '',
      search: '',
      dateRange: [],
    });
    setAppliedFilters({});
    setPage(1);
  };
  
  const handleTableChange = (pagination) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };
  
  // Configuration des colonnes du tableau
  const columns = [
    {
      title: 'Référence',
      dataIndex: 'reference',
      key: 'reference',
      render: (text, record) => <Link to={`/recruitment/job-openings/${record.id}`}>{text}</Link>,
    },
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Département',
      dataIndex: 'department_name',
      key: 'department_name',
    },
    {
      title: 'Date d\'ouverture',
      dataIndex: 'opening_date',
      key: 'opening_date',
      render: (text) => text ? moment(text).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
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
      },
    },
    {
      title: 'Candidatures',
      dataIndex: 'applications_count',
      key: 'applications_count',
      render: (text, record) => (
        <Link to={`/recruitment/job-openings/${record.id}/applications`}>
          <Button type="link" icon={<TeamOutlined />}>{text || 0}</Button>
        </Link>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Link to={`/recruitment/job-openings/${record.id}`}>
            <Button type="primary" size="small">Détails</Button>
          </Link>
          <Link to={`/recruitment/job-openings/${record.id}/edit`}>
            <Button size="small">Modifier</Button>
          </Link>
        </Space>
      ),
    },
  ];
  
  return (
    <div className="recruitment-job-openings">
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col>
          <Title level={2}>Offres d'emploi</Title>
        </Col>
        <Col>
          <Link to="/recruitment/job-openings/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Nouvelle offre
            </Button>
          </Link>
        </Col>
      </Row>
      
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="Rechercher une offre..."
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col span={5}>
            <Select
              placeholder="Statut"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={value => setFilters({...filters, status: value})}
              allowClear
            >
              <Option value="draft">Brouillon</Option>
              <Option value="published">Publié</Option>
              <Option value="in_progress">En cours</Option>
              <Option value="interviewing">Entretiens</Option>
              <Option value="closed">Clôturé</Option>
              <Option value="cancelled">Annulé</Option>
            </Select>
          </Col>
          <Col span={5}>
            <Select
              placeholder="Département"
              style={{ width: '100%' }}
              value={filters.department}
              onChange={value => setFilters({...filters, department: value})}
              allowClear
            >
              {departments.map(dept => (
                <Option key={dept.id} value={dept.id}>{dept.name}</Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['Date début', 'Date fin']}
              value={filters.dateRange}
              onChange={dates => setFilters({...filters, dateRange: dates})}
            />
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
          dataSource={jobOpenings}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: totalItems,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} offres d'emploi`,
          }}
          onChange={handleTableChange}
        />
      )}
    </div>
  );
};

export default JobOpeningList;
