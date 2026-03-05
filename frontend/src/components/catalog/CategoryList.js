// src/components/catalog/CategoryList.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Typography, Card, Input, Space, message, Modal, Form, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/catalog/product-categories/');
      const data = extractResultsFromResponse(response);
      setCategories(data);
    } catch (error) {
      console.error('Erreur categories:', error);
      message.error('Impossible de charger les categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await axios.delete(`/api/catalog/product-categories/${id}/`);
      message.success('Catégorie supprimée');
      fetchCategories();
    } catch (error) {
      console.error('Erreur suppression:', error);
      message.error('Impossible de supprimer la catégorie');
    } finally {
      setActionLoading(false);
    }
  };

  const showEditModal = (category) => {
    setCurrentCategory(category);
    form.setFieldsValue({ ...category, parent: category.parent || null });
    setEditModalVisible(true);
  };

  const showCreateModal = () => {
    setCurrentCategory(null);
    form.resetFields();
    setEditModalVisible(true);
  };

  const handleFormSubmit = async (values) => {
    setActionLoading(true);
    try {
      if (currentCategory) {
        await axios.put(`/api/catalog/product-categories/${currentCategory.id}/`, values);
        message.success('Catégorie mise à jour');
      } else {
        await axios.post('/api/catalog/product-categories/', values);
        message.success('Catégorie créée');
      }
      setEditModalVisible(false);
      fetchCategories();
    } catch (error) {
      console.error('Erreur enregistrement:', error);
      message.error("Impossible d'enregistrer la catégorie");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCategories = searchText
    ? categories.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()) || c.code.toLowerCase().includes(searchText.toLowerCase()))
    : categories;

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    { title: 'Catégorie parente', dataIndex: 'parent_name', key: 'parent_name', render: text => text || '-' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)} />
          <Popconfirm title="Supprimer cette catégorie?" onConfirm={() => handleDelete(record.id)} okText="Oui" cancelText="Non">
            <Button size="small" danger icon={<DeleteOutlined />} loading={actionLoading} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={2}>Categories de produits</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>Nouvelle catégorie</Button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Input placeholder="Rechercher par code ou nom" value={searchText} onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} style={{ width: 400 }} />
        </div>

        <Table columns={columns} dataSource={filteredCategories} rowKey="id" loading={loading} locale={{ emptyText: 'Aucune catégorie trouvée' }} />
      </Card>

      <Modal title={currentCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'} open={editModalVisible} onCancel={() => setEditModalVisible(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Requis' }]}><Input /></Form.Item>
          <Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Requis' }]}><Input /></Form.Item>
          <Form.Item name="parent" label="Catégorie parente">
            <Select allowClear placeholder="Aucune (racine)">
              {categories.filter(c => !currentCategory || c.id !== currentCategory.id).map(c => (
                <Option key={c.id} value={c.id}>{c.code} - {c.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>Annuler</Button>
              <Button type="primary" htmlType="submit" loading={actionLoading}>{currentCategory ? 'Mettre a jour' : 'Creer'}</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryList;
