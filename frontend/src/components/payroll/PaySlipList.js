// src/components/payroll/PaySlipList.js
import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Button, Space, Tag, Typography, 
  message, Spin, Input, Select, DatePicker
} from 'antd';
import { 
  EyeOutlined, DownloadOutlined, SearchOutlined,
  CalculatorOutlined, CheckCircleOutlined, DollarOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const statusColors = {
  draft: 'default',
  calculated: 'warning',
  validated: 'success',
  paid: 'green',
  cancelled: 'error'
};

const statusDisplay = {
  draft: 'Brouillon',
  calculated: 'Calculé',
  validated: 'Validé',
  paid: 'Payé',
  cancelled: 'Annulé'
};

const PaySlipList = () => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: null,
    period: null,
    employee: null,
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
      let url = `/api/payroll/payslips/?page=${page}&page_size=${pageSize}`;
      
      if (filters.search) {
        url += `&search=${filters.search}`;
      }
      
      if (filters.status) {
        url += `&status=${filters.status}`;
      }
      
      if (filters.period) {
        url += `&payroll_run__period=${filters.period}`;
      }
      
      if (filters.employee) {
        url += `&employee=${filters.employee}`;
      }
      
      if (filters.date_range && filters.date_range[0] && filters.date_range[1]) {
        url += `&created_at_after=${filters.date_range[0].format('YYYY-MM-DD')}`;
        url += `&created_at_before=${filters.date_range[1].format('YYYY-MM-DD')}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data.results) {
        setPayslips(response.data.results);
        setPagination({
          ...pagination,
          current: page,
          total: response.data.count
        });
      } else {
        setPayslips([]);
        message.error('Format de réponse inattendu');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des bulletins:', error);
      message.error('Erreur lors du chargement des bulletins');
      // Données de démo en cas d'erreur
      setPayslips([
        {
          id: 1,
          number: 'BUL-MAI25-EMP001',
          payroll_run: { id: 1, name: 'Paie Mai 2025 - Tous les départements' },
          period_name: 'Mai 2025',
          employee: { id: 1, first_name: 'Mohammed', last_name: 'Alami' },
          employee_data: { id: 1, first_name: 'Mohammed', last_name: 'Alami', email: 'm.alami@example.com' },
          worked_days: 22,
          basic_salary: 12000,
          gross_salary: 14300,
          net_salary: 11500,
          status: 'calculated',
          is_paid: false,
          created_at: '2025-05-15T10:00:00Z'
        },
        {
          id: 2,
          number: 'BUL-MAI25-EMP002',
          payroll_run: { id: 1, name: 'Paie Mai 2025 - Tous les départements' },
          period_name: 'Mai 2025',
          employee: { id: 2, first_name: 'Fatima', last_name: 'Benani' },
          employee_data: { id: 2, first_name: 'Fatima', last_name: 'Benani', email: 'f.benani@example.com' },
          worked_days: 20,
          basic_salary: 8000,
          gross_salary: 9200,
          net_salary: 7800,
          status: 'calculated',
          is_paid: false,
          created_at: '2025-05-15T10:00:00Z'
        },
        {
          id: 3,
          number: 'BUL-AVR25-EMP001',
          payroll_run: { id: 2, name: 'Paie Avril 2025 - Tous les départements' },
          period_name: 'Avril 2025',
          employee: { id: 1, first_name: 'Mohammed', last_name: 'Alami' },
          employee_data: { id: 1, first_name: 'Mohammed', last_name: 'Alami', email: 'm.alami@example.com' },
          worked_days: 21,
          basic_salary: 12000,
          gross_salary: 14000,
          net_salary: 11300,
          status: 'paid',
          is_paid: true,
          created_at: '2025-04-15T10:00:00Z'
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

  const handleEmployeeChange = value => {
    setFilters({
      ...filters,
      employee: value
    });
    fetchData(1, pagination.pageSize, { ...filters, employee: value });
  };

  const handleDateRangeChange = dates => {
    setFilters({
      ...filters,
      date_range: dates
    });
    fetchData(1, pagination.pageSize, { ...filters, date_range: dates });
  };

  const handleCalculate = async (id) => {
    try {
      await axios.post(`/api/payroll/payslips/${id}/calculate/`);
      message.success('Bulletin calculé avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      console.error('Erreur lors du calcul du bulletin:', error);
      message.error('Erreur lors du calcul du bulletin');
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      window.open(`/api/payroll/payslips/${id}/download_pdf/`, '_blank');
      message.success('Téléchargement du PDF lancé');
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      message.error('Erreur lors du téléchargement du PDF');
    }
  };

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'number',
      key: 'number',
      render: (text, record) => <Link to={`/payroll/payslips/${record.id}`}>{text}</Link>,
      sorter: (a, b) => a.number.localeCompare(b.number),
    },
    {
      title: 'Employé',
      dataIndex: 'employee_data',
      key: 'employee',
      render: employee => employee ? `${employee.first_name} ${employee.last_name}` : '-',
      sorter: (a, b) => `${a.employee_data?.last_name || ''} ${a.employee_data?.first_name || ''}`.localeCompare(
        `${b.employee_data?.last_name || ''} ${b.employee_data?.first_name || ''}`
      ),
    },
    {
      title: 'Période',
      dataIndex: 'period_name',
      key: 'period_name',
      sorter: (a, b) => (a.period_name || '').localeCompare(b.period_name || ''),
    },
    {
      title: 'Salaire brut',
      dataIndex: 'gross_salary',
      key: 'gross_salary',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.gross_salary || 0) - (b.gross_salary || 0),
    },
    {
      title: 'Salaire net',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.net_salary || 0) - (b.net_salary || 0),
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
      title: 'Payé',
      dataIndex: 'is_paid',
      key: 'is_paid',
      render: is_paid => (
        <Tag color={is_paid ? 'green' : 'orange'}>
          {is_paid ? 'Oui' : 'Non'}
        </Tag>
      ),
      filters: [
        { text: 'Oui', value: true },
        { text: 'Non', value: false },
      ],
      onFilter: (value, record) => record.is_paid === value,
    },
    {
      title: 'Date de création',
      dataIndex: 'created_at',
      key: 'created_at',
      render: date => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
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
            onClick={() => navigate(`/payroll/payslips/${record.id}`)}
            title="Voir"
          />
          
          {record.status === 'draft' && (
            <Button 
              type="default" 
              icon={<CalculatorOutlined />} 
              size="small"
              onClick={() => handleCalculate(record.id)}
              title="Calculer"
            />
          )}
          
          {record.status !== 'draft' && (
            <Button 
              type="default" 
              icon={<DownloadOutlined />} 
              size="small"
              onClick={() => handleDownloadPDF(record.id)}
              title="Télécharger PDF"
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title level={2}>Bulletins de paie</Title>
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
          <RangePicker 
            format="DD/MM/YYYY"
            onChange={handleDateRangeChange}
            placeholder={['Date début', 'Date fin']}
          />
        </div>
      </Card>

      {/* Table des bulletins */}
      <Card>
        <Spin spinning={loading}>
          <Table 
            columns={columns} 
            dataSource={payslips} 
            rowKey="id" 
            pagination={pagination}
            onChange={handleTableChange}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default PaySlipList;
