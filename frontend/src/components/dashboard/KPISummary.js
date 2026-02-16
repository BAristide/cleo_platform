// src/components/dashboard/KPISummary.js
import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  TeamOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  BankOutlined,
  UserOutlined,
  DollarOutlined
} from '@ant-design/icons';

const KPISummary = ({ stats }) => {
  // Formats des données extraites des différents modules basés sur les components Dashboard.js
  
  // CRM: stats.crm contient { contacts, companies, opportunities, pipeline }
  const crmOpportunities = stats.crm?.opportunities || 0;
  const crmPipeline = stats.crm?.pipeline || 0;
  
  // Sales: stats.sales contient { quotes: {count, amount}, orders: {count, amount}, invoices: {count, amount, paid, overdue} }
  const salesRevenue = stats.sales?.invoices?.amount || 0;
  const unpaidInvoices = stats.sales?.invoices?.count - (stats.sales?.invoices?.paid || 0) || 0;
  
  // HR: stats.general contient { total_employees, employees_by_department, employees_by_job_title }
  const hrEmployees = stats.hr?.general?.total_employees || 0;
  
  // Payroll
  const payrollTotal = stats.payroll?.current_period?.total_gross || 0;
  
  // Accounting
  const accountingActive = stats.accounting?.accounts?.active || 0;
  const accountingEntries = stats.accounting?.entries?.amount || 0;

  // Recruitment
  const recruitmentOpenings = stats.recruitment?.active_job_openings_count || 0;
  
  // Définir les KPIs qui seront affichés
  const kpis = [
    {
      title: "Opportunités (CRM)",
      value: crmOpportunities,
      prefix: <TeamOutlined />,
      suffix: "opportunités",
      precision: 0
    },
    {
      title: "Pipeline (CRM)",
      value: crmPipeline,
      prefix: <DollarOutlined />,
      suffix: "MAD",
      precision: 2
    },
    {
      title: "Chiffre d'affaires (Ventes)",
      value: salesRevenue,
      prefix: <ShoppingCartOutlined />,
      suffix: "MAD",
      precision: 2
    },
    {
      title: "Factures impayées",
      value: unpaidInvoices,
      prefix: <FileTextOutlined />,
      suffix: "factures",
      precision: 0
    },
    {
      title: "Employés actifs (RH)",
      value: hrEmployees,
      prefix: <UserOutlined />,
      suffix: "employés",
      precision: 0
    },
    {
      title: "Masse salariale (Paie)",
      value: payrollTotal,
      prefix: <DollarOutlined />,
      suffix: "MAD",
      precision: 2
    },
    {
      title: "Écritures (Comptabilité)",
      value: accountingEntries,
      prefix: <BankOutlined />,
      suffix: "MAD",
      precision: 2
    },
    {
      title: "Offres d'emploi actives",
      value: recruitmentOpenings,
      prefix: <TeamOutlined />,
      suffix: "offres",
      precision: 0
    }
  ];

  return (
    <Card title="Indicateurs clés de performance">
      <Row gutter={16}>
        {kpis.map((kpi, index) => (
          <Col span={6} key={index} style={{ marginBottom: 16 }}>
            <Statistic
              title={kpi.title}
              value={kpi.value}
              precision={kpi.precision}
              prefix={kpi.prefix}
              suffix={kpi.suffix}
            />
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default KPISummary;
