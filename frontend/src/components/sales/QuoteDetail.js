// src/components/sales/QuoteDetail.js
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
  Badge
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
  ShoppingCartOutlined,
  UserOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [sendEmailModal, setSendEmailModal] = useState(false);
  const [emailForm] = Form.useForm();
  const [relatedOrders, setRelatedOrders] = useState([]);
  const [relatedInvoices, setRelatedInvoices] = useState([]);

  useEffect(() => {
    fetchQuoteDetails();
  }, [id]);

  const fetchQuoteDetails = async () => {
    setLoading(true);
    try {
      // Récupérer les détails du devis
      const quoteResponse = await axios.get(`/api/sales/quotes/${id}/`);
      const quoteData = quoteResponse.data;
      setQuote(quoteData);

      // Récupérer les éléments du devis
      if (quoteData.id) {
        try {
          const itemsResponse = await axios.get(`/api/sales/quote-items/?quote=${quoteData.id}`);
          const itemsData = extractResultsFromResponse(itemsResponse);
          setItems(itemsData);
        } catch (error) {
          console.error("Erreur lors de la récupération des éléments du devis:", error);
          setItems([]);
        }

        // Récupérer les contacts associés à l'entreprise
        if (quoteData.company) {
          try {
            const contactsResponse = await axios.get(`/api/crm/companies/${quoteData.company}/contacts/`);
            const contactsData = extractResultsFromResponse(contactsResponse);
            setContacts(contactsData);
          } catch (error) {
            console.error("Erreur lors de la récupération des contacts:", error);
            setContacts([]);
          }
        }

        // Récupérer les commandes liées au devis
        try {
          const ordersResponse = await axios.get(`/api/sales/orders/?quote=${quoteData.id}`);
          const ordersData = extractResultsFromResponse(ordersResponse);
          setRelatedOrders(ordersData);
        } catch (error) {
          console.error("Erreur lors de la récupération des commandes liées:", error);
          setRelatedOrders([]);
        }

        // Récupérer les factures liées au devis
        try {
          const invoicesResponse = await axios.get(`/api/sales/invoices/?quote=${quoteData.id}`);
          const invoicesData = extractResultsFromResponse(invoicesResponse);
          setRelatedInvoices(invoicesData);
        } catch (error) {
          console.error("Erreur lors de la récupération des factures liées:", error);
          setRelatedInvoices([]);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des détails du devis:", error);
      message.error("Impossible de charger les détails du devis");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = async () => {
    setLoadingAction(true);
    try {
      await axios.delete(`/api/sales/quotes/${id}/`);
      message.success('Devis supprimé avec succès');
      navigate('/sales/quotes');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer le devis");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAccept = async () => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/quotes/${id}/accept/`);
      message.success('Devis marqué comme accepté');
      fetchQuoteDetails();
    } catch (error) {
      console.error("Erreur lors de l'acceptation du devis:", error);
      message.error("Impossible de marquer le devis comme accepté");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReject = async () => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/quotes/${id}/reject/`);
      message.success('Devis marqué comme refusé');
      fetchQuoteDetails();
    } catch (error) {
      console.error("Erreur lors du refus du devis:", error);
      message.error("Impossible de marquer le devis comme refusé");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConvertToOrder = async () => {
    setLoadingAction(true);
    try {
      const response = await axios.post(`/api/sales/quotes/${id}/convert_to_order/`);
      message.success('Devis converti en commande avec succès');
      // Si la réponse contient l'ID de la commande, naviguer vers la page de détail de la commande
      if (response.data && response.data.order && response.data.order.id) {
        navigate(`/sales/orders/${response.data.order.id}`);
      } else {
        fetchQuoteDetails();
      }
    } catch (error) {
      console.error("Erreur lors de la conversion du devis:", error);
      message.error("Impossible de convertir le devis en commande");
      setLoadingAction(false);
    }
  };

  const handleGeneratePdf = async () => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/quotes/${id}/generate_pdf/`);
      message.success('PDF généré avec succès');
      // Ouvrir le PDF dans un nouvel onglet
      window.open(`/api/sales/quotes/${id}/download_pdf/`, '_blank');
      fetchQuoteDetails();
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
    if (quote && quote.contact) {
      const contact = contacts.find(c => c.id === quote.contact);
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
      await axios.post(`/api/sales/quotes/${id}/send_by_email/`, values);
      message.success('Email envoyé avec succès');
      setSendEmailModal(false);
      fetchQuoteDetails();
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
      'sent': { color: 'blue', text: 'Envoyé' },
      'accepted': { color: 'green', text: 'Accepté' },
      'rejected': { color: 'red', text: 'Refusé' },
      'cancelled': { color: 'default', text: 'Annulé' },
      'expired': { color: 'orange', text: 'Expiré' }
    };
    
    return (
      <Tag color={statusConfig[status]?.color || 'default'}>
        {statusConfig[status]?.text || status}
      </Tag>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!quote) {
    return <div>Devis non trouvé</div>;
  }

  // Colonnes pour le tableau des éléments du devis
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
      render: (text, record) => `${text} ${quote.currency_code || ''}`,
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
      render: (text, record) => `${text || (record.quantity * record.unit_price).toFixed(2)} ${quote.currency_code || ''}`,
    },
  ];

  return (
    <div className="quote-detail">
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link to="/sales/quotes">Retour à la liste</Link>
          </Button>
          <Button type="primary" icon={<EditOutlined />}>
            <Link to={`/sales/quotes/${id}/edit`}>Modifier</Link>
          </Button>
          
          {/* Actions spécifiques selon le statut du devis */}
          {quote.status === 'sent' && (
            <>
              <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                onClick={handleAccept}
                loading={loadingAction}
                style={{ backgroundColor: 'green', borderColor: 'green' }}
              >
                Accepter
              </Button>
              <Button 
                danger 
                icon={<CloseOutlined />} 
                onClick={handleReject}
                loading={loadingAction}
              >
                Refuser
              </Button>
            </>
          )}
          
          {quote.status === 'accepted' && !quote.converted_to_order && (
            <Button 
              type="primary" 
              icon={<ShoppingCartOutlined />} 
              onClick={handleConvertToOrder}
              loading={loadingAction}
            >
              Convertir en commande
            </Button>
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
          
          {(quote.status === 'draft' || quote.status === 'sent') && (
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer ce devis ?"
              onConfirm={handleDeleteQuote}
              okText="Oui"
              cancelText="Non"
            >
              <Button danger icon={<DeleteOutlined />} loading={loadingAction}>
                Supprimer
              </Button>
            </Popconfirm>
          )}
        </Space>

        <Title level={2}>Devis {quote.number}</Title>
        
        <Space style={{ marginBottom: 16 }}>
          {formatStatusTag(quote.status)}
          
          {quote.converted_to_order && (
            <Badge status="success" text="Converti en commande" />
          )}
          
          {quote.converted_to_invoice && (
            <Badge status="success" text="Converti en facture" />
          )}
          
          {quote.is_expired && (
            <Badge status="error" text="Expiré" />
          )}
        </Space>

        <Tabs defaultActiveKey="1">
          <TabPane tab="Informations" key="1">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Card title="Détails du devis" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                    <Descriptions.Item label="Numéro">{quote.number}</Descriptions.Item>
                    <Descriptions.Item label="Date d'émission">{quote.date}</Descriptions.Item>
                    <Descriptions.Item label="Date d'expiration">{quote.expiration_date}</Descriptions.Item>
                    <Descriptions.Item label="Validité">{quote.validity_period} jours</Descriptions.Item>
                    <Descriptions.Item label="Entreprise">
                      <Link to={`/crm/companies/${quote.company}`}>{quote.company_name}</Link>
                    </Descriptions.Item>
                    <Descriptions.Item label="Contact">
                      {quote.contact ? (
                        <Link to={`/crm/contacts/${quote.contact}`}>{quote.contact_name}</Link>
                      ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Statut">
                      {formatStatusTag(quote.status)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Conditions de paiement">
                      {
                        quote.payment_terms === 'immediate' ? 'Paiement immédiat' :
                        quote.payment_terms === '30_days' ? 'Paiement à 30 jours' :
                        quote.payment_terms === '60_days' ? 'Paiement à 60 jours' :
                        quote.payment_terms
                      }
                    </Descriptions.Item>
                    {quote.discount_percentage > 0 && (
                      <Descriptions.Item label="Remise">{quote.discount_percentage}%</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Exonération TVA">
                      {quote.is_tax_exempt ? 'Oui' : 'Non'}
                    </Descriptions.Item>
                    {quote.is_tax_exempt && quote.tax_exemption_reason && (
                      <Descriptions.Item label="Raison d'exonération">{quote.tax_exemption_reason}</Descriptions.Item>
                    )}
                    {quote.notes && (
                      <Descriptions.Item label="Notes" span={2}>{quote.notes}</Descriptions.Item>
                    )}
                    {quote.terms && (
                      <Descriptions.Item label="Conditions" span={2}>{quote.terms}</Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card title="Résumé financier">
                  <Statistic
                    title="Sous-total HT"
                    value={quote.subtotal}
                    precision={2}
                    suffix={quote.currency_code}
                  />
                  
                  {quote.discount_percentage > 0 && (
                    <>
                      <Statistic
                        title={`Remise (${quote.discount_percentage}%)`}
                        value={quote.discount_amount || 0}
                        precision={2}
                        suffix={quote.currency_code}
                        style={{ marginTop: 16 }}
                      />
                      <Statistic
                        title="Sous-total après remise"
                        value={quote.subtotal_after_discount || 0}
                        precision={2}
                        suffix={quote.currency_code}
                        style={{ marginTop: 16 }}
                      />
                    </>
                  )}
                  
                  {!quote.is_tax_exempt && (
                    <Statistic
                      title="TVA"
                      value={quote.tax_amount}
                      precision={2}
                      suffix={quote.currency_code}
                      style={{ marginTop: 16 }}
                    />
                  )}
                  
                  <Statistic
                    title={`Total${!quote.is_tax_exempt ? ' TTC' : ''}`}
                    value={quote.total}
                    precision={2}
                    suffix={quote.currency_code}
                    style={{ marginTop: 16 }}
                    valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card title="Éléments du devis" style={{ marginTop: 16 }}>
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
                        <strong>{quote.subtotal} {quote.currency_code}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    
                    {quote.discount_percentage > 0 && (
                      <>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={6} align="right">
                            Remise ({quote.discount_percentage}%):
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            -{quote.discount_amount} {quote.currency_code}
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={6} align="right">
                            Sous-total après remise:
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            {quote.subtotal_after_discount} {quote.currency_code}
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </>
                    )}
                    
                    {!quote.is_tax_exempt && (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={6} align="right">
                          TVA:
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          {quote.tax_amount} {quote.currency_code}
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                    
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        <strong>Total{!quote.is_tax_exempt ? ' TTC' : ''}:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong>{quote.total} {quote.currency_code}</strong>
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
              <Timeline.Item label={quote.created_at}>
                <p><strong>Création du devis</strong></p>
                <p>Statut initial: Brouillon</p>
              </Timeline.Item>
              
              {quote.email_sent && quote.email_sent_date && (
                <Timeline.Item color="blue" label={quote.email_sent_date}>
                  <p><strong>Envoi par email</strong></p>
                  <p>Le devis a été envoyé au client</p>
                </Timeline.Item>
              )}
              
              {quote.status === 'accepted' && (
                <Timeline.Item color="green">
                  <p><strong>Devis accepté</strong></p>
                </Timeline.Item>
              )}
              
              {quote.status === 'rejected' && (
                <Timeline.Item color="red">
                  <p><strong>Devis refusé</strong></p>
                </Timeline.Item>
              )}
              
              {quote.converted_to_order && (
                <Timeline.Item color="green">
                  <p><strong>Converti en commande</strong></p>
                </Timeline.Item>
              )}
            </Timeline>
          </TabPane>

          {quote.status === 'accepted' && (
            <TabPane tab={<span><FileDoneOutlined /> Documents liés</span>} key="4">
              {relatedOrders.length > 0 ? (
                <List
                  header={<div><strong>Commandes associées</strong></div>}
                  bordered
                  dataSource={relatedOrders}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Link to={`/sales/orders/${item.id}`}>Voir</Link>
                      ]}
                    >
                      <List.Item.Meta
                        title={`Commande ${item.number}`}
                        description={`Date: ${item.date} - Statut: ${item.status}`}
                      />
                      <div>{item.total} {item.currency_code}</div>
                    </List.Item>
                  )}
                />
              ) : quote.converted_to_order ? (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <p>Les commandes associées à ce devis sont en cours de chargement...</p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <p>Aucun document lié à ce devis pour le moment</p>
                  <Button 
                    type="primary" 
                    icon={<ShoppingCartOutlined />} 
                    onClick={handleConvertToOrder}
                    loading={loadingAction}
                    style={{ marginTop: 10 }}
                  >
                    Convertir en commande
                  </Button>
                </div>
              )}

              {relatedInvoices.length > 0 && (
                <List
                  header={<div style={{ marginTop: 20 }}><strong>Factures associées</strong></div>}
                  bordered
                  dataSource={relatedInvoices}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Link to={`/sales/invoices/${item.id}`}>Voir</Link>
                      ]}
                    >
                      <List.Item.Meta
                        title={`Facture ${item.number}`}
                        description={`Date: ${item.date} - Statut: ${item.payment_status}`}
                      />
                      <div>{item.total} {item.currency_code}</div>
                    </List.Item>
                  )}
                />
              )}
            </TabPane>
          )}
        </Tabs>
      </Card>

      {/* Modal pour l'envoi d'email */}
      <Modal
        title="Envoyer le devis par email"
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
            <Input placeholder={`Devis ${quote.number} - ECINTELLIGENCE`} />
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
    </div>
  );
};

export default QuoteDetail;
