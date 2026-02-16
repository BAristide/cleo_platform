// src/components/accounting/forms/BankStatementForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Space,
  Card,
  Typography,
  Divider,
  Table,
  Popconfirm,
  Row,
  Col,
  Spin,
  Alert,
  message
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  BankOutlined
} from '@ant-design/icons';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const BankStatementForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [journals, setJournals] = useState([]);
  const [partners, setPartners] = useState([]);
  const [lines, setLines] = useState([]);
  const [balances, setBalances] = useState({
    start: 0,
    end: 0,
    calculated: 0,
    difference: 0
  });

  useEffect(() => {
    fetchMasterData();
    if (isEditing) {
      fetchStatementDetails();
    } else {
      // Initialize a new statement with one empty line
      setLines([{
        key: Date.now(),
        date: moment(),
        name: '',
        partner_id: null,
        amount: 0,
        ref: '',
        note: ''
      }]);
    }
  }, [id]);

  useEffect(() => {
    calculateBalances();
  }, [lines]);

  const fetchMasterData = async () => {
    try {
      const [journalsResponse, partnersResponse] = await Promise.all([
        axios.get('/api/accounting/journals/', { params: { type: 'bank' } }),
        axios.get('/api/crm/companies/')
      ]);

      const journalsData = extractResultsFromResponse(journalsResponse);
      const partnersData = extractResultsFromResponse(partnersResponse);

      setJournals(journalsData.length > 0 ? journalsData : demoBankJournals);
      setPartners(partnersData.length > 0 ? partnersData : demoPartners);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setJournals(demoBankJournals);
      setPartners(demoPartners);
    }
  };

  const fetchStatementDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/accounting/bank-statements/${id}/`);
      const statement = response.data;
      
      form.setFieldsValue({
        journal_id: statement.journal_id,
        name: statement.name,
        date: moment(statement.date),
        reference: statement.reference,
        balance_start: statement.balance_start,
        balance_end_real: statement.balance_end_real
      });
      
      if (statement.lines && statement.lines.length > 0) {
        setLines(statement.lines.map(line => ({
          ...line,
          key: line.id,
          date: moment(line.date)
        })));
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du relevé:', error);
      setError('Impossible de charger les détails du relevé. Veuillez réessayer plus tard.');
      
      // If API fails, use demo data
      if (demoStatements[id - 1]) {
        const demoStatement = demoStatements[id - 1];
        
        form.setFieldsValue({
          journal_id: demoStatement.journal_id,
          name: demoStatement.name,
          date: moment(demoStatement.date),
          reference: demoStatement.reference,
          balance_start: demoStatement.balance_start,
          balance_end_real: demoStatement.balance_end_real
        });
        
        setLines(demoStatement.lines);
      }
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    const newLine = {
      key: Date.now(),
      date: moment(),
      name: '',
      partner_id: null,
      amount: 0,
      ref: '',
      note: ''
    };
    
    setLines([...lines, newLine]);
  };

  const deleteLine = (key) => {
    setLines(lines.filter(line => line.key !== key));
  };

  const updateLine = (key, field, value) => {
    const updatedLines = lines.map(line => {
      if (line.key === key) {
        return { ...line, [field]: value };
      }
      return line;
    });
    
    setLines(updatedLines);
  };

  const calculateBalances = () => {
    const startBalance = parseFloat(form.getFieldValue('balance_start') || 0);
    const linesTotal = lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
    const calculatedEnd = startBalance + linesTotal;
    const endRealValue = parseFloat(form.getFieldValue('balance_end_real') || 0);
    const difference = calculatedEnd - endRealValue;
    
    setBalances({
      start: startBalance,
      end: calculatedEnd,
      calculated: calculatedEnd,
      difference: endRealValue ? difference : 0
    });
    
    // Update the form value
    form.setFieldsValue({ balance_end: calculatedEnd });
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    
    try {
      const statementData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        lines: lines.map(line => ({
          ...line,
          date: line.date.format('YYYY-MM-DD'),
          // Exclude the "key" field
          key: undefined
        }))
      };
      
      let response;
      if (isEditing) {
        response = await axios.put(`/api/accounting/bank-statements/${id}/`, statementData);
      } else {
        response = await axios.post('/api/accounting/bank-statements/', statementData);
      }
      
      message.success(isEditing ? 'Relevé modifié avec succès.' : 'Relevé créé avec succès.');
      navigate(`/accounting/bank-statements/${response.data.id || id}`);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du relevé:', error);
      message.error('Erreur lors de l\'enregistrement du relevé. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  // Demo data
  const demoBankJournals = [
    {
      id: 3,
      code: 'BNK',
      name: 'Journal de banque',
      type: 'bank'
    },
    {
      id: 4,
      code: 'CSH',
      name: 'Journal de caisse',
      type: 'cash'
    }
  ];

  const demoPartners = [
    { id: 1, name: 'ABC SARL' },
    { id: 2, name: 'XYZ Inc.' },
    { id: 3, name: 'Sofitel' },
    { id: 4, name: 'Fournitures Office SA' },
    { id: 5, name: 'DEF SA' }
  ];

  const demoStatements = [
    {
      id: 1,
      journal_id: 3,
      name: 'Relevé Mai 2025',
      date: '2025-05-31',
      reference: 'REL-052025',
      balance_start: 350000,
      balance_end: 375400,
      balance_end_real: 375400,
      state: 'draft',
      lines: [
        {
          key: 101,
          date: moment('2025-05-05'),
          name: 'Paiement client ABC',
          ref: 'VIR-12345',
          partner_id: 1,
          amount: 12500,
          is_reconciled: false,
          note: 'Règlement facture FACT-2189'
        },
        {
          key: 102,
          date: moment('2025-05-12'),
          name: 'Paiement client XYZ',
          ref: 'VIR-12346',
          partner_id: 2,
          amount: 9000,
          is_reconciled: false,
          note: 'Règlement facture FACT-2190'
        },
        {
          key: 103,
          date: moment('2025-05-15'),
          name: 'Prélèvement fournisseur',
          ref: 'PRE-00123',
          partner_id: 4,
          amount: -3750,
          is_reconciled: false,
          note: 'Règlement facture fournisseur FRN-0045'
        },
        {
          key: 104,
          date: moment('2025-05-22'),
          name: 'Virement interne',
          ref: 'VIR-12347',
          partner_id: null,
          amount: 7650,
          is_reconciled: false,
          note: 'Virement compte secondaire'
        }
      ]
    }
  ];

  // Table columns for statement lines
  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: '12%',
      render: (date, record) => (
        <DatePicker
          style={{ width: '100%' }}
          format="DD/MM/YYYY"
          value={date}
          onChange={(value) => updateLine(record.key, 'date', value)}
        />
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
      title: 'Référence',
      dataIndex: 'ref',
      key: 'ref',
      width: '15%',
      render: (text, record) => (
        <Input
          placeholder="Référence"
          value={text}
          onChange={(e) => updateLine(record.key, 'ref', e.target.value)}
        />
      ),
    },
    {
      title: 'Partenaire',
      dataIndex: 'partner_id',
      key: 'partner_id',
      width: '20%',
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
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      width: '15%',
      render: (text, record) => (
        <InputNumber
          style={{ width: '100%' }}
          step={0.01}
          precision={2}
          value={text || 0}
          onChange={(value) => updateLine(record.key, 'amount', value)}
        />
      ),
    },
    {
      title: 'Note',
      dataIndex: 'note',
      key: 'note',
      width: '15%',
      render: (text, record) => (
        <Input
          placeholder="Note"
          value={text}
          onChange={(e) => updateLine(record.key, 'note', e.target.value)}
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

  const isBalanced = Math.abs(balances.difference) < 0.01;

  return (
    <div className="bank-statement-form">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2}>{isEditing ? 'Modifier un relevé bancaire' : 'Nouveau relevé bancaire'}</Title>
        <Space>
          <Button onClick={() => navigate(-1)}>Annuler</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={submitting}
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

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            name: '',
            date: moment(),
            reference: '',
            balance_start: 0,
            balance_end: 0,
            balance_end_real: 0
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <Title level={4}>Informations générales</Title>
            <Divider style={{ margin: '12px 0 24px' }} />
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="journal_id"
                  label="Journal"
                  rules={[{ required: true, message: 'Veuillez sélectionner un journal' }]}
                >
                  <Select
                    placeholder="Sélectionner un journal"
                    disabled={isEditing} // Can't change journal in edit mode
                  >
                    {journals.map(journal => (
                      <Option key={journal.id} value={journal.id}>
                        <Space>
                          <BankOutlined />
                          {journal.code} - {journal.name}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Nom du relevé"
                  rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
                >
                  <Input placeholder="Ex: Relevé Mai 2025" />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="date"
                  label="Date du relevé"
                  rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="reference"
                  label="Référence"
                >
                  <Input placeholder="Référence externe du relevé" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Title level={4}>Soldes</Title>
            <Divider style={{ margin: '12px 0 24px' }} />
            
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="balance_start"
                  label="Solde initial"
                  rules={[{ required: true, message: 'Veuillez saisir un solde initial' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    step={0.01}
                    precision={2}
                    formatter={value => `${value} MAD`}
                    parser={value => value.replace(' MAD', '')}
                    onChange={() => calculateBalances()}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="balance_end"
                  label="Solde final calculé"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    step={0.01}
                    precision={2}
                    formatter={value => `${value} MAD`}
                    parser={value => value.replace(' MAD', '')}
                    disabled
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="balance_end_real"
                  label="Solde final réel"
                  rules={[{ required: true, message: 'Veuillez saisir le solde final réel' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    step={0.01}
                    precision={2}
                    formatter={value => `${value} MAD`}
                    parser={value => value.replace(' MAD', '')}
                    onChange={() => calculateBalances()}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <div 
              style={{ 
                marginTop: 8, 
                padding: 12, 
                background: isBalanced ? '#f6ffed' : '#fff2f0', 
                border: `1px solid ${isBalanced ? '#b7eb8f' : '#ffccc7'}`, 
                borderRadius: 4 
              }}
            >
              <Text>
                <strong>Différence :</strong> {balances.difference.toFixed(2)} MAD 
                {isBalanced ? ' (équilibré)' : ' (non équilibré)'}
              </Text>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Title level={4}>Lignes du relevé</Title>
            <Divider style={{ margin: '12px 0 24px' }} />
            
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
                      <strong>
                        {lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0).toFixed(2)}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} colSpan={2} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default BankStatementForm;
