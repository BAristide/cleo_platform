// src/components/catalog/ProductDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, Row, Col, Typography, Spin, message,
  Tabs, List, Popconfirm, Modal, Form, Input, InputNumber, Select, Switch
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ShoppingOutlined,
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [relatedDocuments, setRelatedDocuments] = useState({ quotes: [], orders: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProductDetails();
    fetchCurrencies();
    fetchRelatedDocuments();
  }, [id]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/catalog/products/${id}/`);
      setProduct(response.data);
    } catch (error) {
      console.error('Erreur lors de la recuperation du produit:', error);
      message.error('Impossible de charger les details du produit');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get('/api/core/currencies/');
      setCurrencies(extractResultsFromResponse(response));
    } catch (error) {
      console.error('Erreur devises:', error);
    }
  };

  const fetchRelatedDocuments = async () => {
    try {
      const [quoteItemsRes, orderItemsRes, invoiceItemsRes] = await Promise.all([
        axios.get('/api/sales/quote-items/', { params: { product: id } }).catch(() => ({ data: { results: [] } })),
        axios.get('/api/sales/order-items/', { params: { product: id } }).catch(() => ({ data: { results: [] } })),
        axios.get('/api/sales/invoice-items/', { params: { product: id } }).catch(() => ({ data: { results: [] } })),
      ]);

      const quoteItems = extractResultsFromResponse(quoteItemsRes);
      const orderItems = extractResultsFromResponse(orderItemsRes);
      const invoiceItems = extractResultsFromResponse(invoiceItemsRes);

      const fetchDocs = async (items, field, endpoint) => {
        const ids = [...new Set(items.map(item => item[field]))];
        const docs = [];
        for (const docId of ids) {
          try {
            const res = await axios.get(`${endpoint}${docId}/`);
            docs.push(res.data);
          } catch (e) { /* skip */ }
        }
        return docs;
      };

      const [quotes, orders, invoices] = await Promise.all([
        fetchDocs(quoteItems, 'quote', '/api/sales/quotes/'),
        fetchDocs(orderItems, 'order', '/api/sales/orders/'),
        fetchDocs(invoiceItems, 'invoice', '/api/sales/invoices/'),
      ]);

      setRelatedDocuments({ quotes, orders, invoices });
    } catch (error) {
      console.error('Erreur documents lies:', error);
    }
  };

  const handleDeleteProduct = async () => {
    setActionLoading(true);
    try {
      await axios.delete(`/api/catalog/products/${id}/`);
      message.success('Produit supprimé');
      navigate('/catalog/products');
    } catch (error) {
      console.error('Erreur suppression:', error);
      message.error('Impossible de supprimer le produit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!product) return;
    setActionLoading(true);
    try {
      await axios.patch(`/api/catalog/products/${id}/`, { is_active: !product.is_active });
      message.success(product.is_active ? 'Produit désactivé' : 'Produit activé');
      fetchProductDetails();
    } catch (error) {
      console.error('Erreur statut:', error);
      message.error('Impossible de modifier le statut');
    } finally {
      setActionLoading(false);
    }
  };

  const showEditModal = () => {
    if (!product) return;
    form.setFieldsValue({ ...product });
    setEditModalVisible(true);
  };

  const handleFormSubmit = async (values) => {
    setActionLoading(true);
    try {
      await axios.put(`/api/catalog/products/${id}/`, values);
      message.success('Produit mis a jour');
      setEditModalVisible(false);
      fetchProductDetails();
    } catch (error) {
      console.error('Erreur mise a jour:', error);
      message.error('Impossible de mettre a jour le produit');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
  }

  if (!product) {
    return <div>Produit non trouve</div>;
  }

  const getCurrencyName = (currencyId) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.code : '';
  };

  const statusMap = {
    draft: 'Brouillon', sent: 'Envoye', accepted: 'Accepte', rejected: 'Refuse', expired: 'Expire', cancelled: 'Annule',
    confirmed: 'Confirmee', in_progress: 'En cours', delivered: 'Livree',
    unpaid: 'Non payee', partial: 'Partiellement payee', paid: 'Payee', overdue: 'En retard',
  };

  const typeMap = { standard: 'Standard', deposit: 'Acompte', credit_note: 'Avoir' };

  const renderDocList = (title, docs, linkPrefix, statusField) => {
    if (docs.length === 0) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>{title}</Title>
        <List bordered dataSource={docs} renderItem={item => (
          <List.Item actions={[<Link to={`${linkPrefix}${item.id}`}>Voir</Link>]}>
            <List.Item.Meta
              title={<Link to={`${linkPrefix}${item.id}`}>{item.number}</Link>}
              description={
                <>
                  <div>Client: {item.company_name}</div>
                  <div>Date: {moment(item.date).format('DD/MM/YYYY')}</div>
                  <div>Statut: {statusMap[item[statusField] || item.status] || item[statusField] || item.status}</div>
                  {item.type && <div>Type: {typeMap[item.type] || item.type}</div>}
                </>
              }
            />
            <div>{item.total} {getCurrencyName(item.currency)}</div>
          </List.Item>
        )} />
      </div>
    );
  };

  const tabItems = [
    {
      key: '1',
      label: 'Informations',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Card title="Details du produit">
              <Descriptions column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} bordered>
                <Descriptions.Item label="Reference">{product.reference}</Descriptions.Item>
                <Descriptions.Item label="Nom">{product.name}</Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>{product.description || '-'}</Descriptions.Item>
                <Descriptions.Item label="Prix unitaire">{product.unit_price} {getCurrencyName(product.currency)}</Descriptions.Item>
                <Descriptions.Item label="TVA">{product.tax_rate}%</Descriptions.Item>
                <Descriptions.Item label="Prix TTC">{(product.unit_price * (1 + product.tax_rate / 100)).toFixed(2)} {getCurrencyName(product.currency)}</Descriptions.Item>
                <Descriptions.Item label="Statut"><Tag color={product.is_active ? 'green' : 'red'}>{product.is_active ? 'Actif' : 'Inactif'}</Tag></Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Statistiques d'utilisation">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Devis">{relatedDocuments.quotes.length}</Descriptions.Item>
                <Descriptions.Item label="Commandes">{relatedDocuments.orders.length}</Descriptions.Item>
                <Descriptions.Item label="Factures">{relatedDocuments.invoices.length}</Descriptions.Item>
                <Descriptions.Item label="Total">{relatedDocuments.quotes.length + relatedDocuments.orders.length + relatedDocuments.invoices.length}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: '2',
      label: <span><ShoppingOutlined /> Documents lies</span>,
      children: (
        <>
          {renderDocList('Devis', relatedDocuments.quotes, '/sales/quotes/', 'status')}
          {renderDocList('Commandes', relatedDocuments.orders, '/sales/orders/', 'status')}
          {renderDocList('Factures', relatedDocuments.invoices, '/sales/invoices/', 'payment_status')}
          {relatedDocuments.quotes.length === 0 && relatedDocuments.orders.length === 0 && relatedDocuments.invoices.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}><Text>Ce produit n'a pas ete utilise dans des documents de vente.</Text></div>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="product-detail">
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />}><Link to="/catalog/products">Retour a la liste</Link></Button>
          <Button type="primary" icon={<EditOutlined />} onClick={showEditModal}>Modifier</Button>
          <Button icon={product.is_active ? <CloseCircleOutlined /> : <CheckCircleOutlined />} onClick={handleToggleActive} loading={actionLoading} type={product.is_active ? 'default' : 'primary'}>{product.is_active ? 'Desactiver' : 'Activer'}</Button>
          <Popconfirm title="Supprimer ce produit?" description="Action irreversible." onConfirm={handleDeleteProduct} okText="Oui" cancelText="Non">
            <Button danger icon={<DeleteOutlined />} loading={actionLoading}>Supprimer</Button>
          </Popconfirm>
        </Space>

        <Title level={2}>{product.name}</Title>
        <Tag color={product.is_active ? 'green' : 'red'} style={{ marginBottom: 16 }}>{product.is_active ? 'Actif' : 'Inactif'}</Tag>

        <Tabs defaultActiveKey="1" items={tabItems} />
      </Card>

      <Modal title="Modifier le produit" open={editModalVisible} onCancel={() => setEditModalVisible(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Requis' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="reference" label="Reference" rules={[{ required: true, message: 'Requis' }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Description"><TextArea rows={3} /></Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="unit_price" label="Prix unitaire" rules={[{ required: true }, { type: 'number', min: 0 }]}><InputNumber style={{ width: '100%' }} step={0.01} precision={2} /></Form.Item></Col>
            <Col span={8}><Form.Item name="currency" label="Devise" rules={[{ required: true }]}><Select>{currencies.map(c => <Option key={c.id} value={c.id}>{c.code}</Option>)}</Select></Form.Item></Col>
            <Col span={8}><Form.Item name="tax_rate" label="TVA (%)" rules={[{ required: true }, { type: 'number', min: 0, max: 100 }]}><InputNumber style={{ width: '100%' }} step={0.1} precision={2} /></Form.Item></Col>
          </Row>
          <Form.Item name="is_active" valuePropName="checked"><Switch checkedChildren="Actif" unCheckedChildren="Inactif" /></Form.Item>
          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>Annuler</Button>
              <Button type="primary" htmlType="submit" loading={actionLoading}>Mettre a jour</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductDetail;
