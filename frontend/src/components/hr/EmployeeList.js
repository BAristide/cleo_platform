// src/components/hr/EmployeeList.js
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Input, Select, Tag, Typography, Spin, message, Popconfirm } from 'antd';
import { 
  UserOutlined, 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined 
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;

const EmployeeList = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    searchText: '',
    department: undefined,
    job_title: undefined,
    is_active: undefined
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchJobTitles();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        search: filters.searchText || undefined,
        department: filters.department,
        job_title: filters.job_title,
        is_active: filters.is_active
      };

      const response = await axios.get('/api/hr/employees/', { params });
      const data = extractResultsFromResponse(response);
      
      // Mettre à jour la pagination
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count
        });
      }

      setEmployees(data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des employés:", error);
      message.error("Impossible de charger les employés");
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/hr/departments/');
      const data = extractResultsFromResponse(response);
      setDepartments(data);
    } catch (error) {
      console.error("Erreur lors du chargement des départements:", error);
    }
  };

  const fetchJobTitles = async () => {
    try {
      const response = await axios.get('/api/hr/job-titles/');
      const data = extractResultsFromResponse(response);
      setJobTitles(data);
    } catch (error) {
      console.error("Erreur lors du chargement des postes:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/hr/employees/${id}/`);
      message.success("Employé supprimé avec succès");
      fetchEmployees();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer l'employé");
    }
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value
    });
    setPagination({
      ...pagination,
      current: 1  // Réinitialiser à la première page lors d'un filtrage
    });
  };

  const resetFilters = () => {
    setFilters({
      searchText: '',
      department: undefined,
      job_title: undefined,
      is_active: undefined
    });
    setPagination({
      ...pagination,
      current: 1
    });
  };

  const columns = [
    {
      title: 'Nom',
      key: 'name',
      render: (text, record) => (
        <Link to={`/hr/employees/${record.id}`}>
          {record.first_name} {record.last_name}
        </Link>
      ),
      sorter: true
    },
    {
      title: 'Identifiant',
      dataIndex: 'employee_id',
      key: 'employee_id',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Poste',
      dataIndex: 'job_title_name',
      key: 'job_title_name',
    },
    {
      title: 'Département',
      dataIndex: 'department_name',
      key: 'department_name',
    },
    {
      title: 'Statut',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active) => (
        <Tag color={is_active ? 'green' : 'red'}>
          {is_active ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'Rôles',
      key: 'roles',
      dataIndex: 'roles',
      render: (roles) => (
        <>
          {roles && roles.map(role => {
            let color;
            if (role === 'RH') color = 'blue';
            else if (role === 'Finance') color = 'green';
            else if (role === 'Manager') color = 'purple';
            else color = 'default';
            
            return (
              <Tag color={color} key={role}>
                {role}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space size="small">
          <Button size="small" type="primary" icon={<EditOutlined />}>
            <Link to={`/hr/employees/${record.id}/edit`}>Modifier</Link>
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer cet employé ?"
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
    <div className="employee-list">
      <Card>
        <Title level={2}>Employés</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Rechercher un employé..."
              value={filters.searchText}
              onChange={(e) => handleFilterChange('searchText', e.target.value)}
              onPressEnter={fetchEmployees}
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Département"
              style={{ width: 180 }}
              value={filters.department}
              onChange={(value) => handleFilterChange('department', value)}
              allowClear
            >
              {departments.map(dept => (
                <Option key={dept.id} value={dept.id}>{dept.name}</Option>
              ))}
            </Select>
            <Select
              placeholder="Poste"
              style={{ width: 180 }}
              value={filters.job_title}
              onChange={(value) => handleFilterChange('job_title', value)}
              allowClear
            >
              {jobTitles.map(job => (
                <Option key={job.id} value={job.id}>{job.name}</Option>
              ))}
            </Select>
            <Select
              placeholder="Statut"
              style={{ width: 120 }}
              value={filters.is_active}
              onChange={(value) => handleFilterChange('is_active', value)}
              allowClear
            >
              <Option value={true}>Actif</Option>
              <Option value={false}>Inactif</Option>
            </Select>
            <Button onClick={resetFilters}>Réinitialiser</Button>
          </Space>

          <Button type="primary" icon={<PlusOutlined />}>
            <Link to="/hr/employees/new">Nouvel employé</Link>
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default EmployeeList;
