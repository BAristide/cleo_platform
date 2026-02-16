// src/components/hr/forms/TrainingPlanForm.js
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Card, Row, Col, Typography, message, Spin, Space } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TrainingPlanForm = () => {
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
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Charger la liste des employés
        const employeesResponse = await axios.get('/api/hr/employees/', { 
          params: { is_active: true }
        });
        setEmployees(extractResultsFromResponse(employeesResponse));

        // En mode édition, charger les données du plan de formation
        if (isEditMode) {
          const planResponse = await axios.get(`/api/hr/training-plans/${id}/`);
          const planData = planResponse.data;

          form.setFieldsValue({
            employee: planData.employee,
            year: planData.year,
            objectives: planData.objectives
          });
        } else if (employeeId) {
          // Pré-remplir avec l'employé spécifié dans l'URL
          form.setFieldsValue({
            employee: parseInt(employeeId),
            year: currentYear
          });
        } else {
          // Valeur par défaut pour l'année
          form.setFieldsValue({
            year: currentYear
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
  }, [id, form, isEditMode, employeeId, currentYear]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      if (isEditMode) {
        // Mode édition
        await axios.put(`/api/hr/training-plans/${id}/`, values);
        message.success('Plan de formation mis à jour avec succès');
        navigate(`/hr/training-plans/${id}`);
      } else {
        // Mode création
        const response = await axios.post('/api/hr/training-plans/', values);
        message.success('Plan de formation créé avec succès');
        navigate(`/hr/training-plans/${response.data.id}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer le plan de formation");
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

  // Générer les années disponibles (de l'année courante à 3 ans plus tard)
  const years = [];
  for (let i = 0; i < 4; i++) {
    years.push(currentYear + i);
  }

  return (
    <Card title={isEditMode ? 'Modifier un plan de formation' : 'Nouveau plan de formation'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
      >
        <Row gutter={16}>
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
                disabled={isEditMode || !!employeeId}
              >
                {employees.map(employee => (
                  <Option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="year"
              label="Année"
              rules={[{ required: true, message: 'Veuillez sélectionner une année' }]}
            >
              <Select
                placeholder="Sélectionner une année"
                disabled={isEditMode}
              >
                {years.map(year => (
                  <Option key={year} value={year}>{year}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="objectives"
          label="Objectifs"
          rules={[{ required: true, message: 'Veuillez saisir les objectifs du plan de formation' }]}
        >
          <TextArea 
            rows={6} 
            placeholder="Décrivez les objectifs de développement, les compétences à renforcer, etc."
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEditMode ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button onClick={() => navigate(isEditMode ? `/hr/training-plans/${id}` : '/hr/training-plans')}>
              Annuler
            </Button>
          </Space>
        </Form.Item>

        {!isEditMode && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>Note:</Title>
            <p>Après la création du plan de formation, vous pourrez ajouter les formations spécifiques à suivre.</p>
          </div>
        )}
      </Form>
    </Card>
  );
};

export default TrainingPlanForm;
