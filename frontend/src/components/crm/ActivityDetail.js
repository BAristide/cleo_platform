// src/components/crm/ActivityDetail.js
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
  Badge,
  Timeline,
  Popconfirm
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ShopOutlined,
  FundOutlined,
  FileTextOutlined,
  BellOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ActivityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityDetails();
  }, [id]);

  const fetchActivityDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/crm/activities/${id}/`);
      setActivity(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des détails de l'activité:", error);
      message.error("Impossible de charger les détails de l'activité");
      // Utiliser des données fictives en cas d'erreur
      setActivity({
        id: id,
        subject: 'Activité non trouvée',
        activity_type: { name: 'Inconnu', icon: null, color: '#ccc' },
        start_date: new Date().toISOString(),
        end_date: null,
        status: 'planned',
        company: null,
        opportunity: null,
        contacts: [],
        description: 'Impossible de charger les détails.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/crm/activities/${id}/`);
      message.success('Activité supprimée avec succès');
      navigate('/crm/activities');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer l'activité");
    }
  };

  const handleComplete = async () => {
    try {
      await axios.post(`/api/crm/activities/${id}/complete/`);
      message.success('Activité marquée comme terminée');
      fetchActivityDetails();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      message.error("Impossible de mettre à jour le statut de l'activité");
    }
  };

  const handleCancel = async () => {
    try {
      // Cette API n'existe peut-être pas, il faudrait l'ajouter au backend
      await axios.post(`/api/crm/activities/${id}/cancel/`);
      message.success('Activité annulée');
      fetchActivityDetails();
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
      message.error("Impossible d'annuler l'activité");
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

  // S'assurer que activity est disponible avant de l'utiliser
  if (!activity) {
    return <div>Activité non trouvée</div>;
  }

  // Déterminer le statut pour l'affichage
  const getStatusBadge = (status) => {
    switch (status) {
      case 'planned':
        return <Badge status="processing" text="Planifiée" />;
      case 'completed':
        return <Badge status="success" text="Terminée" />;
      case 'cancelled':
        return <Badge status="error" text="Annulée" />;
      default:
        return <Badge status="default" text={status} />;
    }
  };

  return (
    <div className="activity-detail">
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link to="/crm/activities">Retour à la liste</Link>
          </Button>
          <Button type="primary" icon={<EditOutlined />}>
            <Link to={`/crm/activities/${id}/edit`}>Modifier</Link>
          </Button>
          {activity.status === 'planned' && (
            <>
              <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                onClick={handleComplete}
              >
                Marquer comme terminée
              </Button>
              <Button 
                danger 
                icon={<CloseOutlined />} 
                onClick={handleCancel}
              >
                Annuler
              </Button>
            </>
          )}
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer cette activité?"
            onConfirm={handleDelete}
            okText="Oui"
            cancelText="Non"
          >
            <Button danger icon={<DeleteOutlined />}>
              Supprimer
            </Button>
          </Popconfirm>
        </Space>

        <Title level={2}>{activity.subject}</Title>
        <Space style={{ marginBottom: 16 }}>
          <Tag color={activity.activity_type?.color || '#ccc'}>
            {activity.activity_type?.name || 'Type inconnu'}
          </Tag>
          {getStatusBadge(activity.status)}
        </Space>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Card title="Détails de l'activité" style={{ marginBottom: 16 }}>
              <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                <Descriptions.Item label={<><CalendarOutlined /> Date de début</>}>
                  {moment(activity.start_date).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
                {activity.end_date && (
                  <Descriptions.Item label={<><CalendarOutlined /> Date de fin</>}>
                    {moment(activity.end_date).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label={<><ClockCircleOutlined /> Durée</>}>
                  {activity.end_date ? 
                    moment.duration(moment(activity.end_date).diff(moment(activity.start_date))).humanize() : 
                    activity.all_day ? 'Toute la journée' : 'Non spécifiée'
                  }
                </Descriptions.Item>
                <Descriptions.Item label="Statut">
                  {getStatusBadge(activity.status)}
                </Descriptions.Item>
                {activity.company && (
                  <Descriptions.Item label={<><ShopOutlined /> Entreprise</>}>
                    <Link to={`/crm/companies/${activity.company.id}`}>
                      {activity.company.name}
                    </Link>
                  </Descriptions.Item>
                )}
                {activity.opportunity && (
                  <Descriptions.Item label={<><FundOutlined /> Opportunité</>}>
                    <Link to={`/crm/opportunities/${activity.opportunity.id}`}>
                      {activity.opportunity.name}
                    </Link>
                  </Descriptions.Item>
                )}
                {activity.reminder && (
                  <Descriptions.Item label={<><BellOutlined /> Rappel</>}>
                    {moment(activity.reminder_datetime).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                )}
                {activity.description && (
                  <Descriptions.Item label={<><FileTextOutlined /> Description</>} span={2}>
                    {activity.description}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card title="Contacts associés">
              <List
                dataSource={activity.contacts || []}
                renderItem={contact => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <Link to={`/crm/contacts/${contact.id}`}>
                          {contact.first_name} {contact.last_name}
                        </Link>
                      }
                      description={contact.title}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: "Aucun contact associé" }}
              />
            </Card>

            <Card title="Chronologie" style={{ marginTop: 16 }}>
              <Timeline>
                <Timeline.Item color="blue">
                  Création: {moment(activity.created_at).format('DD/MM/YYYY HH:mm')}
                </Timeline.Item>
                {activity.status !== 'planned' && (
                  <Timeline.Item color={activity.status === 'completed' ? 'green' : 'red'}>
                    {activity.status === 'completed' ? 'Terminée' : 'Annulée'}: {
                      activity.completed_date ? 
                      moment(activity.completed_date).format('DD/MM/YYYY HH:mm') :
                      moment(activity.updated_at).format('DD/MM/YYYY HH:mm')
                    }
                  </Timeline.Item>
                )}
                <Timeline.Item color="blue">
                  Mise à jour: {moment(activity.updated_at).format('DD/MM/YYYY HH:mm')}
                </Timeline.Item>
              </Timeline>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ActivityDetail;
