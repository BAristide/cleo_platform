// src/components/hr/TrainingPlanList.js
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Input, Select, Tag, Typography, Spin, message, Popconfirm } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  BankOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;

const TrainingPlanList = () => {
  const [loading, setLoading] = useState(true);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    searchText: '',
    employee: undefined,
    year: undefined,
    status: undefined
  });

  useEffect(() => {
    fetchTrainingPlans();
    fetchEmployees();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchTrainingPlans = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        search: filters.searchText || undefined,
        employee: filters.employee,
        year: filters.year,
        status: filters.status
      };

      const response = await axios.get('/api/hr/training-plans/', { params });
      const data = extractResultsFromResponse(response);
      
      // Mettre à jour la pagination
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count
        });
      }

      setTrainingPlans(data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des plans de formation:", error);
      message.error("Impossible de charger les plans de formation");
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/hr/employees/', { params: { is_active: true } });
      const data = extractResultsFromResponse(response);
      setEmployees(data);
    } catch (error) {
      console.error("Erreur lors du chargement des employés:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/hr/training-plans/${id}/`);
      message.success("Plan de formation supprimé avec succès");
      fetchTrainingPlans();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer le plan de formation");
    }
  };
  
  const handleSubmitPlan = async (id) => {
    try {
      await axios.post(`/api/hr/training-plans/${id}/submit/`);
      message.success("Plan de formation soumis avec succès");
      fetchTrainingPlans();
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
      message.error("Impossible de soumettre le plan de formation");
    }
  };

  const handleApprovePlan = async (id, approveType) => {
    try {
      let response;
      if (approveType === 'manager') {
        response = await axios.post(`/api/hr/training-plans/${id}/approve_manager/`);
      } else if (approveType === 'hr') {
        response = await axios.post(`/api/hr/training-plans/${id}/approve_hr/`);
      } else if (approveType === 'finance') {
        response = await axios.post(`/api/hr/training-plans/${id}/approve_finance/`);
      }
      
      message.success("Plan de formation approuvé avec succès");
      fetchTrainingPlans();
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error);
      message.error("Impossible d'approuver le plan de formation");
    }
  };

  const handleRejectPlan = async (id, rejectType) => {
    try {
      await axios.post(`/api/hr/training-plans/${id}/reject/`, {
        rejected_by: rejectType
      });
      message.success("Plan de formation rejeté");
      fetchTrainingPlans();
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
      message.error("Impossible de rejeter le plan de formation");
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
      employee: undefined,
      year: undefined,
      status: undefined
    });
    setPagination({
      ...pagination,
      current: 1
    });
  };

  // Générer les années disponibles (de l'année courante à 3 ans plus tard)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 4; i++) {
    years.push(currentYear + i);
  }

  const columns = [
    {
      title: 'Employé',
      key: 'employee',
      render: (_, record) => (
        <Link to={`/hr/employees/${record.employee_data?.id}`}>
          {record.employee_data?.first_name} {record.employee_data?.last_name}
        </Link>
      ),
      sorter: true
    },
    {
      title: 'Année',
      dataIndex: 'year',
      key: 'year',
      sorter: true
    },
    {
      title: 'Statut',
      dataIndex: 'status_display',
      key: 'status_display',
      render: (text, record) => {
        let color;
        switch (record.status) {
          case 'draft': color = 'default'; break;
          case 'submitted': color = 'processing'; break;
          case 'approved_manager': color = 'processing'; break;
          case 'approved_hr': color = 'processing'; break;
          case 'approved_finance': color = 'success'; break;
          case 'rejected': color = 'error'; break;
          case 'completed': color = 'success'; break;
          default: color = 'default';
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Formations',
      key: 'training_items_count',
      render: (_, record) => record.training_items ? record.training_items.length : 0,
      sorter: true
    },
    {
      title: 'Coût total',
      key: 'total_cost',
      render: (_, record) => `${record.total_cost || 0} MAD`,
      sorter: true
    },
    {
      title: 'Approbations',
      key: 'approvals',
      render: (_, record) => {
        const { approvals } = record;
        if (!approvals) return "-";
        
        return (
          <Space direction="vertical" size={0}>
            <Tag color={approvals.manager ? "success" : "default"}>
              Manager: {approvals.manager ? "✓" : "×"}
            </Tag>
            <Tag color={approvals.hr ? "success" : "default"}>
              RH: {approvals.hr ? "✓" : "×"}
            </Tag>
            <Tag color={approvals.finance ? "success" : "default"}>
              Finance: {approvals.finance ? "✓" : "×"}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" type="primary" icon={<FileTextOutlined />}>
            <Link to={`/hr/training-plans/${record.id}`}>Détails</Link>
          </Button>
          
          {record.status === 'draft' && (
            <>
              <Button size="small" icon={<EditOutlined />}>
                <Link to={`/hr/training-plans/${record.id}/edit`}>Modifier</Link>
              </Button>
              <Button 
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleSubmitPlan(record.id)}
              >
                Soumettre
              </Button>
              <Popconfirm
                title="Êtes-vous sûr de vouloir supprimer ce plan ?"
                onConfirm={() => handleDelete(record.id)}
                okText="Oui"
                cancelText="Non"
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  Supprimer
                </Button>
              </Popconfirm>
            </>
          )}
          
          {record.status === 'submitted' && (
            <>
              <Button 
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprovePlan(record.id, 'manager')}
              >
                Approuver (Manager)
              </Button>
              <Button 
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleRejectPlan(record.id, 'manager')}
              >
                Rejeter
              </Button>
            </>
          )}
          
          {record.status === 'approved_manager' && (
            <>
              <Button 
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprovePlan(record.id, 'hr')}
              >
                Approuver (RH)
              </Button>
              <Button 
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleRejectPlan(record.id, 'hr')}
              >
                Rejeter
              </Button>
            </>
          )}
          
          {record.status === 'approved_hr' && (
            <>
              <Button 
                size="small"
                icon={<BankOutlined />}
                onClick={() => handleApprovePlan(record.id, 'finance')}
              >
                Approuver (Finance)
              </Button>
              <Button 
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleRejectPlan(record.id, 'finance')}
              >
                Rejeter
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="training-plan-list">
      <Card>
        <Title level={2}>Plans de formation</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space wrap>
            <Input
              placeholder="Rechercher un plan..."
              value={filters.searchText}
              onChange={(e) => handleFilterChange('searchText', e.target.value)}
              onPressEnter={fetchTrainingPlans}
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Employé"
              style={{ width: 180 }}
              value={filters.employee}
              onChange={(value) => handleFilterChange('employee', value)}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {employees.map(employee => (
                <Option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Année"
              style={{ width: 120 }}
              value={filters.year}
              onChange={(value) => handleFilterChange('year', value)}
              allowClear
            >
              {years.map(year => (
                <Option key={year} value={year}>{year}</Option>
              ))}
            </Select>
            <Select
              placeholder="Statut"
              style={{ width: 180 }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              <Option value="draft">Brouillon</Option>
              <Option value="submitted">Soumis</Option>
              <Option value="approved_manager">Approuvé par Manager</Option>
              <Option value="approved_hr">Approuvé par RH</Option>
              <Option value="approved_finance">Approuvé par Finance</Option>
              <Option value="rejected">Rejeté</Option>
              <Option value="completed">Terminé</Option>
            </Select>
            <Button onClick={resetFilters}>Réinitialiser</Button>
          </Space>

          <Button type="primary" icon={<PlusOutlined />}>
            <Link to="/hr/training-plans/new">Nouveau plan de formation</Link>
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={trainingPlans}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default TrainingPlanList;
