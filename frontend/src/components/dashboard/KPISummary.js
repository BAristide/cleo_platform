import React from 'react';
import {
  TeamOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  BankOutlined,
  UserOutlined,
  DollarOutlined,
  InboxOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { useCurrency } from '../../context/CurrencyContext';

const KPISummary = ({ stats }) => {
  const { currencySymbol, currencyCode } = useCurrency();

  const formatNumber = (val, precision = 0) => {
    if (val === null || val === undefined) return '0';
    return Number(val).toLocaleString('fr-FR', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  };

  const kpis = [
    {
      label: 'Chiffre d\'affaires',
      value: formatNumber(stats.sales?.invoices?.amount || 0, 2),
      suffix: currencyCode,
      color: 'kpi-green',
      icon: <ShoppingCartOutlined className="kpi-icon" />,
    },
    {
      label: 'Factures impayées',
      value: formatNumber((stats.sales?.invoices?.count || 0) - (stats.sales?.invoices?.paid || 0)),
      suffix: '',
      color: 'kpi-red',
      icon: <FileTextOutlined className="kpi-icon" />,
    },
    {
      label: 'Pipeline CRM',
      value: formatNumber(stats.crm?.pipeline || 0, 2),
      suffix: currencyCode,
      color: 'kpi-blue',
      icon: <DollarOutlined className="kpi-icon" />,
    },
    {
      label: 'Opportunités',
      value: formatNumber(stats.crm?.opportunities || 0),
      suffix: '',
      color: 'kpi-blue',
      icon: <TeamOutlined className="kpi-icon" />,
    },
    {
      label: 'Employés actifs',
      value: formatNumber(stats.hr?.general?.total_employees || 0),
      suffix: '',
      color: 'kpi-orange',
      icon: <UserOutlined className="kpi-icon" />,
    },
    {
      label: 'Masse salariale',
      value: formatNumber(stats.payroll?.current_period?.total_gross || 0, 2),
      suffix: currencyCode,
      color: 'kpi-purple',
      icon: <DollarOutlined className="kpi-icon" />,
    },
    {
      label: 'Écritures comptables',
      value: formatNumber(stats.accounting?.entries?.amount || 0, 2),
      suffix: currencyCode,
      color: 'kpi-indigo',
      icon: <BankOutlined className="kpi-icon" />,
    },
    {
      label: 'Produits en stock',
      value: formatNumber(stats.inventory?.total_products || 0),
      suffix: stats.inventory?.alerts_count > 0 ? `⚠ ${stats.inventory.alerts_count} alertes` : '',
      color: 'kpi-teal',
      icon: <InboxOutlined className="kpi-icon" />,
    },
  ];

  return (
    <div className="kpi-grid">
      {kpis.map((kpi, i) => (
        <div key={i} className={`kpi-card ${kpi.color}`}>
          {kpi.icon}
          <div className="kpi-label">{kpi.label}</div>
          <div>
            <span className="kpi-value">{kpi.value}</span>
            {kpi.suffix && <span className="kpi-suffix">{kpi.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KPISummary;
