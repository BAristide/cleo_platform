// src/components/hr/forms/MissionForm.js
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, Select, Card, Row, Col, Typography, message, Spin, Space } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const MissionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const employeeId = queryParams.get('employee');

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  
  const isEditMode = !!id;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Charger la liste des employés
        const employeesResponse = await axios.get('/api/hr/employees/', { 
          params: { is_active: true }
        });
        setEmployees(extractResultsFromResponse(employeesResponse));

        // En mode édition, charger les données de la mission
        if (isEditMode) {
          const missionResponse = await axios.get(`/api/hr/missions/${id}/`);
          const missionData = missionResponse.data;

          // Formater les dates
          form.setFieldsValue({
            title: missionData.title,
            employee: missionData.employee ? missionData.employee.id : null,
            location: missionData.location,
            date_range: [
              moment(missionData.start_date),
              moment(missionData.end_date)
            ],
            description: missionData.description
          });
        } else if (employeeId) {
          // Pré-remplir avec l'employé spécifié dans l'URL
          form.setFieldsValue({
            employee: parseInt(employeeId)
          });
        }

        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        message.error("Impossible de charger les données nécessaires");
        setLoading(false);
      }
    };

    fetchData();
  }, [id, form, isEditMode, employeeId]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // Préparer les données
      const formData = {
        title: values.title,
        employee: values.employee,
        location: values.location,
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
        description: values.description
      };

      if (isEditMode) {
        // Mode édition
        await axios.put(`/api/hr/missions/${id}/`, formData);
        message.success('Mission mise à jour avec succès');
        navigate(`/hr/missions/${id}`);
      } else {
        // Mode création
        const response = await axios.post('/api/hr/missions/', formData);
        message.success('Mission créée avec succès');
        navigate(`/hr/missions/${response.data.id}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer la mission");
    } finally {
      setSubmitting(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Échec de la validation:', errorInfo);
    message.error('Veuillez corriger les erreurs dans le formulaire');
  };

  const disabledDate = (current) => {
    // Désactiver les dates passées (avant aujourd'hui)
    return current && current < moment().startOf('day');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card title={isEditMode ? 'Modifier une mission' : 'Nouvelle mission'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="title"
              label="Titre de la mission"
              rules={[{ required: true, message: 'Veuillez saisir un titre' }]}
            >
              <Input placeholder="Ex: Formation clients à Rabat" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="employee"
              label="Employé"
              rules={[{ required: true, message: 'Veuillez sélectionner un employé' }]}
            >
              <Select
                placeholder="Sélectionner un employé"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {employees.map(employee => (
                  <Option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="location"
              label="Lieu"
              rules={[{ required: true, message: 'Veuillez saisir un lieu' }]}
            >
              <Input placeholder="Ex: Rabat" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="date_range"
              label="Période"
              rules={[{ 
                required: true, 
                message: 'Veuillez sélectionner les dates de la mission' 
              }]}
            >
              <RangePicker 
                style={{ width: '100%' }} 
                format="DD/MM/YYYY"
                disabledDate={isEditMode ? null : disabledDate}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Veuillez saisir une description' }]}
        >
          <TextArea 
            rows={6} 
            placeholder="Décrivez l'objectif, le contexte et les détails de la mission..."
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEditMode ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button onClick={() => navigate(isEditMode ? `/hr/missions/${id}` : '/hr/missions')}>
              Annuler
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default MissionForm;
