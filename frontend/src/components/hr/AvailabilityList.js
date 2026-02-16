// src/components/hr/AvailabilityList.js
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Input, Select, DatePicker, Typography, Tag, Spin, message, Popconfirm } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AvailabilityList = () => {
  const [loading, setLoading] = useState(true);
  const [availabilities, setAvailabilities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    searchText: '',
    employee: undefined,
    type: undefined,
    status: undefined,
    dateRange: undefined
  });

  useEffect(() => {
    fetchAvailabilities();
    fetchEmployees();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchAvailabilities = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        search: filters.searchText || undefined,
        employee: filters.employee,
        type: filters.type,
        status: filters.status,
        start_date_after: filters.dateRange?.[0] ? filters.dateRange[0].format('YYYY-MM-DD') : undefined,
        start_date_before: filters.dateRange?.[1] ? filters.dateRange[1].format('YYYY-MM-DD') : undefined
      };

      const response = await axios.get('/api/hr/availabilities/', { params });
      const data = extractResultsFromResponse(response);
      
      // Mettre à jour la pagination
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count
        });
      }

      setAvailabilities(data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des disponibilités:", error);
      message.error("Impossible de charger les disponibilités");
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

  const handleApprove = async (id, approveType) => {
    try {
      if (approveType === 'manager') {
        await axios.post(`/api/hr/availabilities/${id}/approve_manager/`);
      } else if (approveType === 'hr') {
        await axios.post(`/api/hr/availabilities/${id}/approve_hr/`);
      }
      
      message.success("Disponibilité approuvée avec succès");
      fetchAvailabilities();
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error);
      message.error("Impossible d'approuver la disponibilité");
    }
  };

  const handleReject = async (id, rejectType) => {
    try {
      await axios.post(`/api/hr/availabilities/${id}/reject/`, {
        rejected_by: rejectType
      });
      
      message.success("Disponibilité rejetée");
      fetchAvailabilities();
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
      message.error("Impossible de rejeter la disponibilité");
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
      type: undefined,
      status: undefined,
      dateRange: undefined
    });
    setPagination({
      ...pagination,
      current: 1
    });
  };

  const getTypeDisplay = (type) => {
    switch (type) {
      case 'leave_of_absence': return 'Congé sans solde';
      case 'sabbatical': return 'Congé sabbatique';
      case 'parental': return 'Congé parental';
      case 'other': return 'Autre';
      default: return type;
    }
  };

  const columns = [
    {
      title: 'Employé',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (text, record) => (
        <Link to={`/hr/employees/${record.employee?.id}`}>
          {text}
        </Link>
      ),
      sorter: true
    },
    {
      title: 'Type',
      dataIndex: 'type_display',
      key: 'type_display',
      render: (text, record) => getTypeDisplay(record.type)
    },
    {
      title: 'Date de début',
      dataIndex: 'start_date',
      key: 'start_date',
      sorter: true
    },
    {
      title: 'Date de fin',
      dataIndex: 'end_date',
      key: 'end_date',
      sorter: true
    },
    {
      title: 'Durée (jours)',
      dataIndex: 'duration_days',
      key: 'duration_days',
      sorter: true
    },
    {
      title: 'Statut',
      dataIndex: 'status_display',
      key: 'status_display',
      render: (text, record) => {
        let color;
        switch (record.status) {
          case 'requested': color = 'processing'; break;
          case 'approved': color = 'success'; break;
          case 'rejected': color = 'error'; break;
          case 'cancelled': color = 'default'; break;
          default: color = 'default';
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Approbations',
      key: 'approvals',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag color={record.approved_by_manager ? "success" : "default"}>
            Manager: {record.approved_by_manager ? "✓" : "×"}
          </Tag>
          <Tag color={record.approved_by_hr ? "success" : "default"}>
            RH: {record.approved_by_hr ? "✓" : "×"}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" wrap>
          {record.status === 'requested' && !record.approved_by_manager && (
            <Button 
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(record.id, 'manager')}
            >
              Approuver (Manager)
            </Button>
          )}
          
          {record.status === 'requested' && !record.approved_by_hr && (
            <Button 
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(record.id, 'hr')}
            >
              Approuver (RH)
            </Button>
          )}
          
          {record.status === 'requested' && (
            <Button 
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleReject(record.id, record.approved_by_manager ? 'hr' : 'manager')}
            >
              Rejeter
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="availability-list">
      <Card>
        <Title level={2}>Disponibilités</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space wrap>
            <Input
              placeholder="Rechercher..."
              value={filters.searchText}
              onChange={(e) => handleFilterChange('searchText', e.target.value)}
              onPressEnter={fetchAvailabilities}
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
              placeholder="Type"
              style={{ width: 180 }}
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
              allowClear
            >
              <Option value="leave_of_absence">Congé sans solde</Option>
              <Option value="sabbatical">Congé sabbatique</Option>
              <Option value="parental">Congé parental</Option>
              <Option value="other">Autre</Option>
            </Select>
            <Select
              placeholder="Statut"
              style={{ width: 180 }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              <Option value="requested">Demandée</Option>
              <Option value="approved">Approuvée</Option>
              <Option value="rejected">Rejetée</Option>
              <Option value="cancelled">Annulée</Option>
            </Select>
            <RangePicker
              placeholder={['Date début', 'Date fin']}
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
              style={{ width: 250 }}
            />
            <Button onClick={resetFilters}>Réinitialiser</Button>
          </Space>

          <Button type="primary" icon={<PlusOutlined />}>
            <Link to="/hr/availabilities/new">Nouvelle disponibilité</Link>
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={availabilities}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default AvailabilityList;
