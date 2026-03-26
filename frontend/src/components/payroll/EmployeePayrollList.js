// src/components/payroll/EmployeePayrollList.js
import React, { useState, useEffect } from 'react';
import {
  Table, Card, Button, Space, Tag, Typography,
  message, Popconfirm, Spin, Input, Select, Modal,
  InputNumber, Form, Row, Col
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  TeamOutlined, GiftOutlined, CalendarOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';
import { useCurrency } from '../../context/CurrencyContext';
import usePayrollLabels from '../../hooks/usePayrollLabels';

const { Title } = Typography;
const { Option } = Select;

const paymentMethodDisplay = {
  bank_transfer: 'Virement bancaire',
  check: 'Chèque',
  cash: 'Espèces'
};

const maritalLabels = {
  single: 'Célibataire',
  married: 'Marié(e)',
  divorced: 'Divorcé(e)',
  widowed: 'Veuf/Veuve',
};

const EmployeePayrollList = () => {
  const { currencySymbol, currencyCode } = useCurrency();
  const labels = usePayrollLabels();
  const [employeePayrolls, setEmployeePayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    contract_type: null,
    payment_method: null
  });
  const [contractTypes, setContractTypes] = useState([]);
  const navigate = useNavigate();

  // ── Modales ─────────────────────────────────────
  const [familyModal, setFamilyModal] = useState({ open: false, record: null });
  const [familyForm] = Form.useForm();

  const [primeModal, setPrimeModal] = useState({ open: false, record: null });
  const [primeForm] = Form.useForm();
  const [primeComponents, setPrimeComponents] = useState([]);

  const [leaveModal, setLeaveModal] = useState({ open: false, record: null });
  const [leaveForm] = Form.useForm();
  const [periods, setPeriods] = useState([]);

  useEffect(() => {
    const fetchContractTypes = async () => {
      try {
        const response = await axios.get('/api/payroll/contract-types/');
        if (response.data.results) {
          setContractTypes(response.data.results);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des types de contrat:', error);
      }
    };

    fetchContractTypes();
    fetchData(pagination.current, pagination.pageSize, filters);
  }, []);

  const fetchData = async (page = 1, pageSize = 10, currentFilters = {}) => {
    setLoading(true);
    try {
      let url = `/api/payroll/employee-payrolls/?page=${page}&page_size=${pageSize}`;
      if (currentFilters.search) url += `&search=${currentFilters.search}`;
      if (currentFilters.contract_type) url += `&contract_type=${currentFilters.contract_type}`;
      if (currentFilters.payment_method) url += `&payment_method=${currentFilters.payment_method}`;

      const response = await axios.get(url);
      if (response.data.results) {
        setEmployeePayrolls(response.data.results);
        setPagination(prev => ({ ...prev, current: page, total: response.data.count }));
      } else {
        setEmployeePayrolls([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de paie:', error);
      message.error('Erreur lors du chargement des données de paie');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pag) => {
    fetchData(pag.current, pag.pageSize, filters);
  };

  const handleSearch = value => {
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
    fetchData(1, pagination.pageSize, newFilters);
  };

  const handleContractTypeChange = value => {
    const newFilters = { ...filters, contract_type: value };
    setFilters(newFilters);
    fetchData(1, pagination.pageSize, newFilters);
  };

  const handlePaymentMethodChange = value => {
    const newFilters = { ...filters, payment_method: value };
    setFilters(newFilters);
    fetchData(1, pagination.pageSize, newFilters);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/payroll/employee-payrolls/${id}/`);
      message.success('Données de paie supprimées avec succès');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      handleApiError(error, null, 'Erreur lors de la suppression.');
    }
  };

  // ── Action 1 : Situation familiale ──────────────
  const openFamilyModal = (record) => {
    setFamilyModal({ open: true, record });
    familyForm.setFieldsValue({
      marital_status: record.marital_status || 'single',
      dependent_children: record.dependent_children ?? 0,
    });
  };

  const handleFamilySubmit = async () => {
    try {
      const values = await familyForm.validateFields();
      await axios.post(
        `/api/payroll/employee-payrolls/${familyModal.record.id}/update_family_status/`,
        values
      );
      message.success('Situation familiale mise à jour');
      setFamilyModal({ open: false, record: null });
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      if (error.errorFields) return; // validation frontend
      handleApiError(error, familyForm, 'Erreur lors de la mise à jour.');
    }
  };

  // ── Action 2 : Prime exceptionnelle ─────────────
  const openPrimeModal = async (record) => {
    setPrimeModal({ open: true, record });
    primeForm.resetFields();
    // Charger les composants éligibles (brut ou non_soumise, hors système)
    try {
      const systemCodes = ['SALBASE', 'HS25', 'HS50', 'HS100', 'ANCIENNETE', 'TRANSPORT', 'REPAS', 'ACOMPTE', 'CNSS_EMP', 'CN_EMP', 'AMO_EMP', 'IR'];
      const r = await axios.get('/api/payroll/components/?is_active=true');
      const all = r.data.results || r.data || [];
      setPrimeComponents(
        all.filter(c =>
          (c.component_type === 'brut' || c.component_type === 'non_soumise') &&
          !systemCodes.includes(c.code)
        )
      );
    } catch (error) {
      console.error('Erreur chargement composants:', error);
    }
  };

  const handlePrimeSubmit = async () => {
    try {
      const values = await primeForm.validateFields();
      await axios.post('/api/payroll/employee-allowances/', {
        employee_payroll: primeModal.record.id,
        component: values.component,
        amount: values.amount,
        is_active: true,
      });
      message.success('Prime ajoutée avec succès');
      setPrimeModal({ open: false, record: null });
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      if (error.errorFields) return;
      handleApiError(error, primeForm, "Erreur lors de l'ajout de la prime.");
    }
  };

  // ── Action 3 : Congés période ───────────────────
  const openLeaveModal = async (record) => {
    setLeaveModal({ open: true, record });
    leaveForm.resetFields();
    leaveForm.setFieldsValue({ paid_leave_days: 0, unpaid_leave_days: 0 });
    // Charger les périodes non clôturées
    try {
      const r = await axios.get('/api/payroll/periods/?is_closed=false');
      const list = r.data.results || r.data || [];
      setPeriods(list);
      if (list.length > 0) {
        leaveForm.setFieldValue('period_id', list[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement périodes:', error);
    }
  };

  const handleLeaveSubmit = async () => {
    try {
      const values = await leaveForm.validateFields();
      await axios.post(
        `/api/payroll/employee-payrolls/${leaveModal.record.id}/declare_leave_days/`,
        values
      );
      message.success('Jours de congé déclarés avec succès');
      setLeaveModal({ open: false, record: null });
    } catch (error) {
      if (error.errorFields) return;
      handleApiError(error, leaveForm, 'Erreur lors de la déclaration des congés.');
    }
  };

  // ── Colonnes ────────────────────────────────────
  const columns = [
    {
      title: 'Employé',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (text, record) => <Link to={`/payroll/employee-payrolls/${record.id}`}>{text}</Link>,
      sorter: (a, b) => a.employee_name.localeCompare(b.employee_name),
    },
    {
      title: 'Type de contrat',
      dataIndex: 'contract_type_name',
      key: 'contract_type_name',
    },
    {
      title: 'Salaire de base',
      dataIndex: 'base_salary',
      key: 'base_salary',
      render: value => `${parseFloat(value).toLocaleString()} ${currencySymbol}`,
      sorter: (a, b) => a.base_salary - b.base_salary,
    },
    {
      title: labels.social_number_short,
      dataIndex: 'cnss_number',
      key: 'cnss_number',
    },
    {
      title: 'Banque',
      dataIndex: 'bank_name',
      key: 'bank_name',
    },
    {
      title: 'Méthode de paiement',
      dataIndex: 'payment_method_display',
      key: 'payment_method_display',
    },
    {
      title: 'Indemnité de transport',
      dataIndex: 'transport_allowance',
      key: 'transport_allowance',
      render: value => value ? `${parseFloat(value).toLocaleString()} ${currencySymbol}` : '-',
    },
    {
      title: 'Prime de panier',
      dataIndex: 'meal_allowance',
      key: 'meal_allowance',
      render: value => value ? `${parseFloat(value).toLocaleString()} ${currencySymbol}` : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/payroll/employee-payrolls/${record.id}`)}
            title="Modifier"
          />
          <Button
            icon={<TeamOutlined />}
            size="small"
            onClick={() => openFamilyModal(record)}
            title="Situation familiale"
            style={{ color: '#6366F1', borderColor: '#6366F1' }}
          />
          <Button
            icon={<GiftOutlined />}
            size="small"
            onClick={() => openPrimeModal(record)}
            title="Prime exceptionnelle"
            style={{ color: '#F59E0B', borderColor: '#F59E0B' }}
          />
          <Button
            icon={<CalendarOutlined />}
            size="small"
            onClick={() => openLeaveModal(record)}
            title="Congés période"
            style={{ color: '#10B981', borderColor: '#10B981' }}
          />
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ces données de paie ?"
            onConfirm={() => handleDelete(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              title="Supprimer"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title level={2}>Données de paie des employés</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          <Link to="/payroll/employee-payrolls/new">Nouvelles données de paie</Link>
        </Button>
      </div>

      {/* Filtres */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Input
            placeholder="Rechercher..."
            value={filters.search}
            onChange={e => handleSearch(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
          />
          <Select
            placeholder="Type de contrat"
            style={{ width: 200 }}
            allowClear
            value={filters.contract_type}
            onChange={handleContractTypeChange}
          >
            {contractTypes.map(ct => (
              <Option key={ct.id} value={ct.id}>{ct.name}</Option>
            ))}
          </Select>
          <Select
            placeholder="Méthode de paiement"
            style={{ width: 200 }}
            allowClear
            value={filters.payment_method}
            onChange={handlePaymentMethodChange}
          >
            {Object.entries(paymentMethodDisplay).map(([key, value]) => (
              <Option key={key} value={key}>{value}</Option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={employeePayrolls}
            rowKey="id"
            pagination={pagination}
            onChange={handleTableChange}
          />
        </Spin>
      </Card>

      {/* ── Modale Situation familiale ──────────── */}
      <Modal
        title={`Situation familiale — ${familyModal.record?.employee_name || ''}`}
        open={familyModal.open}
        onCancel={() => setFamilyModal({ open: false, record: null })}
        onOk={handleFamilySubmit}
        okText="Enregistrer"
        cancelText="Annuler"
      >
        <Form form={familyForm} layout="vertical">
          <Form.Item
            name="marital_status"
            label="Statut matrimonial"
            rules={[{ required: true, message: 'Champ requis' }]}
          >
            <Select>
              {Object.entries(maritalLabels).map(([key, label]) => (
                <Option key={key} value={key}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="dependent_children"
            label="Enfants à charge"
            rules={[{ required: true, message: 'Champ requis' }]}
          >
            <InputNumber min={0} max={20} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modale Prime exceptionnelle ─────────── */}
      <Modal
        title={`Prime exceptionnelle — ${primeModal.record?.employee_name || ''}`}
        open={primeModal.open}
        onCancel={() => setPrimeModal({ open: false, record: null })}
        onOk={handlePrimeSubmit}
        okText="Ajouter"
        cancelText="Annuler"
      >
        <Form form={primeForm} layout="vertical">
          <Form.Item
            name="component"
            label="Composant de salaire"
            rules={[{ required: true, message: 'Sélectionnez un composant' }]}
          >
            <Select placeholder="Sélectionner" showSearch optionFilterProp="children">
              {primeComponents.map(c => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="amount"
            label="Montant"
            rules={[{ required: true, message: 'Saisissez le montant' }]}
          >
            <InputNumber
              min={0}
              step={1000}
              style={{ width: '100%' }}
              formatter={v => `${v} ${currencySymbol}`}
              parser={v => v.replace(/[^\d.-]/g, '')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modale Congés période ──────────────── */}
      <Modal
        title={`Congés période — ${leaveModal.record?.employee_name || ''}`}
        open={leaveModal.open}
        onCancel={() => setLeaveModal({ open: false, record: null })}
        onOk={handleLeaveSubmit}
        okText="Déclarer"
        cancelText="Annuler"
      >
        <Form form={leaveForm} layout="vertical">
          <Form.Item
            name="period_id"
            label="Période"
            rules={[{ required: true, message: 'Sélectionnez une période' }]}
          >
            <Select placeholder="Sélectionner la période">
              {periods.map(p => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="paid_leave_days" label="Jours de congés payés">
                <InputNumber min={0} max={30} step={0.5} style={{ width: '100%' }} addonAfter="j" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unpaid_leave_days" label="Jours de congés sans solde">
                <InputNumber min={0} max={30} step={0.5} style={{ width: '100%' }} addonAfter="j" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeePayrollList;
