// src/components/crm/forms/ActivityForm.js
import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  Space, 
  Card, 
  Row, 
  Col, 
  Typography, 
  message, 
  Spin,
  Divider,
  Checkbox,
  TimePicker
} from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const ActivityForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const companyId = queryParams.get('company');
  const opportunityId = queryParams.get('opportunity');
  const contactId = queryParams.get('contact');

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [activity, setActivity] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(companyId ? parseInt(companyId) : null);
  const [isAllDay, setIsAllDay] = useState(false);
  const [isReminder, setIsReminder] = useState(false);

  const isEditMode = !!id;

  useEffect(() => {
    const fetchFormData = async () => {
      setLoading(true);
      try {
        // Chargement des données de référence
        const [
          companiesResponse,
          activityTypesResponse,
          allContactsResponse,
          allOpportunitiesResponse
        ] = await Promise.all([
          axios.get('/api/crm/companies/'),
          axios.get('/api/crm/activity-types/'),
          axios.get('/api/crm/contacts/'),
          axios.get('/api/crm/opportunities/')
        ]);

        const companiesData = extractResultsFromResponse(companiesResponse);
        setCompanies(companiesData);

        const activityTypesData = extractResultsFromResponse(activityTypesResponse);
        setActivityTypes(activityTypesData);

        const contactsData = extractResultsFromResponse(allContactsResponse);
        setContacts(contactsData);

        const opportunitiesData = extractResultsFromResponse(allOpportunitiesResponse);
        setOpportunities(opportunitiesData);

        // En mode édition, charger les données de l'activité
        if (isEditMode) {
          const activityResponse = await axios.get(`/api/crm/activities/${id}/`);
          const activityData = activityResponse.data;
          setActivity(activityData);

          setIsAllDay(activityData.all_day);
          setIsReminder(activityData.reminder);
          
          if (activityData.company) {
            setSelectedCompany(activityData.company.id);
            // Filtrer les contacts par entreprise
            setFilteredContacts(contactsData.filter(contact => contact.company_id === activityData.company.id));
            // Filtrer les opportunités par entreprise
            setFilteredOpportunities(opportunitiesData.filter(opportunity => opportunity.company_id === activityData.company.id));
          }

          // Formater les dates pour le formulaire
          const startDate = moment(activityData.start_date);
          const endDate = activityData.end_date ? moment(activityData.end_date) : null;
          const reminderDateTime = activityData.reminder_datetime ? moment(activityData.reminder_datetime) : null;

          // Formater les données pour le formulaire
          form.setFieldsValue({
            subject: activityData.subject,
            activity_type_id: activityData.activity_type.id,
            start_date: startDate,
            end_date: endDate,
            all_day: activityData.all_day,
            status: activityData.status,
            company_id: activityData.company?.id,
            opportunity_id: activityData.opportunity?.id,
            contact_ids: activityData.contacts?.map(contact => contact.id) || [],
            description: activityData.description,
            reminder: activityData.reminder,
            reminder_datetime: reminderDateTime
          });
        } else {
          // En mode création, initialiser les valeurs par défaut
          form.setFieldsValue({
            status: 'planned',
            all_day: false,
            reminder: false,
            start_date: moment(),
            end_date: moment().add(1, 'hour')
          });

          // Pré-remplir avec les paramètres spécifiés dans l'URL
          const initialValues = {};
          
          if (companyId) {
            initialValues.company_id = parseInt(companyId);
            setSelectedCompany(parseInt(companyId));
            
            // Filtrer les contacts par entreprise sélectionnée
            setFilteredContacts(contactsData.filter(contact => contact.company_id === parseInt(companyId)));
            
            // Filtrer les opportunités par entreprise sélectionnée
            setFilteredOpportunities(opportunitiesData.filter(opportunity => opportunity.company_id === parseInt(companyId)));
          }
          
          if (opportunityId) {
            initialValues.opportunity_id = parseInt(opportunityId);
          }
          
          if (contactId) {
            initialValues.contact_ids = [parseInt(contactId)];
          }
          
          form.setFieldsValue(initialValues);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        message.error("Impossible de charger les données nécessaires");
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [id, form, companyId, opportunityId, contactId, isEditMode]);

  
const handleCompanyChange = async (value) => {
  console.log('Entreprise sélectionnée:', value);
  setSelectedCompany(value);
  
  // Réinitialiser les sélections liées à l'entreprise
  form.setFieldsValue({
    opportunity_id: undefined,
    contact_ids: []
  });
  
  try {
    // Récupérer les contacts de l'entreprise sélectionnée
    const contactsResponse = await axios.get(`/api/crm/companies/${value}/contacts/`);
    console.log('Réponse contacts:', contactsResponse);
    const contactsData = extractResultsFromResponse(contactsResponse);
    console.log('Données contacts après extraction:', contactsData);
    
    // Mettre à jour les contacts filtrés
    if (Array.isArray(contactsData)) {
      setFilteredContacts(contactsData);
    } else {
      console.warn('Les données de contacts ne sont pas un tableau:', contactsData);
      setFilteredContacts([]);
    }
    
    // Récupérer les opportunités de l'entreprise sélectionnée
    const opportunitiesResponse = await axios.get(`/api/crm/companies/${value}/opportunities/`);
    console.log('Réponse opportunités:', opportunitiesResponse);
    const opportunitiesData = extractResultsFromResponse(opportunitiesResponse);
    console.log('Données opportunités après extraction:', opportunitiesData);
    
    // Mettre à jour les opportunités filtrées
    if (Array.isArray(opportunitiesData)) {
      setFilteredOpportunities(opportunitiesData);
    } else {
      console.warn('Les données d\'opportunités ne sont pas un tableau:', opportunitiesData);
      setFilteredOpportunities([]);
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données liées à l'entreprise:", error);
    message.error("Impossible de charger les données associées à l'entreprise");
    setFilteredContacts([]);
    setFilteredOpportunities([]);
  }
};


  const handleAllDayToggle = (e) => {
    const checked = e.target.checked;
    setIsAllDay(checked);
    
    // Si tout le jour est activé, ajuster les heures
    if (checked) {
      const startDate = form.getFieldValue('start_date');
      const endDate = form.getFieldValue('end_date');
      
      if (startDate) {
        form.setFieldsValue({
          start_date: startDate.startOf('day')
        });
      }
      
      if (endDate) {
        form.setFieldsValue({
          end_date: endDate.endOf('day')
        });
      }
    }
  };

  const handleReminderToggle = (e) => {
    const checked = e.target.checked;
    setIsReminder(checked);
    
    // Si le rappel est activé, définir un temps par défaut (1 heure avant)
    if (checked) {
      const startDate = form.getFieldValue('start_date');
      if (startDate) {
        form.setFieldsValue({
          reminder_datetime: moment(startDate).subtract(1, 'hour')
        });
      }
    }
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // Adapter les données pour l'API
      const formData = {
        subject: values.subject,
        activity_type_id: values.activity_type_id,
        start_date: values.start_date.format(),
        end_date: values.end_date ? values.end_date.format() : null,
        all_day: values.all_day,
        status: values.status,
        company_id: values.company_id,
        opportunity_id: values.opportunity_id,
        contact_ids: values.contact_ids || [],
        description: values.description,
        reminder: values.reminder,
        assigned_to_id: 1,
        reminder_datetime: values.reminder && values.reminder_datetime ? values.reminder_datetime.format() : null
      };

      if (isEditMode) {
        // Mode édition
        await axios.put(`/api/crm/activities/${id}/`, formData);
        message.success('Activité mise à jour avec succès');
      } else {
        // Mode création
        const response = await axios.post('/api/crm/activities/', formData);
        message.success('Activité créée avec succès');
        // Naviguer vers la page de détail de la nouvelle activité
        navigate(`/crm/activities/${response.data.id}`);
        return; // Sortir de la fonction pour éviter la redirection en bas
      }

      // Rediriger vers la page de détail de l'activité
      navigate(`/crm/activities/${id}`);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer l'activité");
    } finally {
      setSubmitting(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Échec de la validation:', errorInfo);
    message.error('Veuillez corriger les erreurs dans le formulaire');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card title={isEditMode ? 'Modifier l\'activité' : 'Nouvelle activité'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        initialValues={{
          status: 'planned',
          all_day: false,
          reminder: false,
          start_date: moment(),
          end_date: moment().add(1, 'hour')
        }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="subject"
              label="Sujet"
              rules={[{ required: true, message: 'Veuillez saisir un sujet' }]}
            >
              <Input placeholder="Ex: Réunion de présentation" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="activity_type_id"
              label="Type d'activité"
              rules={[{ required: true, message: 'Veuillez sélectionner un type d\'activité' }]}
            >
              <Select
                placeholder="Sélectionner un type d'activité"
              >
                {activityTypes.map(type => (
                  <Option key={type.id} value={type.id}>
                    <span style={{ color: type.color }}>■</span> {type.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Title level={5}>Planification</Title>
        <Row gutter={16}>
          <Col xs={24} md={isAllDay ? 12 : 6}>
            <Form.Item
              name="start_date"
              label="Date de début"
              rules={[{ required: true, message: 'Veuillez sélectionner une date de début' }]}
            >
              {isAllDay ? (
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="DD/MM/YYYY"
                />
              ) : (
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="DD/MM/YYYY HH:mm"
                  showTime={{ format: 'HH:mm' }}
                />
              )}
            </Form.Item>
          </Col>
          <Col xs={24} md={isAllDay ? 12 : 6}>
            <Form.Item
              name="end_date"
              label="Date de fin"
              dependencies={['start_date']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {


const startDate = getFieldValue('start_date');
if (!value || !startDate) {
 return Promise.resolve();
}
const startTime = moment(startDate).valueOf();
const endTime = moment(value).valueOf();
if (endTime >= startTime) {
return Promise.resolve();
}

 


                    return Promise.reject(new Error('La date de fin doit être postérieure à la date de début'));
                  },
                }),
              ]}
            >
              {isAllDay ? (
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="DD/MM/YYYY"
                />
              ) : (
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="DD/MM/YYYY HH:mm"
                  showTime={{ format: 'HH:mm' }}
                />
              )}
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="all_day"
              valuePropName="checked"
              style={{ marginTop: 29 }}
            >
              <Checkbox onChange={handleAllDayToggle}>
                Toute la journée
              </Checkbox>
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="status"
              label="Statut"
              rules={[{ required: true, message: 'Veuillez sélectionner un statut' }]}
            >
              <Select placeholder="Sélectionner un statut">
                <Option value="planned">Planifiée</Option>
                <Option value="completed">Terminée</Option>
                <Option value="cancelled">Annulée</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Title level={5}>Liens</Title>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="company_id"
              label="Entreprise"
            >
              <Select
                placeholder="Sélectionner une entreprise"
                allowClear
                onChange={handleCompanyChange}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {companies.map(company => (
                  <Option key={company.id} value={company.id}>{company.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="opportunity_id"
              label="Opportunité"
            >
              <Select
                placeholder="Sélectionner une opportunité"
                allowClear
                disabled={!selectedCompany}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {filteredOpportunities.map(opportunity => (
                  <Option key={opportunity.id} value={opportunity.id}>{opportunity.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="contact_ids"
              label="Contacts"
            >
              <Select
                mode="multiple"
                placeholder="Sélectionner des contacts"
                allowClear
                disabled={!selectedCompany}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {filteredContacts.map(contact => (
                  <Option key={contact.id} value={contact.id}>
                    {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea rows={4} placeholder="Description de l'activité..." />
        </Form.Item>

        <Title level={5}>Rappel</Title>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item
              name="reminder"
              valuePropName="checked"
            >
              <Checkbox onChange={handleReminderToggle}>
                Activer un rappel
              </Checkbox>
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="reminder_datetime"
              label="Date et heure du rappel"
              dependencies={['reminder']}
            >
              <DatePicker 
                style={{ width: '100%' }} 
                format="DD/MM/YYYY HH:mm"
                showTime={{ format: 'HH:mm' }}
                disabled={!isReminder}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEditMode ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button onClick={() => navigate(-1)}>
              Annuler
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ActivityForm;
