// src/components/employee/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, CalendarOutlined, WalletOutlined,
  SafetyCertificateOutlined, ExclamationCircleOutlined, TrophyOutlined,
  NotificationOutlined, FileTextOutlined, BookOutlined, CheckSquareOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';

const menuItems = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: <Link to="/my-space">Tableau de bord</Link>,
  },
  {
    type: 'group',
    label: 'Mon activité',
    children: [
      {
        key: 'leaves',
        icon: <CalendarOutlined />,
        label: 'Congés',
        children: [
          { key: 'leaves-list', label: <Link to="/my-space/leaves">Mes congés</Link> },
          { key: 'leaves-calendar', label: <Link to="/my-space/leaves/calendar">Calendrier équipe</Link> },
        ],
      },
      { key: 'expenses', icon: <WalletOutlined />, label: <Link to="/my-space/expenses">Notes de frais</Link> },
      { key: 'certificates', icon: <SafetyCertificateOutlined />, label: <Link to="/my-space/certificates">Attestations</Link> },
      { key: 'complaints', icon: <ExclamationCircleOutlined />, label: <Link to="/my-space/complaints">Doléances</Link> },
    ],
  },
  {
    type: 'group',
    label: 'Développement',
    children: [
      { key: 'training', icon: <BookOutlined />, label: <Link to="/my-space/training">Formations</Link> },
    ],
  },
  {
    type: 'group',
    label: 'Approbations',
    children: [
      { key: 'approvals', icon: <CheckSquareOutlined />, label: <Link to="/my-space/approvals">Mes approbations</Link> },
    ],
  },
  {
    type: 'group',
    label: 'Mes documents',
    children: [
      { key: 'payslips', icon: <FileTextOutlined />, label: <Link to="/my-space/payslips">Bulletins de paie</Link> },
    ],
  },
  {
    type: 'group',
    label: 'Communication',
    children: [
      { key: 'announcements', icon: <NotificationOutlined />, label: <Link to="/my-space/announcements">Annonces</Link> },
      { key: 'rewards', icon: <TrophyOutlined />, label: <Link to="/my-space/rewards">Récompenses</Link> },
    ],
  },
];

const breadcrumbMap = {
  leaves: 'Congés',
  'leaves/calendar': 'Calendrier équipe',
  expenses: 'Notes de frais',
  certificates: 'Attestations',
  complaints: 'Doléances',
  training: 'Formations',
  approvals: 'Approbations',
  payslips: 'Bulletins de paie',
  announcements: 'Annonces',
  rewards: 'Récompenses',
};

const EmployeeLayout = ({ children }) => (
  <ModuleLayout
    moduleTitle="Mon Espace"
    basePath="/my-space"
    menuItems={menuItems}
    breadcrumbMap={breadcrumbMap}
  >
    {children}
  </ModuleLayout>
);

export default EmployeeLayout;
