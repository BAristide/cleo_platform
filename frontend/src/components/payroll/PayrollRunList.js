// src/components/payroll/PayrollRunList.js
import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Button, Space, Tag, Typography, 
  message, Popconfirm, Spin, Input, Select 
} from 'antd';
import { 
  PlusOutlined, EyeOutlined, DeleteOutlined, CalculatorOutlined,
  CheckCircleOutlined, DollarOutlined, SearchOutlined 
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

const statusColors = {
  draft: 'default',
  in_progress: 'processing',
  calculated: 'warning',
  validated: 'success',
  paid: 'green',
  cancelled: 'error'
};

const statusDisplay = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  calculated: 'Calculé',
  validated: 'Validé',
  paid: 'Payé',
  cancelled: 'Annulé'
};

const PayrollRunList = () => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: null,
    period: null
  });
  const [periods, setPeriods] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Charger les périodes pour le filtre
    const fetchPeriods = async () => {
      try {
        const response = await axios.get('/api/payroll/periods/');
        if (response.data.results) {
          setPeriods(response.data.results);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des périodes:', error);
        setPeriods([
          { id: 1, name: 'Mai 2025' },
          { id: 2, name: 'Juin 2025' },
          { id: 3, name: 'Avril 2025' }
        ]);
      }
    };

    fetchPeriods();
    fetchData(pagination.current, pagination.pageSize, filters);
  }, []);

  const fetchData = async (page = 1, pageSize = 10, filters = {}) => {
    setLoading(true);
    try {
      let url = `/api/payroll/payroll-runs/?page=${page}&page_size=${pageSize}`;
      
      if (filters.search) {
        url += `&search=${filters.search}`;
      }
      
      if (filters.status) {
        url += `&status=${filters.status}`;
      }
      
      if (filters.period) {
        url += `&period=${filters.period}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data.results) {
        setRuns(response.data.results);
        setPagination({
          ...pagination,
          current: page,
          total: response.data.count
        });
      } else {
        setRuns([]);
        message.error('Format de réponse inattendu');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des lancements:', error);
      message.error('Erreur lors du chargement des lancements');
      // Données de démo en cas d'erreur
      setRuns([
        {
          id: 1,
          name: 'Paie Mai 2025 - Tous les départements',
          period: { id: 1, name: 'Mai 2025' },
          department: null,
          status: 'draft',
          run_date: '2025-05-15T10:00:00Z',
          calculated_date: null,
          validated_date: null,
          paid_date: null,
          payslips_count: 12,
          payslips_summary: {
            total_gross: 120000,
            total_net: 90000,
            status_counts: {
              draft: 12
            }
          }
        },
        {
          id: 2,
          name: 'Paie Avril 2025 - Tous les départements',
          period: { id: 3, name: 'Avril 2025' },
          department: null,
          status: 'paid',
          run_date: '2025-04-15T10:00:00Z',
          calculated_date: '2025-04-20T10:00:00Z',
          validated_date: '2025-04-25T10:00:00Z',
          paid_date: '2025-04-30T10:00:00Z',
          payslips_count: 12,
          payslips_summary: {
            total_gross: 115000,
            total_net: 88000,
            status_counts: {
              paid: 12
            }
          }
        },
        {
          id: 3,
          name: 'Paie Mars 2025 - Tous les départements',
          period: { id: 4, name: 'Mars 2025' },
          department: null,
          status: 'paid',
          run_date: '2025-03-15T10:00:00Z',
          calculated_date: '2025-03-20T10:00:00Z',
          validated_date: '2025-03-25T10:00:00Z',
          paid_date: '2025-03-30T10:00:00Z',
          payslips_count: 12,
          payslips_summary: {
            total_gross: 115000,
            total_net: 88000,
            status_counts: {
              paid: 12
            }
          }
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

  const handleStatusChange = value => {
    setFilters({
      ...filters,
      status: value
    });
    fetchData(1, pagination.pageSize, { ...filters, status: value });
  };

  const handlePeriodChange = value => {
    setFilters({
      ...filters,
      period: value
    });
    fetchData(1, pagination.pageSize, { ...filters, period: value });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/payroll/payroll-runs/${id}/`);
      message.success('Lancement supprimé avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      console.error('Erreur lors de la suppression du lancement:', error);
      message.error('Erreur lors de la suppression du lancement');
    }
  };

  const handleCalculate = async (id) => {
    try {
      await axios.post(`/api/payroll/payroll-runs/${id}/calculate_payslips/`);
      message.success('Calcul des bulletins lancé avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      console.error('Erreur lors du calcul des bulletins:', error);
      message.error('Erreur lors du calcul des bulletins');
    }
  };

  const handleValidate = async (id) => {
    try {
      await axios.post(`/api/payroll/payroll-runs/${id}/validate_payroll/`);
      message.success('Lancement validé avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      console.error('Erreur lors de la validation du lancement:', error);
      message.error('Erreur lors de la validation du lancement');
    }
  };

  const handlePay = async (id) => {
    try {
      await axios.post(`/api/payroll/payroll-runs/${id}/pay_payroll/`);
      message.success('Lancement marqué comme payé avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      console.error('Erreur lors du paiement du lancement:', error);
      message.error('Erreur lors du paiement du lancement');
    }
  };

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <Link to={`/payroll/runs/${record.id}`}>{text}</Link>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Période',
      dataIndex: 'period',
      key: 'period',
      render: period => period ? period.name : '-',
      sorter: (a, b) => (a.period?.name || '').localeCompare(b.period?.name || ''),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={statusColors[status] || 'default'}>
          {statusDisplay[status] || status}
        </Tag>
      ),
      filters: Object.keys(statusDisplay).map(key => ({ text: statusDisplay[key], value: key })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Date de lancement',
      dataIndex: 'run_date',
      key: 'run_date',
      render: date => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.run_date).unix() - moment(b.run_date).unix(),
    },
    {
      title: 'Bulletins',
      dataIndex: 'payslips_count',
      key: 'payslips_count',
      sorter: (a, b) => a.payslips_count - b.payslips_count,
    },
    {
      title: 'Brut total',
      dataIndex: ['payslips_summary', 'total_gross'],
      key: 'total_gross',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.payslips_summary?.total_gross || 0) - (b.payslips_summary?.total_gross || 0),
    },
    {
      title: 'Net total',
      dataIndex: ['payslips_summary', 'total_net'],
      key: 'total_net',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.payslips_summary?.total_net || 0) - (b.payslips_summary?.total_net || 0),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => navigate(`/payroll/runs/${record.id}`)}
            title="Voir"
          />
          
          {record.status === 'draft' && (
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer ce lancement?"
              onConfirm={() => handleDelete(record.id)}
              okText="Oui"
              cancelText="Non"
            >
              <Button 
                type="danger" 
                icon={<DeleteOutlined />} 
                size="small"
                title="Supprimer"
              />
            </Popconfirm>
          )}
          
          {(record.status === 'draft' || record.status === 'in_progress') && (
            <Button 
              type="default" 
              icon={<CalculatorOutlined />} 
              size="small"
              onClick={() => handleCalculate(record.id)}
              title="Calculer"
            />
          )}
          
          {record.status === 'calculated' && (
            <Button 
              type="default" 
              icon={<CheckCircleOutlined />} 
              size="small"
              onClick={() => handleValidate(record.id)}
              title="Valider"
            />
          )}
          
          {record.status === 'validated' && (
            <Button 
              type="default" 
              icon={<DollarOutlined />} 
              size="small"
              onClick={() => handlePay(record.id)}
              title="Payer"
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title level={2}>Lancements de paie</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          <Link to="/payroll/runs/new">Nouveau lancement</Link>
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
          <Select 
            placeholder="Statut" 
            style={{ width: 150 }} 
            allowClear
            value={filters.status}
            onChange={handleStatusChange}
          >
            {Object.entries(statusDisplay).map(([key, value]) => (
              <Option key={key} value={key}>{value}</Option>
            ))}
          </Select>
          <Select 
            placeholder="Période" 
            style={{ width: 200 }} 
            allowClear
            value={filters.period}
            onChange={handlePeriodChange}
          >
            {periods.map(period => (
              <Option key={period.id} value={period.id}>{period.name}</Option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Table des lancements */}
      <Card>
        <Spin spinning={loading}>
          <Table 
            columns={columns} 
            dataSource={runs} 
            rowKey="id" 
            pagination={pagination}
            onChange={handleTableChange}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default PayrollRunList;
