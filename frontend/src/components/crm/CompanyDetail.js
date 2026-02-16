// src/components/crm/CompanyDetail.js
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
  Statistic,
  Progress,
  Popconfirm
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  HomeOutlined,
  BankOutlined,
  TeamOutlined,
  FundOutlined,
  ScheduleOutlined,
  PlusOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const CompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyDetails();
  }, [id]);

  const fetchCompanyDetails = async () => {
    setLoading(true);
    try {
      // Récupérer les détails de l'entreprise
      const companyResponse = await axios.get(`/api/crm/companies/${id}/`);
      setCompany(companyResponse.data);

      // Récupérer les contacts associés
      const contactsResponse = await axios.get(`/api/crm/companies/${id}/contacts/`);
      const contactsData = extractResultsFromResponse(contactsResponse);
      setContacts(contactsData);

      // Récupérer les opportunités associées
      const opportunitiesResponse = await axios.get(`/api/crm/companies/${id}/opportunities/`);
      const opportunitiesData = extractResultsFromResponse(opportunitiesResponse);
      setOpportunities(opportunitiesData);

      // Récupérer les activités associées
      const activitiesResponse = await axios.get(`/api/crm/companies/${id}/activities/`);
      const activitiesData = extractResultsFromResponse(activitiesResponse);
      setActivities(activitiesData);
    } catch (error) {
      console.error("Erreur lors de la récupération des détails de l'entreprise:", error);
      message.error("Impossible de charger les détails de l'entreprise");
      // Utiliser des données fictives en cas d'erreur
      setCompany({
        id: id,
        name: 'Entreprise non trouvée',
        industry_name: 'N/A',
        phone: '',
        email: '',
        website: '',
        address_line1: '',
        city: '',
        country: '',
        score: 0,
        description: 'Impossible de charger les détails.',
        tags: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/crm/companies/${id}/`);
      message.success('Entreprise supprimée avec succès');
      navigate('/crm/companies');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer l'entreprise");
    }
  };

  // Ajouter un indicateur de chargement
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // S'assurer que company est disponible avant de l'utiliser
  if (!company) {
    return <div>Entreprise non trouvée</div>;
  }

  return (
    <div className="company-detail">
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link to="/crm/companies">Retour à la liste</Link>
          </Button>
          <Button type="primary" icon={<EditOutlined />}>
            <Link to={`/crm/companies/${id}/edit`}>Modifier</Link>
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer cette entreprise?"
            onConfirm={handleDelete}
            okText="Oui"
            cancelText="Non"
          >
            <Button danger icon={<DeleteOutlined />}>
              Supprimer
            </Button>
          </Popconfirm>
        </Space>

        <Title level={2}>{company.name}</Title>
        {company.industry_name && (
          <Tag color="blue" style={{ marginBottom: 16 }}>{company.industry_name}</Tag>
        )}

        <Tabs defaultActiveKey="1">
          <TabPane tab="Détails" key="1">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Card title="Informations générales" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                    {company.phone && (
                      <Descriptions.Item label={<><PhoneOutlined /> Téléphone</>}>
                        <a href={`tel:${company.phone}`}>{company.phone}</a>
                      </Descriptions.Item>
                    )}
                    {company.email && (
                      <Descriptions.Item label={<><MailOutlined /> Email</>}>
                        <a href={`mailto:${company.email}`}>{company.email}</a>
                      </Descriptions.Item>
                    )}
                    {company.website && (
                      <Descriptions.Item label={<><GlobalOutlined /> Site web</>}>
                        <a href={company.website} target="_blank" rel="noopener noreferrer">{company.website}</a>
                      </Descriptions.Item>
                    )}
                    {(company.address_line1 || company.city || company.country) && (
                      <Descriptions.Item label={<><HomeOutlined /> Adresse</>} span={2}>
                        {company.address_line1 && <div>{company.address_line1}</div>}
                        {company.address_line2 && <div>{company.address_line2}</div>}
                        <div>
                          {company.city && company.city}
                          {company.state && `, ${company.state}`}
                          {company.postal_code && ` ${company.postal_code}`}
                        </div>
                        {company.country && <div>{company.country}</div>}
                      </Descriptions.Item>
                    )}
                    {company.annual_revenue && (
                      <Descriptions.Item label={<><BankOutlined /> Chiffre d'affaires annuel</>}>
                        {company.annual_revenue.toLocaleString()} {company.currency || 'MAD'}
                      </Descriptions.Item>
                    )}
                    {company.employee_count && (
                      <Descriptions.Item label="Nombre d'employés">
                        {company.employee_count}
                      </Descriptions.Item>
                    )}
                    {company.description && (
                      <Descriptions.Item label="Description" span={2}>
                        {company.description}
                      </Descriptions.Item>
                    )}
                    {company.tags && company.tags.length > 0 && (
                      <Descriptions.Item label="Tags" span={2}>
                        {company.tags.map(tag => (
                          <Tag key={tag.id} color={tag.color}>{tag.name}</Tag>
                        ))}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card title="Score de qualification" style={{ marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress
                      type="dashboard"
                      percent={company.score || 0}
                      format={percent => `${percent}%`}
                      status={
                        (company.score || 0) < 30 ? "exception" :
                        (company.score || 0) < 70 ? "normal" : "success"
                      }
                    />
                    <div style={{ marginTop: 16 }}>
                      <Text>
                        {(company.score || 0) < 30 ? "Faible potentiel" :
                         (company.score || 0) < 70 ? "Potentiel moyen" : "Fort potentiel"}
                      </Text>
                    </div>
                  </div>
                </Card>

                <Card title="Résumé">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic
                        title="Contacts"
                        value={contacts.length}
                        prefix={<TeamOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Opportunités"
                        value={opportunities.length}
                        prefix={<FundOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Activités"
                        value={activities.length}
                        prefix={<ScheduleOutlined />}
                      />
                    </Col>
                    {opportunities.length > 0 && (
                      <Col span={12}>
                        <Statistic
                          title="Pipeline"
                          value={opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0)}
                          precision={0}
                          suffix="MAD"
                          prefix={<FundOutlined />}
                        />
                      </Col>
                    )}
                  </Row>
                </Card>
              </Col>
            </Row>
          </TabPane>
          
          <TabPane tab={<span><TeamOutlined /> Contacts</span>} key="2">
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button type="primary" icon={<PlusOutlined />}>
                <Link to={`/crm/contacts/new?company=${id}`}>Nouveau Contact</Link>
              </Button>
            </div>

            <List
              itemLayout="horizontal"
              dataSource={contacts}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Link to={`/crm/contacts/${item.id}`}>Détails</Link>,
                    <Link to={`/crm/contacts/${item.id}/edit`}>Modifier</Link>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={<Link to={`/crm/contacts/${item.id}`}>{item.first_name} {item.last_name}</Link>}
                    description={
                      <>
                        <div>{item.title}</div>
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
          
          <TabPane tab={<span><FundOutlined /> Opportunités</span>} key="3">
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button type="primary" icon={<PlusOutlined />}>
                <Link to={`/crm/opportunities/new?company=${id}`}>Nouvelle Opportunité</Link>
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
              locale={{ emptyText: "Aucune opportunité associée à cette entreprise" }}
            />
          </TabPane>
          
          <TabPane tab={<span><ScheduleOutlined /> Activités</span>} key="4">
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button type="primary" icon={<PlusOutlined />}>
                <Link to={`/crm/activities/new?company=${id}`}>Nouvelle Activité</Link>
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
                      </>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "Aucune activité associée à cette entreprise" }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default CompanyDetail;
