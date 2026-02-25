// src/components/accounting/CashForecastChart.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Statistic, Spin, Alert, Select, Typography,
  Space, Table, Tag, Divider, Button
} from 'antd';
import {
  ArrowLeftOutlined, ArrowUpOutlined, ArrowDownOutlined,
  BankOutlined, WarningOutlined, DollarOutlined
} from '@ant-design/icons';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import axios from '../../utils/axiosConfig';
import { useCurrency } from '../../context/CurrencyContext';

const { Title, Text } = Typography;
const { Option } = Select;

const CashForecastChart = () => {
  const navigate = useNavigate();
  const { currencyCode } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [weeks, setWeeks] = useState(12);

  useEffect(() => {
    fetchForecast();
  }, [weeks]);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/accounting/cash-forecast/?weeks=${weeks}`);
      setData(response.data);
    } catch (err) {
      console.error('Erreur prévision trésorerie:', err);
      setError('Impossible de charger la prévision de trésorerie.');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div style={{
        background: '#fff', border: '1px solid #d9d9d9',
        padding: 12, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: 8 }}>
          {d.label} ({d.start_date?.substring(5)} → {d.end_date?.substring(5)})
        </p>
        <p style={{ color: '#52c41a' }}>Encaissements : {formatAmount(d.inflows)} {currencyCode}</p>
        <p style={{ color: '#ff4d4f' }}>Décaissements : {formatAmount(d.outflows)} {currencyCode}</p>
        {d.salaries > 0 && (
          <p style={{ color: '#fa8c16' }}>Salaires : {formatAmount(d.salaries)} {currencyCode}</p>
        )}
        <Divider style={{ margin: '4px 0' }} />
        <p style={{ fontWeight: 'bold', color: d.balance >= 0 ? '#52c41a' : '#ff4d4f' }}>
          Solde prévu : {formatAmount(d.balance)} {currencyCode}
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Calcul de la prévision..." />
      </div>
    );
  }

  if (error) {
    return <Alert message="Erreur" description={error} type="error" showIcon />;
  }

  if (!data) return null;

  const { summary, weekly_forecast, bank_accounts, current_balance } = data;
  const minBalance = Math.min(...weekly_forecast.map(w => w.balance));
  const hasNegativeBalance = minBalance < 0;

  // Données pour le graphique barres flux
  const flowData = weekly_forecast.map(w => ({
    ...w,
    outflows_neg: -(w.outflows + w.salaries),
  }));

  // Colonnes tableau détaillé
  const columns = [
    {
      title: 'Semaine', dataIndex: 'label', key: 'label', width: 80,
      render: (text, record) => (
        <span>{text}<br /><Text type="secondary" style={{ fontSize: 11 }}>{record.start_date?.substring(5)}</Text></span>
      ),
    },
    {
      title: `Encaissements (${currencyCode})`, dataIndex: 'inflows', key: 'inflows',
      align: 'right',
      render: (val) => val > 0 ? <Text type="success">{formatAmount(val)}</Text> : '-',
    },
    {
      title: `Décaissements (${currencyCode})`, dataIndex: 'outflows', key: 'outflows',
      align: 'right',
      render: (val) => val > 0 ? <Text type="danger">{formatAmount(val)}</Text> : '-',
    },
    {
      title: `Salaires (${currencyCode})`, dataIndex: 'salaries', key: 'salaries',
      align: 'right',
      render: (val) => val > 0 ? <Text style={{ color: '#fa8c16' }}>{formatAmount(val)}</Text> : '-',
    },
    {
      title: 'Net', dataIndex: 'net', key: 'net', align: 'right',
      render: (val) => (
        <Text strong type={val >= 0 ? 'success' : 'danger'}>
          {val >= 0 ? '+' : ''}{formatAmount(val)}
        </Text>
      ),
    },
    {
      title: `Solde prévu (${currencyCode})`, dataIndex: 'balance', key: 'balance',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: val >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {formatAmount(val)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/accounting')}>
            Retour
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            <DollarOutlined /> Prévision de trésorerie
          </Title>
        </Space>
        <Select value={weeks} onChange={setWeeks} style={{ width: 180 }}>
          <Option value={4}>4 semaines</Option>
          <Option value={8}>8 semaines</Option>
          <Option value={12}>12 semaines (3 mois)</Option>
          <Option value={26}>26 semaines (6 mois)</Option>
        </Select>
      </div>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="Solde actuel"
              value={current_balance}
              precision={2}
              suffix={currencyCode}
              prefix={<BankOutlined />}
              valueStyle={{ color: current_balance >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Encaissements prévus"
              value={summary.total_inflows}
              precision={2}
              suffix={currencyCode}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Décaissements prévus"
              value={summary.total_outflows}
              precision={2}
              suffix={currencyCode}
              prefix={<ArrowDownOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Salaires prévus"
              value={summary.total_salaries}
              precision={2}
              suffix={currencyCode}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Solde projeté"
              value={summary.projected_balance}
              precision={2}
              suffix={currencyCode}
              valueStyle={{ color: summary.projected_balance >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Créances échues"
              value={summary.overdue_receivables}
              precision={2}
              suffix={currencyCode}
              prefix={<WarningOutlined />}
              valueStyle={{ color: summary.overdue_receivables > 0 ? '#fa8c16' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {hasNegativeBalance && (
        <Alert
          message="Attention : solde prévisionnel négatif"
          description={`Le solde de trésorerie pourrait devenir négatif (minimum prévu : ${formatAmount(minBalance)} ${currencyCode}). Anticipez vos encaissements ou décalez vos décaissements.`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Graphique évolution du solde */}
      <Card title="Évolution du solde prévisionnel" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={weekly_forecast}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#ff4d4f" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#1890ff"
              fill="#e6f7ff"
              strokeWidth={2}
              name="Solde prévu"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Graphique flux entrants/sortants */}
      <Card title="Flux de trésorerie par semaine" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={flowData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine y={0} stroke="#000" />
            <Bar dataKey="inflows" name="Encaissements" fill="#52c41a" />
            <Bar dataKey="outflows_neg" name="Décaissements + Salaires" fill="#ff4d4f" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Comptes bancaires */}
      {bank_accounts.length > 0 && (
        <Card title="Comptes bancaires" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            {bank_accounts.map(ba => (
              <Col span={8} key={ba.id}>
                <Card size="small">
                  <Statistic
                    title={ba.name}
                    value={ba.balance}
                    precision={2}
                    suffix={currencyCode}
                    prefix={<BankOutlined />}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>RIB : {ba.rib}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Tableau détaillé */}
      <Card title="Détail hebdomadaire">
        <Table
          columns={columns}
          dataSource={weekly_forecast}
          rowKey="week"
          pagination={false}
          size="small"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default CashForecastChart;
