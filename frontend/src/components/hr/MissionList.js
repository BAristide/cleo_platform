// src/components/hr/MissionList.js
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Input, Select, DatePicker, Typography, Tag, Spin, message, Popconfirm } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const MissionList = () => {
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    searchText: '',
    employee: undefined,
    status: undefined,
    dateRange: undefined
  });

  useEffect(() => {
    fetchMissions();
    fetchEmployees();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        search: filters.searchText || undefined,
        employee: filters.employee,
        status: filters.status,
        start_date_after: filters.dateRange?.[0] ? filters.dateRange[0].format('YYYY-MM-DD') : undefined,
        start_date_before: filters.dateRange?.[1] ? filters.dateRange[1].format('YYYY-MM-DD') : undefined
      };

      const response = await axios.get('/api/hr/missions/', { params });
      const data = extractResultsFromResponse(response);

      // Mettre à jour la pagination
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count
        });
      }

      setMissions(data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des missions:", error);
      message.error("Impossible de charger les missions");
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
      await axios.delete(`/api/hr/missions/${id}/`);
      message.success("Mission supprimée avec succès");
      fetchMissions();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer la mission");
    }
  };

  const handleGeneratePDF = async (id) => {
    try {
      await axios.post(`/api/hr/missions/${id}/generate_order_pdf/`);
      message.success("Ordre de mission généré avec succès");
      fetchMissions();
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      message.error("Impossible de générer l'ordre de mission");
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      window.open(`/api/hr/missions/${id}/download_order_pdf/`, '_blank');
    } catch (error) {
      console.error("Erreur lors du téléchargement du PDF:", error);
      message.error("Impossible de télécharger l'ordre de mission");
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
      status: undefined,
      dateRange: undefined
    });
    setPagination({
      ...pagination,
      current: 1
    });
  };

  const columns = [
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Link to={`/hr/missions/${record.id}`}>{text}</Link>
      ),
      sorter: true
    },
    {
      title: 'Employé',
      dataIndex: 'employee_name',
      key: 'employee_name',
      sorter: true
    },
    {
      title: 'Lieu',
      dataIndex: 'location',
      key: 'location',
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
          case 'cancelled': color = 'default'; break;
          case 'completed': color = 'success'; break;
          default: color = 'default';
        }
        return <Tag color={color}>{text}</Tag>;
      },
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
        <Space size="small">
          <Button size="small" type="primary" icon={<EditOutlined />}>
            <Link to={`/hr/missions/${record.id}`}>Détails</Link>
          </Button>
          {record.status === 'approved_finance' && !record.order_pdf && (
            <Button 
              size="small" 
              icon={<FileOutlined />}
              onClick={() => handleGeneratePDF(record.id)}
            >
              Générer PDF
            </Button>
          )}
          {record.order_pdf && (
            <Button 
              size="small" 
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadPDF(record.id)}
            >
              PDF
            </Button>
          )}
          {record.status === 'draft' && (
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer cette mission ?"
              onConfirm={() => handleDelete(record.id)}
              okText="Oui"
              cancelText="Non"
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Supprimer
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="mission-list">
      <Card>
        <Title level={2}>Missions</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space wrap>
            <Input
              placeholder="Rechercher une mission..."
              value={filters.searchText}
              onChange={(e) => handleFilterChange('searchText', e.target.value)}
              onPressEnter={fetchMissions}
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
              placeholder="Statut"
              style={{ width: 180 }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              <Option value="draft">Brouillon</Option>
              <Option value="submitted">Soumise</Option>
              <Option value="approved_manager">Approuvée par N+1</Option>
              <Option value="approved_hr">Approuvée par RH</Option>
              <Option value="approved_finance">Approuvée par Finance</Option>
              <Option value="rejected">Rejetée</Option>
              <Option value="cancelled">Annulée</Option>
              <Option value="completed">Terminée</Option>
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
            <Link to="/hr/missions/new">Nouvelle mission</Link>
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={missions}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default MissionList;
