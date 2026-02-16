// src/components/payroll/forms/index.js
import React from 'react';
import { Form, Input, Button, Card, DatePicker, Select, InputNumber, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import moment from 'moment';

const { Option } = Select;

// Formulaire pour les périodes de paie
export const PayrollPeriodForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [initialValues, setInitialValues] = React.useState({});

  React.useEffect(() => {
    if (id) {
      setLoading(true);
      axios.get(`/api/payroll/periods/${id}/`)
        .then(response => {
          const data = response.data;
          setInitialValues({
            ...data,
            start_date: data.start_date ? moment(data.start_date) : null,
            end_date: data.end_date ? moment(data.end_date) : null
          });
          form.setFieldsValue({
            ...data,
            start_date: data.start_date ? moment(data.start_date) : null,
            end_date: data.end_date ? moment(data.end_date) : null
          });
          setLoading(false);
        })
        .catch(error => {
          console.error('Erreur lors du chargement de la période:', error);
          message.error('Erreur lors du chargement de la période');
          setLoading(false);
        });
    }
  }, [id, form]);

  const onFinish = (values) => {
    setLoading(true);
    const formattedValues = {
      ...values,
      start_date: values.start_date.format('YYYY-MM-DD'),
      end_date: values.end_date.format('YYYY-MM-DD')
    };

    const request = id
      ? axios.put(`/api/payroll/periods/${id}/`, formattedValues)
      : axios.post('/api/payroll/periods/', formattedValues);

    request
      .then(response => {
        message.success(`Période de paie ${id ? 'modifiée' : 'créée'} avec succès`);
        navigate('/payroll/periods');
      })
      .catch(error => {
        console.error('Erreur lors de l\'enregistrement de la période:', error);
        message.error('Erreur lors de l\'enregistrement de la période');
        setLoading(false);
      });
  };

  return (
    <Card title={id ? "Modifier la période de paie" : "Nouvelle période de paie"} loading={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={initialValues}
      >
        <Form.Item
          name="name"
          label="Nom"
          rules={[{ required: true, message: 'Veuillez saisir le nom de la période' }]}
        >
          <Input placeholder="Ex: Mai 2025" />
        </Form.Item>

        <Form.Item
          name="start_date"
          label="Date de début"
          rules={[{ required: true, message: 'Veuillez sélectionner la date de début' }]}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="end_date"
          label="Date de fin"
          rules={[{ required: true, message: 'Veuillez sélectionner la date de fin' }]}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="is_closed"
          label="Clôturée"
          valuePropName="checked"
        >
          <Select>
            <Option value={false}>Non</Option>
            <Option value={true}>Oui</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {id ? "Modifier" : "Créer"}
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/payroll/periods')}>
            Annuler
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

// Formulaire pour les lancements de paie
export const PayrollRunForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [periods, setPeriods] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [initialValues, setInitialValues] = React.useState({});

  React.useEffect(() => {
    // Charger les périodes
    axios.get('/api/payroll/periods/')
      .then(response => {
        setPeriods(response.data.results || []);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des périodes:', error);
        message.error('Erreur lors du chargement des périodes');
      });

    // Charger les départements
    axios.get('/api/hr/departments/')
      .then(response => {
        setDepartments(response.data.results || []);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des départements:', error);
        message.error('Erreur lors du chargement des départements');
      });

    // Charger les données du lancement si en mode édition
    if (id) {
      setLoading(true);
      axios.get(`/api/payroll/payroll-runs/${id}/`)
        .then(response => {
          const data = response.data;
          setInitialValues(data);
          form.setFieldsValue(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Erreur lors du chargement du lancement:', error);
          message.error('Erreur lors du chargement du lancement');
          setLoading(false);
        });
    }
  }, [id, form]);

  const onFinish = (values) => {
    setLoading(true);

    const request = id
      ? axios.put(`/api/payroll/payroll-runs/${id}/`, values)
      : axios.post('/api/payroll/payroll-runs/', values);

    request
      .then(response => {
        message.success(`Lancement de paie ${id ? 'modifié' : 'créé'} avec succès`);
        navigate('/payroll/runs');
      })
      .catch(error => {
        console.error('Erreur lors de l\'enregistrement du lancement:', error);
        message.error('Erreur lors de l\'enregistrement du lancement');
        setLoading(false);
      });
  };

  return (
    <Card title={id ? "Modifier le lancement de paie" : "Nouveau lancement de paie"} loading={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={initialValues}
      >
        <Form.Item
          name="period"
          label="Période"
          rules={[{ required: true, message: 'Veuillez sélectionner la période' }]}
        >
          <Select placeholder="Sélectionner la période">
            {periods.map(period => (
              <Option key={period.id} value={period.id}>{period.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="name"
          label="Nom"
          rules={[{ required: true, message: 'Veuillez saisir le nom du lancement' }]}
        >
          <Input placeholder="Ex: Paie Mai 2025 - Tous les départements" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea rows={4} placeholder="Description du lancement de paie" />
        </Form.Item>

        <Form.Item
          name="department"
          label="Département"
        >
          <Select placeholder="Tous les départements" allowClear>
            {departments.map(dept => (
              <Option key={dept.id} value={dept.id}>{dept.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {id ? "Modifier" : "Créer"}
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/payroll/runs')}>
            Annuler
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

// Formulaire pour les données de paie des employés
export const EmployeePayrollForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [employees, setEmployees] = React.useState([]);
  const [contractTypes, setContractTypes] = React.useState([]);
  const [initialValues, setInitialValues] = React.useState({});

  React.useEffect(() => {
    // Charger les employés
    axios.get('/api/hr/employees/')
      .then(response => {
        setEmployees(response.data.results || []);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des employés:', error);
        message.error('Erreur lors du chargement des employés');
      });

    // Charger les types de contrat
    axios.get('/api/payroll/contract-types/')
      .then(response => {
        setContractTypes(response.data.results || []);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des types de contrat:', error);
        message.error('Erreur lors du chargement des types de contrat');
      });

    // Charger les données si en mode édition
    if (id) {
      setLoading(true);
      axios.get(`/api/payroll/employee-payrolls/${id}/`)
        .then(response => {
          const data = response.data;
          setInitialValues(data);
          form.setFieldsValue(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Erreur lors du chargement des données de paie:', error);
          message.error('Erreur lors du chargement des données de paie');
          setLoading(false);
        });
    }
  }, [id, form]);

  const onFinish = (values) => {
    setLoading(true);

    const request = id
      ? axios.put(`/api/payroll/employee-payrolls/${id}/`, values)
      : axios.post('/api/payroll/employee-payrolls/', values);

    request
      .then(response => {
        message.success(`Données de paie ${id ? 'modifiées' : 'créées'} avec succès`);
        navigate('/payroll/employee-payrolls');
      })
      .catch(error => {
        console.error('Erreur lors de l\'enregistrement des données de paie:', error);
        message.error('Erreur lors de l\'enregistrement des données de paie');
        setLoading(false);
      });
  };

  return (
    <Card title={id ? "Modifier les données de paie" : "Nouvelles données de paie"} loading={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={initialValues}
      >
        <Form.Item
          name="employee"
          label="Employé"
          rules={[{ required: true, message: 'Veuillez sélectionner l\'employé' }]}
        >
          <Select placeholder="Sélectionner l'employé">
            {employees.map(emp => (
              <Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="contract_type"
          label="Type de contrat"
          rules={[{ required: true, message: 'Veuillez sélectionner le type de contrat' }]}
        >
          <Select placeholder="Sélectionner le type de contrat">
            {contractTypes.map(ct => (
              <Option key={ct.id} value={ct.id}>{ct.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="base_salary"
          label="Salaire de base"
          rules={[{ required: true, message: 'Veuillez saisir le salaire de base' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={100}
            formatter={value => `${value} MAD`}
            parser={value => value.replace(' MAD', '')}
          />
        </Form.Item>

        <Form.Item
          name="hourly_rate"
          label="Taux horaire"
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={1}
            formatter={value => `${value} MAD/h`}
            parser={value => value.replace(' MAD/h', '')}
          />
        </Form.Item>

        <Form.Item
          name="cnss_number"
          label="Numéro CNSS"
        >
          <Input placeholder="Numéro CNSS" />
        </Form.Item>

        <Form.Item
          name="bank_account"
          label="Compte bancaire"
        >
          <Input placeholder="Numéro de compte bancaire" />
        </Form.Item>

        <Form.Item
          name="bank_name"
          label="Banque"
        >
          <Input placeholder="Nom de la banque" />
        </Form.Item>

        <Form.Item
          name="payment_method"
          label="Méthode de paiement"
          rules={[{ required: true, message: 'Veuillez sélectionner la méthode de paiement' }]}
        >
          <Select placeholder="Sélectionner la méthode de paiement">
            <Option value="bank_transfer">Virement bancaire</Option>
            <Option value="check">Chèque</Option>
            <Option value="cash">Espèces</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="transport_allowance"
          label="Indemnité de transport"
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={100}
            formatter={value => `${value} MAD`}
            parser={value => value.replace(' MAD', '')}
          />
        </Form.Item>

        <Form.Item
          name="meal_allowance"
          label="Prime de panier"
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={100}
            formatter={value => `${value} MAD`}
            parser={value => value.replace(' MAD', '')}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {id ? "Modifier" : "Créer"}
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/payroll/employee-payrolls')}>
            Annuler
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

// Formulaire pour les acomptes
export const AdvanceSalaryForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [employees, setEmployees] = React.useState([]);
  const [periods, setPeriods] = React.useState([]);
  const [initialValues, setInitialValues] = React.useState({});

  React.useEffect(() => {
    // Charger les employés
    axios.get('/api/hr/employees/')
      .then(response => {
        setEmployees(response.data.results || []);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des employés:', error);
        message.error('Erreur lors du chargement des employés');
      });

    // Charger les périodes
    axios.get('/api/payroll/periods/')
      .then(response => {
        setPeriods(response.data.results || []);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des périodes:', error);
        message.error('Erreur lors du chargement des périodes');
      });

    // Charger les données si en mode édition
    if (id) {
      setLoading(true);
      axios.get(`/api/payroll/advances/${id}/`)
        .then(response => {
          const data = response.data;
          setInitialValues({
            ...data,
            payment_date: data.payment_date ? moment(data.payment_date) : null
          });
          form.setFieldsValue({
            ...data,
            payment_date: data.payment_date ? moment(data.payment_date) : null
          });
          setLoading(false);
        })
        .catch(error => {
          console.error('Erreur lors du chargement de l\'acompte:', error);
          message.error('Erreur lors du chargement de l\'acompte');
          setLoading(false);
        });
    }
  }, [id, form]);

  const onFinish = (values) => {
    setLoading(true);
    const formattedValues = {
      ...values,
      payment_date: values.payment_date.format('YYYY-MM-DD')
    };

    const request = id
      ? axios.put(`/api/payroll/advances/${id}/`, formattedValues)
      : axios.post('/api/payroll/advances/', formattedValues);

    request
      .then(response => {
        message.success(`Acompte ${id ? 'modifié' : 'créé'} avec succès`);
        navigate('/payroll/advances');
      })
      .catch(error => {
        console.error('Erreur lors de l\'enregistrement de l\'acompte:', error);
        message.error('Erreur lors de l\'enregistrement de l\'acompte');
        setLoading(false);
      });
  };

  return (
    <Card title={id ? "Modifier l'acompte" : "Nouvel acompte"} loading={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={initialValues}
      >
        <Form.Item
          name="employee"
          label="Employé"
          rules={[{ required: true, message: 'Veuillez sélectionner l\'employé' }]}
        >
          <Select placeholder="Sélectionner l'employé">
            {employees.map(emp => (
              <Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="period"
          label="Période"
          rules={[{ required: true, message: 'Veuillez sélectionner la période' }]}
        >
          <Select placeholder="Sélectionner la période">
            {periods.map(period => (
              <Option key={period.id} value={period.id}>{period.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Montant"
          rules={[{ required: true, message: 'Veuillez saisir le montant' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={100}
            formatter={value => `${value} MAD`}
            parser={value => value.replace(' MAD', '')}
          />
        </Form.Item>

        <Form.Item
          name="payment_date"
          label="Date de paiement"
          rules={[{ required: true, message: 'Veuillez sélectionner la date de paiement' }]}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="is_paid"
          label="Payé"
          valuePropName="checked"
        >
          <Select defaultValue={false}>
            <Option value={false}>Non</Option>
            <Option value={true}>Oui</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <Input.TextArea rows={4} placeholder="Notes supplémentaires" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {id ? "Modifier" : "Créer"}
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/payroll/advances')}>
            Annuler
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
