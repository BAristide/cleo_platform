// src/components/payroll/forms/index.js
import React from 'react';
import { Form, Input, Button, Card, DatePicker, Select, InputNumber, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import moment from 'moment';
import { useCurrency } from '../../../context/CurrencyContext';

const { Option } = Select;

// Formulaire pour les périodes de paie
export const PayrollPeriodForm = () => {
  const { currencySymbol, currencyCode } = useCurrency();
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
  const { currencySymbol } = useCurrency();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [employees, setEmployees] = React.useState([]);
  const [contractTypes, setContractTypes] = React.useState([]);
  const [initialValues, setInitialValues] = React.useState({});
  const [allowanceComponents, setAllowanceComponents] = React.useState([]);
  const [allowances, setAllowances] = React.useState([]);

  React.useEffect(() => {
    axios.get('/api/hr/employees/')
      .then(response => setEmployees(response.data.results || []))
      .catch(error => { console.error('Erreur employes:', error); message.error('Erreur lors du chargement des employes'); });

    axios.get('/api/payroll/contract-types/')
      .then(response => setContractTypes(response.data.results || []))
      .catch(error => { console.error('Erreur contrats:', error); message.error('Erreur lors du chargement des types de contrat'); });

    // Charger les composants de type brut/non_soumise (hors systeme)
    axios.get('/api/payroll/components/?is_active=true')
      .then(response => {
        const all = response.data.results || response.data || [];
        const systemCodes = ['SALBASE', 'HS25', 'HS50', 'HS100', 'ANCIENNETE', 'TRANSPORT', 'REPAS', 'ACOMPTE', 'CNSS_EMP', 'AMO_EMP', 'IR'];
        const filtered = all.filter(c => (c.component_type === 'brut' || c.component_type === 'non_soumise') && !systemCodes.includes(c.code));
        setAllowanceComponents(filtered);
      })
      .catch(() => {});

    if (id) {
      setLoading(true);
      axios.get(`/api/payroll/employee-payrolls/${id}/`)
        .then(response => {
          const data = response.data;
          setInitialValues(data);
          form.setFieldsValue(data);
          if (data.allowances) {
            setAllowances(data.allowances.map((a, i) => ({ key: i, id: a.id, component: a.component, amount: a.amount, is_active: a.is_active })));
          }
          setLoading(false);
        })
        .catch(error => { console.error('Erreur chargement:', error); message.error('Erreur lors du chargement des donnees de paie'); setLoading(false); });
    }
  }, [id, form]);

  const addAllowance = () => {
    setAllowances([...allowances, { key: Date.now(), id: null, component: null, amount: 0, is_active: true }]);
  };

  const removeAllowance = (key) => {
    const toRemove = allowances.find(a => a.key === key);
    if (toRemove && toRemove.id) {
      axios.delete(`/api/payroll/employee-allowances/${toRemove.id}/`).catch(console.error);
    }
    setAllowances(allowances.filter(a => a.key !== key));
  };

  const updateAllowance = (key, field, value) => {
    setAllowances(allowances.map(a => a.key === key ? { ...a, [field]: value } : a));
  };

  const saveAllowances = async (employeePayrollId) => {
    for (const alloc of allowances) {
      if (!alloc.component || !alloc.amount) continue;
      const payload = { employee_payroll: employeePayrollId, component: alloc.component, amount: alloc.amount, is_active: alloc.is_active !== false };
      try {
        if (alloc.id) {
          await axios.put(`/api/payroll/employee-allowances/${alloc.id}/`, payload);
        } else {
          await axios.post('/api/payroll/employee-allowances/', payload);
        }
      } catch (err) { console.error('Erreur sauvegarde prime:', err); }
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      let response;
      if (id) {
        response = await axios.put(`/api/payroll/employee-payrolls/${id}/`, values);
      } else {
        response = await axios.post('/api/payroll/employee-payrolls/', values);
      }
      const epId = response.data.id || id;
      await saveAllowances(epId);
      message.success(`Donnees de paie ${id ? 'modifiees' : 'creees'} avec succes`);
      navigate('/payroll/employee-payrolls');
    } catch (error) {
      console.error('Erreur:', error);
      message.error('Erreur lors de l\'enregistrement des donnees de paie');
      setLoading(false);
    }
  };

  return (
    <Card title={id ? "Modifier les donnees de paie" : "Nouvelles donnees de paie"} loading={loading}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialValues}>
        <Form.Item name="employee" label="Employe" rules={[{ required: true, message: 'Veuillez selectionner l\'employe' }]}>
          <Select placeholder="Selectionner l'employe">
            {employees.map(emp => (<Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Option>))}
          </Select>
        </Form.Item>

        <Form.Item name="contract_type" label="Type de contrat" rules={[{ required: true, message: 'Veuillez selectionner le type de contrat' }]}>
          <Select placeholder="Selectionner le type de contrat">
            {contractTypes.map(ct => (<Option key={ct.id} value={ct.id}>{ct.name}</Option>))}
          </Select>
        </Form.Item>

        <Form.Item name="base_salary" label="Salaire de base" rules={[{ required: true, message: 'Veuillez saisir le salaire de base' }]}>
          <InputNumber style={{ width: '100%' }} min={0} step={100}
            formatter={value => `${value} ${currencySymbol}`}
            parser={value => value.replace(/[^\d.-]/g, '')} />
        </Form.Item>

        <Form.Item name="hourly_rate" label="Taux horaire">
          <InputNumber style={{ width: '100%' }} min={0} step={1}
            formatter={value => `${value} ${currencySymbol}/h`}
            parser={value => value.replace(/[^\d.-]/g, '')} />
        </Form.Item>

        <Form.Item name="cnss_number" label="Numero CNSS">
          <Input placeholder="Numero CNSS" />
        </Form.Item>

        <Form.Item name="bank_account" label="Compte bancaire">
          <Input placeholder="Numero de compte bancaire" />
        </Form.Item>

        <Form.Item name="bank_name" label="Banque">
          <Input placeholder="Nom de la banque" />
        </Form.Item>

        <Form.Item name="payment_method" label="Methode de paiement" rules={[{ required: true, message: 'Veuillez selectionner la methode de paiement' }]}>
          <Select placeholder="Selectionner la methode de paiement">
            <Option value="bank_transfer">Virement bancaire</Option>
            <Option value="check">Cheque</Option>
            <Option value="cash">Especes</Option>
          </Select>
        </Form.Item>

        <Form.Item name="transport_allowance" label="Indemnite de transport">
          <InputNumber style={{ width: '100%' }} min={0} step={100}
            formatter={value => `${value} ${currencySymbol}`}
            parser={value => value.replace(/[^\d.-]/g, '')} />
        </Form.Item>

        <Form.Item name="meal_allowance" label="Prime de panier">
          <InputNumber style={{ width: '100%' }} min={0} step={100}
            formatter={value => `${value} ${currencySymbol}`}
            parser={value => value.replace(/[^\d.-]/g, '')} />
        </Form.Item>

        {/* Section primes et indemnites dynamiques */}
        <Card title="Primes et indemnites" size="small" style={{ marginBottom: 16 }}
          extra={<Button type="dashed" size="small" onClick={addAllowance}>+ Ajouter</Button>}>
          {allowances.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center' }}>Aucune prime configuree. Cliquez sur "+ Ajouter" pour en ajouter.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Composant</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Montant</th>
                  <th style={{ textAlign: 'center', padding: '8px', width: 80 }}>Actif</th>
                  <th style={{ textAlign: 'center', padding: '8px', width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {allowances.map(alloc => (
                  <tr key={alloc.key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '4px 8px' }}>
                      <Select style={{ width: '100%' }} value={alloc.component} onChange={v => updateAllowance(alloc.key, 'component', v)} placeholder="Selectionner">
                        {allowanceComponents.map(c => (<Option key={c.id} value={c.id}>{c.name}</Option>))}
                      </Select>
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <InputNumber style={{ width: '100%' }} min={0} step={1000} value={alloc.amount}
                        onChange={v => updateAllowance(alloc.key, 'amount', v)}
                        formatter={value => `${value} ${currencySymbol}`}
                        parser={value => value.replace(/[^\d.-]/g, '')} />
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                      <input type="checkbox" checked={alloc.is_active !== false} onChange={e => updateAllowance(alloc.key, 'is_active', e.target.checked)} />
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                      <Button type="link" danger size="small" onClick={() => removeAllowance(alloc.key)}>X</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {id ? "Modifier" : "Creer"}
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/payroll/employee-payrolls')}>
            Annuler
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

// Formulaire pour les acomptes};

// Formulaire pour les acomptes
export const AdvanceSalaryForm = () => {
  const { currencySymbol } = useCurrency();
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
            formatter={value => `${value} ${currencySymbol}`}
            parser={value => value.replace(/[^\d.-]/g, '')}
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
