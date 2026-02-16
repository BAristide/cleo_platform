// src/components/crm/CompanyList.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Card, Typography, message, Tooltip, Popconfirm, Tag } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  FundOutlined,
  TeamOutlined 
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;

const CompanyList = () => {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [industries, setIndustries] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    fetchCompanies();
    fetchIndustries();
  }, [pagination.current, pagination.pageSize]);

  const fetchIndustries = async () => {
    try {
      const response = await axios.get('/api/crm/industries/');
      console.log('Industries API response:', response);
      const data = extractResultsFromResponse(response);
      setIndustries(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des industries:", error);
      message.error("Impossible de charger les industries");
    }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/crm/companies/', {
        params: {
          page: pagination.current,
          page_size: pagination.pageSize,
          search: searchText || undefined
        }
      });
      
      console.log('Companies API response:', response);
      
      // Utiliser l'utilitaire pour extraire les résultats
      const data = extractResultsFromResponse(response);
      
      // Mettre à jour la pagination avec les données de l'API
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count
        });
      }
      
      setCompanies(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des entreprises:", error);
      message.error("Impossible de charger les entreprises");
      // Données de démonstration en cas d'erreur
      setCompanies([
        {
          id: 1,
          name: 'TechMaroc',
          industry_name: 'Technologie',
          city: 'Casablanca',
          country: 'Maroc',
          phone: '+212 5 22 123 456',
          email: 'contact@techmaroc.ma',
          website: 'https://www.techmaroc.ma',
          score: 75,
          contact_count: 3,
          opportunity_count: 2
        },
        {
          id: 2,
          name: 'Santé Plus',
          industry_name: 'Santé',
          city: 'Rabat',
          country: 'Maroc',
          phone: '+212 5 37 789 123',
          email: 'info@santeplus.ma',
          website: 'https://www.santeplus.ma',
          score: 60,
          contact_count: 2,
          opportunity_count: 1
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/crm/companies/${id}/`);
      message.success('Entreprise supprimée avec succès');
      fetchCompanies();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer l'entreprise");
    }
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const handleSearch = () => {
    setPagination({
      ...pagination,
      current: 1 // Réinitialiser à la première page lors d'une recherche
    });
    fetchCompanies();
  };

  const resetSearch = () => {
    setSearchText('');
    setPagination({
      ...pagination,
      current: 1
    });
    fetchCompanies();
  };

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Link to={`/crm/companies/${record.id}`}>{text}</Link>
      ),
      sorter: true
    },
    {
      title: 'Industrie',
      dataIndex: 'industry_name',
      key: 'industry_name',
      filters: industries.map(industry => ({ text: industry.name, value: industry.id })),
      onFilter: (value, record) => record.industry_id === value
    },
    {
      title: 'Localisation',
      key: 'location',
      render: (text, record) => (
        <span>
          {record.city}{record.city && record.country ? ', ' : ''}{record.country}
        </span>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (text, record) => (
        <Space>
          {record.email && (
            <Tooltip title={record.email}>
              <a href={`mailto:${record.email}`}>
                <MailOutlined />
              </a>
            </Tooltip>
          )}
          {record.phone && (
            <Tooltip title={record.phone}>
              <a href={`tel:${record.phone}`}>
                <PhoneOutlined />
              </a>
            </Tooltip>
          )}
          {record.website && (
            <Tooltip title={record.website}>
              <a href={record.website} target="_blank" rel="noopener noreferrer">
                <GlobalOutlined />
              </a>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score) => {
        let color = 'green';
        if (score < 30) {
          color = 'red';
        } else if (score < 70) {
          color = 'orange';
        }
        return <Tag color={color}>{score}</Tag>;
      },
      sorter: (a, b) => a.score - b.score
    },
    {
      title: 'Contacts',
      dataIndex: 'contact_count',
      key: 'contact_count',
      render: (count, record) => (
        <Link to={`/crm/companies/${record.id}/contacts`}>
          <Space>
            <TeamOutlined />
            {count}
          </Space>
        </Link>
      )
    },
    {
      title: 'Opportunités',
      dataIndex: 'opportunity_count',
      key: 'opportunity_count',
      render: (count, record) => (
        <Link to={`/crm/companies/${record.id}/opportunities`}>
          <Space>
            <FundOutlined />
            {count}
          </Space>
        </Link>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space size="small">
          <Button size="small">
            <Link to={`/crm/companies/${record.id}`}>Détails</Link>
          </Button>
          <Button size="small" icon={<EditOutlined />}>
            <Link to={`/crm/companies/${record.id}/edit`}>Modifier</Link>
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer cette entreprise?"
            onConfirm={() => handleDelete(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Supprimer
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="company-list-container">
      <Card>
        <Title level={2}>Entreprises</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Rechercher une entreprise..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
            />
            <Button onClick={handleSearch} type="primary">Rechercher</Button>
            {searchText && <Button onClick={resetSearch}>Réinitialiser</Button>}
          </Space>

          <Button type="primary" icon={<PlusOutlined />}>
            <Link to="/crm/companies/new">Nouvelle Entreprise</Link>
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={companies}
          loading={loading}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default CompanyList;
