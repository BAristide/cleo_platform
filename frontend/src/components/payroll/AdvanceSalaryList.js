// src/components/payroll/AdvanceSalaryList.js
import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Button, Space, Tag, Typography, 
  message, Popconfirm, Spin, Input, Select, DatePicker 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AdvanceSalaryList = () => {
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    period: null,
    employee: null,
    is_paid: null,
    date_range: null
  });
  const [periods, setPeriods] = useState([]);
  const [employees, setEmployees] = useState([]);
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

    // Charger les employés pour le filtre
    const fetchEmployees = async () => {
      try {
        const response = await axios.get('/api/hr/employees/');
        if (response.data.results) {
          setEmployees(response.data.results);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des employés:', error);
        setEmployees([
          { id: 1, first_name: 'Mohammed', last_name: 'Alami' },
          { id: 2, first_name: 'Fatima', last_name: 'Benani' },
          { id: 3, first_name: 'Karim', last_name: 'Zidane' }
        ]);
      }
    };

    fetchPeriods();
    fetchEmployees();
    fetchData(pagination.current, pagination.pageSize, filters);
  }, []);

  const fetchData = async (page = 1, pageSize = 10, filters = {}) => {
    setLoading(true);
    try {
      let url = `/api/payroll/advances/?page=${page}&page_size=${pageSize}`;
      
      if (filters.search) {
        url += `&search=${filters.search}`;
      }
      
      if (filters.period) {
        url += `&period=${filters.period}`;
      }
      
      if (filters.employee) {
        url += `&employee=${filters.employee}`;
      }
      
      if (filters.is_paid !== null) {
        url += `&is_paid=${filters.is_paid}`;
      }
      
      if (filters.date_range && filters.date_range[0] && filters.date_range[1]) {
        url += `&payment_date_after=${filters.date_range[0].format('YYYY-MM-DD')}`;
        url += `&payment_date_before=${filters.date_range[1].format('YYYY-MM-DD')}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data.results) {
        setAdvances(response.data.results);
        setPagination({
          ...pagination,
          current: page,
          total: response.data.count
        });
      } else {
        setAdvances([]);
        message.error('Format de réponse inattendu');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des acomptes:', error);
      message.error('Erreur lors du chargement des acomptes');
      // Données de démo en cas d'erreur
      setAdvances([
        {
          id: 1,
          employee: { id: 2, first_name: 'Fatima', last_name: 'Benani' },
          employee_name: 'Fatima Benani',
          period: { id: 1, name: 'Mai 2025' },
          period_name: 'Mai 2025',
          amount: 2000,
          payment_date: '2025-05-15',
          is_paid: true,
          notes: 'Acompte pour le mois de mai',
          payslip: null,
          payslip_number: null,
          created_at: '2025-05-10T10:00:00Z'
        },
        {
          id: 2,
          employee: { id: 3, first_name: 'Karim', last_name: 'Zidane' },
          employee_name: 'Karim Zidane',
          period: { id: 1, name: 'Mai 2025' },
          period_name: 'Mai 2025',
          amount: 1500,
          payment_date: '2025-05-20',
          is_paid: false,
          notes: 'Acompte pour frais médicaux',
          payslip: null,
          payslip_number: null,
          created_at: '2025-05-18T10:00:00Z'
        },
        {
          id: 3,
          employee: { id: 2, first_name: 'Fatima', last_name: 'Benani' },
          employee_name: 'Fatima Benani',
          period: { id: 3, name: 'Avril 2025' },
          period_name: 'Avril 2025',
          amount: 1800,
          payment_date: '2025-04-15',
          is_paid: true,
          notes: 'Acompte pour le mois d\'avril',
          payslip: { id: 3, number: 'BUL-AVR25-EMP002' },
          payslip_number: 'BUL-AVR25-EMP002',
          created_at: '2025-04-10T10:00:00Z'
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

  const handlePeriodChange = value => {
    setFilters({
      ...filters,
      period: value
    });
    fetchData(1, pagination.pageSize, { ...filters, period: value });
  };

  const handleEmployeeChange = value => {
    setFilters({
      ...filters,
      employee: value
    });
    fetchData(1, pagination.pageSize, { ...filters, employee: value });
  };

  const handlePaidStatusChange = value => {
    setFilters({
      ...filters,
      is_paid: value
    });
    fetchData(1, pagination.pageSize, { ...filters, is_paid: value });
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
      await axios.delete(`/api/payroll/advances/${id}/`);
      message.success('Acompte supprimé avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'acompte:', error);
      message.error('Erreur lors de la suppression de l\'acompte');
    }
  };

  const handleMarkAsPaid = async (id) => {
    try {
      await axios.post(`/api/payroll/advances/${id}/mark_as_paid/`);
      message.success('Acompte marqué comme payé avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      console.error('Erreur lors du paiement de l\'acompte:', error);
      message.error('Erreur lors du paiement de l\'acompte');
    }
  };

  const columns = [
    {
      title: 'Employé',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (text, record) => <Link to={`/payroll/advances/${record.id}`}>{text}</Link>,
      sorter: (a, b) => a.employee_name.localeCompare(b.employee_name),
    },
    {
      title: 'Période',
      dataIndex: 'period_name',
      key: 'period_name',
      sorter: (a, b) => a.period_name.localeCompare(b.period_name),
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      render: value => `${value.toLocaleString()} MAD`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Date de paiement',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: date => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.payment_date).unix() - moment(b.payment_date).unix(),
    },
    {
      title: 'Statut',
      dataIndex: 'is_paid',
      key: 'is_paid',
      render: is_paid => (
        <Tag color={is_paid ? 'green' : 'orange'}>
          {is_paid ? 'Payé' : 'Non payé'}
        </Tag>
      ),
      filters: [
        { text: 'Payé', value: true },
        { text: 'Non payé', value: false },
      ],
      onFilter: (value, record) => record.is_paid === value,
    },
    {
      title: 'Bulletin',
      dataIndex: 'payslip_number',
      key: 'payslip_number',
      render: (text, record) => {
        if (text) {
          return <Link to={`/payroll/payslips/${record.payslip.id}`}>{text}</Link>;
        }
        return '-';
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
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
            onClick={() => navigate(`/payroll/advances/${record.id}`)}
            title="Modifier"
            disabled={record.payslip !== null}
          />
          
          {!record.is_paid && (
            <Button 
              type="default" 
              icon={<CheckCircleOutlined />} 
              size="small"
              onClick={() => handleMarkAsPaid(record.id)}
              title="Marquer comme payé"
            />
          )}
          
          {record.payslip === null && (
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer cet acompte?"
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
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title level={2}>Acomptes sur salaire</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          <Link to="/payroll/advances/new">Nouvel acompte</Link>
        </Button>
      </div>

      {/* Filtres */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Input 
            placeholder="Rechercher..." 
            value={filters.search}
            onChange={e => handleSearch(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
          />
          <Select 
            placeholder="Période" 
            style={{ width: 150 }} 
            allowClear
            value={filters.period}
            onChange={handlePeriodChange}
          >
            {periods.map(period => (
              <Option key={period.id} value={period.id}>{period.name}</Option>
            ))}
          </Select>
          <Select 
            placeholder="Employé" 
            style={{ width: 200 }} 
            allowClear
            value={filters.employee}
            onChange={handleEmployeeChange}
            showSearch
            optionFilterProp="children"
          >
            {employees.map(emp => (
              <Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Option>
            ))}
          </Select>
          <Select 
            placeholder="Statut" 
            style={{ width: 120 }} 
            allowClear
            value={filters.is_paid}
            onChange={handlePaidStatusChange}
          >
            <Option value={true}>Payé</Option>
            <Option value={false}>Non payé</Option>
          </Select>
          <RangePicker 
            format="DD/MM/YYYY"
            onChange={handleDateRangeChange}
            placeholder={['Date début', 'Date fin']}
          />
        </div>
      </Card>

      {/* Table des acomptes */}
      <Card>
        <Spin spinning={loading}>
          <Table 
            columns={columns} 
            dataSource={advances} 
            rowKey="id" 
            pagination={pagination}
            onChange={handleTableChange}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default AdvanceSalaryList;
