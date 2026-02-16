// src/components/payroll/EmployeePayrollList.js
import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Button, Space, Tag, Typography, 
  message, Popconfirm, Spin, Input, Select 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined 
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const paymentMethodDisplay = {
  bank_transfer: 'Virement bancaire',
  check: 'Chèque',
  cash: 'Espèces'
};

const EmployeePayrollList = () => {
  const [employeePayrolls, setEmployeePayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    contract_type: null,
    payment_method: null
  });
  const [contractTypes, setContractTypes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Charger les types de contrat pour le filtre
    const fetchContractTypes = async () => {
      try {
        const response = await axios.get('/api/payroll/contract-types/');
        if (response.data.results) {
          setContractTypes(response.data.results);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des types de contrat:', error);
        setContractTypes([
          { id: 1, name: 'CDI' },
          { id: 2, name: 'CDD' },
          { id: 3, name: 'ANAPEC' }
        ]);
      }
    };

    fetchContractTypes();
    fetchData(pagination.current, pagination.pageSize, filters);
  }, []);

  const fetchData = async (page = 1, pageSize = 10, filters = {}) => {
    setLoading(true);
    try {
      let url = `/api/payroll/employee-payrolls/?page=${page}&page_size=${pageSize}`;
      
      if (filters.search) {
        url += `&search=${filters.search}`;
      }
      
      if (filters.contract_type) {
        url += `&contract_type=${filters.contract_type}`;
      }
      
      if (filters.payment_method) {
        url += `&payment_method=${filters.payment_method}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data.results) {
        setEmployeePayrolls(response.data.results);
        setPagination({
          ...pagination,
          current: page,
          total: response.data.count
        });
      } else {
        setEmployeePayrolls([]);
        message.error('Format de réponse inattendu');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de paie:', error);
      message.error('Erreur lors du chargement des données de paie');
      // Données de démo en cas d'erreur
      setEmployeePayrolls([
        {
          id: 1,
          employee: { id: 1, first_name: 'Mohammed', last_name: 'Alami' },
          employee_name: 'Mohammed Alami',
          contract_type: { id: 1, name: 'CDI' },
          contract_type_name: 'CDI',
          base_salary: 12000,
          hourly_rate: 75,
          cnss_number: 'CN12345678',
          bank_account: '011780000123456789012345',
          bank_name: 'Banque Populaire',
          payment_method: 'bank_transfer',
          payment_method_display: 'Virement bancaire',
          transport_allowance: 1000,
          meal_allowance: 600
        },
        {
          id: 2,
          employee: { id: 2, first_name: 'Fatima', last_name: 'Benani' },
          employee_name: 'Fatima Benani',
          contract_type: { id: 1, name: 'CDI' },
          contract_type_name: 'CDI',
          base_salary: 8000,
          hourly_rate: 50,
          cnss_number: 'CN87654321',
          bank_account: '011780000987654321012345',
          bank_name: 'Attijariwafa Bank',
          payment_method: 'bank_transfer',
          payment_method_display: 'Virement bancaire',
          transport_allowance: 800,
          meal_allowance: 500
        },
        {
          id: 3,
          employee: { id: 3, first_name: 'Karim', last_name: 'Zidane' },
          employee_name: 'Karim Zidane',
          contract_type: { id: 2, name: 'CDD' },
          contract_type_name: 'CDD',
          base_salary: 10000,
          hourly_rate: 60,
          cnss_number: 'CN45678901',
          bank_account: '011780000456789012345',
          bank_name: 'BMCE Bank',
          payment_method: 'bank_transfer',
          payment_method_display: 'Virement bancaire',
          transport_allowance: 900,
          meal_allowance: 550
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

  const handleContractTypeChange = value => {
    setFilters({
      ...filters,
      contract_type: value
    });
    fetchData(1, pagination.pageSize, { ...filters, contract_type: value });
  };

  const handlePaymentMethodChange = value => {
    setFilters({
      ...filters,
      payment_method: value
    });
    fetchData(1, pagination.pageSize, { ...filters, payment_method: value });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/payroll/employee-payrolls/${id}/`);
      message.success('Données de paie supprimées avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      console.error('Erreur lors de la suppression des données de paie:', error);
      message.error('Erreur lors de la suppression des données de paie');
    }
  };

  const columns = [
    {
      title: 'Employé',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (text, record) => <Link to={`/payroll/employee-payrolls/${record.id}`}>{text}</Link>,
      sorter: (a, b) => a.employee_name.localeCompare(b.employee_name),
    },
    {
      title: 'Type de contrat',
      dataIndex: 'contract_type_name',
      key: 'contract_type_name',
      sorter: (a, b) => a.contract_type_name.localeCompare(b.contract_type_name),
      filters: contractTypes.map(ct => ({ text: ct.name, value: ct.id })),
      onFilter: (value, record) => record.contract_type.id === value,
    },
    {
      title: 'Salaire de base',
      dataIndex: 'base_salary',
      key: 'base_salary',
      render: value => `${value.toLocaleString()} MAD`,
      sorter: (a, b) => a.base_salary - b.base_salary,
    },
    {
      title: 'Numéro CNSS',
      dataIndex: 'cnss_number',
      key: 'cnss_number',
    },
    {
      title: 'Banque',
      dataIndex: 'bank_name',
      key: 'bank_name',
      sorter: (a, b) => (a.bank_name || '').localeCompare(b.bank_name || ''),
    },
    {
      title: 'Méthode de paiement',
      dataIndex: 'payment_method_display',
      key: 'payment_method_display',
      sorter: (a, b) => a.payment_method_display.localeCompare(b.payment_method_display),
      filters: Object.entries(paymentMethodDisplay).map(([key, value]) => ({ text: value, value: key })),
      onFilter: (value, record) => record.payment_method === value,
    },
    {
      title: 'Indemnité de transport',
      dataIndex: 'transport_allowance',
      key: 'transport_allowance',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.transport_allowance || 0) - (b.transport_allowance || 0),
    },
    {
      title: 'Prime de panier',
      dataIndex: 'meal_allowance',
      key: 'meal_allowance',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.meal_allowance || 0) - (b.meal_allowance || 0),
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
            onClick={() => navigate(`/payroll/employee-payrolls/${record.id}`)}
            title="Modifier"
          />
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ces données de paie?"
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
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title level={2}>Données de paie des employés</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          <Link to="/payroll/employee-payrolls/new">Nouvelles données de paie</Link>
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
            placeholder="Type de contrat" 
            style={{ width: 200 }} 
            allowClear
            value={filters.contract_type}
            onChange={handleContractTypeChange}
          >
            {contractTypes.map(ct => (
              <Option key={ct.id} value={ct.id}>{ct.name}</Option>
            ))}
          </Select>
          <Select 
            placeholder="Méthode de paiement" 
            style={{ width: 200 }} 
            allowClear
            value={filters.payment_method}
            onChange={handlePaymentMethodChange}
          >
            {Object.entries(paymentMethodDisplay).map(([key, value]) => (
              <Option key={key} value={key}>{value}</Option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Table des données de paie */}
      <Card>
        <Spin spinning={loading}>
          <Table 
            columns={columns} 
            dataSource={employeePayrolls} 
            rowKey="id" 
            pagination={pagination}
            onChange={handleTableChange}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default EmployeePayrollList;
