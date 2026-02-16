// src/components/hr/SkillList.js
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Input, Select, Tag, Typography, message, Popconfirm, Modal, Form } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SkillList = () => {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/hr/skills/');
      const data = extractResultsFromResponse(response);
      setSkills(data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des compétences:", error);
      message.error("Impossible de charger les compétences");
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/hr/skills/${id}/`);
      message.success("Compétence supprimée avec succès");
      fetchSkills();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer la compétence. Elle est peut-être utilisée par des employés ou des postes.");
    }
  };

  const showModal = (skill = null) => {
    setEditingSkill(skill);
    form.resetFields();
    if (skill) {
      form.setFieldsValue({
        name: skill.name,
        category: skill.category,
        description: skill.description
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingSkill) {
        // Mode édition
        await axios.put(`/api/hr/skills/${editingSkill.id}/`, values);
        message.success("Compétence mise à jour avec succès");
      } else {
        // Mode création
        await axios.post('/api/hr/skills/', values);
        message.success("Compétence créée avec succès");
      }
      
      setModalVisible(false);
      fetchSkills();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer la compétence");
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'technical': return 'blue';
      case 'soft': return 'green';
      case 'language': return 'geekblue';
      case 'certification': return 'purple';
      default: return 'default';
    }
  };

  const getCategoryDisplay = (category) => {
    switch (category) {
      case 'technical': return 'Technique';
      case 'soft': return 'Compétences douces';
      case 'language': return 'Langue';
      case 'certification': return 'Certification';
      default: return 'Autre';
    }
  };

  const handleSearch = (e) => {
    setSearchText(e.target.value);
  };

  const filteredSkills = skills.filter(skill => 
    (searchText === '' || 
     skill.name.toLowerCase().includes(searchText.toLowerCase()) ||
     (skill.description && skill.description.toLowerCase().includes(searchText.toLowerCase()))) &&
    (categoryFilter === null || skill.category === categoryFilter)
  );

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Catégorie',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryDisplay(category)}
        </Tag>
      ),
      sorter: (a, b) => a.category.localeCompare(b.category)
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
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
            title="Êtes-vous sûr de vouloir supprimer cette compétence ?"
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
    <div className="skill-list">
      <Card>
        <Title level={2}>Compétences</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Rechercher une compétence..."
              value={searchText}
              onChange={handleSearch}
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Filtrer par catégorie"
              style={{ width: 200 }}
              value={categoryFilter}
              onChange={setCategoryFilter}
              allowClear
            >
              <Option value="technical">Technique</Option>
              <Option value="soft">Compétences douces</Option>
              <Option value="language">Langue</Option>
              <Option value="certification">Certification</Option>
              <Option value="other">Autre</Option>
            </Select>
          </Space>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            Nouvelle compétence
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredSkills}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal pour créer/modifier une compétence */}
      <Modal
        title={editingSkill ? "Modifier la compétence" : "Nouvelle compétence"}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setModalVisible(false)}>
            Annuler
          </Button>,
          <Button key="submit" type="primary" onClick={handleSave}>
            {editingSkill ? "Mettre à jour" : "Créer"}
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
            name="category"
            label="Catégorie"
            rules={[{ required: true, message: 'Veuillez sélectionner une catégorie' }]}
          >
            <Select>
              <Option value="technical">Technique</Option>
              <Option value="soft">Compétences douces</Option>
              <Option value="language">Langue</Option>
              <Option value="certification">Certification</Option>
              <Option value="other">Autre</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SkillList;
