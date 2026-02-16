// src/components/sales/ProductDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Spin,
  message,
  Tabs,
  List,
  Table,
  Popconfirm,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShoppingOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [relatedDocuments, setRelatedDocuments] = useState({
    quotes: [],
    orders: [],
    invoices: []
  });
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
      const response = await axios.get(`/api/sales/products/${id}/`);
      setProduct(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des détails du produit:", error);
      message.error("Impossible de charger les détails du produit");
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
      console.error('Erreur lors de la récupération des devises:', error);
      message.error('Impossible de charger les devises');
    }
  };

  const fetchRelatedDocuments = async () => {
    try {
      // Récupérer les devis liés au produit
      const quoteItemsResponse = await axios.get('/api/sales/quote-items/', {
        params: { product: id }
      });
      const quoteItems = extractResultsFromResponse(quoteItemsResponse);
      const quoteIds = [...new Set(quoteItems.map(item => item.quote))];
      
      const quotesData = [];
      for (const quoteId of quoteIds) {
        const quoteResponse = await axios.get(`/api/sales/quotes/${quoteId}/`);
        quotesData.push(quoteResponse.data);
      }

      // Récupérer les commandes liées au produit
      const orderItemsResponse = await axios.get('/api/sales/order-items/', {
        params: { product: id }
      });
      const orderItems = extractResultsFromResponse(orderItemsResponse);
      const orderIds = [...new Set(orderItems.map(item => item.order))];
      
      const ordersData = [];
      for (const orderId of orderIds) {
        const orderResponse = await axios.get(`/api/sales/orders/${orderId}/`);
        ordersData.push(orderResponse.data);
      }

      // Récupérer les factures liées au produit
      const invoiceItemsResponse = await axios.get('/api/sales/invoice-items/', {
        params: { product: id }
      });
      const invoiceItems = extractResultsFromResponse(invoiceItemsResponse);
      const invoiceIds = [...new Set(invoiceItems.map(item => item.invoice))];
      
      const invoicesData = [];
      for (const invoiceId of invoiceIds) {
        const invoiceResponse = await axios.get(`/api/sales/invoices/${invoiceId}/`);
        invoicesData.push(invoiceResponse.data);
      }

      setRelatedDocuments({
        quotes: quotesData,
        orders: ordersData,
        invoices: invoicesData
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des documents liés:", error);
      message.error("Impossible de charger les documents liés");
    }
  };

  const handleDeleteProduct = async () => {
    setActionLoading(true);
    try {
      await axios.delete(`/api/sales/products/${id}/`);
      message.success('Produit supprimé avec succès');
      navigate('/sales/products');
    } catch (error) {
      console.error("Erreur lors de la suppression du produit:", error);
      message.error("Impossible de supprimer le produit. Ce produit est peut-être utilisé dans des documents de vente.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!product) return;

    setActionLoading(true);
    try {
      await axios.patch(`/api/sales/products/${id}/`, { is_active: !product.is_active });
      message.success(product.is_active ? 'Produit désactivé avec succès' : 'Produit activé avec succès');
      fetchProductDetails();
    } catch (error) {
      console.error("Erreur lors de la modification du statut:", error);
      message.error("Impossible de modifier le statut du produit");
    } finally {
      setActionLoading(false);
    }
  };

  const showEditModal = () => {
    if (!product) return;

    form.setFieldsValue({
      ...product
    });
    setEditModalVisible(true);
  };

  const handleFormSubmit = async (values) => {
    setActionLoading(true);
    try {
      await axios.put(`/api/sales/products/${id}/`, values);
      message.success('Produit mis à jour avec succès');
      setEditModalVisible(false);
      fetchProductDetails();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du produit:", error);
      message.error("Impossible de mettre à jour le produit");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return <div>Produit non trouvé</div>;
  }

  const getCurrencyName = (currencyId) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.code : '';
  };

  return (
    <div className="product-detail">
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link to="/sales/products">Retour à la liste</Link>
          </Button>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={showEditModal}
          >
            Modifier
          </Button>
          <Button
            icon={product.is_active ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
            onClick={handleToggleActive}
            loading={actionLoading}
            type={product.is_active ? "default" : "primary"}
          >
            {product.is_active ? 'Désactiver' : 'Activer'}
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ce produit?"
            description="Cette action ne peut pas être annulée."
            onConfirm={handleDeleteProduct}
            okText="Oui"
            cancelText="Non"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              loading={actionLoading}
            >
              Supprimer
            </Button>
          </Popconfirm>
        </Space>

        <Title level={2}>{product.name}</Title>
        <Tag color={product.is_active ? "green" : "red"} style={{ marginBottom: 16 }}>
          {product.is_active ? 'Actif' : 'Inactif'}
        </Tag>

        <Tabs defaultActiveKey="1">
          <TabPane tab="Informations" key="1">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Card title="Détails du produit">
                  <Descriptions column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} bordered>
                    <Descriptions.Item label="Référence">{product.reference}</Descriptions.Item>
                    <Descriptions.Item label="Nom">{product.name}</Descriptions.Item>
                    <Descriptions.Item label="Description" span={2}>
                      {product.description || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Prix unitaire">
                      {product.unit_price} {getCurrencyName(product.currency)}
                    </Descriptions.Item>
                    <Descriptions.Item label="TVA">
                      {product.tax_rate}%
                    </Descriptions.Item>
                    <Descriptions.Item label="Prix TTC">
                      {(product.unit_price * (1 + product.tax_rate / 100)).toFixed(2)} {getCurrencyName(product.currency)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Statut">
                      <Tag color={product.is_active ? "green" : "red"}>
                        {product.is_active ? 'Actif' : 'Inactif'}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card title="Statistiques d'utilisation">
                  <Descriptions column={1} bordered>
                    <Descriptions.Item label="Utilisé dans des devis">
                      {relatedDocuments.quotes.length}
                    </Descriptions.Item>
                    <Descriptions.Item label="Utilisé dans des commandes">
                      {relatedDocuments.orders.length}
                    </Descriptions.Item>
                    <Descriptions.Item label="Utilisé dans des factures">
                      {relatedDocuments.invoices.length}
                    </Descriptions.Item>
                    <Descriptions.Item label="Utilisation totale">
                      {relatedDocuments.quotes.length + relatedDocuments.orders.length + relatedDocuments.invoices.length}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab={<span><ShoppingOutlined /> Documents liés</span>} key="2">
            {relatedDocuments.quotes.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Title level={4}>Devis</Title>
                <List
                  bordered
                  dataSource={relatedDocuments.quotes}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Link to={`/sales/quotes/${item.id}`}>Voir</Link>
                      ]}
                    >
                      <List.Item.Meta
                        title={<Link to={`/sales/quotes/${item.id}`}>Devis {item.number}</Link>}
                        description={
                          <>
                            <div>Client: {item.company_name}</div>
                            <div>Date: {moment(item.date).format('DD/MM/YYYY')}</div>
                            <div>Statut: {
                              item.status === 'draft' ? 'Brouillon' :
                              item.status === 'sent' ? 'Envoyé' :
                              item.status === 'accepted' ? 'Accepté' :
                              item.status === 'rejected' ? 'Refusé' :
                              item.status === 'expired' ? 'Expiré' :
                              item.status === 'cancelled' ? 'Annulé' :
                              item.status
                            }</div>
                          </>
                        }
                      />
                      <div>{item.total} {getCurrencyName(item.currency)}</div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {relatedDocuments.orders.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Title level={4}>Commandes</Title>
                <List
                  bordered
                  dataSource={relatedDocuments.orders}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Link to={`/sales/orders/${item.id}`}>Voir</Link>
                      ]}
                    >
                      <List.Item.Meta
                        title={<Link to={`/sales/orders/${item.id}`}>Commande {item.number}</Link>}
                        description={
                          <>
                            <div>Client: {item.company_name}</div>
                            <div>Date: {moment(item.date).format('DD/MM/YYYY')}</div>
                            <div>Statut: {
                              item.status === 'draft' ? 'Brouillon' :
                              item.status === 'confirmed' ? 'Confirmée' :
                              item.status === 'in_progress' ? 'En cours' :
                              item.status === 'delivered' ? 'Livrée' :
                              item.status === 'cancelled' ? 'Annulée' :
                              item.status
                            }</div>
                          </>
                        }
                      />
                      <div>{item.total} {getCurrencyName(item.currency)}</div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {relatedDocuments.invoices.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Title level={4}>Factures</Title>
                <List
                  bordered
                  dataSource={relatedDocuments.invoices}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Link to={`/sales/invoices/${item.id}`}>Voir</Link>
                      ]}
                    >
                      <List.Item.Meta
                        title={<Link to={`/sales/invoices/${item.id}`}>Facture {item.number}</Link>}
                        description={
                          <>
                            <div>Client: {item.company_name}</div>
                            <div>Date: {moment(item.date).format('DD/MM/YYYY')}</div>
                            <div>Type: {
                              item.type === 'standard' ? 'Standard' :
                              item.type === 'deposit' ? 'Acompte' :
                              item.type === 'credit_note' ? 'Avoir' :
                              item.type
                            }</div>
                            <div>Statut: {
                              item.payment_status === 'unpaid' ? 'Non payée' :
                              item.payment_status === 'partial' ? 'Partiellement payée' :
                              item.payment_status === 'paid' ? 'Payée' :
                              item.payment_status === 'overdue' ? 'En retard' :
                              item.payment_status === 'cancelled' ? 'Annulée' :
                              item.payment_status
                            }</div>
                          </>
                        }
                      />
                      <div>{item.total} {getCurrencyName(item.currency)}</div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {relatedDocuments.quotes.length === 0 && relatedDocuments.orders.length === 0 && relatedDocuments.invoices.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Text>Ce produit n'a pas été utilisé dans des documents de vente.</Text>
              </div>
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* Modal pour modifier le produit */}
      <Modal
        title="Modifier le produit"
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nom"
                rules={[{ required: true, message: 'Veuillez saisir le nom du produit' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="reference"
                label="Référence"
                rules={[{ required: true, message: 'Veuillez saisir la référence du produit' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="unit_price"
                label="Prix unitaire"
                rules={[
                  { required: true, message: 'Veuillez saisir le prix unitaire' },
                  { type: 'number', min: 0, message: 'Le prix doit être positif' }
                ]}
              >
                <InputNumber style={{ width: '100%' }} step={0.01} precision={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="currency"
                label="Devise"
                rules={[{ required: true, message: 'Veuillez sélectionner une devise' }]}
              >
                <Select>
                  {currencies.map(currency => (
                    <Option key={currency.id} value={currency.id}>{currency.code}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tax_rate"
                label="TVA (%)"
                rules={[
                  { required: true, message: 'Veuillez saisir le taux de TVA' },
                  { type: 'number', min: 0, max: 100, message: 'Le taux doit être entre 0 et 100' }
                ]}
              >
                <InputNumber style={{ width: '100%' }} step={0.1} precision={2} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            valuePropName="checked"
          >
            <Switch checkedChildren="Actif" unCheckedChildren="Inactif" />
          </Form.Item>

          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" loading={actionLoading}>
                Mettre à jour
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductDetail;
