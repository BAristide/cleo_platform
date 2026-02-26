// src/components/payroll/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, CalendarOutlined, CalculatorOutlined,
  FileTextOutlined, TeamOutlined, DollarOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/payroll">Tableau de bord</Link> },
  { key: 'periods', icon: <CalendarOutlined />, label: <Link to="/payroll/periods">Périodes de paie</Link> },
  { key: 'runs', icon: <CalculatorOutlined />, label: <Link to="/payroll/runs">Lancements de paie</Link> },
  { key: 'payslips', icon: <FileTextOutlined />, label: <Link to="/payroll/payslips">Bulletins de paie</Link> },
  { key: 'employee-payrolls', icon: <TeamOutlined />, label: <Link to="/payroll/employee-payrolls">Données employés</Link> },
  { key: 'advances', icon: <DollarOutlined />, label: <Link to="/payroll/advances">Acomptes</Link> },
];

const breadcrumbMap = {
  periods: 'Périodes de paie', runs: 'Lancements de paie', payslips: 'Bulletins de paie',
  'employee-payrolls': 'Données employés', advances: 'Acomptes',
};

const PayrollLayout = ({ children }) => (
  <ModuleLayout moduleTitle="Module Paie" basePath="/payroll" menuItems={menuItems} breadcrumbMap={breadcrumbMap}>
    {children}
  </ModuleLayout>
);

export default PayrollLayout;
