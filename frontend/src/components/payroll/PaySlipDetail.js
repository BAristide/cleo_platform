// src/components/payroll/PaySlipDetail.js
import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Descriptions, Button, Table, 
  Space, Tag, Divider, Statistic, Row, Col, Spin, message,
  Popconfirm, Modal, Empty, Result
} from 'antd';
import { 
  CalculatorOutlined, DownloadOutlined, FilePdfOutlined,
  ArrowLeftOutlined, EyeOutlined
} from '@ant-design/icons';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

const statusColors = {
  draft: 'default',
  calculated: 'warning',
  validated: 'success',
  paid: 'green',
  cancelled: 'error'
};

const statusDisplay = {
  draft: 'Brouillon',
  calculated: 'Calculé',
  validated: 'Validé',
  paid: 'Payé',
  cancelled: 'Annulé'
};

const PaySlipDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [payslipLines, setPayslipLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer les détails du bulletin
      const response = await axios.get(`/api/payroll/payslips/${id}/`);
      setPayslip(response.data);
      
      // Récupérer les lignes du bulletin
      if (response.data.lines) {
        setPayslipLines(response.data.lines);
      } else {
        try {
          const linesResponse = await axios.get(`/api/payroll/payslip-lines/?payslip=${id}`);
          if (linesResponse.data.results) {
            setPayslipLines(linesResponse.data.results);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des lignes:', error);
          setPayslipLines([]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      message.error('Erreur lors du chargement des données');
      
      // Données de démo en cas d'erreur
      setPayslip({
        id: parseInt(id),
        number: 'BUL-MAI25-EMP001',
        payroll_run: { id: 1, name: 'Paie Mai 2025 - Tous les départements' },
        period_name: 'Mai 2025',
        employee: { id: 1, first_name: 'Mohammed', last_name: 'Alami' },
        employee_data: { 
          id: 1, 
          first_name: 'Mohammed', 
          last_name: 'Alami', 
          email: 'm.alami@example.com',
          employee_id: 'EMP001'
        },
        worked_days: 22,
        absence_days: 0,
        paid_leave_days: 0,
        unpaid_leave_days: 0,
        overtime_25_hours: 10,
        overtime_50_hours: 5,
        overtime_100_hours: 0,
        basic_salary: 12000,
        gross_salary: 14300,
        taxable_salary: 13577,
        net_salary: 11500,
        cnss_employee: 437,
        cnss_employer: 1032,
        amo_employee: 286,
        amo_employer: 286,
        income_tax: 577,
        status: 'calculated',
        status_display: 'Calculé',
        is_paid: false,
        payment_date: null,
        payment_reference: '',
        created_at: '2025-05-15T10:00:00Z',
        updated_at: '2025-05-20T10:00:00Z',
        pdf_file: null
      });
      
      setPayslipLines([
        {
          id: 1,
          payslip: parseInt(id),
          component: { id: 1, name: 'Salaire de base', code: 'SALBASE', component_type: 'brut' },
          component_name: 'Salaire de base',
          component_type: 'brut',
          amount: 10182,
          base_amount: null,
          rate: null,
          quantity: null,
          is_employer_contribution: false,
          display_order: 10
        },
        {
          id: 2,
          payslip: parseInt(id),
          component: { id: 2, name: 'Heures supplémentaires 25%', code: 'HS25', component_type: 'brut' },
          component_name: 'Heures supplémentaires 25%',
          component_type: 'brut',
          amount: 937.5,
          base_amount: null,
          rate: 25,
          quantity: 10,
          is_employer_contribution: false,
          display_order: 20
        },
        {
          id: 3,
          payslip: parseInt(id),
          component: { id: 3, name: 'Heures supplémentaires 50%', code: 'HS50', component_type: 'brut' },
          component_name: 'Heures supplémentaires 50%',
          component_type: 'brut',
          amount: 562.5,
          base_amount: null,
          rate: 50,
          quantity: 5,
          is_employer_contribution: false,
          display_order: 21
        },
        {
          id: 4,
          payslip: parseInt(id),
          component: { id: 4, name: 'Prime d\'ancienneté', code: 'ANCIENNETE', component_type: 'brut' },
          component_name: 'Prime d\'ancienneté',
          component_type: 'brut',
          amount: 1018.2,
          base_amount: 10182,
          rate: 10,
          quantity: null,
          is_employer_contribution: false,
          display_order: 30
        },
        {
          id: 5,
          payslip: parseInt(id),
          component: { id: 5, name: 'Indemnité de transport', code: 'TRANSPORT', component_type: 'non_soumise' },
          component_name: 'Indemnité de transport',
          component_type: 'non_soumise',
          amount: 1000,
          base_amount: null,
          rate: null,
          quantity: null,
          is_employer_contribution: false,
          display_order: 40
        },
        {
          id: 6,
          payslip: parseInt(id),
          component: { id: 6, name: 'Prime de panier', code: 'REPAS', component_type: 'non_soumise' },
          component_name: 'Prime de panier',
          component_type: 'non_soumise',
          amount: 600,
          base_amount: null,
          rate: null,
          quantity: null,
          is_employer_contribution: false,
          display_order: 41
        },
        {
          id: 7,
          payslip: parseInt(id),
          component: { id: 7, name: 'Cotisation CNSS', code: 'CNSS_EMP', component_type: 'cotisation' },
          component_name: 'Cotisation CNSS',
          component_type: 'cotisation',
          amount: -437,
          base_amount: 10182,
          rate: 4.29,
          quantity: null,
          is_employer_contribution: false,
          display_order: 50
        },
        {
          id: 8,
          payslip: parseInt(id),
          component: { id: 8, name: 'Cotisation AMO', code: 'AMO_EMP', component_type: 'cotisation' },
          component_name: 'Cotisation AMO',
          component_type: 'cotisation',
          amount: -286,
          base_amount: 14300,
          rate: 2,
          quantity: null,
          is_employer_contribution: false,
          display_order: 51
        },
        {
          id: 9,
          payslip: parseInt(id),
          component: { id: 9, name: 'Impôt sur le revenu', code: 'IR', component_type: 'cotisation' },
          component_name: 'Impôt sur le revenu',
          component_type: 'cotisation',
          amount: -577,
          base_amount: 13577,
          rate: null,
          quantity: null,
          is_employer_contribution: false,
          display_order: 60
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const response = await axios.post(`/api/payroll/payslips/${id}/calculate/`);
      message.success('Bulletin calculé avec succès');
      
      if (response.data.payslip) {
        setPayslip(response.data.payslip);
        if (response.data.payslip.lines) {
          setPayslipLines(response.data.payslip.lines);
        } else {
          fetchData(); // Recharger les données si les lignes ne sont pas incluses
        }
      } else {
        fetchData(); // Recharger les données si le bulletin n'est pas inclus
      }
    } catch (error) {
      console.error('Erreur lors du calcul du bulletin:', error);
      message.error('Erreur lors du calcul du bulletin');
    } finally {
      setCalculating(false);
    }
  };

  const handleDownloadPDF = async () => {
    setPdfGenerating(true);
    try {
      window.open(`/api/payroll/payslips/${id}/download_pdf/`, '_blank');
      message.success('Téléchargement du PDF lancé');
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      message.error('Erreur lors du téléchargement du PDF');
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spin size="large" tip="Chargement des données..." />
      </div>
    );
  }

  if (!payslip) {
    return (
      <div style={{ padding: '20px' }}>
        <Result
          status="error"
          title="Erreur"
          subTitle="Le bulletin de paie demandé n'existe pas."
          extra={
            <Button type="primary">
              <Link to="/payroll/payslips">Retour à la liste</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Trier les lignes par ordre d'affichage
  const sortedLines = [...payslipLines].sort((a, b) => a.display_order - b.display_order);
  
  // Séparer les gains et les retenues
  const gains = sortedLines.filter(line => line.amount > 0);
  const deductions = sortedLines.filter(line => line.amount < 0);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Button 
          type="default" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/payroll/payslips')}
        >
          Retour
        </Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title level={2}>
          Bulletin de paie #{payslip.number}
          <Tag 
            color={statusColors[payslip.status] || 'default'} 
            style={{ marginLeft: '10px', verticalAlign: 'middle' }}
          >
            {statusDisplay[payslip.status] || payslip.status}
          </Tag>
        </Title>
        <Space>
          {payslip.status === 'draft' && (
            <Button 
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={handleCalculate}
              loading={calculating}
            >
              Calculer
            </Button>
          )}
          
          {payslip.status !== 'draft' && (
            <Button 
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={handleDownloadPDF}
              loading={pdfGenerating}
            >
              Télécharger PDF
            </Button>
          )}
        </Space>
      </div>

      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Descriptions title="Informations du bulletin" column={1} bordered>
              <Descriptions.Item label="Numéro">{payslip.number}</Descriptions.Item>
              <Descriptions.Item label="Période">{payslip.period_name}</Descriptions.Item>
              <Descriptions.Item label="Lancement de paie">
                <Link to={`/payroll/runs/${payslip.payroll_run.id}`}>{payslip.payroll_run.name}</Link>
              </Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={statusColors[payslip.status] || 'default'}>
                  {statusDisplay[payslip.status] || payslip.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payé">
                <Tag color={payslip.is_paid ? 'green' : 'orange'}>
                  {payslip.is_paid ? 'Oui' : 'Non'}
                </Tag>
              </Descriptions.Item>
              {payslip.is_paid && (
                <Descriptions.Item label="Date de paiement">
                  {moment(payslip.payment_date).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {payslip.is_paid && payslip.payment_reference && (
                <Descriptions.Item label="Référence de paiement">
                  {payslip.payment_reference}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions title="Informations de l'employé" column={1} bordered>
              <Descriptions.Item label="Nom">
                {payslip.employee_data.first_name} {payslip.employee_data.last_name}
              </Descriptions.Item>
              <Descriptions.Item label="Matricule">{payslip.employee_data.employee_id || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{payslip.employee_data.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Jours travaillés">{payslip.worked_days}</Descriptions.Item>
              <Descriptions.Item label="Absences">{payslip.absence_days || 0}</Descriptions.Item>
              <Descriptions.Item label="Congés payés">{payslip.paid_leave_days || 0}</Descriptions.Item>
              {payslip.overtime_25_hours > 0 && (
                <Descriptions.Item label="Heures supp. 25%">{payslip.overtime_25_hours}</Descriptions.Item>
              )}
              {payslip.overtime_50_hours > 0 && (
                <Descriptions.Item label="Heures supp. 50%">{payslip.overtime_50_hours}</Descriptions.Item>
              )}
              {payslip.overtime_100_hours > 0 && (
                <Descriptions.Item label="Heures supp. 100%">{payslip.overtime_100_hours}</Descriptions.Item>
              )}
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Salaire de base"
              value={payslip.basic_salary.toLocaleString()}
              suffix="MAD"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Salaire brut"
              value={payslip.gross_salary.toLocaleString()}
              suffix="MAD"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total cotisations"
              value={(payslip.cnss_employee + payslip.amo_employee + payslip.income_tax).toLocaleString()}
              suffix="MAD"
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Salaire net"
              value={payslip.net_salary.toLocaleString()}
              suffix="MAD"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Gains" style={{ marginBottom: '20px' }}>
            <Table 
              dataSource={gains}
              rowKey="id"
              columns={[
                {
                  title: 'Désignation',
                  dataIndex: 'component_name',
                  key: 'component_name',
                },
                {
                  title: 'Base',
                  dataIndex: 'base_amount',
                  key: 'base_amount',
                  render: value => value ? `${value.toLocaleString()} MAD` : '-'
                },
                {
                  title: 'Taux',
                  dataIndex: 'rate',
                  key: 'rate',
                  render: value => value ? `${value} %` : '-'
                },
                {
                  title: 'Quantité',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  render: value => value || '-'
                },
                {
                  title: 'Montant',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: value => `${value.toLocaleString()} MAD`,
                  sorter: (a, b) => a.amount - b.amount,
                },
              ]}
              pagination={false}
              summary={pageData => {
                let totalAmount = 0;
                pageData.forEach(({ amount }) => {
                  totalAmount += amount;
                });
                
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4}><strong>Total des gains</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <strong>{totalAmount.toLocaleString()} MAD</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Retenues" style={{ marginBottom: '20px' }}>
            <Table 
              dataSource={deductions}
              rowKey="id"
              columns={[
                {
                  title: 'Désignation',
                  dataIndex: 'component_name',
                  key: 'component_name',
                },
                {
                  title: 'Base',
                  dataIndex: 'base_amount',
                  key: 'base_amount',
                  render: value => value ? `${value.toLocaleString()} MAD` : '-'
                },
                {
                  title: 'Taux',
                  dataIndex: 'rate',
                  key: 'rate',
                  render: value => value ? `${value} %` : '-'
                },
                {
                  title: 'Montant',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: value => `${Math.abs(value).toLocaleString()} MAD`,
                  sorter: (a, b) => Math.abs(a.amount) - Math.abs(b.amount),
                },
              ]}
              pagination={false}
              summary={pageData => {
                let totalAmount = 0;
                pageData.forEach(({ amount }) => {
                  totalAmount += Math.abs(amount);
                });
                
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}><strong>Total des retenues</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <strong>{totalAmount.toLocaleString()} MAD</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Cotisations patronales" style={{ marginBottom: '20px' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Descriptions bordered>
              <Descriptions.Item label="CNSS Employeur" span={3}>
                {payslip.cnss_employer.toLocaleString()} MAD
              </Descriptions.Item>
              <Descriptions.Item label="AMO Employeur" span={3}>
                {payslip.amo_employer.toLocaleString()} MAD
              </Descriptions.Item>
              <Descriptions.Item label="Total charges patronales" span={3}>
                <strong>{(payslip.cnss_employer + payslip.amo_employer).toLocaleString()} MAD</strong>
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions bordered>
              <Descriptions.Item label="Coût total" span={3}>
                <strong>{(payslip.gross_salary + payslip.cnss_employer + payslip.amo_employer).toLocaleString()} MAD</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Détail" span={3}>
                <Text>Salaire brut: {payslip.gross_salary.toLocaleString()} MAD</Text>
                <br />
                <Text>Charges patronales: {(payslip.cnss_employer + payslip.amo_employer).toLocaleString()} MAD</Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default PaySlipDetail;
