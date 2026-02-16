// src/components/payroll/PayrollPeriodList.js
import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Button, Space, Tag, Typography, 
  message, Popconfirm, Spin, Input, DatePicker 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  CheckCircleOutlined, CloseCircleOutlined, SearchOutlined 
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const PayrollPeriodList = () => {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    date_range: null
  });
  const navigate = useNavigate();

  const fetchData = async (page = 1, pageSize = 10, filters = {}) => {
    setLoading(true);
    try {
      let url = `/api/payroll/periods/?page=${page}&page_size=${pageSize}`;
      
      if (filters.search) {
        url += `&search=${filters.search}`;
      }
      
      if (filters.date_range && filters.date_range[0] && filters.date_range[1]) {
        url += `&start_date_after=${filters.date_range[0].format('YYYY-MM-DD')}`;
        url += `&end_date_before=${filters.date_range[1].format('YYYY-MM-DD')}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data.results) {
        setPeriods(response.data.results);
        setPagination({
          ...pagination,
          current: page,
          total: response.data.count
        });
      } else {
        setPeriods([]);
        message.error('Format de réponse inattendu');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des périodes:', error);
      message.error('Erreur lors du chargement des périodes');
      // Données de démo en cas d'erreur
      setPeriods([
        {
          id: 1,
          name: 'Mai 2025',
          start_date: '2025-05-01',
          end_date: '2025-05-31',
          is_closed: false,
          created_at: '2025-04-25T10:00:00Z'
        },
        {
          id: 2,
          name: 'Juin 2025',
          start_date: '2025-06-01',
          end_date: '2025-06-30',
          is_closed: false,
          created_at: '2025-05-25T10:00:00Z'
        },
        {
          id: 3,
          name: 'Avril 2025',
          start_date: '2025-04-01',
          end_date: '2025-04-30',
          is_closed: true,
          created_at: '2025-03-25T10:00:00Z'
        }
      ]);
      setPagination({
        ...pagination,
        current: page,
        total: 3
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(pagination.current, pagination.pageSize, filters);
  }, []);

  const handleTableChange = (pagination, filters, sorter) => {
    fetchData(pagination.current, pagination.pageSize, filters);
  };

  const handleSearch = value => {
    setFilters({
      ...filters,
      search: value
    });
    fetchData(1, pagination.pageSize, { ...filters, search: value });
  };

  const handleDateRangeChange = dates => {
    setFilters({
      ...filters,
      date_range: dates
    });
    fetchData(1, pagination.pageSize, { ...filters, date_range: dates });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/payroll/periods/${id}/`);
      message.success('Période supprimée avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      console.error('Erreur lors de la suppression de la période:', error);
      message.error('Erreur lors de la suppression de la période');
    }
  };

  const handleClosePeriod = async (id) => {
    try {
      await axios.post(`/api/payroll/periods/${id}/close_period/`);
      message.success('Période clôturée avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      console.error('Erreur lors de la clôture de la période:', error);
      message.error('Erreur lors de la clôture de la période');
    }
  };

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <Link to={`/payroll/periods/${record.id}`}>{text}</Link>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Date de début',
      dataIndex: 'start_date',
      key: 'start_date',
      render: date => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.start_date).unix() - moment(b.start_date).unix(),
    },
    {
      title: 'Date de fin',
      dataIndex: 'end_date',
      key: 'end_date',
      render: date => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.end_date).unix() - moment(b.end_date).unix(),
    },
    {
      title: 'Statut',
      dataIndex: 'is_closed',
      key: 'is_closed',
      render: is_closed => (
        <Tag color={is_closed ? 'green' : 'blue'}>
          {is_closed ? 'Clôturée' : 'Ouverte'}
        </Tag>
      ),
      filters: [
        { text: 'Ouverte', value: false },
        { text: 'Clôturée', value: true },
      ],
      onFilter: (value, record) => record.is_closed === value,
    },
    {
      title: 'Date de création',
      dataIndex: 'created_at',
      key: 'created_at',
      render: date => moment(date).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => navigate(`/payroll/periods/${record.id}`)}
          />
          {!record.is_closed && (
            <Popconfirm
              title="Êtes-vous sûr de vouloir clôturer cette période?"
              onConfirm={() => handleClosePeriod(record.id)}
              okText="Oui"
              cancelText="Non"
            >
              <Button 
                type="default" 
                icon={<CheckCircleOutlined />} 
                size="small"
                title="Clôturer"
              />
            </Popconfirm>
          )}
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer cette période?"
            onConfirm={() => handleDelete(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button 
              type="danger" 
              icon={<DeleteOutlined />} 
              size="small"
              disabled={record.is_closed}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title level={2}>Périodes de paie</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          <Link to="/payroll/periods/new">Nouvelle période</Link>
        </Button>
      </div>

      {/* Filtres */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Input 
            placeholder="Rechercher..." 
            value={filters.search}
            onChange={e => handleSearch(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
          />
          <RangePicker 
            format="DD/MM/YYYY"
            onChange={handleDateRangeChange}
            placeholder={['Date début', 'Date fin']}
          />
        </div>
      </Card>

      {/* Table des périodes */}
      <Card>
        <Spin spinning={loading}>
          <Table 
            columns={columns} 
            dataSource={periods} 
            rowKey="id" 
            pagination={pagination}
            onChange={handleTableChange}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default PayrollPeriodList;
