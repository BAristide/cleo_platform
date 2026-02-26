// src/components/accounting/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, BookOutlined, AccountBookOutlined, CalendarOutlined,
  BankOutlined, BuildOutlined, CalculatorOutlined, BarChartOutlined, DollarOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/accounting">Tableau de bord</Link> },
  { key: 'accounts', icon: <BookOutlined />, label: <Link to="/accounting/accounts">Plan comptable</Link> },
  {
    key: 'entries-group', icon: <AccountBookOutlined />, label: 'Écritures comptables',
    children: [
      { key: 'journals', label: <Link to="/accounting/journals">Journaux</Link> },
      { key: 'entries', label: <Link to="/accounting/entries">Écritures</Link> },
    ],
  },
  {
    key: 'fiscal-group', icon: <CalendarOutlined />, label: 'Périodes fiscales',
    children: [
      { key: 'fiscal-years', label: <Link to="/accounting/fiscal-years">Exercices</Link> },
      { key: 'fiscal-periods', label: <Link to="/accounting/fiscal-periods">Périodes</Link> },
    ],
  },
  { key: 'bank-statements', icon: <BankOutlined />, label: <Link to="/accounting/bank-statements">Relevés bancaires</Link> },
  { key: 'cash-forecast', icon: <BankOutlined />, label: <Link to="/accounting/cash-forecast">Prévision trésorerie</Link> },
  {
    key: 'assets-group', icon: <BuildOutlined />, label: 'Immobilisations',
    children: [
      { key: 'assets', label: <Link to="/accounting/assets">Actifs</Link> },
      { key: 'asset-depreciations', label: <Link to="/accounting/asset-depreciations">Amortissements</Link> },
    ],
  },
  { key: 'taxes', icon: <CalculatorOutlined />, label: <Link to="/accounting/taxes">Taxes & TVA</Link> },
  { key: 'reports', icon: <BarChartOutlined />, label: <Link to="/accounting/reports">États et rapports</Link> },
  { key: 'currencies', icon: <DollarOutlined />, label: <Link to="/accounting/currencies">Devises</Link> },
];

const breadcrumbMap = {
  accounts: 'Plan comptable', journals: 'Journaux', entries: 'Écritures',
  'fiscal-years': 'Exercices', 'fiscal-periods': 'Périodes',
  'bank-statements': 'Relevés bancaires', 'cash-forecast': 'Prévision trésorerie',
  assets: 'Actifs', 'asset-depreciations': 'Amortissements',
  taxes: 'Taxes & TVA', reports: 'États et rapports', currencies: 'Devises',
};

const AccountingLayout = ({ children }) => (
  <ModuleLayout moduleTitle="Comptabilité" basePath="/accounting" menuItems={menuItems} breadcrumbMap={breadcrumbMap}>
    {children}
  </ModuleLayout>
);

export default AccountingLayout;
