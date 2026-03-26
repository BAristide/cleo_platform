// src/components/payroll/forms/index.js
import React from 'react';
import {
  Form, Input, Button, Card, DatePicker, Select, InputNumber,
  message, Divider, Row, Col, Typography, Tag,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import moment from 'moment';
import { useCurrency } from '../../../context/CurrencyContext';

const { Option } = Select;
const { Text } = Typography;

// ─── Formulaire Périodes de paie ─────────────────────────────────────────────

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
            end_date: data.end_date ? moment(data.end_date) : null,
          });
          form.setFieldsValue({
            ...data,
            start_date: data.start_date ? moment(data.start_date) : null,
            end_date: data.end_date ? moment(data.end_date) : null,
          });
          setLoading(false);
        })
        .catch(() => {
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
      end_date: values.end_date.format('YYYY-MM-DD'),
    };
    const request = id
      ? axios.put(`/api/payroll/periods/${id}/`, formattedValues)
      : axios.post('/api/payroll/periods/', formattedValues);
    request
      .then(() => {
        message.success(`Période de paie ${id ? 'modifiée' : 'créée'} avec succès`);
        navigate('/payroll/periods');
      })
      .catch(() => {
        message.error("Erreur lors de l'enregistrement de la période");
        setLoading(false);
      });
  };

  return (
    <Card title={id ? 'Modifier la période de paie' : 'Nouvelle période de paie'} loading={loading}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialValues}>
        <Form.Item name="name" label="Nom"
          rules={[{ required: true, message: 'Veuillez saisir le nom de la période' }]}>
          <Input placeholder="Ex: Mai 2025" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="start_date" label="Date de début"
              rules={[{ required: true, message: 'Veuillez sélectionner la date de début' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="end_date" label="Date de fin"
              rules={[{ required: true, message: 'Veuillez sélectionner la date de fin' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="is_closed" label="Clôturée" valuePropName="checked">
          <Select>
            <Option value={false}>Non</Option>
            <Option value={true}>Oui</Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {id ? 'Modifier' : 'Créer'}
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/payroll/periods')}>
            Annuler
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

// ─── Formulaire Lancements de paie ───────────────────────────────────────────

export const PayrollRunForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [periods, setPeriods] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);

  React.useEffect(() => {
    axios.get('/api/payroll/periods/')
      .then(r => setPeriods(r.data.results || []))
      .catch(() => message.error('Erreur lors du chargement des périodes'));

    axios.get('/api/hr/departments/')
      .then(r => setDepartments(r.data.results || []))
      .catch(() => message.error('Erreur lors du chargement des départements'));

    if (id) {
      setLoading(true);
      axios.get(`/api/payroll/payroll-runs/${id}/`)
        .then(r => { form.setFieldsValue(r.data); setLoading(false); })
        .catch(() => { message.error('Erreur lors du chargement du lancement'); setLoading(false); });
    }
  }, [id, form]);

  const onFinish = (values) => {
    setLoading(true);
    const request = id
      ? axios.put(`/api/payroll/payroll-runs/${id}/`, values)
      : axios.post('/api/payroll/payroll-runs/', values);
    request
      .then(() => { message.success(`Lancement ${id ? 'modifié' : 'créé'} avec succès`); navigate('/payroll/runs'); })
      .catch(() => { message.error("Erreur lors de l'enregistrement"); setLoading(false); });
  };

  return (
    <Card title={id ? 'Modifier le lancement de paie' : 'Nouveau lancement de paie'} loading={loading}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="period" label="Période"
              rules={[{ required: true, message: 'Veuillez sélectionner la période' }]}>
              <Select placeholder="Sélectionner la période">
                {periods.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="department" label="Département">
              <Select placeholder="Tous les départements" allowClear>
                {departments.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="name" label="Nom"
          rules={[{ required: true, message: 'Veuillez saisir le nom du lancement' }]}>
          <Input placeholder="Ex: Paie Mai 2025 - Tous les départements" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Description du lancement de paie" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>{id ? 'Modifier' : 'Créer'}</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/payroll/runs')}>Annuler</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

// ─── Formulaire Données de paie employé ──────────────────────────────────────

export const EmployeePayrollForm = () => {
  const { currencySymbol } = useCurrency();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [employees, setEmployees] = React.useState([]);
  const [contractTypes, setContractTypes] = React.useState([]);
  const [allowanceComponents, setAllowanceComponents] = React.useState([]);
  const [allowances, setAllowances] = React.useState([]);
  // Infos RH en lecture seule de l'employé sélectionné
  const [employeeInfo, setEmployeeInfo] = React.useState(null);

  const maritalLabels = {
    single: 'Célibataire',
    married: 'Marié(e)',
    divorced: 'Divorcé(e)',
    widowed: 'Veuf/Veuve',
  };

  React.useEffect(() => {
    axios.get('/api/hr/employees/')
      .then(r => setEmployees(r.data.results || []))
      .catch(() => message.error('Erreur lors du chargement des employés'));

    axios.get('/api/payroll/contract-types/')
      .then(r => setContractTypes(r.data.results || []))
      .catch(() => message.error('Erreur lors du chargement des types de contrat'));

    const systemCodes = ['SALBASE', 'HS25', 'HS50', 'HS100', 'ANCIENNETE', 'TRANSPORT', 'REPAS', 'ACOMPTE', 'CNSS_EMP', 'AMO_EMP', 'IR'];
    axios.get('/api/payroll/components/?is_active=true')
      .then(r => {
        const all = r.data.results || r.data || [];
        setAllowanceComponents(
          all.filter(c =>
            (c.component_type === 'brut' || c.component_type === 'non_soumise') &&
            !systemCodes.includes(c.code)
          )
        );
      })
      .catch(() => {});

    if (id) {
      setLoading(true);
      axios.get(`/api/payroll/employee-payrolls/${id}/`)
        .then(r => {
          const data = r.data;
          form.setFieldsValue(data);
          if (data.allowances) {
            setAllowances(data.allowances.map((a, i) => ({
              key: i, id: a.id, component: a.component,
              amount: a.amount, is_active: a.is_active,
            })));
          }
          // Charger les infos RH de l'employé
          if (data.employee) {
            loadEmployeeInfo(data.employee);
          }
          setLoading(false);
        })
        .catch(() => { message.error('Erreur lors du chargement'); setLoading(false); });
    }
  }, [id, form]);

  const loadEmployeeInfo = (empId) => {
    if (!empId) { setEmployeeInfo(null); return; }
    axios.get(`/api/hr/employees/${empId}/`)
      .then(r => setEmployeeInfo(r.data))
      .catch(() => setEmployeeInfo(null));
  };

  const handleEmployeeChange = (empId) => {
    loadEmployeeInfo(empId);
    // Pré-remplir le type de contrat si l'employé en a un
    if (empId) {
      const emp = employees.find(e => e.id === empId);
      if (emp && emp.contract_type) {
        form.setFieldValue('contract_type', emp.contract_type);
      }
    } else {
      setEmployeeInfo(null);
    }
  };

  const addAllowance = () =>
    setAllowances([...allowances, { key: Date.now(), id: null, component: null, amount: 0, is_active: true }]);

  const removeAllowance = (key) => {
    const toRemove = allowances.find(a => a.key === key);
    if (toRemove?.id) {
      axios.delete(`/api/payroll/employee-allowances/${toRemove.id}/`).catch(console.error);
    }
    setAllowances(allowances.filter(a => a.key !== key));
  };

  const updateAllowance = (key, field, value) =>
    setAllowances(allowances.map(a => a.key === key ? { ...a, [field]: value } : a));

  const saveAllowances = async (epId) => {
    for (const alloc of allowances) {
      if (!alloc.component || !alloc.amount) continue;
      const payload = {
        employee_payroll: epId, component: alloc.component,
        amount: alloc.amount, is_active: alloc.is_active !== false,
      };
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
      message.success(`Données de paie ${id ? 'modifiées' : 'créées'} avec succès`);
      navigate('/payroll/employee-payrolls');
    } catch (error) {
      message.error("Erreur lors de l'enregistrement des données de paie");
      setLoading(false);
    }
  };

  const sectionTitle = (title) => (
    <div style={{
      fontSize: 13, fontWeight: 600, color: '#64748B',
      textTransform: 'uppercase', letterSpacing: '0.3px',
      borderBottom: '1px solid #E5E7EB', paddingBottom: 8, marginBottom: 16,
    }}>
      {title}
    </div>
  );

  return (
    <Card
      title={id ? 'Modifier les données de paie' : 'Nouvelles données de paie'}
      loading={loading}
      style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} scrollToFirstError>

        {/* ── Section 1 : Contrat & Salaire ───────────────── */}
        {sectionTitle('Contrat & Salaire')}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="employee" label="Employé"
              rules={[{ required: true, message: "Veuillez sélectionner l'employé" }]}>
              <Select
                showSearch placeholder="Sélectionner un employé"
                optionFilterProp="children" allowClear
                onChange={handleEmployeeChange}
                disabled={Boolean(id)}
              >
                {employees.map(emp => (
                  <Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="contract_type" label="Type de contrat"
              rules={[{ required: true, message: 'Veuillez sélectionner le type de contrat' }]}>
              <Select showSearch placeholder="Sélectionner" optionFilterProp="children" allowClear>
                {contractTypes.map(ct => <Option key={ct.id} value={ct.id}>{ct.name}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="base_salary" label="Salaire de base"
              rules={[{ required: true, message: 'Veuillez saisir le salaire de base' }]}>
              <InputNumber style={{ width: '100%' }} min={0} step={100}
                formatter={v => `${v} ${currencySymbol}`}
                parser={v => v.replace(/[^\d.-]/g, '')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="hourly_rate" label="Taux horaire">
              <InputNumber style={{ width: '100%' }} min={0} step={1}
                formatter={v => `${v} ${currencySymbol}/h`}
                parser={v => v.replace(/[^\d.-]/g, '')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="monthly_hours" label="Horaire mensuel">
              <InputNumber style={{ width: '100%' }} min={0} step={0.01}
                addonAfter="h" placeholder="Ex: 173.33" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Section 2 : Infos RH (lecture seule) ────────── */}
        {employeeInfo && (
          <>
            {sectionTitle('Informations RH (depuis le dossier employé)')}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} md={8}>
                <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', border: '1px solid #E5E7EB' }}>
                  <Text style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 4 }}>
                    SITUATION MATRIMONIALE
                  </Text>
                  <Text strong style={{ color: '#0F172A' }}>
                    {maritalLabels[employeeInfo.marital_status] || employeeInfo.marital_status || '—'}
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', border: '1px solid #E5E7EB' }}>
                  <Text style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 4 }}>
                    ENFANTS À CHARGE
                  </Text>
                  <Text strong style={{ color: '#0F172A' }}>
                    {employeeInfo.dependent_children ?? 0}
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', border: '1px solid #E5E7EB' }}>
                  <Text style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 4 }}>
                    DATE D'EMBAUCHE
                  </Text>
                  <Text strong style={{ color: '#0F172A' }}>
                    {employeeInfo.hire_date
                      ? new Date(employeeInfo.hire_date).toLocaleDateString('fr-FR')
                      : '—'}
                  </Text>
                </div>
              </Col>
            </Row>
          </>
        )}

        {/* ── Section 3 : Coordonnées bancaires ───────────── */}
        {sectionTitle('Coordonnées bancaires & Paiement')}
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="cnss_number" label="N° immatriculation sociale">
              <Input placeholder="Numéro CNSS / IPRES / CNSS selon le pays" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="payment_method" label="Méthode de paiement"
              rules={[{ required: true, message: 'Veuillez sélectionner la méthode de paiement' }]}>
              <Select placeholder="Sélectionner">
                <Option value="bank_transfer">Virement bancaire</Option>
                <Option value="check">Chèque</Option>
                <Option value="cash">Espèces</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="bank_name" label="Banque">
              <Input placeholder="Nom de la banque" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="bank_account" label="N° compte bancaire">
              <Input placeholder="Numéro de compte" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="bank_swift" label="Code SWIFT">
              <Input placeholder="Code SWIFT / BIC" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Section 4 : Classification professionnelle ──── */}
        {sectionTitle('Classification professionnelle')}
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="professional_category" label="Catégorie professionnelle">
              <Input placeholder="Ex: Cadre, Agent de maîtrise, P.18" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="coefficient" label="Coefficient">
              <InputNumber style={{ width: '100%' }} min={0} step={1} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="echelon" label="Échelon">
              <Input placeholder="Ex: E1, E2" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="indice" label="Indice">
              <InputNumber style={{ width: '100%' }} min={0} step={1} />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name="collective_agreement" label="Convention collective">
              <Input placeholder="Ex: Convention Collective Interprofessionnelle" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Section 5 : Indemnités fixes ────────────────── */}
        {sectionTitle('Indemnités fixes')}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="transport_allowance" label="Indemnité de transport">
              <InputNumber style={{ width: '100%' }} min={0} step={100}
                formatter={v => `${v} ${currencySymbol}`}
                parser={v => v.replace(/[^\d.-]/g, '')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="meal_allowance" label="Prime de panier">
              <InputNumber style={{ width: '100%' }} min={0} step={100}
                formatter={v => `${v} ${currencySymbol}`}
                parser={v => v.replace(/[^\d.-]/g, '')} />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Section 6 : Primes & Indemnités dynamiques ──── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {sectionTitle('Primes & Indemnités additionnelles')}
          <Button type="dashed" size="small" onClick={addAllowance}
            style={{ borderColor: '#10B981', color: '#10B981', marginTop: -8 }}>
            + Ajouter
          </Button>
        </div>

        {allowances.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '16px', color: '#94A3B8',
            background: '#F8FAFC', borderRadius: 8, border: '1px dashed #E5E7EB',
            marginBottom: 24,
          }}>
            Aucune prime configurée. Cliquez sur "+ Ajouter" pour en ajouter.
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <Row gutter={8} style={{ marginBottom: 8 }}>
              <Col span={10}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Composant
                </Text>
              </Col>
              <Col span={10}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Montant
                </Text>
              </Col>
              <Col span={3} style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Actif
                </Text>
              </Col>
              <Col span={1} />
            </Row>
            {allowances.map(alloc => (
              <Row key={alloc.key} gutter={8} style={{ marginBottom: 8, alignItems: 'center' }}>
                <Col span={10}>
                  <Select style={{ width: '100%' }} value={alloc.component}
                    onChange={v => updateAllowance(alloc.key, 'component', v)}
                    placeholder="Sélectionner">
                    {allowanceComponents.map(c => (
                      <Option key={c.id} value={c.id}>{c.name}</Option>
                    ))}
                  </Select>
                </Col>
                <Col span={10}>
                  <InputNumber style={{ width: '100%' }} min={0} step={1000}
                    value={alloc.amount}
                    onChange={v => updateAllowance(alloc.key, 'amount', v)}
                    formatter={v => `${v} ${currencySymbol}`}
                    parser={v => v.replace(/[^\d.-]/g, '')} />
                </Col>
                <Col span={3} style={{ textAlign: 'center' }}>
                  <input type="checkbox"
                    checked={alloc.is_active !== false}
                    onChange={e => updateAllowance(alloc.key, 'is_active', e.target.checked)} />
                </Col>
                <Col span={1}>
                  <Button type="link" danger size="small"
                    onClick={() => removeAllowance(alloc.key)}>✕</Button>
                </Col>
              </Row>
            ))}
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────── */}
        <Divider style={{ margin: '8px 0 20px' }} />
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={loading}
            style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8, marginRight: 8 }}>
            {id ? 'Modifier' : 'Créer'}
          </Button>
          <Button onClick={() => navigate('/payroll/employee-payrolls')} style={{ borderRadius: 8 }}>
            Annuler
          </Button>
        </Form.Item>

      </Form>
    </Card>
  );
};

// ─── Formulaire Acomptes sur salaire ─────────────────────────────────────────

export const AdvanceSalaryForm = () => {
  const { currencySymbol } = useCurrency();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [employees, setEmployees] = React.useState([]);
  const [periods, setPeriods] = React.useState([]);

  React.useEffect(() => {
    axios.get('/api/hr/employees/')
      .then(r => setEmployees(r.data.results || []))
      .catch(() => message.error('Erreur lors du chargement des employés'));

    axios.get('/api/payroll/periods/')
      .then(r => setPeriods(r.data.results || []))
      .catch(() => message.error('Erreur lors du chargement des périodes'));

    if (id) {
      setLoading(true);
      axios.get(`/api/payroll/advances/${id}/`)
        .then(r => {
          const data = r.data;
          form.setFieldsValue({
            ...data,
            payment_date: data.payment_date ? moment(data.payment_date) : null,
          });
          setLoading(false);
        })
        .catch(() => { message.error("Erreur lors du chargement de l'acompte"); setLoading(false); });
    }
  }, [id, form]);

  const onFinish = (values) => {
    setLoading(true);
    const formattedValues = { ...values, payment_date: values.payment_date.format('YYYY-MM-DD') };
    const request = id
      ? axios.put(`/api/payroll/advances/${id}/`, formattedValues)
      : axios.post('/api/payroll/advances/', formattedValues);
    request
      .then(() => { message.success(`Acompte ${id ? 'modifié' : 'créé'} avec succès`); navigate('/payroll/advances'); })
      .catch(() => { message.error("Erreur lors de l'enregistrement de l'acompte"); setLoading(false); });
  };

  return (
    <Card title={id ? "Modifier l'acompte" : 'Nouvel acompte'} loading={loading}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="employee" label="Employé"
              rules={[{ required: true, message: "Veuillez sélectionner l'employé" }]}>
              <Select showSearch placeholder="Sélectionner un employé" optionFilterProp="children" allowClear>
                {employees.map(emp => (
                  <Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="period" label="Période"
              rules={[{ required: true, message: 'Veuillez sélectionner la période' }]}>
              <Select placeholder="Sélectionner la période">
                {periods.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="amount" label="Montant"
              rules={[{ required: true, message: 'Veuillez saisir le montant' }]}>
              <InputNumber style={{ width: '100%' }} min={0} step={100}
                formatter={v => `${v} ${currencySymbol}`}
                parser={v => v.replace(/[^\d.-]/g, '')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="payment_date" label="Date de paiement"
              rules={[{ required: true, message: 'Veuillez sélectionner la date' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="is_paid" label="Statut">
              <Select defaultValue={false}>
                <Option value={false}>Non payé</Option>
                <Option value={true}>Payé</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} placeholder="Notes supplémentaires" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}
            style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8, marginRight: 8 }}>
            {id ? 'Modifier' : 'Créer'}
          </Button>
          <Button onClick={() => navigate('/payroll/advances')} style={{ borderRadius: 8 }}>Annuler</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
