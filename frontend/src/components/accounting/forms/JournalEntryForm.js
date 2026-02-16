// src/components/accounting/forms/JournalEntryForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Card,
  Typography,
  Divider,
  Table,
  Popconfirm,
  InputNumber,
  Row,
  Col,
  Alert,
  Spin,
  message
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckOutlined,
  WarningOutlined
} from '@ant-design/icons';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const JournalEntryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [totals, setTotals] = useState({ debit: 0, credit: 0, difference: 0 });

  useEffect(() => {
    fetchMasterData();
    if (isEditing) {
      fetchEntryDetails();
    } else {
      // Initialize a new entry with one empty line
      setLines([{
        key: Date.now(),
        account_id: null,
        name: '',
        partner_id: null,
        debit: 0,
        credit: 0,
        date_maturity: null,
        analytic_account_id: null
      }]);
    }
  }, [id]);

  useEffect(() => {
    calculateTotals();
  }, [lines]);

  const fetchMasterData = async () => {
    try {
      const [journalsResponse, accountsResponse, partnersResponse] = await Promise.all([
        axios.get('/api/accounting/journals/'),
        axios.get('/api/accounting/accounts/'),
        axios.get('/api/crm/companies/')
      ]);

      const journalsData = extractResultsFromResponse(journalsResponse);
      const accountsData = extractResultsFromResponse(accountsResponse);
      const partnersData = extractResultsFromResponse(partnersResponse);

      setJournals(journalsData.length > 0 ? journalsData : demoJournals);
      setAccounts(accountsData.length > 0 ? accountsData : demoAccounts);
      setPartners(partnersData.length > 0 ? partnersData : demoPartners);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      // Fallback to demo data
      setJournals(demoJournals);
      setAccounts(demoAccounts);
      setPartners(demoPartners);
    }
  };

  const fetchEntryDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/accounting/journal-entries/${id}/`);
      const entry = response.data;
      
      setSelectedJournal(entry.journal_id);
      
      // Set form values
      form.setFieldsValue({
        journal_id: entry.journal_id,
        date: moment(entry.date),
        ref: entry.ref,
        narration: entry.narration
      });

      // Set lines
      if (entry.lines && entry.lines.length > 0) {
        setLines(entry.lines.map(line => ({
          ...line,
          key: line.id,
          date_maturity: line.date_maturity ? moment(line.date_maturity) : null
        })));
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de l\'écriture:', error);
      setError('Impossible de charger les détails de l\'écriture. Veuillez réessayer plus tard.');
      
      // If API fails, use demo data
      if (demoEntries[id - 1]) {
        const demoEntry = demoEntries[id - 1];
        setSelectedJournal(demoEntry.journal_id);
        
        form.setFieldsValue({
          journal_id: demoEntry.journal_id,
          date: moment(demoEntry.date),
          ref: demoEntry.ref,
          narration: demoEntry.narration
        });

        setLines(demoEntry.lines);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJournalChange = (value) => {
    setSelectedJournal(value);
    
    // Get selected journal
    const journal = journals.find(j => j.id === value);
    
    // If journal has default accounts, add them to first line if it's empty
    if (journal && (journal.default_debit_account_id || journal.default_credit_account_id) && lines.length === 1) {
      const firstLine = lines[0];
      if (!firstLine.account_id && firstLine.debit === 0 && firstLine.credit === 0) {
        const updatedLine = { ...firstLine };
        
        if (journal.default_debit_account_id) {
          updatedLine.account_id = journal.default_debit_account_id;
        }
        
        setLines([updatedLine]);
      }
    }
  };

  const addLine = () => {
    const newLine = {
      key: Date.now(),
      account_id: null,
      name: '',
      partner_id: null,
      debit: 0,
      credit: 0,
      date_maturity: null,
      analytic_account_id: null
    };
    
    setLines([...lines, newLine]);
  };

  const deleteLine = (key) => {
    setLines(lines.filter(line => line.key !== key));
  };

  const updateLine = (key, field, value) => {
    const updatedLines = lines.map(line => {
      if (line.key === key) {
        const updatedLine = { ...line, [field]: value };
        
        // If debit is entered, clear credit and vice versa
        if (field === 'debit' && value > 0) {
          updatedLine.credit = 0;
        } else if (field === 'credit' && value > 0) {
          updatedLine.debit = 0;
        }
        
        return updatedLine;
      }
      return line;
    });
    
    setLines(updatedLines);
  };

  const calculateTotals = () => {
    const debitTotal = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const creditTotal = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    const difference = debitTotal - creditTotal;
    
    setTotals({ debit: debitTotal, credit: creditTotal, difference });
  };

  const validateLines = () => {
    // Check if we have at least 2 lines
    if (lines.length < 2) {
      return { valid: false, message: 'L\'écriture doit contenir au moins 2 lignes.' };
    }
    
    // Check if all lines have an account
    const missingAccount = lines.some(line => !line.account_id);
    if (missingAccount) {
      return { valid: false, message: 'Toutes les lignes doivent avoir un compte comptable.' };
    }
    
    // Check if all lines have either debit or credit
    const invalidAmount = lines.some(line => !line.debit && !line.credit);
    if (invalidAmount) {
      return { valid: false, message: 'Toutes les lignes doivent avoir un montant débit ou crédit.' };
    }
    
    // Check if the entry is balanced
    if (Math.abs(totals.difference) > 0.01) { // Using a small tolerance for rounding errors
      return { valid: false, message: 'L\'écriture n\'est pas équilibrée. La différence est de ' + totals.difference.toFixed(2) + ' MAD.' };
    }
    
    return { valid: true };
  };

  const handleSubmit = async (values) => {
    // Validate lines first
    const validation = validateLines();
    if (!validation.valid) {
      message.error(validation.message);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const entryData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        lines: lines.map(line => ({
          ...line,
          date_maturity: line.date_maturity ? line.date_maturity.format('YYYY-MM-DD') : null,
          // Exclude the "key" field
          key: undefined
        }))
      };
      
      let response;
      if (isEditing) {
        response = await axios.put(`/api/accounting/journal-entries/${id}/`, entryData);
      } else {
        response = await axios.post('/api/accounting/journal-entries/', entryData);
      }
      
      message.success(isEditing ? 'Écriture modifiée avec succès.' : 'Écriture créée avec succès.');
      navigate(`/accounting/entries/${response.data.id || id}`);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'écriture:', error);
      message.error('Erreur lors de l\'enregistrement de l\'écriture. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  // Demo data
  const demoJournals = [
    {
      id: 1,
      code: 'VEN',
      name: 'Journal des ventes',
      type: 'sale',
      default_debit_account_id: 4,
      default_credit_account_id: 9
    },
    {
      id: 2,
      code: 'ACH',
      name: 'Journal des achats',
      type: 'purchase',
      default_debit_account_id: 8,
      default_credit_account_id: 7
    },
    {
      id: 3,
      code: 'BNK',
      name: 'Journal de banque',
      type: 'bank',
      default_debit_account_id: 6,
      default_credit_account_id: null
    },
    {
      id: 5,
      code: 'OD',
      name: 'Opérations diverses',
      type: 'general',
      default_debit_account_id: null,
      default_credit_account_id: null
    }
  ];
  
  const demoAccounts = [
    {
      id: 1,
      code: '101000',
      name: 'Capital',
      type_id: 1,
      type_name: 'Capitaux',
      is_reconcilable: false
    },
    {
      id: 4,
      code: '411000',
      name: 'Clients',
      type_id: 4,
      type_name: 'Créances',
      is_reconcilable: true
    },
    {
      id: 5,
      code: '445650',
      name: 'TVA facturée',
      type_id: 4,
      type_name: 'Créances',
      is_reconcilable: false
    },
    {
      id: 6,
      code: '512000',
      name: 'Banque',
      type_id: 5,
      type_name: 'Trésorerie',
      is_reconcilable: true
    },
    {
      id: 7,
      code: '401000',
      name: 'Fournisseurs',
      type_id: 6,
      type_name: 'Dettes',
      is_reconcilable: true
    },
    {
      id: 8,
      code: '601000',
      name: 'Achats de matières premières',
      type_id: 7,
      type_name: 'Charges',
      is_reconcilable: false
    },
    {
      id: 9,
      code: '701000',
      name: 'Ventes de produits finis',
      type_id: 8,
      type_name: 'Produits',
      is_reconcilable: false
    }
  ];
  
  const demoPartners = [
    { id: 1, name: 'ABC SARL' },
    { id: 2, name: 'XYZ Inc.' },
    { id: 3, name: 'Sofitel' },
    { id: 4, name: 'Fournitures Office SA' },
    { id: 5, name: 'DEF SA' }
  ];
  
  const demoEntries = [
    {
      id: 1,
      name: 'VEN/2025/00125',
      journal_id: 1,
      journal_code: 'VEN',
      date: '2025-05-15',
      ref: 'FACT-2189',
      narration: 'Facture FACT-2189 - Client ABC',
      state: 'draft',
      lines: [
        {
          key: 101,
          account_id: 4,
          name: 'Facture client',
          partner_id: 1,
          debit: 12500,
          credit: 0,
          date_maturity: '2025-06-15'
        },
        {
          key: 102,
          account_id: 5,
          name: 'TVA collectée',
          partner_id: 1,
          debit: 0,
          credit: 2500,
          date_maturity: null
        },
        {
          key: 103,
          account_id: 9,
          name: 'Produit des ventes',
          partner_id: 1,
          debit: 0,
          credit: 10000,
          date_maturity: null
        }
      ]
    },
    {
      id: 4,
      name: 'OD/2025/00054',
      journal_id: 5,
      journal_code: 'OD',
      date: '2025-05-10',
      ref: 'REG-TVA',
      narration: 'Écriture de régularisation TVA',
      state: 'draft',
      lines: [
        {
          key: 401,
          account_id: 5,
          name: 'TVA collectée',
          partner_id: null,
          debit: 4320,
          credit: 0,
          date_maturity: null
        },
        {
          key: 402,
          account_id: 6,
          name: 'Banque',
          partner_id: null,
          debit: 0,
          credit: 4320,
          date_maturity: null
        }
      ]
    }
  ];

  // Table columns for entry lines
  const columns = [
    {
      title: 'Compte',
      dataIndex: 'account_id',
      key: 'account_id',
      width: '25%',
      render: (accountId, record, index) => (
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Sélectionner un compte"
          optionFilterProp="children"
          value={accountId}
          onChange={(value) => updateLine(record.key, 'account_id', value)}
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {accounts.map(account => (
            <Option key={account.id} value={account.id}>
              {account.code} - {account.name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Libellé',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      render: (text, record) => (
        <Input
          placeholder="Libellé"
          value={text}
          onChange={(e) => updateLine(record.key, 'name', e.target.value)}
        />
      ),
    },
    {
      title: 'Partenaire',
      dataIndex: 'partner_id',
      key: 'partner_id',
      width: '15%',
      render: (partnerId, record) => (
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Partenaire"
          optionFilterProp="children"
          value={partnerId}
          allowClear
          onChange={(value) => updateLine(record.key, 'partner_id', value)}
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {partners.map(partner => (
            <Option key={partner.id} value={partner.id}>{partner.name}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Échéance',
      dataIndex: 'date_maturity',
      key: 'date_maturity',
      width: '10%',
      render: (date, record) => (
        <DatePicker
          style={{ width: '100%' }}
          format="DD/MM/YYYY"
          placeholder="Échéance"
          value={date}
          allowClear
          onChange={(value) => updateLine(record.key, 'date_maturity', value)}
        />
      ),
    },
    {
      title: 'Débit',
      dataIndex: 'debit',
      key: 'debit',
      width: '10%',
      render: (text, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          precision={2}
          value={text || 0}
          onChange={(value) => updateLine(record.key, 'debit', value)}
        />
      ),
    },
    {
      title: 'Crédit',
      dataIndex: 'credit',
      key: 'credit',
      width: '10%',
      render: (text, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          precision={2}
          value={text || 0}
          onChange={(value) => updateLine(record.key, 'credit', value)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'action',
      width: '5%',
      render: (_, record) => (
        <Popconfirm
          title="Supprimer cette ligne?"
          onConfirm={() => deleteLine(record.key)}
          okText="Oui"
          cancelText="Non"
          disabled={lines.length <= 1}
        >
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            disabled={lines.length <= 1}
          />
        </Popconfirm>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const isBalanced = Math.abs(totals.difference) < 0.01;

  return (
    <div className="journal-entry-form">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2}>{isEditing ? 'Modifier une écriture' : 'Nouvelle écriture'}</Title>
        <Space>
          <Button onClick={() => navigate(-1)}>Annuler</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={submitting}
            disabled={!isBalanced}
          >
            Enregistrer
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {!isBalanced && (
        <Alert
          message="Écriture non équilibrée"
          description={`La différence entre débit et crédit est de ${totals.difference.toFixed(2)} MAD.`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            date: moment(),
            ref: '',
            narration: ''
          }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="journal_id"
                label="Journal"
                rules={[{ required: true, message: 'Veuillez sélectionner un journal' }]}
              >
                <Select
                  showSearch
                  placeholder="Sélectionner un journal"
                  optionFilterProp="children"
                  onChange={handleJournalChange}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                  disabled={isEditing} // Can't change journal in edit mode
                >
                  {journals.map(journal => (
                    <Option key={journal.id} value={journal.id}>
                      {journal.code} - {journal.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="ref"
                label="Référence"
              >
                <Input placeholder="Référence externe (facture, etc.)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="narration"
            label="Libellé"
            rules={[{ required: true, message: 'Veuillez saisir un libellé' }]}
          >
            <TextArea
              placeholder="Description de l'écriture comptable"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>

          <Divider />
          
          <div style={{ marginBottom: 16 }}>
            <Button
              type="dashed"
              onClick={addLine}
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
            >
              Ajouter une ligne
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={lines}
            pagination={false}
            rowKey="key"
            size="middle"
            scroll={{ x: true }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}><strong>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <strong style={{ color: isBalanced ? 'inherit' : 'red' }}>
                      {totals.debit.toFixed(2)}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <strong style={{ color: isBalanced ? 'inherit' : 'red' }}>
                      {totals.credit.toFixed(2)}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} />
                </Table.Summary.Row>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}><strong>Différence</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} colSpan={3}>
                    <strong style={{ color: isBalanced ? 'inherit' : 'red' }}>
                      {totals.difference.toFixed(2)}
                    </strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </Form>
      </Card>
    </div>
  );
};

export default JournalEntryForm;
