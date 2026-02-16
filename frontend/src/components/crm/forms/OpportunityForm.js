// src/components/crm/forms/OpportunityForm.js
import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  InputNumber, 
  DatePicker, 
  Space, 
  Card, 
  Row, 
  Col, 
  Typography, 
  message, 
  Spin,
  Divider
} from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const OpportunityForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const companyId = queryParams.get('company');
  const contactId = queryParams.get('contact');

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactOptions, setContactOptions] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(companyId ? parseInt(companyId) : null);
  const [salesStages, setSalesStages] = useState([]);
  const [tags, setTags] = useState([]);
  const [opportunity, setOpportunity] = useState(null);

  const isEditMode = !!id;

  useEffect(() => {
    const fetchFormData = async () => {
      setLoading(true);
      try {
        // Chargement des données de référence
        const [
          companiesResponse,
          stagesResponse,
          tagsResponse
        ] = await Promise.all([
          axios.get('/api/crm/companies/'),
          axios.get('/api/crm/sales-stages/'),
          axios.get('/api/crm/tags/')
        ]);

        const companiesData = extractResultsFromResponse(companiesResponse);
        setCompanies(companiesData);

        const stagesData = extractResultsFromResponse(stagesResponse);
        setSalesStages(stagesData);

        const tagsData = extractResultsFromResponse(tagsResponse);
        setTags(tagsData);

        // Si un ID d'entreprise est spécifié, charger les contacts associés
        if (selectedCompany) {
          await fetchContactsByCompany(selectedCompany);
        }

        // En mode édition, charger les données de l'opportunité
        if (isEditMode) {
          const opportunityResponse = await axios.get(`/api/crm/opportunities/${id}/`);
          const opportunityData = opportunityResponse.data;
          setOpportunity(opportunityData);

          // Charger les contacts de l'entreprise associée à l'opportunité
          if (opportunityData.company_id) {
            await fetchContactsByCompany(opportunityData.company_id);
          }

          // Formater les données pour le formulaire
          form.setFieldsValue({
            name: opportunityData.name,
            company_id: opportunityData.company_id,
            stage_id: opportunityData.stage_id,
            amount: opportunityData.amount,
            currency: opportunityData.currency,
            probability: opportunityData.probability,
            expected_close_date: opportunityData.expected_close_date ? moment(opportunityData.expected_close_date) : null,
            description: opportunityData.description,
            tag_ids: opportunityData.tags?.map(tag => tag.id) || [],
            contact_ids: opportunityData.contacts?.map(contact => contact.id) || []
          });

          setSelectedCompany(opportunityData.company_id);
        } else {
          // En mode création, pré-remplir avec la première étape de vente
          if (stagesData.length > 0) {
            const firstStage = stagesData.sort((a, b) => a.order - b.order)[0];
            form.setFieldsValue({
              stage_id: firstStage.id,
              probability: firstStage.probability,
              currency: 'MAD' // Devise par défaut
            });
          }

          // Pré-remplir avec l'entreprise spécifiée dans l'URL
          if (companyId) {
            form.setFieldsValue({
              company_id: parseInt(companyId)
            });
          }

          // Pré-remplir avec le contact spécifié dans l'URL
          if (contactId) {
            form.setFieldsValue({
              contact_ids: [parseInt(contactId)]
            });
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        message.error("Impossible de charger les données nécessaires");
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [id, form, selectedCompany, companyId, contactId, isEditMode]);

 
const fetchContactsByCompany = async (companyId) => {
  try {
    const contactsResponse = await axios.get(`/api/crm/companies/${companyId}/contacts/`);
    console.log('Réponse contactsResponse:', contactsResponse);
    
    // Utiliser l'utilitaire pour extraire correctement les résultats
    const contactsData = extractResultsFromResponse(contactsResponse);
    console.log('Contacts après extraction:', contactsData);
    
    setContacts(contactsData);
    
    // Assurez-vous que les contacts ont un format utilisable
    if (Array.isArray(contactsData)) {
      // Formatage amélioré des options de contact
      const options = contactsData.map(contact => ({
        value: contact.id,
        label: contact.full_name || `Contact #${contact.id}`
      }));
      console.log('Options formatées:', options);
      setContactOptions(options);
    } else {
      setContactOptions([]);
    }
  } catch (error) {
    console.error("Erreur lors du chargement des contacts:", error);
    message.error("Impossible de charger les contacts associés à l'entreprise");
    setContactOptions([]);
  }
};

  const handleCompanyChange = async (value) => {
    setSelectedCompany(value);
    // Réinitialiser les contacts sélectionnés si l'entreprise change
    form.setFieldsValue({ contact_ids: [] });
    await fetchContactsByCompany(value);
  };

  const handleStageChange = (value) => {
    // Mettre à jour la probabilité en fonction de l'étape sélectionnée
    const selectedStage = salesStages.find(stage => stage.id === value);
    if (selectedStage) {
      form.setFieldsValue({ probability: selectedStage.probability });
    }
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // Adapter les données pour l'API
      const formData = {
        name: values.name,
        company_id: values.company_id,
        stage_id: values.stage_id,
        amount: values.amount,
        currency: values.currency,
        probability: values.probability,
        expected_close_date: values.expected_close_date ? values.expected_close_date.format('YYYY-MM-DD') : null,
        description: values.description,
        tag_ids: values.tag_ids,
        assigned_to_id: 1,
        contact_ids: values.contact_ids
      };

      if (isEditMode) {
        // Mode édition
        await axios.put(`/api/crm/opportunities/${id}/`, formData);
        message.success('Opportunité mise à jour avec succès');
      } else {
        // Mode création
        const response = await axios.post('/api/crm/opportunities/', formData);
        message.success('Opportunité créée avec succès');
        // Naviguer vers la page de détail de la nouvelle opportunité
        navigate(`/crm/opportunities/${response.data.id}`);
        return; // Sortir de la fonction pour éviter la redirection en bas
      }

      // Rediriger vers la page de détail de l'opportunité
      navigate(`/crm/opportunities/${id}`);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer l'opportunité");
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
    <Card title={isEditMode ? 'Modifier l\'opportunité' : 'Nouvelle opportunité'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        initialValues={{
          currency: 'MAD',
          probability: 10
        }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Nom de l'opportunité"
              rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
            >
              <Input placeholder="Ex: Projet développement web" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="company_id"
              label="Entreprise"
              rules={[{ required: true, message: 'Veuillez sélectionner une entreprise' }]}
            >
              <Select
                placeholder="Sélectionner une entreprise"
                showSearch
                optionFilterProp="children"
                onChange={handleCompanyChange}
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
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="stage_id"
              label="Étape"
              rules={[{ required: true, message: 'Veuillez sélectionner une étape' }]}
            >
              <Select
                placeholder="Sélectionner une étape"
                onChange={handleStageChange}
              >
                {salesStages.map(stage => (
                  <Option key={stage.id} value={stage.id}>
                    {stage.name} ({stage.probability}%)
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="contact_ids"
              label="Contacts"
            >
              <Select
                mode="multiple"
                placeholder="Sélectionner des contacts"
                options={contactOptions}
                disabled={!selectedCompany}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="amount"
              label="Montant"
              rules={[{ required: true, message: 'Veuillez saisir un montant' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                placeholder="Ex: 50000"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item
              name="currency"
              label="Devise"
              rules={[{ required: true, message: 'Veuillez sélectionner une devise' }]}
            >
              <Select>
                <Option value="MAD">MAD</Option>
                <Option value="EUR">EUR</Option>
                <Option value="USD">USD</Option>
                <Option value="GBP">GBP</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="probability"
              label="Probabilité (%)"
              rules={[{ required: true, message: 'Veuillez saisir une probabilité' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                formatter={value => `${value}%`}
                parser={value => value.replace('%', '')}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="expected_close_date"
              label="Date de clôture prévue"
            >
              <DatePicker 
                style={{ width: '100%' }} 
                format="DD/MM/YYYY"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea rows={4} placeholder="Description de l'opportunité..." />
        </Form.Item>

        <Form.Item
          name="tag_ids"
          label="Tags"
        >
          <Select
            mode="multiple"
            placeholder="Sélectionner des tags"
          >
            {tags.map(tag => (
              <Option key={tag.id} value={tag.id}>
                <span style={{ color: tag.color }}>■</span> {tag.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

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

export default OpportunityForm;
