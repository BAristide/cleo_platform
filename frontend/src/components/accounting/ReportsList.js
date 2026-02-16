// src/components/accounting/ReportsList.js
import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Typography, 
  Space, 
  Row, 
  Col,
  DatePicker,
  Select,
  Form,
  Divider,
  List,
  Spin,
  message,
  Empty,
  Collapse
} from 'antd';
import { 
  FileTextOutlined,
  BarChartOutlined,
  PrinterOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileSearchOutlined,
  CalculatorOutlined,
  BankOutlined,
  ProfileOutlined,
  RightCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

const ReportsList = () => {
  const [form] = Form.useForm();
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment()]);

  const handleReportSelect = (reportType) => {
    setSelectedReport(reportType);
    setReport(null);
    form.resetFields();
  };

  const handleGenerateReport = async (values) => {
    setLoading(true);
    
    try {
      // Simulate API call to generate report
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      message.success('Rapport généré avec succès.');
      setReport({
        type: selectedReport,
        title: getReportTitle(selectedReport),
        generated: moment().format('DD/MM/YYYY HH:mm'),
        filters: values,
        content: `Contenu simulé du rapport ${selectedReport}`
      });
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      message.error('Erreur lors de la génération du rapport. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    message.info('Impression du rapport...');
  };

  const handleDownloadPdf = () => {
    message.info('Téléchargement du rapport en PDF...');
  };

  const handleDownloadExcel = () => {
    message.info('Téléchargement du rapport en Excel...');
  };

  const getReportTitle = (reportType) => {
    const reportTitles = {
      'balance': 'Balance des comptes',
      'general_ledger': 'Grand livre',
      'journal': 'Journal',
      'balance_sheet': 'Bilan',
      'income_statement': 'Compte de résultat',
      'tax_report': 'Déclaration de TVA',
      'analytical_report': 'Analyse analytique',
      'aged_receivable': 'Balance âgée clients',
      'aged_payable': 'Balance âgée fournisseurs'
    };
    
    return reportTitles[reportType] || 'Rapport';
  };

  const getReportIcon = (reportType) => {
    const reportIcons = {
      'balance': <ProfileOutlined />,
      'general_ledger': <FileTextOutlined />,
      'journal': <FileSearchOutlined />,
      'balance_sheet': <BankOutlined />,
      'income_statement': <CalculatorOutlined />,
      'tax_report': <BarChartOutlined />,
      'analytical_report': <BarChartOutlined />,
      'aged_receivable': <ProfileOutlined />,
      'aged_payable': <ProfileOutlined />
    };
    
    return reportIcons[reportType] || <FileTextOutlined />;
  };

  const FinancialStatementOptions = (
    <div>
      <Form.Item
        name="date"
        label="Date du bilan"
        rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
        initialValue={moment()}
      >
        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
      </Form.Item>
      
      <Form.Item
        name="comparison"
        label="Comparaison"
      >
        <Select>
          <Option value="none">Aucune</Option>
          <Option value="previous_year">Année précédente</Option>
          <Option value="previous_period">Période précédente</Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        name="detail_level"
        label="Niveau de détail"
        initialValue="normal"
      >
        <Select>
          <Option value="summary">Résumé</Option>
          <Option value="normal">Normal</Option>
          <Option value="detailed">Détaillé</Option>
        </Select>
      </Form.Item>
    </div>
  );

  const LedgerOptions = (
    <div>
      <Form.Item
        name="date_range"
        label="Période"
        rules={[{ required: true, message: 'Veuillez sélectionner une période' }]}
        initialValue={dateRange}
      >
        <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
      </Form.Item>
      
      <Form.Item
        name="accounts"
        label="Comptes"
      >
        <Select 
          mode="multiple" 
          placeholder="Tous les comptes" 
          style={{ width: '100%' }}
          maxTagCount={3}
        >
          <Option value="1">Classe 1 - Capitaux</Option>
          <Option value="2">Classe 2 - Immobilisations</Option>
          <Option value="3">Classe 3 - Stocks</Option>
          <Option value="4">Classe 4 - Tiers</Option>
          <Option value="5">Classe 5 - Trésorerie</Option>
          <Option value="6">Classe 6 - Charges</Option>
          <Option value="7">Classe 7 - Produits</Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        name="include_unposted"
        label="Inclure les écritures non validées"
        initialValue={false}
      >
        <Select>
          <Option value={true}>Oui</Option>
          <Option value={false}>Non</Option>
        </Select>
      </Form.Item>
    </div>
  );

  const JournalOptions = (
    <div>
      <Form.Item
        name="date_range"
        label="Période"
        rules={[{ required: true, message: 'Veuillez sélectionner une période' }]}
        initialValue={dateRange}
      >
        <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
      </Form.Item>
      
      <Form.Item
        name="journal"
        label="Journal"
        rules={[{ required: true, message: 'Veuillez sélectionner un journal' }]}
      >
        <Select placeholder="Sélectionner un journal">
          <Option value="all">Tous les journaux</Option>
          <Option value="VEN">VEN - Journal des ventes</Option>
          <Option value="ACH">ACH - Journal des achats</Option>
          <Option value="BNK">BNK - Journal de banque</Option>
          <Option value="CSH">CSH - Journal de caisse</Option>
          <Option value="OD">OD - Opérations diverses</Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        name="sorting"
        label="Tri"
        initialValue="date"
      >
        <Select>
          <Option value="date">Par date</Option>
          <Option value="entry">Par numéro d'écriture</Option>
          <Option value="account">Par compte</Option>
        </Select>
      </Form.Item>
    </div>
  );

  const VATOptions = (
    <div>
      <Form.Item
        name="date_range"
        label="Période de déclaration"
        rules={[{ required: true, message: 'Veuillez sélectionner une période' }]}
        initialValue={[moment().startOf('month'), moment().endOf('month')]}
      >
        <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
      </Form.Item>
      
      <Form.Item
        name="format"
        label="Format de déclaration"
        initialValue="standard"
      >
        <Select>
          <Option value="standard">Standard</Option>
          <Option value="detailed">Détaillé</Option>
          <Option value="official">Formulaire officiel</Option>
        </Select>
      </Form.Item>
    </div>
  );

  const AgedBalanceOptions = (
    <div>
      <Form.Item
        name="date"
        label="Date d'analyse"
        rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
        initialValue={moment()}
      >
        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
      </Form.Item>
      
      <Form.Item
        name="periods"
        label="Périodes (jours)"
        initialValue="30,60,90,120"
      >
        <Select>
          <Option value="30,60,90,120">30 - 60 - 90 - 120</Option>
          <Option value="15,30,45,60,75,90">15 - 30 - 45 - 60 - 75 - 90</Option>
          <Option value="7,14,30,60,90">7 - 14 - 30 - 60 - 90</Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        name="include_undue"
        label="Inclure les échéances non dues"
        initialValue={true}
      >
        <Select>
          <Option value={true}>Oui</Option>
          <Option value={false}>Non</Option>
        </Select>
      </Form.Item>
    </div>
  );

  const renderReportOptions = () => {
    switch (selectedReport) {
      case 'balance_sheet':
      case 'income_statement':
        return FinancialStatementOptions;
      case 'balance':
      case 'general_ledger':
      case 'analytical_report':
        return LedgerOptions;
      case 'journal':
        return JournalOptions;
      case 'tax_report':
        return VATOptions;
      case 'aged_receivable':
      case 'aged_payable':
        return AgedBalanceOptions;
      default:
        return null;
    }
  };

  return (
    <div className="reports-list">
      <Title level={2}>États et rapports comptables</Title>

      <Row gutter={16}>
        <Col span={8}>
          <Card style={{ marginBottom: 16 }}>
            <Title level={4}>Rapports disponibles</Title>
            <Divider style={{ margin: '12px 0' }} />
            
            <Collapse defaultActiveKey={['1', '2', '3']}>
              <Panel header="Rapports standards" key="1">
                <List
                  size="small"
                  dataSource={[
                    { key: 'balance', title: 'Balance des comptes', icon: <ProfileOutlined /> },
                    { key: 'general_ledger', title: 'Grand livre', icon: <FileTextOutlined /> },
                    { key: 'journal', title: 'Journal', icon: <FileSearchOutlined /> }
                  ]}
                  renderItem={item => (
                    <List.Item
                      style={{ 
                        cursor: 'pointer', 
                        backgroundColor: selectedReport === item.key ? '#f0f5ff' : 'inherit',
                        borderRadius: '4px',
                        padding: '8px',
                        marginBottom: '4px'
                      }}
                      onClick={() => handleReportSelect(item.key)}
                    >
                      <Space>
                        {item.icon}
                        <Text>{item.title}</Text>
                      </Space>
                      {selectedReport === item.key && <RightCircleOutlined />}
                    </List.Item>
                  )}
                />
              </Panel>
              
              <Panel header="États financiers" key="2">
                <List
                  size="small"
                  dataSource={[
                    { key: 'balance_sheet', title: 'Bilan', icon: <BankOutlined /> },
                    { key: 'income_statement', title: 'Compte de résultat', icon: <CalculatorOutlined /> },
                    { key: 'tax_report', title: 'Déclaration de TVA', icon: <BarChartOutlined /> }
                  ]}
                  renderItem={item => (
                    <List.Item
                      style={{ 
                        cursor: 'pointer', 
                        backgroundColor: selectedReport === item.key ? '#f0f5ff' : 'inherit',
                        borderRadius: '4px',
                        padding: '8px',
                        marginBottom: '4px'
                      }}
                      onClick={() => handleReportSelect(item.key)}
                    >
                      <Space>
                        {item.icon}
                        <Text>{item.title}</Text>
                      </Space>
                      {selectedReport === item.key && <RightCircleOutlined />}
                    </List.Item>
                  )}
                />
              </Panel>
              
              <Panel header="Analyses" key="3">
                <List
                  size="small"
                  dataSource={[
                    { key: 'analytical_report', title: 'Analyse analytique', icon: <BarChartOutlined /> },
                    { key: 'aged_receivable', title: 'Balance âgée clients', icon: <ProfileOutlined /> },
                    { key: 'aged_payable', title: 'Balance âgée fournisseurs', icon: <ProfileOutlined /> }
                  ]}
                  renderItem={item => (
                    <List.Item
                      style={{ 
                        cursor: 'pointer', 
                        backgroundColor: selectedReport === item.key ? '#f0f5ff' : 'inherit',
                        borderRadius: '4px',
                        padding: '8px',
                        marginBottom: '4px'
                      }}
                      onClick={() => handleReportSelect(item.key)}
                    >
                      <Space>
                        {item.icon}
                        <Text>{item.title}</Text>
                      </Space>
                      {selectedReport === item.key && <RightCircleOutlined />}
                    </List.Item>
                  )}
                />
              </Panel>
            </Collapse>
          </Card>
        </Col>

        <Col span={16}>
          <Card style={{ marginBottom: 16 }}>
            {selectedReport ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Space>
                    {getReportIcon(selectedReport)}
                    <Title level={4} style={{ margin: 0 }}>{getReportTitle(selectedReport)}</Title>
                  </Space>
                </div>
                <Divider style={{ margin: '0 0 24px 0' }} />
                
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleGenerateReport}
                >
                  {renderReportOptions()}
                  
                  <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Générer le rapport
                    </Button>
                  </Form.Item>
                </Form>
              </>
            ) : (
              <Empty 
                description="Sélectionnez un rapport dans la liste" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>

          {report && (
            <Card 
              title={
                <Space>
                  {getReportIcon(report.type)}
                  <span>{report.title}</span>
                </Space>
              }
              extra={
                <Space>
                  <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                    Imprimer
                  </Button>
                  <Button icon={<FilePdfOutlined />} onClick={handleDownloadPdf}>
                    PDF
                  </Button>
                  <Button icon={<FileExcelOutlined />} onClick={handleDownloadExcel}>
                    Excel
                  </Button>
                </Space>
              }
            >
              <Paragraph>
                <Text strong>Rapport généré le:</Text> {report.generated}
              </Paragraph>
              
              {report.filters && report.filters.date_range && (
                <Paragraph>
                  <Text strong>Période:</Text> {moment(report.filters.date_range[0]).format('DD/MM/YYYY')} - {moment(report.filters.date_range[1]).format('DD/MM/YYYY')}
                </Paragraph>
              )}
              
              {report.filters && report.filters.date && (
                <Paragraph>
                  <Text strong>Date:</Text> {moment(report.filters.date).format('DD/MM/YYYY')}
                </Paragraph>
              )}
              
              <Divider style={{ margin: '12px 0' }} />
              
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p>Contenu du rapport (aperçu)</p>
                <img 
                  src="/api/placeholder/600/400"
                  alt="Aperçu du rapport"
                  style={{ maxWidth: '100%', border: '1px solid #eee' }}
                />
                <Paragraph style={{ marginTop: 24 }}>
                  Pour afficher le rapport complet, veuillez utiliser les options d'exportation ci-dessus.
                </Paragraph>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default ReportsList;
