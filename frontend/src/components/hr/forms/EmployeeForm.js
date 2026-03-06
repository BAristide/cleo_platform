// src/components/hr/forms/EmployeeForm.js
import React, { useState, useEffect } from 'react';
import {
  Form, Input, Button, Select, DatePicker, Switch,
  Card, Row, Col, Typography, message, Spin, Space
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';
import dayjs from 'dayjs';

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
        // Promise.allSettled : chaque requête échoue indépendamment
        const [
          departmentsResult,
          jobTitlesResult,
          employeesResult,
          usersResult,
        ] = await Promise.allSettled([
          axios.get('/api/hr/departments/'),
          axios.get('/api/hr/job-titles/'),
          axios.get('/api/hr/employees/'),
          axios.get('/api/users/users/'),  // endpoint correct
        ]);

        if (departmentsResult.status === 'fulfilled') {
          setDepartments(extractResultsFromResponse(departmentsResult.value));
        } else {
          console.error('Départements:', departmentsResult.reason);
          message.warning('Impossible de charger les départements');
        }

        if (jobTitlesResult.status === 'fulfilled') {
          setJobTitles(extractResultsFromResponse(jobTitlesResult.value));
        } else {
          console.error('Postes:', jobTitlesResult.reason);
        }

        if (employeesResult.status === 'fulfilled') {
          setManagers(extractResultsFromResponse(employeesResult.value));
        } else {
          console.error('Employés:', employeesResult.reason);
        }

        if (usersResult.status === 'fulfilled') {
          setUsers(extractResultsFromResponse(usersResult.value));
        } else {
          console.error('Utilisateurs:', usersResult.reason);
          // Non bloquant — le champ utilisateur sera simplement vide
        }

        // En mode édition, charger les données de l'employé
        if (isEditMode) {
          const employeeResponse = await axios.get(`/api/hr/employees/${id}/`);
          const emp = employeeResponse.data;

          // department est un objet imbriqué dans EmployeeDetailSerializer
          const deptId = emp.department ? emp.department.id : null;
          if (deptId) setSelectedDepartment(deptId);

          form.setFieldsValue({
            first_name:        emp.first_name,
            last_name:         emp.last_name,
            email:             emp.email,
            phone:             emp.phone || '',
            address:           emp.address || '',
            birth_date:        emp.birth_date ? dayjs(emp.birth_date) : null,
            hire_date:         emp.hire_date ? dayjs(emp.hire_date) : null,
            employee_id:       emp.employee_id,
            department_id:     deptId,
            job_title_id:      emp.job_title ? emp.job_title.id : null,
            manager_id:        emp.manager ? emp.manager.id : null,
            second_manager_id: emp.second_manager ? emp.second_manager.id : null,
            user_id:           emp.user ? emp.user.id : null,
            is_active:         emp.is_active,
            is_hr:             emp.is_hr,
            is_finance:        emp.is_finance,
          });
        }
      } catch (error) {
        console.error('Erreur chargement formulaire:', error);
        message.error('Erreur lors du chargement du formulaire');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, form, isEditMode]);

  // Filtrer les postes par département sélectionné
  // JobTitleSerializer retourne department comme ID (FK DRF par défaut)
  const filteredJobTitles = selectedDepartment
    ? jobTitles.filter(job => job.department === selectedDepartment)
    : jobTitles;

  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
    form.setFieldsValue({ job_title_id: undefined });
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const formData = {
        ...values,
        hire_date:  values.hire_date  ? values.hire_date.format('YYYY-MM-DD')  : null,
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
      };

      if (isEditMode) {
        await axios.put(`/api/hr/employees/${id}/`, formData);
        message.success('Employé mis à jour avec succès');
        navigate(`/hr/employees/${id}`);
      } else {
        const response = await axios.post('/api/hr/employees/', formData);
        message.success('Employé créé avec succès');
        navigate(`/hr/employees/${response.data.id}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      const detail = error.response?.data;
      const msg = typeof detail === 'object'
        ? Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join(' | ')
        : "Impossible d'enregistrer l'employé";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
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
        initialValues={{ is_active: true, is_hr: false, is_finance: false }}
      >
        <Title level={4}>Informations personnelles</Title>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="first_name" label="Prénom"
              rules={[{ required: true, message: 'Veuillez saisir le prénom' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="last_name" label="Nom"
              rules={[{ required: true, message: 'Veuillez saisir le nom' }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="email" label="Email"
              rules={[
                { required: true, message: "Veuillez saisir l'email" },
                { type: 'email', message: 'Email invalide' },
              ]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label="Téléphone">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="birth_date" label="Date de naissance">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="user_id" label="Utilisateur du système"
              help="Liaison avec un compte utilisateur Django (facultatif)">
              <Select allowClear showSearch placeholder="Sélectionnez un utilisateur"
                optionFilterProp="children">
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.full_name || user.username || user.email}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="address" label="Adresse">
          <TextArea rows={3} />
        </Form.Item>

        <Title level={4} style={{ marginTop: 24 }}>Informations professionnelles</Title>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="employee_id" label="Identifiant employé"
              rules={[{ required: true, message: "Veuillez saisir l'identifiant" }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="hire_date" label="Date d'embauche"
              rules={[{ required: true, message: "Veuillez sélectionner la date d'embauche" }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="department_id" label="Département"
              rules={[{ required: true, message: 'Veuillez sélectionner un département' }]}>
              <Select placeholder="Sélectionnez un département"
                onChange={handleDepartmentChange} showSearch optionFilterProp="children">
                {departments.map(dept => (
                  <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="job_title_id" label="Poste"
              rules={[{ required: true, message: 'Veuillez sélectionner un poste' }]}>
              <Select
                placeholder={selectedDepartment ? 'Sélectionnez un poste' : "Veuillez d'abord sélectionner un département"}
                disabled={!selectedDepartment}
                showSearch optionFilterProp="children">
                {filteredJobTitles.map(job => (
                  <Option key={job.id} value={job.id}>{job.name || job.title}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Title level={4} style={{ marginTop: 24 }}>Hiérarchie</Title>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="manager_id" label="Responsable hiérarchique (N+1)">
              <Select allowClear showSearch placeholder="Sélectionnez un manager"
                optionFilterProp="children">
                {managers.filter(m => !isEditMode || m.id !== parseInt(id)).map(m => (
                  <Option key={m.id} value={m.id}>{m.first_name} {m.last_name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="second_manager_id" label="N+2">
              <Select allowClear showSearch placeholder="Sélectionnez un N+2"
                optionFilterProp="children">
                {managers.filter(m => !isEditMode || m.id !== parseInt(id)).map(m => (
                  <Option key={m.id} value={m.id}>{m.first_name} {m.last_name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Title level={4} style={{ marginTop: 24 }}>Statut et rôles</Title>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="is_active" label="Actif" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="is_hr" label="Rôle RH" valuePropName="checked"
              tooltip="Peut approuver les demandes RH">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="is_finance" label="Rôle Finance" valuePropName="checked"
              tooltip="Peut approuver les demandes financières">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEditMode ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button onClick={() => navigate('/hr/employees')}>Annuler</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default EmployeeForm;
