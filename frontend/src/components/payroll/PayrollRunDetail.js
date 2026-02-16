// src/components/payroll/PayrollRunDetail.js
import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Descriptions, Button, Table, Tabs,
  Space, Tag, Divider, Statistic, Row, Col, Spin, message,
  Popconfirm, Modal, Result
} from 'antd';
import { 
  EditOutlined, DownloadOutlined, CalculatorOutlined,
  CheckCircleOutlined, DollarOutlined, EyeOutlined,
  ArrowLeftOutlined, PlusOutlined, FilePdfOutlined
} from '@ant-design/icons';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const statusColors = {
  draft: 'default',
  in_progress: 'processing',
  calculated: 'warning',
  validated: 'success',
  paid: 'green',
  cancelled: 'error'
};

const statusDisplay = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  calculated: 'Calculé',
  validated: 'Validé',
  paid: 'Payé',
  cancelled: 'Annulé'
};

const PayrollRunDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payrollRun, setPayrollRun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer les détails du lancement de paie
      const runResponse = await axios.get(`/api/payroll/payroll-runs/${id}/`);
      setPayrollRun(runResponse.data);
      
      // Récupérer les bulletins associés
      fetchPayslips(1, pagination.pageSize);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      message.error('Erreur lors du chargement des données');
      
      // Données de démo en cas d'erreur
      setPayrollRun({
        id: parseInt(id),
        name: 'Paie Mai 2025 - Tous les départements',
        description: 'Lancement de paie pour le mois de mai 2025',
        period: { id: 1, name: 'Mai 2025' },
        department: null,
        department_name: 'Tous les départements',
        status: 'calculated',
        status_display: 'Calculé',
        run_date: '2025-05-15T10:00:00Z',
        calculated_date: '2025-05-20T10:00:00Z',
        validated_date: null,
        paid_date: null,
        created_by: { id: 1, first_name: 'Admin', last_name: 'Système' },
        created_by_name: 'Admin Système',
        validated_by: null,
        validated_by_name: '',
        notes: '',
        payslips_count: 2,
        payslips_summary: {
          total_gross: 23500,
          total_net: 19300,
          total_cnss_employee: 1008,
          total_cnss_employer: 2021,
          total_amo_employee: 470,
          total_amo_employer: 470,
          total_income_tax: 722,
          status_counts: {
            calculated: 2
          }
        }
      });
      
      setPayslips([
        {
          id: 1,
          number: 'BUL-MAI25-EMP001',
          period_name: 'Mai 2025',
          employee: { id: 1, first_name: 'Mohammed', last_name: 'Alami' },
          employee_data: { id: 1, first_name: 'Mohammed', last_name: 'Alami', email: 'm.alami@example.com' },
          worked_days: 22,
          basic_salary: 12000,
          gross_salary: 14300,
          net_salary: 11500,
          cnss_employee: 602,
          cnss_employer: 1230,
          amo_employee: 286,
          amo_employer: 286,
          income_tax: 412,
          status: 'calculated',
          is_paid: false,
          created_at: '2025-05-15T10:00:00Z'
        },
        {
          id: 2,
          number: 'BUL-MAI25-EMP002',
          period_name: 'Mai 2025',
          employee: { id: 2, first_name: 'Fatima', last_name: 'Benani' },
          employee_data: { id: 2, first_name: 'Fatima', last_name: 'Benani', email: 'f.benani@example.com' },
          worked_days: 20,
          basic_salary: 8000,
          gross_salary: 9200,
          net_salary: 7800,
          cnss_employee: 406,
          cnss_employer: 791,
          amo_employee: 184,
          amo_employer: 184,
          income_tax: 310,
          status: 'calculated',
          is_paid: false,
          created_at: '2025-05-15T10:00:00Z'
        }
      ]);
      setPagination({
        ...pagination,
        total: 2
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslips = async (page = 1, pageSize = 10) => {
    setPayslipLoading(true);
    try {
      const payslipsResponse = await axios.get(`/api/payroll/payslips/?payroll_run=${id}&page=${page}&page_size=${pageSize}`);
      
      if (payslipsResponse.data.results) {
        setPayslips(payslipsResponse.data.results);
        setPagination({
          ...pagination,
          current: page,
          total: payslipsResponse.data.count
        });
      } else {
        setPayslips([]);
        message.error('Format de réponse inattendu pour les bulletins');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des bulletins:', error);
      message.error('Erreur lors du chargement des bulletins');
      // Utiliser les données de démo déjà définies
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleTableChange = (pagination, filters, sorter) => {
    fetchPayslips(pagination.current, pagination.pageSize);
  };

  const handleGeneratePayslips = async () => {
    try {
      await axios.post(`/api/payroll/payroll-runs/${id}/generate_payslips/`);
      message.success('Génération des bulletins lancée avec succès');
      fetchData();
    } catch (error) {
      console.error('Erreur lors de la génération des bulletins:', error);
      message.error('Erreur lors de la génération des bulletins');
    }
  };

  const handleCalculatePayslips = async () => {
    try {
      await axios.post(`/api/payroll/payroll-runs/${id}/calculate_payslips/`);
      message.success('Calcul des bulletins lancé avec succès');
      fetchData();
    } catch (error) {
      console.error('Erreur lors du calcul des bulletins:', error);
      message.error('Erreur lors du calcul des bulletins');
    }
  };

  const handleValidatePayroll = async () => {
    try {
      await axios.post(`/api/payroll/payroll-runs/${id}/validate_payroll/`);
      message.success('Lancement validé avec succès');
      fetchData();
    } catch (error) {
      console.error('Erreur lors de la validation du lancement:', error);
      message.error('Erreur lors de la validation du lancement');
    }
  };

  const handlePayPayroll = async () => {
    Modal.confirm({
      title: 'Paiement du lancement de paie',
      content: (
        <div>
          <p>Êtes-vous sûr de vouloir marquer ce lancement comme payé ?</p>
          <p>Cette action marquera tous les bulletins comme payés.</p>
        </div>
      ),
      onOk: async () => {
        try {
          await axios.post(`/api/payroll/payroll-runs/${id}/pay_payroll/`, {
            payment_reference: `VIR-${moment().format('YYYYMMDD')}`
          });
          message.success('Lancement marqué comme payé avec succès');
          fetchData();
        } catch (error) {
          console.error('Erreur lors du paiement du lancement:', error);
          message.error('Erreur lors du paiement du lancement');
        }
      }
    });
  };

  const handleGenerateSummaryPDF = async () => {
    setPdfGenerating(true);
    try {
      const response = await axios.get(`/api/payroll/payroll-runs/${id}/generate_summary_pdf/`);
      if (response.data.success && response.data.pdf_url) {
        window.open(response.data.pdf_url, '_blank');
        message.success('PDF récapitulatif généré avec succès');
      } else {
        message.error('Erreur lors de la génération du PDF');
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      message.error('Erreur lors de la génération du PDF');
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleCalculatePayslip = async (payslipId) => {
    try {
      await axios.post(`/api/payroll/payslips/${payslipId}/calculate/`);
      message.success('Bulletin calculé avec succès');
      fetchPayslips(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('Erreur lors du calcul du bulletin:', error);
      message.error('Erreur lors du calcul du bulletin');
    }
  };

  const handleDownloadPayslipPDF = async (payslipId) => {
    try {
      window.open(`/api/payroll/payslips/${payslipId}/download_pdf/`, '_blank');
      message.success('Téléchargement du PDF lancé');
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      message.error('Erreur lors du téléchargement du PDF');
    }
  };

  const payslipColumns = [
    {
      title: 'Numéro',
      dataIndex: 'number',
      key: 'number',
      render: (text, record) => <Link to={`/payroll/payslips/${record.id}`}>{text}</Link>,
      sorter: (a, b) => a.number.localeCompare(b.number),
    },
    {
      title: 'Employé',
      dataIndex: 'employee_data',
      key: 'employee',
      render: employee => employee ? `${employee.first_name} ${employee.last_name}` : '-',
      sorter: (a, b) => `${a.employee_data?.last_name || ''} ${a.employee_data?.first_name || ''}`.localeCompare(
        `${b.employee_data?.last_name || ''} ${b.employee_data?.first_name || ''}`
      ),
    },
    {
      title: 'Salaire brut',
      dataIndex: 'gross_salary',
      key: 'gross_salary',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.gross_salary || 0) - (b.gross_salary || 0),
    },
    {
      title: 'CNSS',
      dataIndex: 'cnss_employee',
      key: 'cnss_employee',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.cnss_employee || 0) - (b.cnss_employee || 0),
    },
    {
      title: 'AMO',
      dataIndex: 'amo_employee',
      key: 'amo_employee',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.amo_employee || 0) - (b.amo_employee || 0),
    },
    {
      title: 'IR',
      dataIndex: 'income_tax',
      key: 'income_tax',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.income_tax || 0) - (b.income_tax || 0),
    },
    {
      title: 'Salaire net',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: value => value ? `${value.toLocaleString()} MAD` : '-',
      sorter: (a, b) => (a.net_salary || 0) - (b.net_salary || 0),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={statusColors[status] || 'default'}>
          {statusDisplay[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => navigate(`/payroll/payslips/${record.id}`)}
            title="Voir"
          />
          
          {record.status === 'draft' && (
            <Button 
              type="default" 
              icon={<CalculatorOutlined />} 
              size="small"
              onClick={() => handleCalculatePayslip(record.id)}
              title="Calculer"
            />
          )}
          
          {record.status !== 'draft' && (
            <Button 
              type="default" 
              icon={<DownloadOutlined />} 
              size="small"
              onClick={() => handleDownloadPayslipPDF(record.id)}
              title="Télécharger PDF"
            />
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spin size="large" tip="Chargement des données..." />
      </div>
    );
  }

  if (!payrollRun) {
    return (
      <div style={{ padding: '20px' }}>
        <Result
          status="error"
          title="Erreur"
          subTitle="Le lancement de paie demandé n'existe pas."
          extra={
            <Button type="primary">
              <Link to="/payroll/runs">Retour à la liste</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Button 
          type="default" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/payroll/runs')}
        >
          Retour
        </Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title level={2}>
          {payrollRun.name}
          <Tag 
            color={statusColors[payrollRun.status] || 'default'} 
            style={{ marginLeft: '10px', verticalAlign: 'middle' }}
          >
            {statusDisplay[payrollRun.status] || payrollRun.status}
          </Tag>
        </Title>
        <Space>
          {payrollRun.status === 'draft' && (
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleGeneratePayslips}
            >
              Générer les bulletins
            </Button>
          )}
          
          {(payrollRun.status === 'draft' || payrollRun.status === 'in_progress') && (
            <Button 
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={handleCalculatePayslips}
            >
              Calculer les bulletins
            </Button>
          )}
          
          {payrollRun.status === 'calculated' && (
            <Button 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleValidatePayroll}
            >
              Valider
            </Button>
          )}
          
          {payrollRun.status === 'validated' && (
            <Button 
              type="primary"
              icon={<DollarOutlined />}
              onClick={handlePayPayroll}
            >
              Payer
            </Button>
          )}
          
          {(payrollRun.status === 'calculated' || payrollRun.status === 'validated' || payrollRun.status === 'paid') && (
            <Button 
              type="default"
              icon={<FilePdfOutlined />}
              onClick={handleGenerateSummaryPDF}
              loading={pdfGenerating}
            >
              Récapitulatif PDF
            </Button>
          )}
        </Space>
      </div>

      <Card style={{ marginBottom: '20px' }}>
        <Descriptions title="Informations générales" bordered>
          <Descriptions.Item label="Nom">{payrollRun.name}</Descriptions.Item>
          <Descriptions.Item label="Période">{payrollRun.period?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Département">{payrollRun.department_name || 'Tous les départements'}</Descriptions.Item>
          <Descriptions.Item label="Date de lancement">{moment(payrollRun.run_date).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="Date de calcul">{payrollRun.calculated_date ? moment(payrollRun.calculated_date).format('DD/MM/YYYY HH:mm') : '-'}</Descriptions.Item>
          <Descriptions.Item label="Date de validation">{payrollRun.validated_date ? moment(payrollRun.validated_date).format('DD/MM/YYYY HH:mm') : '-'}</Descriptions.Item>
          <Descriptions.Item label="Statut" span={3}>
            <Tag color={statusColors[payrollRun.status] || 'default'}>
              {statusDisplay[payrollRun.status] || payrollRun.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Date de paiement">{payrollRun.paid_date ? moment(payrollRun.paid_date).format('DD/MM/YYYY HH:mm') : '-'}</Descriptions.Item>
          <Descriptions.Item label="Créé par">{payrollRun.created_by_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Validé par">{payrollRun.validated_by_name || '-'}</Descriptions.Item>
          {payrollRun.description && (
            <Descriptions.Item label="Description" span={3}>{payrollRun.description}</Descriptions.Item>
          )}
          {payrollRun.notes && (
            <Descriptions.Item label="Notes" span={3}>{payrollRun.notes}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Nombre de bulletins"
              value={payrollRun.payslips_count || 0}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Masse salariale brute"
              value={(payrollRun.payslips_summary?.total_gross || 0).toLocaleString()}
              suffix="MAD"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total des cotisations"
              value={(
                (payrollRun.payslips_summary?.total_cnss_employee || 0) +
                (payrollRun.payslips_summary?.total_amo_employee || 0) +
                (payrollRun.payslips_summary?.total_income_tax || 0)
              ).toLocaleString()}
              suffix="MAD"
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Masse salariale nette"
              value={(payrollRun.payslips_summary?.total_net || 0).toLocaleString()}
              suffix="MAD"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="1">
        <TabPane tab="Bulletins de paie" key="1">
          <Card>
            <Spin spinning={payslipLoading}>
              <Table 
                columns={payslipColumns} 
                dataSource={payslips} 
                rowKey="id" 
                pagination={pagination}
                onChange={handleTableChange}
              />
            </Spin>
          </Card>
        </TabPane>
        <TabPane tab="Cotisations" key="2">
          <Card>
            <Title level={4}>Récapitulatif des cotisations</Title>
            <Table 
              dataSource={[
                {
                  key: '1',
                  organisme: 'CNSS',
                  base: 'Plafonné',
                  part_salariale: payrollRun.payslips_summary?.total_cnss_employee || 0,
                  part_patronale: payrollRun.payslips_summary?.total_cnss_employer || 0,
                  total: (payrollRun.payslips_summary?.total_cnss_employee || 0) + (payrollRun.payslips_summary?.total_cnss_employer || 0)
                },
                {
                  key: '2',
                  organisme: 'AMO',
                  base: payrollRun.payslips_summary?.total_gross || 0,
                  part_salariale: payrollRun.payslips_summary?.total_amo_employee || 0,
                  part_patronale: payrollRun.payslips_summary?.total_amo_employer || 0,
                  total: (payrollRun.payslips_summary?.total_amo_employee || 0) + (payrollRun.payslips_summary?.total_amo_employer || 0)
                },
                {
                  key: '3',
                  organisme: 'IR (Impôt sur le Revenu)',
                  base: '-',
                  part_salariale: payrollRun.payslips_summary?.total_income_tax || 0,
                  part_patronale: 0,
                  total: payrollRun.payslips_summary?.total_income_tax || 0
                }
              ]}
              columns={[
                {
                  title: 'Organisme',
                  dataIndex: 'organisme',
                  key: 'organisme',
                },
                {
                  title: 'Base',
                  dataIndex: 'base',
                  key: 'base',
                  render: value => typeof value === 'number' ? `${value.toLocaleString()} MAD` : value
                },
                {
                  title: 'Part salariale',
                  dataIndex: 'part_salariale',
                  key: 'part_salariale',
                  render: value => `${value.toLocaleString()} MAD`
                },
                {
                  title: 'Part patronale',
                  dataIndex: 'part_patronale',
                  key: 'part_patronale',
                  render: value => `${value.toLocaleString()} MAD`
                },
                {
                  title: 'Total',
                  dataIndex: 'total',
                  key: 'total',
                  render: value => `${value.toLocaleString()} MAD`
                }
              ]}
              pagination={false}
              summary={pageData => {
                let totalSalariale = 0;
                let totalPatronale = 0;
                let totalTotal = 0;
                
                pageData.forEach(({ part_salariale, part_patronale, total }) => {
                  totalSalariale += part_salariale;
                  totalPatronale += part_patronale;
                  totalTotal += total;
                });
                
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}><strong>Total</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <strong>{totalSalariale.toLocaleString()} MAD</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <strong>{totalPatronale.toLocaleString()} MAD</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <strong>{totalTotal.toLocaleString()} MAD</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default PayrollRunDetail;
