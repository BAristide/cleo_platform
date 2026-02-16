// src/components/crm/ActivityList.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Card, Typography, message, Tooltip, Popconfirm, Tag, DatePicker, Select } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CheckOutlined,
  CalendarOutlined, 
  UserOutlined,
  ShopOutlined,
  FundOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ActivityList = () => {
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [activityTypes, setActivityTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const STATUS_OPTIONS = [
    { value: 'planned', label: 'Planifiée', color: 'blue' },
    { value: 'completed', label: 'Terminée', color: 'green' },
    { value: 'cancelled', label: 'Annulée', color: 'red' }
  ];

  useEffect(() => {
    fetchActivities();
    fetchActivityTypes();
  }, [pagination.current, pagination.pageSize]);

  const fetchActivityTypes = async () => {
    try {
      const response = await axios.get('/api/crm/activity-types/');
      console.log('Activity Types API response:', response);
      const data = extractResultsFromResponse(response);
      setActivityTypes(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des types d'activités:", error);
      message.error("Impossible de charger les types d'activités");
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        search: searchText || undefined
      };
      
      if (selectedType) {
        params.activity_type = selectedType;
      }
      
      if (selectedStatus) {
        params.status = selectedStatus;
      }
      
      if (dateRange && dateRange.length === 2) {
        params.start_date_after = dateRange[0].format('YYYY-MM-DD');
        params.start_date_before = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await axios.get('/api/crm/activities/', { params });
      console.log('Activities API response:', response);
      
      // Utiliser l'utilitaire pour extraire les résultats
      const data = extractResultsFromResponse(response);
      
      // Mettre à jour la pagination avec les données de l'API
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count
        });
      }
      
      setActivities(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des activités:", error);
      message.error("Impossible de charger les activités");
      // Données de démonstration en cas d'erreur
      setActivities([
        {
          id: 1,
          subject: 'Appel de suivi',
          activity_type_name: 'Appel',
          activity_type_icon: 'phone',
          activity_type_color: '#1890ff',
          start_date: '2025-05-12T10:00:00Z',
          end_date: '2025-05-12T10:30:00Z',
          status: 'planned',
          company_name: 'TechMaroc',
          opportunity_name: 'Projet développement web',
          contact_names: ['Ahmed Bennani']
        },
        {
          id: 2,
          subject: 'Démonstration du produit',
          activity_type_name: 'Réunion',
          activity_type_icon: 'team',
          activity_type_color: '#52c41a',
          start_date: '2025-05-15T14:00:00Z',
          end_date: '2025-05-15T15:30:00Z',
          status: 'planned',
          company_name: 'Santé Plus',
          opportunity_name: 'Système gestion hospitalière',
          contact_names: ['Sara Alaoui', 'Mohamed Chraibi']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/crm/activities/${id}/`);
      message.success('Activité supprimée avec succès');
      fetchActivities();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer l'activité");
    }
  };

  const handleComplete = async (id) => {
    try {
      await axios.post(`/api/crm/activities/${id}/complete/`);
      message.success('Activité marquée comme terminée');
      fetchActivities();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      message.error("Impossible de mettre à jour le statut de l'activité");
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
    fetchActivities();
  };

  const resetSearch = () => {
    setSearchText('');
    setDateRange(null);
    setSelectedType(null);
    setSelectedStatus(null);
    setPagination({
      ...pagination,
      current: 1
    });
    fetchActivities();
  };

  const columns = [
    {
      title: 'Sujet',
      dataIndex: 'subject',
      key: 'subject',
      render: (text, record) => (
        <Link to={`/crm/activities/${record.id}`}>{text}</Link>
      ),
      sorter: true
    },
    {
      title: 'Type',
      key: 'activity_type',
      render: (text, record) => (
        <Tag color={record.activity_type_color}>
          {record.activity_type_icon && <span className={`anticon anticon-${record.activity_type_icon}`} style={{ marginRight: 5 }} />}
          {record.activity_type_name}
        </Tag>
      ),
      filters: activityTypes.map(type => ({ text: type.name, value: type.id })),
      onFilter: (value, record) => record.activity_type_id === value
    },
    {
      title: 'Date & Heure',
      key: 'date',
      render: (text, record) => (
        <span>
          {moment(record.start_date).format('DD/MM/YYYY HH:mm')}
          {record.end_date && ` - ${moment(record.end_date).format('HH:mm')}`}
        </span>
      ),
      sorter: (a, b) => new Date(a.start_date) - new Date(b.start_date)
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusInfo = STATUS_OPTIONS.find(opt => opt.value === status) || { 
          value: status, 
          label: status.charAt(0).toUpperCase() + status.slice(1), 
          color: 'default' 
        };
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
      filters: STATUS_OPTIONS.map(status => ({ text: status.label, value: status.value })),
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Entreprise',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (text, record) => text ? (
        <Link to={`/crm/companies/${record.company_id}`}>
          <Space>
            <ShopOutlined />
            {text}
          </Space>
        </Link>
      ) : null
    },
    {
      title: 'Opportunité',
      dataIndex: 'opportunity_name',
      key: 'opportunity_name',
      render: (text, record) => text ? (
        <Link to={`/crm/opportunities/${record.opportunity_id}`}>
          <Space>
            <FundOutlined />
            {text}
          </Space>
        </Link>
      ) : null
    },
    {
      title: 'Contacts',
      dataIndex: 'contact_names',
      key: 'contact_names',
      render: (contacts, record) => (
        <>
          {contacts && contacts.map((contact, index) => (
            <Tag key={index} icon={<UserOutlined />}>
              {contact}
            </Tag>
          ))}
        </>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space size="small">
          <Button size="small">
            <Link to={`/crm/activities/${record.id}`}>Détails</Link>
          </Button>
          {record.status === 'planned' && (
            <Button 
              size="small" 
              type="primary" 
              icon={<CheckOutlined />} 
              onClick={() => handleComplete(record.id)}
            >
              Terminée
            </Button>
          )}
          <Button size="small" icon={<EditOutlined />}>
            <Link to={`/crm/activities/${record.id}/edit`}>Modifier</Link>
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer cette activité?"
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
    <div className="activity-list-container">
      <Card>
        <Title level={2}>Activités</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap>
              <Input
                placeholder="Rechercher une activité..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                prefix={<SearchOutlined />}
                style={{ width: 250 }}
              />
              <Select
                placeholder="Type d'activité"
                style={{ width: 180 }}
                allowClear
                value={selectedType}
                onChange={setSelectedType}
              >
                {activityTypes.map(type => (
                  <Option key={type.id} value={type.id}>
                    <Tag color={type.color}>{type.name}</Tag>
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Statut"
                style={{ width: 150 }}
                allowClear
                value={selectedStatus}
                onChange={setSelectedStatus}
              >
                {STATUS_OPTIONS.map(status => (
                  <Option key={status.value} value={status.value}>
                    <Tag color={status.color}>{status.label}</Tag>
                  </Option>
                ))}
              </Select>
              <RangePicker 
                placeholder={['Date début', 'Date fin']}
                value={dateRange}
                onChange={setDateRange}
              />
              <Button onClick={handleSearch} type="primary">Rechercher</Button>
              {(searchText || selectedType || selectedStatus || dateRange) && 
                <Button onClick={resetSearch}>Réinitialiser</Button>
              }
            </Space>
            <Space style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button type="primary" icon={<PlusOutlined />}>
                <Link to="/crm/activities/new">Nouvelle Activité</Link>
              </Button>
            </Space>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={activities}
          loading={loading}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default ActivityList;
