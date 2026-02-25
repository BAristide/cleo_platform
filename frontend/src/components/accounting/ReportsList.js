// src/components/accounting/ReportsList.js
import React, { useState } from 'react';
import {
  Card, Button, Typography, Space, Row, Col, DatePicker, Select,
  Form, Divider, List, Spin, message, Empty, Collapse, Table, Tag,
  Alert, Statistic
} from 'antd';
import {
  FileTextOutlined, BarChartOutlined, DownloadOutlined,
  FileExcelOutlined, FilePdfOutlined, FileSearchOutlined,
  CalculatorOutlined, BankOutlined, ProfileOutlined,
  RightCircleOutlined, FundOutlined, ToolOutlined,
  BookOutlined, AuditOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

const fmt = (val) => parseFloat(val || 0).toLocaleString('fr-MA', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});

const ReportsList = () => {
  const [form] = Form.useForm();
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleReportSelect = (reportType) => {
    setSelectedReport(reportType);
    setReport(null);
    setError(null);
    form.resetFields();
  };

  // ── Génération des rapports via API réelles ──
  const handleGenerateReport = async (values) => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      let url = '';
      let params = {};
      const dateRange = values.date_range;
      const singleDate = values.date;

      switch (selectedReport) {
        case 'balance':
          url = '/api/accounting/trial-balance/';
          if (dateRange) {
            params.start_date = dateRange[0].format('YYYY-MM-DD');
            params.end_date = dateRange[1].format('YYYY-MM-DD');
          }
          break;
        case 'general_ledger':
          url = '/api/accounting/general-ledger/';
          if (dateRange) {
            params.start_date = dateRange[0].format('YYYY-MM-DD');
            params.end_date = dateRange[1].format('YYYY-MM-DD');
          }
          break;
        case 'balance_sheet':
          url = '/api/accounting/balance-sheet/';
          if (singleDate) params.date = singleDate.format('YYYY-MM-DD');
          break;
        case 'income_statement':
          url = '/api/accounting/income-statement/';
          if (dateRange) {
            params.start_date = dateRange[0].format('YYYY-MM-DD');
            params.end_date = dateRange[1].format('YYYY-MM-DD');
          }
          break;
        case 'tax_report':
          url = '/api/accounting/vat-declaration/';
          if (dateRange) {
            params.start_date = dateRange[0].format('YYYY-MM-DD');
            params.end_date = dateRange[1].format('YYYY-MM-DD');
          }
          break;
        case 'esg':
          url = '/api/accounting/reports/esg/';
          if (dateRange) {
            params.start_date = dateRange[0].format('YYYY-MM-DD');
            params.end_date = dateRange[1].format('YYYY-MM-DD');
          }
          break;
        case 'asset_schedule':
          url = '/api/accounting/reports/asset-schedule/';
          if (singleDate) params.date = singleDate.format('YYYY-MM-DD');
          break;
        case 'journal_officiel':
          url = '/api/accounting/reports/journal/';
          if (dateRange) {
            params.start_date = dateRange[0].format('YYYY-MM-DD');
            params.end_date = dateRange[1].format('YYYY-MM-DD');
          }
          break;
        default:
          message.warning('Rapport non encore implémenté');
          setLoading(false);
          return;
      }

      const res = await axios.get(url, { params });
      setReport({ type: selectedReport, data: res.data });
      message.success('Rapport généré avec succès');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message;
      setError(`Erreur: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Export PDF / Excel ──
  const handleExport = async (format) => {
    setExporting(true);
    try {
      let url = '';
      let params = { format };
      const values = form.getFieldsValue();
      const dateRange = values.date_range;
      const singleDate = values.date;

      if (dateRange) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      if (singleDate) {
        params.date = singleDate.format('YYYY-MM-DD');
      }

      switch (selectedReport) {
        case 'balance':
          url = '/api/accounting/trial-balance/export/';
          break;
        case 'general_ledger':
          url = '/api/accounting/general-ledger/export/';
          break;
        case 'balance_sheet':
          url = '/api/accounting/financial-statements/export/';
          params.type = 'balance_sheet';
          break;
        case 'income_statement':
          url = '/api/accounting/financial-statements/export/';
          params.type = 'income_statement';
          break;
        case 'tax_report':
          url = '/api/accounting/vat-declaration/export/';
          break;
        default:
          message.warning('Export non disponible pour ce rapport');
          setExporting(false);
          return;
      }

      const res = await axios.get(url, { params, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      link.download = `${selectedReport}_${moment().format('YYYY-MM-DD')}.${ext}`;
      link.click();
      URL.revokeObjectURL(link.href);
      message.success(`Export ${format.toUpperCase()} téléchargé`);
    } catch (err) {
      message.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // ── Configuration des rapports ──
  const reportCategories = [
    {
      key: '1', header: 'Rapports standards',
      items: [
        { key: 'balance', title: 'Balance des comptes', icon: <ProfileOutlined />, hasExport: true },
        { key: 'general_ledger', title: 'Grand livre', icon: <FileTextOutlined />, hasExport: true },
        { key: 'journal_officiel', title: 'Journal centralisé', icon: <BookOutlined />, hasExport: false },
      ]
    },
    {
      key: '2', header: 'États financiers',
      items: [
        { key: 'balance_sheet', title: 'Bilan', icon: <BankOutlined />, hasExport: true },
        { key: 'income_statement', title: 'Compte de résultat (CPC)', icon: <CalculatorOutlined />, hasExport: true },
        { key: 'esg', title: 'État des Soldes de Gestion (ESG)', icon: <FundOutlined />, hasExport: false },
        { key: 'tax_report', title: 'Déclaration de TVA', icon: <BarChartOutlined />, hasExport: true },
      ]
    },
    {
      key: '3', header: 'Immobilisations & Analyses',
      items: [
        { key: 'asset_schedule', title: 'Tableau des immobilisations', icon: <ToolOutlined />, hasExport: false },
        { key: 'aged_receivable', title: 'Balance âgée clients', icon: <AuditOutlined />, hasExport: false },
        { key: 'aged_payable', title: 'Balance âgée fournisseurs', icon: <AuditOutlined />, hasExport: false },
      ]
    }
  ];

  const getReportConfig = () => reportCategories.flatMap(c => c.items).find(i => i.key === selectedReport);

  const getReportTitle = (key) => {
    const item = reportCategories.flatMap(c => c.items).find(i => i.key === key);
    return item ? item.title : 'Rapport';
  };

  // ── Formulaires d'options par type de rapport ──
  const renderOptions = () => {
    const usesDateRange = ['balance', 'general_ledger', 'income_statement', 'tax_report', 'esg', 'journal_officiel'];
    const usesSingleDate = ['balance_sheet', 'asset_schedule'];
    const usesAgedOptions = ['aged_receivable', 'aged_payable'];

    if (usesDateRange.includes(selectedReport)) {
      return (
        <Form.Item name="date_range" label="Période"
          rules={[{ required: true, message: 'Sélectionnez une période' }]}
          initialValue={[moment().startOf('year'), moment()]}>
          <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      );
    }

    if (usesSingleDate.includes(selectedReport)) {
      return (
        <Form.Item name="date" label="Date" initialValue={moment()}
          rules={[{ required: true, message: 'Sélectionnez une date' }]}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      );
    }

    if (usesAgedOptions.includes(selectedReport)) {
      return (
        <>
          <Form.Item name="date" label="Date d'analyse" initialValue={moment()}
            rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="periods" label="Tranches (jours)" initialValue="30,60,90,120">
            <Select>
              <Option value="30,60,90,120">30 - 60 - 90 - 120</Option>
              <Option value="15,30,45,60,90">15 - 30 - 45 - 60 - 90</Option>
            </Select>
          </Form.Item>
        </>
      );
    }

    return null;
  };

  // ── Rendu des données de chaque rapport ──
  const renderReportData = () => {
    if (!report || !report.data) return null;
    const d = report.data;

    switch (report.type) {

      // ── Balance des comptes ──
      case 'balance':
        return (
          <Table dataSource={d.accounts || []} pagination={false} size="small" rowKey="code"
            columns={[
              { title: 'Code', dataIndex: 'code', width: 80 },
              { title: 'Compte', dataIndex: 'name' },
              { title: 'Débit', dataIndex: 'debit', align: 'right', render: v => fmt(v) },
              { title: 'Crédit', dataIndex: 'credit', align: 'right', render: v => fmt(v) },
              { title: 'Solde', dataIndex: 'balance', align: 'right',
                render: v => <Text strong style={{ color: parseFloat(v) < 0 ? '#e53e3e' : '#2d3748' }}>{fmt(v)}</Text>
              },
            ]} />
        );

      // ── Grand livre ──
      case 'general_ledger':
        return (d.accounts || []).map((acct, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <Text strong style={{ fontSize: 14 }}>{acct.code} — {acct.name}</Text>
            <Table dataSource={acct.entries || []} pagination={false} size="small"
              rowKey={(_, idx) => idx}
              columns={[
                { title: 'Date', dataIndex: 'date', width: 100 },
                { title: 'Journal', dataIndex: 'journal', width: 60 },
                { title: 'N° pièce', dataIndex: 'entry_name', width: 120 },
                { title: 'Libellé', dataIndex: 'label' },
                { title: 'Débit', dataIndex: 'debit', align: 'right', render: v => parseFloat(v) > 0 ? fmt(v) : '' },
                { title: 'Crédit', dataIndex: 'credit', align: 'right', render: v => parseFloat(v) > 0 ? fmt(v) : '' },
              ]}
              summary={() => (
                <Table.Summary.Row style={{ fontWeight: 700, background: '#f7fafc' }}>
                  <Table.Summary.Cell index={0} colSpan={4}>Solde</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} colSpan={2} align="right">
                    {fmt(acct.balance)}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )} />
          </div>
        ));

      // ── Bilan ──
      case 'balance_sheet':
        return (
          <Row gutter={24}>
            <Col span={12}>
              <Title level={5}>Actif</Title>
              <Table dataSource={d.assets || []} pagination={false} size="small" rowKey="code"
                columns={[
                  { title: 'Code', dataIndex: 'code', width: 80 },
                  { title: 'Compte', dataIndex: 'name' },
                  { title: 'Montant', dataIndex: 'balance', align: 'right', render: v => fmt(v) },
                ]} />
              <div style={{ textAlign: 'right', fontWeight: 700, padding: '8px 16px', fontSize: 15, background: '#ebf8ff' }}>
                Total Actif : {fmt(d.total_assets)} MAD
              </div>
            </Col>
            <Col span={12}>
              <Title level={5}>Passif</Title>
              <Table dataSource={d.liabilities || []} pagination={false} size="small" rowKey="code"
                columns={[
                  { title: 'Code', dataIndex: 'code', width: 80 },
                  { title: 'Compte', dataIndex: 'name' },
                  { title: 'Montant', dataIndex: 'balance', align: 'right', render: v => fmt(v) },
                ]} />
              <div style={{ textAlign: 'right', fontWeight: 700, padding: '8px 16px', fontSize: 15, background: '#f0fff4' }}>
                Total Passif : {fmt(d.total_liabilities)} MAD
              </div>
            </Col>
          </Row>
        );

      // ── Compte de résultat (CPC) ──
      case 'income_statement':
        return (
          <>
            <Row gutter={24}>
              <Col span={12}>
                <Title level={5}>Produits</Title>
                <Table dataSource={d.income || []} pagination={false} size="small" rowKey="code"
                  columns={[
                    { title: 'Code', dataIndex: 'code', width: 80 },
                    { title: 'Compte', dataIndex: 'name' },
                    { title: 'Montant', dataIndex: 'balance', align: 'right', render: v => fmt(v) },
                  ]} />
                <div style={{ textAlign: 'right', fontWeight: 700, padding: '8px 16px' }}>
                  Total Produits : {fmt(d.total_income)} MAD
                </div>
              </Col>
              <Col span={12}>
                <Title level={5}>Charges</Title>
                <Table dataSource={d.expenses || []} pagination={false} size="small" rowKey="code"
                  columns={[
                    { title: 'Code', dataIndex: 'code', width: 80 },
                    { title: 'Compte', dataIndex: 'name' },
                    { title: 'Montant', dataIndex: 'balance', align: 'right', render: v => fmt(v) },
                  ]} />
                <div style={{ textAlign: 'right', fontWeight: 700, padding: '8px 16px' }}>
                  Total Charges : {fmt(d.total_expenses)} MAD
                </div>
              </Col>
            </Row>
            <Divider />
            <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700,
              color: parseFloat(d.net_income) >= 0 ? '#276749' : '#e53e3e' }}>
              Résultat net : {fmt(d.net_income)} MAD
            </div>
          </>
        );

      // ── TVA ──
      case 'tax_report':
        return (
          <>
            {d.collected && (
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>TVA collectée</Title>
                <Table dataSource={d.collected || []} pagination={false} size="small" rowKey="tax_name"
                  columns={[
                    { title: 'Taxe', dataIndex: 'tax_name' },
                    { title: 'Base HT', dataIndex: 'base_amount', align: 'right', render: v => fmt(v) },
                    { title: 'TVA', dataIndex: 'tax_amount', align: 'right', render: v => fmt(v) },
                  ]} />
              </div>
            )}
            {d.deductible && (
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>TVA déductible</Title>
                <Table dataSource={d.deductible || []} pagination={false} size="small" rowKey="tax_name"
                  columns={[
                    { title: 'Taxe', dataIndex: 'tax_name' },
                    { title: 'Base HT', dataIndex: 'base_amount', align: 'right', render: v => fmt(v) },
                    { title: 'TVA', dataIndex: 'tax_amount', align: 'right', render: v => fmt(v) },
                  ]} />
              </div>
            )}
            <Divider />
            <Row gutter={16} justify="center">
              <Col><Statistic title="TVA collectée" value={fmt(d.total_collected)} suffix="MAD" /></Col>
              <Col><Statistic title="TVA déductible" value={fmt(d.total_deductible)} suffix="MAD" /></Col>
              <Col>
                <Statistic title="TVA à payer" value={fmt(d.vat_due)}  suffix="MAD"
                  valueStyle={{ color: parseFloat(d.vat_due) > 0 ? '#e53e3e' : '#276749', fontWeight: 700 }} />
              </Col>
            </Row>
          </>
        );

      // ── ESG ──
      case 'esg':
        return (
          <>
            <Table dataSource={d.tfr || []} pagination={false} size="small" rowKey="label"
              columns={[
                { title: 'Libellé', dataIndex: 'label',
                  render: (v, r) => (
                    <span style={{
                      fontWeight: r.is_total ? 700 : 400,
                      color: r.is_total ? '#1a365d' : '#2d3748',
                      paddingLeft: r.is_total ? 0 : 20
                    }}>
                      {r.sign === '-' ? '(−) ' : ''}{v}
                    </span>
                  )
                },
                { title: 'Montant (MAD)', dataIndex: 'value', align: 'right', width: 180,
                  render: (v, r) => (
                    <span style={{
                      fontWeight: r.is_total ? 700 : 400,
                      color: parseFloat(v) < 0 ? '#e53e3e' : '#2d3748',
                      fontSize: r.is_total ? 14 : 13
                    }}>
                      {fmt(v)}
                    </span>
                  )
                },
              ]} />
            <Divider />
            <Title level={5}>Capacité d'Autofinancement (CAF)</Title>
            <Row gutter={16}>
              <Col span={6}><Card size="small"><Text type="secondary">Résultat net</Text><br /><Text strong>{fmt(d.caf?.resultat_net)}</Text></Card></Col>
              <Col span={6}><Card size="small"><Text type="secondary">+ Dotations</Text><br /><Text strong>{fmt(d.caf?.dotations)}</Text></Card></Col>
              <Col span={6}><Card size="small"><Text type="secondary">− Reprises</Text><br /><Text strong>{fmt(d.caf?.reprises)}</Text></Card></Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#ebf8ff' }}>
                  <Text type="secondary">= CAF</Text><br />
                  <Text strong style={{ fontSize: 18, color: '#2b6cb0' }}>{fmt(d.caf?.caf)}</Text>
                </Card>
              </Col>
            </Row>
          </>
        );

      // ── Tableau des immobilisations ──
      case 'asset_schedule':
        return (
          <>
            {(d.categories || []).map((cat, i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                <Title level={5}>
                  {cat.name}
                  <Tag style={{ marginLeft: 8 }}>{cat.method === 'linear' ? 'Linéaire' : 'Dégressif'}</Tag>
                  <Tag>{cat.duration} ans</Tag>
                </Title>
                <Table dataSource={cat.assets} pagination={false} size="small" rowKey="id"
                  columns={[
                    { title: 'Code', dataIndex: 'code', width: 80 },
                    { title: 'Libellé', dataIndex: 'name' },
                    { title: 'Date acq.', dataIndex: 'acquisition_date', width: 100,
                      render: v => v ? moment(v).format('DD/MM/YYYY') : '—' },
                    { title: 'Valeur acq.', dataIndex: 'acquisition_value', align: 'right', render: v => fmt(v) },
                    { title: 'Amort. cumulé', dataIndex: 'cumulated_depreciation', align: 'right', render: v => fmt(v) },
                    { title: 'Dotation exercice', dataIndex: 'year_depreciation', align: 'right', render: v => fmt(v) },
                    { title: 'VNC', dataIndex: 'net_value', align: 'right',
                      render: v => <Text strong>{fmt(v)}</Text> },
                  ]}
                  summary={() => (
                    <Table.Summary.Row style={{ fontWeight: 700, background: '#f7fafc' }}>
                      <Table.Summary.Cell index={0} colSpan={3}>Total {cat.name}</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">{fmt(cat.totals?.acquisition_value)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">{fmt(cat.totals?.cumulated_depreciation)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">{fmt(cat.totals?.year_depreciation)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">{fmt(cat.totals?.net_value)}</Table.Summary.Cell>
                    </Table.Summary.Row>
                  )} />
              </div>
            ))}
            <Divider />
            <Row gutter={16}>
              <Col span={6}><Card size="small"><Text type="secondary">Total acquisitions</Text><br /><Text strong>{fmt(d.grand_totals?.acquisition_value)}</Text></Card></Col>
              <Col span={6}><Card size="small"><Text type="secondary">Amort. cumulés</Text><br /><Text strong>{fmt(d.grand_totals?.cumulated_depreciation)}</Text></Card></Col>
              <Col span={6}><Card size="small"><Text type="secondary">Dotation exercice</Text><br /><Text strong>{fmt(d.grand_totals?.year_depreciation)}</Text></Card></Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#f0fff4' }}>
                  <Text type="secondary">VNC totale</Text><br />
                  <Text strong style={{ fontSize: 18, color: '#276749' }}>{fmt(d.grand_totals?.net_value)}</Text>
                </Card>
              </Col>
            </Row>
          </>
        );

      // ── Journal centralisé ──
      case 'journal_officiel':
        return (
          <>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              {d.entries_count} écriture(s) validée(s)
            </Text>
            {(d.entries || []).map((entry, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ background: '#edf2f7', padding: '6px 12px', borderRadius: 6, marginBottom: 4 }}>
                  <Text strong>{moment(entry.date).format('DD/MM/YYYY')}</Text>
                  {' — '}<Tag>{entry.journal}</Tag>
                  {' '}<Text>{entry.number}</Text>
                  {entry.ref && <Text type="secondary"> | Réf: {entry.ref}</Text>}
                </div>
                <Table dataSource={entry.lines} pagination={false} size="small"
                  rowKey={(_, idx) => `${i}-${idx}`} showHeader={i === 0}
                  columns={[
                    { title: 'Code', dataIndex: 'account_code', width: 80 },
                    { title: 'Compte', dataIndex: 'account_name' },
                    { title: 'Libellé', dataIndex: 'label' },
                    { title: 'Débit', dataIndex: 'debit', align: 'right',
                      render: v => parseFloat(v) > 0 ? fmt(v) : '' },
                    { title: 'Crédit', dataIndex: 'credit', align: 'right',
                      render: v => parseFloat(v) > 0 ? fmt(v) : '' },
                  ]} />
              </div>
            ))}
            <Divider />
            <Row justify="end">
              <Col>
                <Text strong style={{ fontSize: 15 }}>
                  Totaux — Débit: {fmt(d.totals?.debit)} MAD | Crédit: {fmt(d.totals?.credit)} MAD
                </Text>
              </Col>
            </Row>
          </>
        );

      default:
        return <Empty description="Rapport non encore implémenté" />;
    }
  };

  const config = getReportConfig();

  return (
    <div>
      <Title level={2}>États et rapports comptables</Title>

      <Row gutter={16}>
        {/* ── Panneau gauche : sélection du rapport ── */}
        <Col span={7}>
          <Card>
            <Title level={4}>Rapports disponibles</Title>
            <Divider style={{ margin: '12px 0' }} />
            <Collapse defaultActiveKey={['1', '2', '3']}>
              {reportCategories.map(cat => (
                <Panel header={cat.header} key={cat.key}>
                  <List size="small" dataSource={cat.items}
                    renderItem={item => (
                      <List.Item
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedReport === item.key ? '#e6f7ff' : 'inherit',
                          borderRadius: 6, padding: '8px 10px', marginBottom: 4,
                          border: selectedReport === item.key ? '1px solid #91d5ff' : '1px solid transparent'
                        }}
                        onClick={() => handleReportSelect(item.key)}>
                        <Space>
                          {item.icon}
                          <Text style={{ fontWeight: selectedReport === item.key ? 600 : 400 }}>{item.title}</Text>
                        </Space>
                        {selectedReport === item.key && <RightCircleOutlined style={{ color: '#1890ff' }} />}
                      </List.Item>
                    )} />
                </Panel>
              ))}
            </Collapse>
          </Card>
        </Col>

        {/* ── Panneau droit : paramètres + résultats ── */}
        <Col span={17}>
          <Card style={{ marginBottom: 16 }}>
            {selectedReport ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Space>
                    {config && config.icon}
                    <Title level={4} style={{ margin: 0 }}>{getReportTitle(selectedReport)}</Title>
                  </Space>
                  {report && config?.hasExport && (
                    <Space>
                      <Button icon={<FileExcelOutlined />} loading={exporting}
                        onClick={() => handleExport('excel')}>Excel</Button>
                      <Button icon={<FilePdfOutlined />} loading={exporting}
                        onClick={() => handleExport('pdf')}>PDF</Button>
                    </Space>
                  )}
                </div>
                <Divider style={{ margin: '0 0 16px 0' }} />

                <Form form={form} layout="vertical" onFinish={handleGenerateReport}>
                  <Row gutter={16} align="bottom">
                    <Col flex="auto">{renderOptions()}</Col>
                    <Col>
                      <Form.Item label=" ">
                        <Button type="primary" htmlType="submit" loading={loading}
                          icon={<BarChartOutlined />}>
                          Générer
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </>
            ) : (
              <Empty description="Sélectionnez un rapport dans la liste" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />}
          {loading && <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}

          {report && (
            <Card title={
              <Space>
                {config && config.icon}
                <span>{getReportTitle(report.type)}</span>
                <Tag color="green">Généré le {moment().format('DD/MM/YYYY à HH:mm')}</Tag>
              </Space>
            }>
              {renderReportData()}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default ReportsList;
