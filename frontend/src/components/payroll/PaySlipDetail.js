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
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';
import moment from 'moment';
import { useCurrency } from '../../context/CurrencyContext';
import usePayrollLabels from '../../hooks/usePayrollLabels';

const { Title, Text } = Typography;

/** Convertit une valeur API (potentiellement string) en nombre. */
const num = (v) => parseFloat(v) || 0;

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
  const { currencySymbol, currencyCode } = useCurrency();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [payslipLines, setPayslipLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const labels = usePayrollLabels();

  useEffect(() => {
    fetchData();

  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/payroll/payslips/${id}/`);
      setPayslip(response.data);

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
          fetchData();
        }
      } else {
        fetchData();
      }
    } catch (error) {
      handleApiError(error, null, 'Erreur lors du calcul du bulletin.');
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
  const gains = sortedLines.filter(line => num(line.amount) > 0);
  const deductions = sortedLines.filter(line => num(line.amount) < 0);

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
              {num(payslip.overtime_25_hours) > 0 && (
                <Descriptions.Item label="Heures supp. 25%">{payslip.overtime_25_hours}</Descriptions.Item>
              )}
              {num(payslip.overtime_50_hours) > 0 && (
                <Descriptions.Item label="Heures supp. 50%">{payslip.overtime_50_hours}</Descriptions.Item>
              )}
              {num(payslip.overtime_100_hours) > 0 && (
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
              value={num(payslip.basic_salary).toLocaleString()}
              suffix={currencyCode}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Salaire brut"
              value={num(payslip.gross_salary).toLocaleString()}
              suffix={currencyCode}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total cotisations"
              value={(num(payslip.cnss_employee) + num(payslip.amo_employee) + num(payslip.income_tax)).toLocaleString()}
              suffix={currencyCode}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Salaire net"
              value={num(payslip.net_salary).toLocaleString()}
              suffix={currencyCode}
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
                  render: value => value ? `${num(value).toLocaleString()} ${currencyCode}` : '-'
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
                  render: value => `${num(value).toLocaleString()} ${currencyCode}`,
                  sorter: (a, b) => num(a.amount) - num(b.amount),
                },
              ]}
              pagination={false}
              summary={pageData => {
                let totalAmount = 0;
                pageData.forEach(({ amount }) => {
                  totalAmount += num(amount);
                });

                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4}><strong>Total des gains</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <strong>{totalAmount.toLocaleString()} {currencyCode}</strong>
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
                  render: value => value ? `${num(value).toLocaleString()} ${currencyCode}` : '-'
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
                  render: value => `${Math.abs(num(value)).toLocaleString()} ${currencyCode}`,
                  sorter: (a, b) => Math.abs(num(a.amount)) - Math.abs(num(b.amount)),
                },
              ]}
              pagination={false}
              summary={pageData => {
                let totalAmount = 0;
                pageData.forEach(({ amount }) => {
                  totalAmount += Math.abs(num(amount));
                });

                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}><strong>Total des retenues</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <strong>{totalAmount.toLocaleString()} {currencyCode}</strong>
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
              <Descriptions.Item label={labels.social_employer} span={3}>
                {num(payslip.cnss_employer).toLocaleString()} {currencyCode}
              </Descriptions.Item>
              <Descriptions.Item label={labels.health_employer} span={3}>
                {num(payslip.amo_employer).toLocaleString()} {currencyCode}
              </Descriptions.Item>
              <Descriptions.Item label="Total charges patronales" span={3}>
                <strong>{(num(payslip.cnss_employer) + num(payslip.amo_employer)).toLocaleString()} {currencyCode}</strong>
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions bordered>
              <Descriptions.Item label="Coût total" span={3}>
                <strong>{(num(payslip.gross_salary) + num(payslip.cnss_employer) + num(payslip.amo_employer)).toLocaleString()} {currencyCode}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Détail" span={3}>
                <Text>Salaire brut: {num(payslip.gross_salary).toLocaleString()} {currencyCode}</Text>
                <br />
                <Text>Charges patronales: {(num(payslip.cnss_employer) + num(payslip.amo_employer)).toLocaleString()} {currencyCode}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>
      {payslip.ytd_totals && (
        <Card title="Cumuls annuels" style={{ marginBottom: '20px' }}>
          <Row gutter={16}>
            <Col span={5}>
              <Statistic
                title="Cumul brut"
                value={num(payslip.ytd_totals.ytd_gross).toLocaleString()}
                suffix={currencyCode}
              />
            </Col>
            <Col span={5}>
              <Statistic
                title={`Cumul ${labels.social_organism}`}
                value={num(payslip.ytd_totals.ytd_cnss).toLocaleString()}
                suffix={currencyCode}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title={`Cumul ${labels.health}`}
                value={num(payslip.ytd_totals.ytd_amo).toLocaleString()}
                suffix={currencyCode}
              />
            </Col>
            <Col span={5}>
              <Statistic
                title={`Cumul ${labels.tax_short}`}
                value={num(payslip.ytd_totals.ytd_tax).toLocaleString()}
                suffix={currencyCode}
              />
            </Col>
            <Col span={5}>
              <Statistic
                title="Cumul net"
                value={num(payslip.ytd_totals.ytd_net).toLocaleString()}
                suffix={currencyCode}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
          </Row>
        </Card>
      )}
      {payslip.leave_info && payslip.leave_info.length > 0 && (
        <Card title="Solde de conges" style={{ marginBottom: '20px' }}>
          <Table
            dataSource={payslip.leave_info}
            rowKey="code"
            columns={[
              { title: 'Type', dataIndex: 'type', key: 'type' },
              { title: 'Droit total', dataIndex: 'total', key: 'total', render: v => `${v} j` },
              { title: 'Pris', dataIndex: 'used', key: 'used', render: v => `${v} j` },
              { title: 'En attente', dataIndex: 'pending', key: 'pending', render: v => v > 0 ? `${v} j` : '-' },
              {
                title: 'Solde',
                dataIndex: 'remaining',
                key: 'remaining',
                render: v => <span style={{ fontWeight: 'bold', color: v > 0 ? '#3f8600' : '#cf1322' }}>{v} j</span>,
              },
            ]}
            pagination={false}
            size="small"
          />
        </Card>
      )}
    </div>
  );
};

export default PaySlipDetail;
