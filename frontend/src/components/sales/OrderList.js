// src/components/sales/OrderList.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Input, Card, Tag, Typography, message, Popconfirm, Select,
  DatePicker, Row, Col, Badge, Drawer, Form, Alert, Modal
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  FileOutlined,
  ShopOutlined,
  MailOutlined,
  CheckOutlined,
  CloseOutlined,
  BankOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import moment from 'moment';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const OrderList = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [createDepositModal, setCreateDepositModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [depositPercentage, setDepositPercentage] = useState(30);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, pagination.current, pagination.pageSize]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Construire les paramètres de requête
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
      };

      // Ajouter les filtres si définis
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchText) {
        params.search = searchText;
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.date_min = dateRange[0].format('YYYY-MM-DD');
        params.date_max = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await axios.get('/api/sales/orders/', { params });
      
      // Extraire les résultats avec l'utilitaire
      const ordersData = extractResultsFromResponse(response);
      
      // Mettre à jour la pagination avec la réponse
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count,
        });
      }
      
      setOrders(ordersData);
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      message.error('Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Réinitialiser à la première page lors d'une recherche
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchOrders();
  };

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setDateRange(null);
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchOrders();
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPagination({
      ...pagination,
      current: 1,
    });
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handleConfirmOrder = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/sales/orders/${id}/confirm/`);
      message.success('Commande confirmée avec succès');
      fetchOrders();
    } catch (error) {
      console.error("Erreur lors de la confirmation de la commande:", error);
      message.error("Impossible de confirmer la commande");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/sales/orders/${id}/cancel/`);
      message.success('Commande annulée avec succès');
      fetchOrders();
    } catch (error) {
      console.error("Erreur lors de l'annulation de la commande:", error);
      message.error("Impossible d'annuler la commande");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDepositInvoice = async () => {
    if (!selectedOrderId) return;
    
    setActionLoading(true);
    try {
      const response = await axios.post(`/api/sales/orders/${selectedOrderId}/create_deposit_invoice/`, {
        deposit_percentage: depositPercentage
      });
      message.success(`Facture d'acompte créée avec succès (${depositPercentage}%)`);
      setCreateDepositModal(false);
      
      // Si la réponse contient l'ID de la facture, naviguer vers la page de détail
      if (response.data && response.data.invoice && response.data.invoice.id) {
        navigate(`/sales/invoices/${response.data.invoice.id}`);
      } else {
        fetchOrders();
      }
    } catch (error) {
      console.error("Erreur lors de la création de la facture d'acompte:", error);
      message.error("Impossible de créer la facture d'acompte");
    } finally {
      setActionLoading(false);
    }
  };

  const showCreateDepositModal = (order) => {
    setSelectedOrderId(order.id);
    setDepositPercentage(30);
    setCreateDepositModal(true);
  };

  const handleConvertToInvoice = async (id) => {
    setActionLoading(true);
    try {
      const response = await axios.post(`/api/sales/orders/${id}/convert_to_invoice/`);
      message.success('Commande convertie en facture avec succès');
      
      // Si la réponse contient l'ID de la facture, naviguer vers la page de détail
      if (response.data && response.data.invoice && response.data.invoice.id) {
        navigate(`/sales/invoices/${response.data.invoice.id}`);
      } else {
        fetchOrders();
      }
    } catch (error) {
      console.error("Erreur lors de la conversion de la commande:", error);
      message.error("Impossible de convertir la commande en facture");
      setActionLoading(false);
    }
  };

  const handleGeneratePdf = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/sales/orders/${id}/generate_pdf/`);
      message.success('PDF généré avec succès');
      // Ouvrir le PDF dans un nouvel onglet
      window.open(`/api/sales/orders/${id}/download_pdf/`, '_blank');
      fetchOrders();
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      message.error("Impossible de générer le PDF");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendByEmail = async (id) => {
    setActionLoading(true);
    try {
      // Pour simplifier, nous utilisons directement l'API sans modal ici
      // Dans un cas réel, il faudrait probablement utiliser un modal pour saisir l'email
      await axios.post(`/api/sales/orders/${id}/send_by_email/`);
      message.success('Commande envoyée par email avec succès');
      fetchOrders();
    } catch (error) {
      console.error("Erreur lors de l'envoi de la commande par email:", error);
      message.error("Impossible d'envoyer la commande par email");
      navigate(`/sales/orders/${id}`); // Rediriger vers la page de détail pour l'envoi manuel
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'number',
      key: 'number',
      render: (text, record) => <Link to={`/sales/orders/${record.id}`}>{text}</Link>,
    },
    {
      title: 'Entreprise',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: 'Contact',
      dataIndex: 'contact_name',
      key: 'contact_name',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: text => text ? moment(text).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Livraison',
      dataIndex: 'delivery_date',
      key: 'delivery_date',
      render: text => text ? moment(text).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (text, record) => `${text} ${record.currency_code || ''}`,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        let color, label;
        switch (status) {
          case 'draft':
            color = 'default';
            label = 'Brouillon';
            break;
          case 'confirmed':
            color = 'blue';
            label = 'Confirmée';
            break;
          case 'in_progress':
            color = 'processing';
            label = 'En cours';
            break;
          case 'delivered':
            color = 'green';
            label = 'Livrée';
            break;
          case 'cancelled':
            color = 'red';
            label = 'Annulée';
            break;
          default:
            color = 'default';
            label = status;
        }
        return (
          <Space>
            <Tag color={color}>{label}</Tag>
            {record.has_deposit_invoice && <Badge status="processing" text="Acompte" />}
            {record.has_final_invoice && <Badge status="success" text="Facturée" />}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="primary">
            <Link to={`/sales/orders/${record.id}`}>Détails</Link>
          </Button>

          {record.status === 'draft' && (
            <Button 
              size="small" 
              type="primary" 
              icon={<CheckOutlined />} 
              onClick={() => handleConfirmOrder(record.id)}
              loading={actionLoading}
            >
              Confirmer
            </Button>
          )}

          {['draft', 'confirmed', 'in_progress'].includes(record.status) && !record.has_final_invoice && (
            <Button 
              size="small" 
              danger 
              icon={<CloseOutlined />} 
              onClick={() => handleCancelOrder(record.id)}
              loading={actionLoading}
            >
              Annuler
            </Button>
          )}

          {record.status === 'confirmed' && (
            <>
              {record.can_create_deposit_invoice && (
                <Button 
                  size="small" 
                  type="primary" 
                  icon={<BankOutlined />} 
                  onClick={() => showCreateDepositModal(record)}
                  loading={actionLoading}
                >
                  Acompte
                </Button>
              )}
              
              {record.can_create_final_invoice && (
                <Button 
                  size="small" 
                  type="primary" 
                  icon={<ShopOutlined />} 
                  onClick={() => handleConvertToInvoice(record.id)}
                  loading={actionLoading}
                >
                  Facturer
                </Button>
              )}
            </>
          )}

          <Button 
            size="small" 
            icon={<FileOutlined />} 
            onClick={() => handleGeneratePdf(record.id)}
            loading={actionLoading}
          >
            PDF
          </Button>

          <Button 
            size="small" 
            icon={<MailOutlined />} 
            onClick={() => handleSendByEmail(record.id)}
            loading={actionLoading}
          >
            Email
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="order-list-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={2}>Commandes</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/sales/orders/new')}
          >
            Nouvelle commande
          </Button>
        </div>

        {/* Filtres */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Input
                placeholder="Rechercher par numéro, entreprise ou contact"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filtrer par statut"
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <Option value="all">Tous les statuts</Option>
                <Option value="draft">Brouillon</Option>
                <Option value="confirmed">Confirmée</Option>
                <Option value="in_progress">En cours</Option>
                <Option value="delivered">Livrée</Option>
                <Option value="cancelled">Annulée</Option>
              </Select>
            </Col>
            <Col span={10}>
              <Space>
                <RangePicker
                  placeholder={['Date début', 'Date fin']}
                  value={dateRange}
                  onChange={handleDateRangeChange}
                />
                <Button onClick={handleSearch} type="primary">Rechercher</Button>
                {(searchText || statusFilter !== 'all' || dateRange) && (
                  <Button onClick={resetFilters}>Réinitialiser</Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        {/* Tableau des commandes */}
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          locale={{ emptyText: 'Aucune commande trouvée' }}
          summary={pageData => {
            if (pageData.length === 0) return null;
            
            // Calculer les statistiques
            let totalAmount = 0;
            
            pageData.forEach(item => {
              totalAmount += Number(item.total || 0);
            });
            
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <strong>Total de la page</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong>{totalAmount.toLocaleString()} {pageData[0]?.currency_code || ''}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={2}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      {/* Modal pour la création de facture d'acompte */}
      <Modal
        title="Créer une facture d'acompte"
        visible={createDepositModal}
        onCancel={() => setCreateDepositModal(false)}
        onOk={handleCreateDepositInvoice}
        confirmLoading={actionLoading}
      >
        <p>Veuillez indiquer le pourcentage d'acompte à facturer:</p>
        <Form layout="vertical">
          <Form.Item
            label="Pourcentage d'acompte"
            required
          >
            <Input
              type="number"
              min={1}
              max={100}
              value={depositPercentage}
              onChange={e => setDepositPercentage(parseInt(e.target.value))}
              suffix="%"
            />
          </Form.Item>
        </Form>
        
        {selectedOrderId && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message="Aperçu du montant"
              description={
                <>
                  <p>
                    Montant de l'acompte ({depositPercentage}%): {
                      ((orders.find(order => order.id === selectedOrderId)?.total * depositPercentage) / 100).toFixed(2) 
                    } {
                      orders.find(order => order.id === selectedOrderId)?.currency_code
                    }
                  </p>
                </>
              }
              type="info"
              showIcon
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderList;
