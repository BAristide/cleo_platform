// src/components/hr/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, HomeOutlined, CalendarOutlined, WalletOutlined,
  SafetyCertificateOutlined, ExclamationCircleOutlined, TrophyOutlined,
  IdcardOutlined, BranchesOutlined, UsergroupAddOutlined,
  NotificationOutlined, CarOutlined, ScheduleOutlined,
  ToolOutlined, BookOutlined, BankOutlined, SettingOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';
import './Layout.css';

const menuItems = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: <Link to="/hr">Tableau de bord</Link>,
  },
  {
    type: 'group',
    label: 'Espace personnel',
    children: [
      { key: 'portal',       icon: <HomeOutlined />,              label: <Link to="/hr/portal">Mon espace</Link> },
      {
        key: 'leaves',
        icon: <CalendarOutlined />,
        label: 'Congés',
        children: [
          { key: 'leaves-list',     label: <Link to="/hr/leaves">Mes congés</Link> },
          { key: 'leaves-calendar', label: <Link to="/hr/leaves/calendar">Calendrier équipe</Link> },
        ],
      },
      { key: 'expenses',     icon: <WalletOutlined />,            label: <Link to="/hr/expenses">Notes de frais</Link> },
      { key: 'certificates', icon: <SafetyCertificateOutlined />, label: <Link to="/hr/certificates">Attestations</Link> },
      { key: 'complaints',   icon: <ExclamationCircleOutlined />, label: <Link to="/hr/complaints">Doléances</Link> },
    ],
  },
  {
    type: 'group',
    label: 'Organisation',
    children: [
      { key: 'employees',   icon: <IdcardOutlined />,       label: <Link to="/hr/employees">Employés</Link> },
      { key: 'departments', icon: <BranchesOutlined />,     label: <Link to="/hr/departments">Départements</Link> },
      { key: 'job-titles',  icon: <UsergroupAddOutlined />, label: <Link to="/hr/job-titles">Postes</Link> },
    ],
  },
  {
    type: 'group',
    label: 'Activités',
    children: [
      { key: 'missions',       icon: <CarOutlined />,      label: <Link to="/hr/missions">Missions</Link> },
      { key: 'availabilities', icon: <ScheduleOutlined />, label: <Link to="/hr/availabilities">Disponibilités</Link> },
    ],
  },
  {
    type: 'group',
    label: 'Développement',
    children: [
      { key: 'skills',           icon: <ToolOutlined />, label: <Link to="/hr/skills">Compétences</Link> },
      { key: 'training-courses', icon: <BookOutlined />, label: <Link to="/hr/training-courses">Formations</Link> },
      { key: 'training-plans',   icon: <BankOutlined />, label: <Link to="/hr/training-plans">Plans de formation</Link> },
    ],
  },
  {
    type: 'group',
    label: 'Communication',
    children: [
      { key: 'announcements', icon: <NotificationOutlined />, label: <Link to="/hr/announcements">Annonces</Link> },
      { key: 'rewards',       icon: <TrophyOutlined />,       label: <Link to="/hr/rewards">Récompenses</Link> },
    ],
  },
  {
    type: 'group',
    label: 'Configuration',
    children: [
      { key: 'public-holidays', icon: <SettingOutlined />, label: <Link to="/hr/public-holidays">Jours feries</Link> },
    ],
  },
];

const breadcrumbMap = {
  portal:             'Mon espace',
  leaves:             'Congés',
  'leaves/calendar':  'Calendrier équipe',
  expenses:           'Notes de frais',
  certificates:       'Attestations',
  complaints:         'Doléances',
  rewards:            'Récompenses',
  employees:          'Employés',
  departments:        'Départements',
  'job-titles':       'Postes',
  missions:           'Missions',
  availabilities:     'Disponibilités',
  skills:             'Compétences',
  'training-courses': 'Formations',
  'training-plans':   'Plans de formation',
  announcements:      'Annonces',
  'public-holidays':  'Jours feries',
};

const HRLayout = ({ children }) => (
  <ModuleLayout moduleTitle="Module Ressources Humaines" basePath="/hr" menuItems={menuItems} breadcrumbMap={breadcrumbMap}>
    {children}
  </ModuleLayout>
);

export default HRLayout;
