// src/components/hr/JobTitleList.js
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Input, Select, Typography, Tag, Spin, message, Popconfirm, Modal, Form } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const JobTitleList = () => {
  const [loading, setLoading] = useState(true);
  const [jobTitles, setJobTitles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchJobTitles();
    fetchDepartments();
  }, []);

  const fetchJobTitles = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/hr/job-titles/');
      const data = extractResultsFromResponse(response);
      setJobTitles(data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des postes:", error);
      message.error("Impossible de charger les postes");
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

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/hr/job-titles/${id}/`);
      message.success("Poste supprimé avec succès");
      fetchJobTitles();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer le poste. Il est peut-être utilisé par des employés.");
    }
  };

  const showModal = (jobTitle = null) => {
    setEditingJobTitle(jobTitle);
    form.resetFields();
    if (jobTitle) {
      form.setFieldsValue({
        name: jobTitle.name,
        department: jobTitle.department.id,
        description: jobTitle.description,
        is_management: jobTitle.is_management
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingJobTitle) {
        // Mode édition
        await axios.put(`/api/hr/job-titles/${editingJobTitle.id}/`, values);
        message.success("Poste mis à jour avec succès");
      } else {
        // Mode création
        await axios.post('/api/hr/job-titles/', values);
        message.success("Poste créé avec succès");
      }
      
      setModalVisible(false);
      fetchJobTitles();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer le poste");
    }
  };

  const handleSearch = (e) => {
    setSearchText(e.target.value);
  };

  const filteredJobTitles = jobTitles.filter(jobTitle => 
    (searchText === '' || 
     jobTitle.name.toLowerCase().includes(searchText.toLowerCase()) ||
     (jobTitle.description && jobTitle.description.toLowerCase().includes(searchText.toLowerCase()))) &&
    (departmentFilter === null || jobTitle.department.id === departmentFilter)
  );

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Département',
      key: 'department',
      render: (_, record) => record.department ? record.department.name : '-',
      sorter: (a, b) => (a.department?.name || '').localeCompare(b.department?.name || '')
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: 'Type',
      dataIndex: 'is_management',
      key: 'is_management',
      render: (is_management) => (
        <Tag color={is_management ? 'purple' : 'default'}>
          {is_management ? 'Management' : 'Standard'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => showModal(record)}>
            Modifier
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ce poste ?"
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
    <div className="job-title-list">
      <Card>
        <Title level={2}>Postes</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Rechercher un poste..."
              value={searchText}
              onChange={handleSearch}
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Filtrer par département"
              style={{ width: 200 }}
              value={departmentFilter}
              onChange={setDepartmentFilter}
              allowClear
            >
              {departments.map(dept => (
                <Option key={dept.id} value={dept.id}>{dept.name}</Option>
              ))}
            </Select>
          </Space>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            Nouveau poste
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredJobTitles}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal pour créer/modifier un poste */}
      <Modal
        title={editingJobTitle ? "Modifier le poste" : "Nouveau poste"}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setModalVisible(false)}>
            Annuler
          </Button>,
          <Button key="submit" type="primary" onClick={handleSave}>
            {editingJobTitle ? "Mettre à jour" : "Créer"}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Nom"
            rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="department"
            label="Département"
            rules={[{ required: true, message: 'Veuillez sélectionner un département' }]}
          >
            <Select
              placeholder="Sélectionner un département"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {departments.map(dept => (
                <Option key={dept.id} value={dept.id}>{dept.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="is_management"
            label="Poste de management"
            valuePropName="checked"
          >
            <Select defaultValue={false}>
              <Option value={true}>Oui</Option>
              <Option value={false}>Non</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default JobTitleList;
