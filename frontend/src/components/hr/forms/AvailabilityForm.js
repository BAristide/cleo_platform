// src/components/hr/forms/AvailabilityForm.js
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, Select, Card, Row, Col, message, Spin, Space } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const AvailabilityForm = () => {
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

        // En mode édition, charger les données de la disponibilité
        if (isEditMode) {
          const availabilityResponse = await axios.get(`/api/hr/availabilities/${id}/`);
          const availabilityData = availabilityResponse.data;

          // Formater les dates
          form.setFieldsValue({
            employee: availabilityData.employee.id,
            type: availabilityData.type,
            date_range: [
              moment(availabilityData.start_date),
              moment(availabilityData.end_date)
            ],
            reason: availabilityData.reason
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
        employee: values.employee,
        type: values.type,
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
        reason: values.reason
      };

      if (isEditMode) {
        // Mode édition
        await axios.put(`/api/hr/availabilities/${id}/`, formData);
        message.success('Disponibilité mise à jour avec succès');
        navigate(`/hr/availabilities`);
      } else {
        // Mode création
        const response = await axios.post('/api/hr/availabilities/', formData);
        message.success('Disponibilité créée avec succès');
        navigate(`/hr/availabilities`);
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer la disponibilité");
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
    <Card title={isEditMode ? 'Modifier une disponibilité' : 'Nouvelle disponibilité'}>
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
              name="type"
              label="Type de disponibilité"
              rules={[{ required: true, message: 'Veuillez sélectionner un type' }]}
            >
              <Select placeholder="Sélectionner un type">
                <Option value="leave_of_absence">Congé sans solde</Option>
                <Option value="sabbatical">Congé sabbatique</Option>
                <Option value="parental">Congé parental</Option>
                <Option value="other">Autre</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="date_range"
          label="Période"
          rules={[{ 
            required: true, 
            message: 'Veuillez sélectionner les dates de la disponibilité' 
          }]}
        >
          <RangePicker 
            style={{ width: '100%' }} 
            format="DD/MM/YYYY"
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Motif"
          rules={[{ required: true, message: 'Veuillez saisir un motif' }]}
        >
          <TextArea 
            rows={4} 
            placeholder="Décrivez le motif de cette demande de disponibilité..."
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEditMode ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button onClick={() => navigate('/hr/availabilities')}>
              Annuler
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AvailabilityForm;
