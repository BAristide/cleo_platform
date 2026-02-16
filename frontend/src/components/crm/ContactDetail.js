// src/components/crm/ContactDetail.js
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
  Avatar,
  Divider,
  Popconfirm
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  MobileOutlined,
  ShopOutlined,
  TagOutlined,
  FundOutlined,
  ScheduleOutlined,
  PlusOutlined,
  LinkedinOutlined,
  TwitterOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContactDetails();
  }, [id]);

  const fetchContactDetails = async () => {
    setLoading(true);
    try {
      // Récupérer les détails du contact
      const contactResponse = await axios.get(`/api/crm/contacts/${id}/`);
      setContact(contactResponse.data);

      // Récupérer les opportunités associées
      const opportunitiesResponse = await axios.get(`/api/crm/contacts/${id}/opportunities/`);
      const opportunitiesData = extractResultsFromResponse(opportunitiesResponse);
      setOpportunities(opportunitiesData);

      // Récupérer les activités associées
      const activitiesResponse = await axios.get(`/api/crm/contacts/${id}/activities/`);
      const activitiesData = extractResultsFromResponse(activitiesResponse);
      setActivities(activitiesData);
    } catch (error) {
      console.error("Erreur lors de la récupération des détails du contact:", error);
      message.error("Impossible de charger les détails du contact");
      // Utiliser des données fictives en cas d'erreur
      setContact({
        id: id,
        first_name: 'Contact',
        last_name: 'non trouvé',
        email: '',
        phone: '',
        company: { id: null, name: 'N/A' },
        title: '',
        source: 'unknown',
        tags: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/crm/contacts/${id}/`);
      message.success('Contact supprimé avec succès');
      navigate('/crm/contacts');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer le contact");
    }
  };

  // Mapping des sources pour l'affichage
  const sourceMap = {
    'website': { color: 'blue', text: 'Site Web' },
    'referral': { color: 'green', text: 'Référence' },
    'cold_call': { color: 'orange', text: 'Appel à froid' },
    'social': { color: 'purple', text: 'Réseaux Sociaux' },
    'email': { color: 'cyan', text: 'Email' },
    'chatbot': { color: 'magenta', text: 'Chatbot IA' },
    'event': { color: 'gold', text: 'Événement' },
    'other': { color: 'gray', text: 'Autre' },
  };

  // Ajouter un indicateur de chargement
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // S'assurer que contact est disponible avant de l'utiliser
  if (!contact) {
    return <div>Contact non trouvé</div>;
  }

  return (
    <div className="contact-detail">
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link to="/crm/contacts">Retour à la liste</Link>
          </Button>
          <Button type="primary" icon={<EditOutlined />}>
            <Link to={`/crm/contacts/${id}/edit`}>Modifier</Link>
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ce contact?"
            onConfirm={handleDelete}
            okText="Oui"
            cancelText="Non"
          >
            <Button danger icon={<DeleteOutlined />}>
              Supprimer
            </Button>
          </Popconfirm>
        </Space>

        <Title level={2}>{contact.first_name} {contact.last_name}</Title>
        {contact.title && <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>{contact.title}</Text>}
        {contact.company && (
          <Link to={`/crm/companies/${contact.company.id}`} style={{ marginBottom: 16, display: 'block' }}>
            <ShopOutlined /> {contact.company.name}
          </Link>
        )}

        <Tabs defaultActiveKey="1">
          <TabPane tab="Détails" key="1">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Card title="Informations personnelles" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                    {contact.email && (
                      <Descriptions.Item label={<><MailOutlined /> Email</>}>
                        <a href={`mailto:${contact.email}`}>{contact.email}</a>
                      </Descriptions.Item>
                    )}
                    {contact.phone && (
                      <Descriptions.Item label={<><PhoneOutlined /> Téléphone</>}>
                        <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                      </Descriptions.Item>
                    )}
                    {contact.mobile && (
                      <Descriptions.Item label={<><MobileOutlined /> Mobile</>}>
                        <a href={`tel:${contact.mobile}`}>{contact.mobile}</a>
                      </Descriptions.Item>
                    )}
                    {contact.linkedin && (
                      <Descriptions.Item label={<><LinkedinOutlined /> LinkedIn</>}>
                        <a href={contact.linkedin} target="_blank" rel="noopener noreferrer">{contact.linkedin}</a>
                      </Descriptions.Item>
                    )}
                    {contact.twitter && (
                      <Descriptions.Item label={<><TwitterOutlined /> Twitter</>}>
                        <a href={`https://twitter.com/${contact.twitter}`} target="_blank" rel="noopener noreferrer">@{contact.twitter}</a>
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Source">
                      <Tag color={sourceMap[contact.source]?.color || 'default'}>
                        {sourceMap[contact.source]?.text || contact.source}
                      </Tag>
                    </Descriptions.Item>
                    {contact.source_detail && (
                      <Descriptions.Item label="Détails de la source">
                        {contact.source_detail}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Statut">
                      <Tag color={contact.is_active ? 'green' : 'red'}>
                        {contact.is_active ? 'Actif' : 'Inactif'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Créé le">
                      {contact.created_at}
                    </Descriptions.Item>
                    {contact.notes && (
                      <Descriptions.Item label="Notes" span={2}>
                        {contact.notes}
                      </Descriptions.Item>
                    )}
                    {contact.tags && contact.tags.length > 0 && (
                      <Descriptions.Item label={<><TagOutlined /> Tags</>} span={2}>
                        {contact.tags.map(tag => (
                          <Tag key={tag.id} color={tag.color}>{tag.name}</Tag>
                        ))}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card title="Actions rapides">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {contact.email && (
                      <Button block icon={<MailOutlined />} href={`mailto:${contact.email}`}>
                        Envoyer un email
                      </Button>
                    )}
                    {contact.phone && (
                      <Button block icon={<PhoneOutlined />} href={`tel:${contact.phone}`}>
                        Appeler
                      </Button>
                    )}
                    <Button type="primary" block icon={<FundOutlined />}>
                      <Link to={`/crm/opportunities/new?contact=${id}`}>Créer une opportunité</Link>
                    </Button>
                    <Button block icon={<ScheduleOutlined />}>
                      <Link to={`/crm/activities/new?contact=${id}`}>Planifier une activité</Link>
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </TabPane>
          
          <TabPane tab={<span><FundOutlined /> Opportunités</span>} key="2">
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button type="primary" icon={<PlusOutlined />}>
                <Link to={`/crm/opportunities/new?contact=${id}`}>Nouvelle Opportunité</Link>
              </Button>
            </div>

            <List
              itemLayout="horizontal"
              dataSource={opportunities}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Link to={`/crm/opportunities/${item.id}`}>Détails</Link>,
                    <Link to={`/crm/opportunities/${item.id}/edit`}>Modifier</Link>
                  ]}
                >
                  <List.Item.Meta
                    title={<Link to={`/crm/opportunities/${item.id}`}>{item.name}</Link>}
                    description={
                      <>
                        <div>
                          <Tag color={item.stage_color}>{item.stage_name}</Tag>
                          {item.is_won && <Tag color="green">Gagnée</Tag>}
                          {item.is_lost && <Tag color="red">Perdue</Tag>}
                        </div>
                        <div>
                          <Link to={`/crm/companies/${item.company_id}`}>
                            <ShopOutlined /> {item.company_name}
                          </Link>
                        </div>
                        <div>
                          Montant: {item.amount ? item.amount.toLocaleString() : 0} {item.currency || 'MAD'} | 
                          Probabilité: {item.probability || 0}%
                        </div>
                        {item.expected_close_date && (
                          <div>Date de clôture prévue: {item.expected_close_date}</div>
                        )}
                      </>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "Aucune opportunité associée à ce contact" }}
            />
          </TabPane>
          
          <TabPane tab={<span><ScheduleOutlined /> Activités</span>} key="3">
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button type="primary" icon={<PlusOutlined />}>
                <Link to={`/crm/activities/new?contact=${id}`}>Nouvelle Activité</Link>
              </Button>
            </div>

            <List
              itemLayout="horizontal"
              dataSource={activities}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Link to={`/crm/activities/${item.id}`}>Détails</Link>,
                    <Link to={`/crm/activities/${item.id}/edit`}>Modifier</Link>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor: item.activity_type_color }}>
                        {item.activity_type_icon || item.activity_type_name[0]}
                      </Avatar>
                    }
                    title={<Link to={`/crm/activities/${item.id}`}>{item.subject}</Link>}
                    description={
                      <>
                        <div>Type: {item.activity_type_name}</div>
                        <div>Date: {new Date(item.start_date).toLocaleString()}</div>
                        <div>Statut: {
                          item.status === 'planned' ? 'Planifiée' :
                          item.status === 'completed' ? 'Terminée' :
                          item.status === 'cancelled' ? 'Annulée' : item.status
                        }</div>
                        {item.company_name && (
                          <div>
                            <Link to={`/crm/companies/${item.company_id}`}>
                              <ShopOutlined /> {item.company_name}
                            </Link>
                          </div>
                        )}
                      </>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "Aucune activité associée à ce contact" }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default ContactDetail;
