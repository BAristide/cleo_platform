// src/components/catalog/ProductList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, Button, Space, Typography, Card, Input, Select,
  Tag, Popconfirm, message, Switch, Row, Col, Modal, Form, InputNumber
} from 'antd';
import {
  SearchOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
  CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchProducts();
    fetchCurrencies();
  }, [statusFilter, pagination.current, pagination.pageSize]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
      };

      if (statusFilter && statusFilter !== 'all') {
        params.is_active = statusFilter === 'active';
      }

      if (searchText) {
        params.search = searchText;
      }

      const response = await axios.get('/api/catalog/products/', { params });
      const productsData = extractResultsFromResponse(response);

      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count,
        });
      }

      setProducts(productsData);
    } catch (error) {
      console.error('Erreur lors de la recuperation des produits:', error);
      message.error('Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get('/api/core/currencies/');
      const currenciesData = extractResultsFromResponse(response);
      setCurrencies(currenciesData);
    } catch (error) {
      console.error('Erreur lors de la recuperation des devises:', error);
    }
  };

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    fetchProducts();
  };

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setPagination({ ...pagination, current: 1 });
    fetchProducts();
  };

  const handleTableChange = (pag) => {
    setPagination(pag);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPagination({ ...pagination, current: 1 });
  };

  const handleDeleteProduct = async (id) => {
    setActionLoading(true);
    try {
      await axios.delete(`/api/catalog/products/${id}/`);
      message.success('Produit supprime avec succes');
      fetchProducts();
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error);
      message.error('Impossible de supprimer le produit. Ce produit est peut-etre utilise dans des documents.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    setActionLoading(true);
    try {
      await axios.patch(`/api/catalog/products/${id}/`, { is_active: !currentStatus });
      message.success(currentStatus ? 'Produit desactive' : 'Produit active');
      fetchProducts();
    } catch (error) {
      console.error('Erreur lors de la modification du statut:', error);
      message.error('Impossible de modifier le statut du produit');
    } finally {
      setActionLoading(false);
    }
  };

  const showEditModal = (product) => {
    setCurrentProduct(product);
    form.setFieldsValue({ ...product });
    setEditModalVisible(true);
  };

  const showCreateModal = () => {
    setCurrentProduct(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, tax_rate: 20 });
    setEditModalVisible(true);
  };

  const handleFormSubmit = async (values) => {
    setActionLoading(true);
    try {
      if (currentProduct) {
        await axios.put(`/api/catalog/products/${currentProduct.id}/`, values);
        message.success('Produit mis a jour avec succes');
      } else {
        await axios.post('/api/catalog/products/', values);
        message.success('Produit cree avec succes');
      }
      setEditModalVisible(false);
      fetchProducts();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du produit:", error);
      message.error("Impossible d'enregistrer le produit");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (text, record) => <Link to={`/catalog/products/${record.id}`}>{text}</Link>,
    },
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: text => text || '-',
    },
    {
      title: 'Prix unitaire',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (text, record) => `${text} ${record.currency_code || ''}`,
      sorter: (a, b) => a.unit_price - b.unit_price,
    },
    { title: 'TVA (%)', dataIndex: 'tax_rate', key: 'tax_rate', render: text => `${text}%` },
    {
      title: 'Statut',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'} icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isActive ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)} />
          <Switch checked={record.is_active} onChange={() => handleToggleActive(record.id, record.is_active)} loading={actionLoading} />
          <Popconfirm title="Supprimer ce produit?" description="Cette action ne peut pas etre annulee." onConfirm={() => handleDeleteProduct(record.id)} okText="Oui" cancelText="Non">
            <Button size="small" danger icon={<DeleteOutlined />} loading={actionLoading} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="product-list-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={2}>Produits</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>Nouveau produit</Button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Input placeholder="Rechercher par reference, nom ou description" value={searchText} onChange={e => setSearchText(e.target.value)} onPressEnter={handleSearch} prefix={<SearchOutlined />} />
            </Col>
            <Col span={8}>
              <Space>
                <Select placeholder="Filtrer par statut" style={{ width: 150 }} value={statusFilter} onChange={handleStatusChange}>
                  <Option value="all">Tous</Option>
                  <Option value="active">Actifs</Option>
                  <Option value="inactive">Inactifs</Option>
                </Select>
                <Button onClick={handleSearch} type="primary">Rechercher</Button>
                {(searchText || statusFilter !== 'all') && <Button onClick={resetFilters}>Reinitialiser</Button>}
              </Space>
            </Col>
          </Row>
        </div>

        <Table columns={columns} dataSource={products} rowKey="id" loading={loading} pagination={pagination} onChange={handleTableChange} locale={{ emptyText: 'Aucun produit trouve' }} />
      </Card>

      <Modal title={currentProduct ? 'Modifier le produit' : 'Nouveau produit'} open={editModalVisible} onCancel={() => setEditModalVisible(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Veuillez saisir le nom' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="reference" label="Reference" rules={[{ required: true, message: 'Veuillez saisir la reference' }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Description"><TextArea rows={3} /></Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="unit_price" label="Prix unitaire" rules={[{ required: true, message: 'Requis' }, { type: 'number', min: 0, message: 'Positif' }]}><InputNumber style={{ width: '100%' }} step={0.01} precision={2} /></Form.Item></Col>
            <Col span={8}><Form.Item name="currency" label="Devise" rules={[{ required: true, message: 'Requis' }]}><Select>{currencies.map(c => <Option key={c.id} value={c.id}>{c.code}</Option>)}</Select></Form.Item></Col>
            <Col span={8}><Form.Item name="tax_rate" label="TVA (%)" rules={[{ required: true, message: 'Requis' }, { type: 'number', min: 0, max: 100, message: '0-100' }]}><InputNumber style={{ width: '100%' }} step={0.1} precision={2} /></Form.Item></Col>
          </Row>
          <Form.Item name="is_active" valuePropName="checked"><Switch checkedChildren="Actif" unCheckedChildren="Inactif" /></Form.Item>
          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>Annuler</Button>
              <Button type="primary" htmlType="submit" loading={actionLoading}>{currentProduct ? 'Mettre a jour' : 'Creer'}</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductList;
