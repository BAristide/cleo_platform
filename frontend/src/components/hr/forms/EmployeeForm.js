// src/components/hr/forms/EmployeeForm.js
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, DatePicker, Switch, Card, Row, Col, Typography, message, Spin, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const EmployeeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  
  const isEditMode = !!id;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Chargement des données de référence
        const [
          departmentsResponse,
          jobTitlesResponse,
          employeesResponse,
          usersResponse
        ] = await Promise.all([
          axios.get('/api/hr/departments/'),
          axios.get('/api/hr/job-titles/'),
          axios.get('/api/hr/employees/'),
          axios.get('/api/crm/users/') // Endpoint pour les utilisateurs Django
        ]);

        setDepartments(extractResultsFromResponse(departmentsResponse));
        setJobTitles(extractResultsFromResponse(jobTitlesResponse));
        setManagers(extractResultsFromResponse(employeesResponse));
        setUsers(extractResultsFromResponse(usersResponse));

        // En mode édition, charger les données de l'employé
        if (isEditMode) {
          const employeeResponse = await axios.get(`/api/hr/employees/${id}/`);
          const employeeData = employeeResponse.data;

          // Mettre à jour le département sélectionné pour filtrer les postes
          if (employeeData.department) {
            setSelectedDepartment(employeeData.department.id);
          }

          // Formater les dates
          const formattedData = {
            ...employeeData,
            hire_date: employeeData.hire_date ? moment(employeeData.hire_date) : null,
            birth_date: employeeData.birth_date ? moment(employeeData.birth_date) : null,
            // Extraire les IDs des objets imbriqués
            user_id: employeeData.user ? employeeData.user.id : null,
            department_id: employeeData.department ? employeeData.department.id : null,
            job_title_id: employeeData.job_title ? employeeData.job_title.id : null,
            manager_id: employeeData.manager ? employeeData.manager.id : null,
            second_manager_id: employeeData.second_manager ? employeeData.second_manager.id : null,
          };

          form.setFieldsValue(formattedData);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        message.error("Impossible de charger les données nécessaires");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, form, isEditMode]);

  // Filtrer les postes par département
  const filteredJobTitles = selectedDepartment
    ? jobTitles.filter(job => job.department === selectedDepartment)
    : jobTitles;

  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
    // Réinitialiser le poste si le département change
    form.setFieldsValue({ job_title_id: undefined });
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // Formater les dates
      const formData = {
        ...values,
        hire_date: values.hire_date ? values.hire_date.format('YYYY-MM-DD') : null,
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
      };

      if (isEditMode) {
        // Mode édition
        await axios.put(`/api/hr/employees/${id}/`, formData);
        message.success('Employé mis à jour avec succès');
      } else {
        // Mode création
        const response = await axios.post('/api/hr/employees/', formData);
        message.success('Employé créé avec succès');
        navigate(`/hr/employees/${response.data.id}`);
        return; // Sortir de la fonction pour éviter la redirection en bas
      }

      // Rediriger vers la page de détail
      navigate(`/hr/employees/${id}`);

    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer l'employé");
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
    <Card title={isEditMode ? 'Modifier un employé' : 'Nouvel employé'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        initialValues={{
          is_active: true,
          is_hr: false,
          is_finance: false
        }}
      >
        <Title level={4}>Informations personnelles</Title>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="first_name"
              label="Prénom"
              rules={[{ required: true, message: 'Veuillez saisir le prénom' }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="last_name"
              label="Nom"
              rules={[{ required: true, message: 'Veuillez saisir le nom' }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Veuillez saisir l\'email' },
                { type: 'email', message: 'Veuillez saisir un email valide' }
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="phone"
              label="Téléphone"
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="birth_date"
              label="Date de naissance"
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="user_id"
              label="Utilisateur du système"
              help="Liaison avec un compte utilisateur Django (facultatif)"
            >
              <Select
                allowClear
                showSearch
                placeholder="Sélectionnez un utilisateur"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.full_name || user.username || user.email}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="address"
          label="Adresse"
        >
          <TextArea rows={3} />
        </Form.Item>

        <Title level={4} style={{ marginTop: 24 }}>Informations professionnelles</Title>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="employee_id"
              label="Identifiant employé"
              rules={[{ required: true, message: 'Veuillez saisir l\'identifiant employé' }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="hire_date"
              label="Date d'embauche"
              rules={[{ required: true, message: 'Veuillez sélectionner la date d\'embauche' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="department_id"
              label="Département"
              rules={[{ required: true, message: 'Veuillez sélectionner un département' }]}
            >
              <Select
                placeholder="Sélectionnez un département"
                onChange={handleDepartmentChange}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {departments.map(dept => (
                  <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="job_title_id"
              label="Poste"
              rules={[{ required: true, message: 'Veuillez sélectionner un poste' }]}
            >
              <Select
                placeholder={selectedDepartment ? "Sélectionnez un poste" : "Veuillez d'abord sélectionner un département"}
                disabled={!selectedDepartment}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {filteredJobTitles.map(job => (
                  <Option key={job.id} value={job.id}>{job.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Title level={4} style={{ marginTop: 24 }}>Hiérarchie</Title>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="manager_id"
              label="Responsable hiérarchique (N+1)"
            >
              <Select
                allowClear
                showSearch
                placeholder="Sélectionnez un manager"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {managers.map(manager => (
                  <Option key={manager.id} value={manager.id}>
                    {manager.first_name} {manager.last_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="second_manager_id"
              label="N+2"
            >
              <Select
                allowClear
                showSearch
                placeholder="Sélectionnez un N+2"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {managers.map(manager => (
                  <Option key={manager.id} value={manager.id}>
                    {manager.first_name} {manager.last_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Title level={4} style={{ marginTop: 24 }}>Statut et rôles</Title>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="is_active"
              label="Actif"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="is_hr"
              label="Rôle RH"
              valuePropName="checked"
              tooltip="L'employé a un rôle RH et peut approuver les demandes RH"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="is_finance"
              label="Rôle Finance"
              valuePropName="checked"
              tooltip="L'employé a un rôle finance et peut approuver les demandes financières"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEditMode ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button onClick={() => navigate('/hr/employees')}>
              Annuler
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default EmployeeForm;
