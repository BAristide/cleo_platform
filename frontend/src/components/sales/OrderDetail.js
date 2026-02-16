import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Statistic,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Spin,
  message,
  Tabs,
  Timeline,
  Modal,
  Form,
  Input,
  Divider,
  List,
  Avatar,
  Table,
  Popconfirm,
  Badge,
  Alert
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  TeamOutlined,
  MailOutlined,
  FileOutlined,
  CheckOutlined,
  CloseOutlined,
  ShopOutlined,
  UserOutlined,
  PhoneOutlined,
  DollarOutlined,
  BankOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [sendEmailModal, setSendEmailModal] = useState(false);
  const [createDepositInvoiceModal, setCreateDepositInvoiceModal] = useState(false);
  const [depositPercentage, setDepositPercentage] = useState(30);
  const [relatedInvoices, setRelatedInvoices] = useState([]);
  const [emailForm] = Form.useForm();

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      // Récupérer les détails de la commande
      const orderResponse = await axios.get(`/api/sales/orders/${id}/`);
      const orderData = orderResponse.data;
      setOrder(orderData);

      // Récupérer les éléments de la commande
      if (orderData.id) {
        try {
          const itemsResponse = await axios.get(`/api/sales/order-items/?order=${orderData.id}`);
          const itemsData = extractResultsFromResponse(itemsResponse);
          setItems(itemsData);
        } catch (error) {
          console.error("Erreur lors de la récupération des éléments de la commande:", error);
          setItems([]);
        }

        // Récupérer les contacts associés à l'entreprise
        if (orderData.company) {
          try {
            const contactsResponse = await axios.get(`/api/crm/companies/${orderData.company}/contacts/`);
            const contactsData = extractResultsFromResponse(contactsResponse);
            setContacts(contactsData);
          } catch (error) {
            console.error("Erreur lors de la récupération des contacts:", error);
            setContacts([]);
          }
        }

        // Récupérer les factures liées à la commande
        try {
          const invoicesResponse = await axios.get(`/api/sales/invoices/?order=${orderData.id}`);
          const invoicesData = extractResultsFromResponse(invoicesResponse);
          setRelatedInvoices(invoicesData);
        } catch (error) {
          console.error("Erreur lors de la récupération des factures liées:", error);
          setRelatedInvoices([]);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des détails de la commande:", error);
      message.error("Impossible de charger les détails de la commande");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/orders/${id}/confirm/`);
      message.success('Commande confirmée avec succès');
      fetchOrderDetails();
    } catch (error) {
      console.error("Erreur lors de la confirmation de la commande:", error);
      message.error("Impossible de confirmer la commande");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelOrder = async () => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/orders/${id}/cancel/`);
      message.success('Commande annulée avec succès');
      fetchOrderDetails();
    } catch (error) {
      console.error("Erreur lors de l'annulation de la commande:", error);
      message.error("Impossible d'annuler la commande");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateDepositInvoice = async () => {
    setLoadingAction(true);
    try {
      const response = await axios.post(`/api/sales/orders/${id}/create_deposit_invoice/`, {
        deposit_percentage: depositPercentage
      });
      message.success(`Facture d'acompte créée avec succès (${depositPercentage}%)`);
      setCreateDepositInvoiceModal(false);
      
      // Si la réponse contient l'ID de la facture, naviguer vers la page de détail
      if (response.data && response.data.invoice && response.data.invoice.id) {
        navigate(`/sales/invoices/${response.data.invoice.id}`);
      } else {
        fetchOrderDetails();
      }
    } catch (error) {
      console.error("Erreur lors de la création de la facture d'acompte:", error);
      message.error("Impossible de créer la facture d'acompte");
      setLoadingAction(false);
    }
  };

  const handleConvertToInvoice = async () => {
    setLoadingAction(true);
    try {
      const response = await axios.post(`/api/sales/orders/${id}/convert_to_invoice/`);
      message.success('Commande convertie en facture avec succès');
      
      // Si la réponse contient l'ID de la facture, naviguer vers la page de détail
      if (response.data && response.data.invoice && response.data.invoice.id) {
        navigate(`/sales/invoices/${response.data.invoice.id}`);
      } else {
        fetchOrderDetails();
      }
    } catch (error) {
      console.error("Erreur lors de la conversion de la commande:", error);
      message.error("Impossible de convertir la commande en facture");
      setLoadingAction(false);
    }
  };

  const handleGeneratePdf = async () => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/orders/${id}/generate_pdf/`);
      message.success('PDF généré avec succès');
      // Ouvrir le PDF dans un nouvel onglet
      window.open(`/api/sales/orders/${id}/download_pdf/`, '_blank');
      fetchOrderDetails();
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      message.error("Impossible de générer le PDF");
    } finally {
      setLoadingAction(false);
    }
  };

  const showSendEmailModal = () => {
    emailForm.resetFields();
    // Pré-remplir l'adresse email avec celle du contact si disponible
    if (order && order.contact) {
      const contact = contacts.find(c => c.id === order.contact);
      if (contact && contact.email) {
        emailForm.setFieldsValue({
          recipient_email: contact.email
        });
      }
    }
    setSendEmailModal(true);
  };

  const handleSendEmail = async (values) => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/orders/${id}/send_by_email/`, values);
      message.success('Email envoyé avec succès');
      setSendEmailModal(false);
      fetchOrderDetails();
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      message.error("Impossible d'envoyer l'email");
    } finally {
      setLoadingAction(false);
    }
  };

  const formatStatusTag = (status) => {
    const statusConfig = {
      'draft': { color: 'default', text: 'Brouillon' },
      'confirmed': { color: 'blue', text: 'Confirmée' },
      'in_progress': { color: 'processing', text: 'En cours' },
      'delivered': { color: 'green', text: 'Livrée' },
      'cancelled': { color: 'red', text: 'Annulée' }
    };
    
    return (
      <Tag color={statusConfig[status]?.color || 'default'}>
        {statusConfig[status]?.text || status}
      </Tag>
    );
  };

  // Filtrer les factures par type
  const depositInvoices = relatedInvoices.filter(invoice => invoice.type === 'deposit');
  const finalInvoices = relatedInvoices.filter(invoice => invoice.type === 'standard');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return <div>Commande non trouvée</div>;
  }

  // Colonnes pour le tableau des éléments de la commande
  const itemColumns = [
    {
      title: 'Référence',
      dataIndex: 'product_reference',
      key: 'product_reference',
    },
    {
      title: 'Produit',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: text => text || '-',
      ellipsis: true,
    },
    {
      title: 'Quantité',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
    },
    {
      title: 'Prix unitaire',
      dataIndex: 'unit_price',
      key: 'unit_price',
      align: 'right',
      render: (text, record) => `${text} ${order.currency_code || ''}`,
    },
    {
      title: 'TVA (%)',
      dataIndex: 'tax_rate',
      key: 'tax_rate',
      align: 'right',
      render: text => `${text}%`,
    },
    {
      title: 'Total HT',
      dataIndex: 'subtotal',
      key: 'subtotal',
      align: 'right',
      render: (text, record) => `${text || (record.quantity * record.unit_price).toFixed(2)} ${order.currency_code || ''}`,
    },
  ];

  return (
    <div className="order-detail">
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link to="/sales/orders">Retour à la liste</Link>
          </Button>
          
          {/* Actions spécifiques selon le statut de la commande */}
          {order.status === 'draft' && (
            <Button 
              type="primary" 
              icon={<CheckOutlined />} 
              onClick={handleConfirmOrder}
              loading={loadingAction}
            >
              Confirmer la commande
            </Button>
          )}
          
          {['draft', 'confirmed', 'in_progress'].includes(order.status) && !order.has_final_invoice && (
            <Button 
              danger 
              icon={<CloseOutlined />} 
              onClick={handleCancelOrder}
              loading={loadingAction}
            >
              Annuler
            </Button>
          )}
          
          {order.status === 'confirmed' && (
            <>
              {order.can_create_deposit_invoice && (
                <Button 
                  type="primary" 
                  icon={<BankOutlined />} 
                  onClick={() => setCreateDepositInvoiceModal(true)}
                  loading={loadingAction}
                >
                  Créer facture d'acompte
                </Button>
              )}
              
              {order.can_create_final_invoice && (
                <Button 
                  type="primary" 
                  icon={<ShopOutlined />} 
                  onClick={handleConvertToInvoice}
                  loading={loadingAction}
                >
                  Convertir en facture
                </Button>
              )}
            </>
          )}
          
          <Button 
            icon={<FileOutlined />} 
            onClick={handleGeneratePdf}
            loading={loadingAction}
          >
            Générer PDF
          </Button>
          
          <Button 
            icon={<MailOutlined />} 
            onClick={showSendEmailModal}
            loading={loadingAction}
          >
            Envoyer par email
          </Button>
        </Space>

        <Title level={2}>Commande {order.number}</Title>
        
        <Space style={{ marginBottom: 16 }}>
          {formatStatusTag(order.status)}
          
          {order.has_deposit_invoice && (
            <Badge status="processing" text="Acompte facturé" />
          )}
          
          {order.has_final_invoice && (
            <Badge status="success" text="Facturée" />
          )}
        </Space>

        <Tabs defaultActiveKey="1">
          <TabPane tab="Informations" key="1">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Card title="Détails de la commande" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                    <Descriptions.Item label="Numéro">{order.number}</Descriptions.Item>
                    <Descriptions.Item label="Date">{order.date}</Descriptions.Item>
                    <Descriptions.Item label="Date de livraison">{order.delivery_date || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Statut">{formatStatusTag(order.status)}</Descriptions.Item>
                    <Descriptions.Item label="Entreprise">
                      <Link to={`/crm/companies/${order.company}`}>{order.company_name}</Link>
                    </Descriptions.Item>
                    <Descriptions.Item label="Contact">
                      {order.contact ? (
                        <Link to={`/crm/contacts/${order.contact}`}>{order.contact_name}</Link>
                      ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Devis d'origine">
                      {order.quote ? (
                        <Link to={`/sales/quotes/${order.quote}`}>{order.quote_number}</Link>
                      ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Conditions de paiement">
                      {
                        order.payment_terms === 'immediate' ? 'Paiement immédiat' :
                        order.payment_terms === '30_days' ? 'Paiement à 30 jours' :
                        order.payment_terms === '60_days' ? 'Paiement à 60 jours' :
                        order.payment_terms
                      }
                    </Descriptions.Item>
                    {order.discount_percentage > 0 && (
                      <Descriptions.Item label="Remise">{order.discount_percentage}%</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Exonération TVA">
                      {order.is_tax_exempt ? 'Oui' : 'Non'}
                    </Descriptions.Item>
                    {order.is_tax_exempt && order.tax_exemption_reason && (
                      <Descriptions.Item label="Raison d'exonération">{order.tax_exemption_reason}</Descriptions.Item>
                    )}
                    {order.delivery_address && (
                      <Descriptions.Item label="Adresse de livraison">{order.delivery_address}</Descriptions.Item>
                    )}
                    {order.notes && (
                      <Descriptions.Item label="Notes" span={2}>{order.notes}</Descriptions.Item>
                    )}
                    {order.terms && (
                      <Descriptions.Item label="Conditions" span={2}>{order.terms}</Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card title="Résumé financier">
                  <Statistic
                    title="Sous-total HT"
                    value={order.subtotal}
                    precision={2}
                    suffix={order.currency_code}
                  />
                  
                  {order.discount_percentage > 0 && (
                    <>
                      <Statistic
                        title={`Remise (${order.discount_percentage}%)`}
                        value={order.discount_amount || 0}
                        precision={2}
                        suffix={order.currency_code}
                        style={{ marginTop: 16 }}
                      />
                      <Statistic
                        title="Sous-total après remise"
                        value={order.subtotal_after_discount || 0}
                        precision={2}
                        suffix={order.currency_code}
                        style={{ marginTop: 16 }}
                      />
                    </>
                  )}
                  
                  {!order.is_tax_exempt && (
                    <Statistic
                      title="TVA"
                      value={order.tax_amount}
                      precision={2}
                      suffix={order.currency_code}
                      style={{ marginTop: 16 }}
                    />
                  )}
                  
                  <Statistic
                    title={`Total${!order.is_tax_exempt ? ' TTC' : ''}`}
                    value={order.total}
                    precision={2}
                    suffix={order.currency_code}
                    style={{ marginTop: 16 }}
                    valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
                  />
                  
                  {depositInvoices.length > 0 && (
                    <>
                      <Divider />
                      <Statistic
                        title="Montant des acomptes"
                        value={order.deposit_total || 0}
                        precision={2}
                        suffix={order.currency_code}
                        style={{ marginTop: 16 }}
                      />
                      <Statistic
                        title="Reste à facturer"
                        value={order.remaining_amount || 0}
                        precision={2}
                        suffix={order.currency_code}
                        style={{ marginTop: 16 }}
                        valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                      />
                    </>
                  )}
                </Card>
              </Col>
            </Row>

            <Card title="Produits commandés" style={{ marginTop: 16 }}>
              <Table
                columns={itemColumns}
                dataSource={items}
                rowKey="id"
                pagination={false}
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        <strong>Sous-total HT:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong>{order.subtotal} {order.currency_code}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    
                    {order.discount_percentage > 0 && (
                      <>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={6} align="right">
                            Remise ({order.discount_percentage}%):
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            -{order.discount_amount} {order.currency_code}
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={6} align="right">
                            Sous-total après remise:
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            {order.subtotal_after_discount} {order.currency_code}
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </>
                    )}
                    
                    {!order.is_tax_exempt && (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={6} align="right">
                          TVA:
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          {order.tax_amount} {order.currency_code}
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                    
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        <strong>Total{!order.is_tax_exempt ? ' TTC' : ''}:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong>{order.total} {order.currency_code}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </Card>
          </TabPane>

          <TabPane tab={<span><TeamOutlined /> Contacts</span>} key="2">
            <List
              itemLayout="horizontal"
              dataSource={contacts}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Link to={`/crm/contacts/${item.id}`}>Détails</Link>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={<Link to={`/crm/contacts/${item.id}`}>{item.first_name} {item.last_name}</Link>}
                    description={
                      <>
                        <div>{item.title} {item.company_name && `chez ${item.company_name}`}</div>
                        <div>
                          {item.email && <><MailOutlined /> {item.email} </>}
                          {item.phone && <><PhoneOutlined /> {item.phone}</>}
                        </div>
                      </>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "Aucun contact associé à cette entreprise" }}
            />
          </TabPane>

          <TabPane tab={<span><HistoryOutlined /> Historique</span>} key="3">
            <Timeline mode="left">
              <Timeline.Item label={order.created_at}>
                <p><strong>Création de la commande</strong></p>
                <p>Statut initial: Brouillon</p>
              </Timeline.Item>
              
              {order.status === 'confirmed' && (
                <Timeline.Item color="blue">
                  <p><strong>Commande confirmée</strong></p>
                </Timeline.Item>
              )}
              
              {order.status === 'in_progress' && (
                <Timeline.Item color="blue">
                  <p><strong>Commande en cours de traitement</strong></p>
                </Timeline.Item>
              )}
              
              {order.status === 'delivered' && (
                <Timeline.Item color="green">
                  <p><strong>Commande livrée</strong></p>
                </Timeline.Item>
              )}
              
              {order.status === 'cancelled' && (
                <Timeline.Item color="red">
                  <p><strong>Commande annulée</strong></p>
                </Timeline.Item>
              )}
              
              {order.email_sent && order.email_sent_date && (
                <Timeline.Item color="blue" label={order.email_sent_date}>
                  <p><strong>Envoi par email</strong></p>
                  <p>La commande a été envoyée au client</p>
                </Timeline.Item>
              )}
              
              {depositInvoices.map(invoice => (
                <Timeline.Item 
                  key={invoice.id} 
                  color="blue" 
                  label={invoice.date}
                >
                  <p>
                    <strong>Facture d'acompte créée: </strong>
                    <Link to={`/sales/invoices/${invoice.id}`}>{invoice.number}</Link>
                  </p>
                  <p>Montant: {invoice.total} {invoice.currency_code}</p>
                </Timeline.Item>
              ))}
              
              {finalInvoices.map(invoice => (
                <Timeline.Item 
                  key={invoice.id} 
                  color="green" 
                  label={invoice.date}
                >
                  <p>
                    <strong>Facture finale créée: </strong>
                    <Link to={`/sales/invoices/${invoice.id}`}>{invoice.number}</Link>
                  </p>
                  <p>Montant: {invoice.total} {invoice.currency_code}</p>
                </Timeline.Item>
              ))}
            </Timeline>
          </TabPane>

          <TabPane tab={<span><FileDoneOutlined /> Factures</span>} key="4">
            {depositInvoices.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <Title level={4}>Factures d'acompte</Title>
                <List
                  bordered
                  dataSource={depositInvoices}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Link to={`/sales/invoices/${item.id}`}>Voir</Link>
                      ]}
                    >
                      <List.Item.Meta
                        title={`Facture ${item.number}`}
                        description={
                          <>
                            <div>Date: {item.date}</div>
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
                      <div>{item.total} {item.currency_code}</div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {finalInvoices.length > 0 && (
              <div>
                <Title level={4}>Factures finales</Title>
                <List
                  bordered
                  dataSource={finalInvoices}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Link to={`/sales/invoices/${item.id}`}>Voir</Link>
                      ]}
                    >
                      <List.Item.Meta
                        title={`Facture ${item.number}`}
                        description={
                          <>
                            <div>Date: {item.date}</div>
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
                      <div>{item.total} {item.currency_code}</div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {depositInvoices.length === 0 && finalInvoices.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <p>Aucune facture associée à cette commande pour le moment</p>
                
                {order.status === 'confirmed' && (
                  <Space direction="vertical" style={{ marginTop: 10 }}>
                    {order.can_create_deposit_invoice && (
                      <Button 
                        type="primary" 
                        icon={<BankOutlined />} 
                        onClick={() => setCreateDepositInvoiceModal(true)}
                      >
                        Créer facture d'acompte
                      </Button>
                    )}
                    
                    {order.can_create_final_invoice && (
                      <Button 
                        type="primary" 
                        icon={<ShopOutlined />} 
                        onClick={handleConvertToInvoice}
                      >
                        Convertir en facture
                      </Button>
                    )}
                  </Space>
                )}
              </div>
            )}
            
            {order.status === 'confirmed' && order.deposit_total > 0 && order.can_create_final_invoice && (
              <Alert
                message="Facture finale"
                description={
                  <>
                    <p>Un acompte de {order.deposit_total} {order.currency_code} a déjà été facturé.</p>
                    <p>Vous pouvez maintenant créer une facture finale pour le montant restant de {order.remaining_amount} {order.currency_code}.</p>
                    <Button 
                      type="primary" 
                      icon={<ShopOutlined />} 
                      onClick={handleConvertToInvoice}
                      style={{ marginTop: 10 }}
                    >
                      Créer facture finale
                    </Button>
                  </>
                }
                type="info"
                showIcon
                style={{ marginTop: 20 }}
              />
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* Modal pour l'envoi d'email */}
      <Modal
        title="Envoyer la commande par email"
        visible={sendEmailModal}
        onCancel={() => setSendEmailModal(false)}
        footer={null}
      >
        <Form
          form={emailForm}
          layout="vertical"
          onFinish={handleSendEmail}
        >
          <Form.Item
            name="recipient_email"
            label="Email du destinataire"
            rules={[
              { required: true, message: 'Veuillez saisir l\'email du destinataire' },
              { type: 'email', message: 'Format d\'email invalide' }
            ]}
          >
            <Input placeholder="exemple@domaine.com" />
          </Form.Item>
          
          <Form.Item
            name="subject"
            label="Objet"
          >
            <Input placeholder={`Commande ${order.number} - ECINTELLIGENCE`} />
          </Form.Item>
          
          <Form.Item
            name="message"
            label="Message additionnel"
          >
            <TextArea rows={4} placeholder="Votre message personnalisé (optionnel)" />
          </Form.Item>
          
          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setSendEmailModal(false)} style={{ marginRight: 8 }}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" loading={loadingAction}>
                Envoyer
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal pour la création de facture d'acompte */}
      <Modal
        title="Créer une facture d'acompte"
        visible={createDepositInvoiceModal}
        onCancel={() => setCreateDepositInvoiceModal(false)}
        onOk={handleCreateDepositInvoice}
        confirmLoading={loadingAction}
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
        
        <div style={{ marginTop: 16 }}>
          <Alert
            message="Aperçu du montant"
            description={
              <>
                <p>Total de la commande: {order.total} {order.currency_code}</p>
                <p>Montant de l'acompte ({depositPercentage}%): {((order.total * depositPercentage) / 100).toFixed(2)} {order.currency_code}</p>
              </>
            }
            type="info"
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
};

export default OrderDetail;
