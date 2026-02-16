// src/components/crm/OpportunityDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { extractResultsFromResponse } from '../../utils/apiUtils';
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
  Select,
  Input,
  Divider,
  List,
  Avatar,
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
  ScheduleOutlined,
  CopyOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const OpportunityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stageHistory, setStageHistory] = useState([]);
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [stages, setStages] = useState([]);
  const [isStageModalVisible, setIsStageModalVisible] = useState(false);
  const [stageForm] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchOpportunityDetails();
    fetchStages();
  }, [id]);

  const fetchStages = async () => {
  try {
    const response = await axios.get('/api/crm/sales-stages/');
    console.log('Stages response:', response);  // Pour déboguer
    
    // Utiliser l'utilitaire pour extraire les résultats
    const data = extractResultsFromResponse(response);
    console.log('Stages data:', data);  // Pour déboguer
    
    if (Array.isArray(data)) {
      setStages(data);
    } else {
      console.error('Les données des étapes ne sont pas un tableau:', data);
      setStages([]);  // Initialiser avec un tableau vide en cas d'erreur
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des étapes:", error);
    message.error("Impossible de charger les étapes de vente");
    setStages([]);  // Initialiser avec un tableau vide en cas d'erreur
  }
};

  const fetchOpportunityDetails = async () => {
    setLoading(true);
    try {
      const opportunityResponse = await axios.get(`/api/crm/opportunities/${id}/`);
      setOpportunity(opportunityResponse.data);

      // Récupérer l'historique des étapes
      const historyResponse = await axios.get(`/api/crm/opportunities/${id}/stage_history/`);
      setStageHistory(historyResponse.data);

      // Récupérer les activités liées
      const activitiesResponse = await axios.get(`/api/crm/opportunities/${id}/activities/`);
      setActivities(activitiesResponse.data);

      // Récupérer les contacts liés à l'opportunité directement à partir des données
      setContacts(opportunityResponse.data.contacts || []);
    } catch (error) {
      console.error("Erreur lors de la récupération des détails de l'opportunité:", error);
      message.error("Impossible de charger les détails de l'opportunité");
      // Utiliser des données fictives en cas d'erreur
      setOpportunity({
        id: id,
        name: 'Opportunité non trouvée',
        company_name: 'N/A',
        stage_name: 'N/A',
        stage_color: '#ccc',
        amount: 0,
        currency: 'MAD',
        probability: 0,
        expected_close_date: 'N/A',
        description: 'Impossible de charger les détails.',
        created_at: 'N/A'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/crm/opportunities/${id}/`);
      message.success('Opportunité supprimée avec succès');
      navigate('/crm/opportunities');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer l'opportunité");
    }
  };

  const showStageModal = () => {
    stageForm.resetFields();
    setIsStageModalVisible(true);
  };

  const handleStageChange = async (values) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`/api/crm/opportunities/${id}/change_stage/`, {
        stage_id: values.stage_id,
        notes: values.notes
      });
      
      setOpportunity(response.data);
      message.success('Étape modifiée avec succès');
      
      // Rafraîchir l'historique des étapes
      const historyResponse = await axios.get(`/api/crm/opportunities/${id}/stage_history/`);
      setStageHistory(historyResponse.data);
      
      setIsStageModalVisible(false);
    } catch (error) {
      console.error("Erreur lors du changement d'étape:", error);
      message.error("Impossible de modifier l'étape");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuote = () => {
    navigate(`/sales/quotes/new?opportunity=${id}&company=${opportunity.company_id}`);
  };

  // Ajouter un indicateur de chargement
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // S'assurer que opportunity est disponible avant de l'utiliser
  if (!opportunity) {
    return <div>Opportunité non trouvée</div>;
  }

  return (
    <div className="opportunity-detail">
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link to="/crm/opportunities">Retour à la liste</Link>
          </Button>
          <Button type="primary" icon={<EditOutlined />}>
            <Link to={`/crm/opportunities/${id}/edit`}>Modifier</Link>
          </Button>
          <Button icon={<HistoryOutlined />} onClick={showStageModal}>
            Changer d'étape
          </Button>
          {!opportunity.is_closed && (
            <Button icon={<FileTextOutlined />} onClick={handleCreateQuote}>
              Créer un devis
            </Button>
          )}
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            Supprimer
          </Button>
        </Space>

        <Title level={2}>{opportunity.name}</Title>
        <Space style={{ marginBottom: 16 }}>
          <Badge status={opportunity.is_won ? "success" : opportunity.is_lost ? "error" : "processing"} text={
            opportunity.is_won ? "Gagnée" : opportunity.is_lost ? "Perdue" : "En cours"
          } />
          <Tag color={opportunity.stage_color}>{opportunity.stage_name}</Tag>
        </Space>

        <Tabs defaultActiveKey="1">
          <TabPane tab="Détails" key="1">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Card title="Informations générales" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                    <Descriptions.Item label="Entreprise">
                      <Link to={`/crm/companies/${opportunity.company_id}`}>
                        {opportunity.company_name}
                      </Link>
                    </Descriptions.Item>
                    <Descriptions.Item label="Étape">
                      <Tag color={opportunity.stage_color}>{opportunity.stage_name}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Montant">
                      {opportunity.amount ? opportunity.amount.toLocaleString() : 0} {opportunity.currency}
                    </Descriptions.Item>
                    <Descriptions.Item label="Probabilité">
                      {opportunity.probability || 0}%
                    </Descriptions.Item>
                    <Descriptions.Item label="Date de clôture prévue">
                      {opportunity.expected_close_date || 'Non définie'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Créé le">
                      {opportunity.created_at}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description" span={2}>
                      {opportunity.description || 'Aucune description'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card title="Résumé financier">
                  <Statistic
                    title="Montant"
                    value={opportunity.amount || 0}
                    precision={0}
                    formatter={value => `${value.toLocaleString()} ${opportunity.currency}`}
                  />
                  <Statistic
                    title="Pondéré"
                    value={(opportunity.amount || 0) * (opportunity.probability || 0) / 100}
                    precision={0}
                    formatter={value => `${value.toLocaleString()} ${opportunity.currency}`}
                    style={{ marginTop: 16 }}
                  />
                </Card>
              </Col>
            </Row>
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
              locale={{ emptyText: "Aucun contact associé à cette opportunité" }}
            />
          </TabPane>
          
          <TabPane tab={<span><ScheduleOutlined /> Activités</span>} key="3">
            <List
              itemLayout="horizontal"
              dataSource={activities}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Link to={`/crm/activities/${item.id}`}>Détails</Link>
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
              locale={{ emptyText: "Aucune activité associée à cette opportunité" }}
            />
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button type="primary">
                <Link to={`/crm/activities/new?opportunity=${id}`}>Nouvelle activité</Link>
              </Button>
            </div>
          </TabPane>
          
          <TabPane tab={<span><HistoryOutlined /> Historique</span>} key="4">
            <Timeline mode="left">
              {stageHistory.map((history, index) => (
                <Timeline.Item 
                  key={index}
                  color={history.to_stage.color || "blue"}
                  label={new Date(history.changed_at).toLocaleString()}
                >
                  <p>
                    <strong>De:</strong> {history.from_stage ? history.from_stage.name : 'Création'} {' '}
                    <strong>À:</strong> {history.to_stage.name}
                  </p>
                  {history.changed_by && <p><strong>Par:</strong> {history.changed_by.full_name || history.changed_by.username}</p>}
                  {history.notes && <p><strong>Notes:</strong> {history.notes}</p>}
                </Timeline.Item>
              ))}
            </Timeline>
          </TabPane>
          
          <TabPane tab={<span><FileDoneOutlined /> Documents</span>} key="5">
            {/* Section pour les devis */}
            <Title level={4}>Devis</Title>
            <p>Aucun devis lié à cette opportunité.</p>
            
            {/* Section pour les commandes */}
            <Title level={4} style={{ marginTop: 16 }}>Commandes</Title>
            <p>Aucune commande liée à cette opportunité.</p>
            
            {/* Section pour les factures */}
            <Title level={4} style={{ marginTop: 16 }}>Factures</Title>
            <p>Aucune facture liée à cette opportunité.</p>
            
            <Divider />
            
            <div style={{ textAlign: 'center' }}>
              <Space>
                <Button type="primary" icon={<CopyOutlined />} onClick={handleCreateQuote}>
                  Créer un devis
                </Button>
              </Space>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* Modal pour changer l'étape */}
      <Modal
        title="Changer l'étape de l'opportunité"
        visible={isStageModalVisible}
        onCancel={() => setIsStageModalVisible(false)}
        footer={null}
      >
        <Form
          form={stageForm}
          layout="vertical"
          onFinish={handleStageChange}
          initialValues={{
            stage_id: opportunity.stage_id
          }}
        >
          <Form.Item
            name="stage_id"
            label="Nouvelle étape"
            rules={[{ required: true, message: 'Veuillez sélectionner une étape' }]}
          >
            <Select placeholder="Sélectionnez une étape">
              {Array.isArray(stages) ? stages.map(stage => (
                <Option key={stage.id} value={stage.id}>
                  <Tag color={stage.color}>{stage.name}</Tag>
                </Option>
               )) : <Option value="">Chargement des étapes...</Option>}
            </Select>
          </Form.Item>
          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea rows={4} placeholder="Ajoutez des notes concernant ce changement d'étape (optionnel)" />
          </Form.Item>
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsStageModalVisible(false)}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                Enregistrer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OpportunityDetail;
