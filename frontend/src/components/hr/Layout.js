// src/components/hr/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, IdcardOutlined, BranchesOutlined, UsergroupAddOutlined,
  CarOutlined, ScheduleOutlined, ToolOutlined, BookOutlined, BankOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';
import './Layout.css';

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/hr">Tableau de bord</Link> },
  { key: 'employees', icon: <IdcardOutlined />, label: <Link to="/hr/employees">Employés</Link> },
  { key: 'departments', icon: <BranchesOutlined />, label: <Link to="/hr/departments">Départements</Link> },
  { key: 'job-titles', icon: <UsergroupAddOutlined />, label: <Link to="/hr/job-titles">Postes</Link> },
  { key: 'missions', icon: <CarOutlined />, label: <Link to="/hr/missions">Missions</Link> },
  { key: 'availabilities', icon: <ScheduleOutlined />, label: <Link to="/hr/availabilities">Disponibilités</Link> },
  { key: 'skills', icon: <ToolOutlined />, label: <Link to="/hr/skills">Compétences</Link> },
  { key: 'training-courses', icon: <BookOutlined />, label: <Link to="/hr/training-courses">Formations</Link> },
  { key: 'training-plans', icon: <BankOutlined />, label: <Link to="/hr/training-plans">Plans de formation</Link> },
];

const breadcrumbMap = {
  employees: 'Employés', departments: 'Départements', 'job-titles': 'Postes',
  missions: 'Missions', availabilities: 'Disponibilités', skills: 'Compétences',
  'training-courses': 'Formations', 'training-plans': 'Plans de formation',
};

const HRLayout = ({ children }) => (
  <ModuleLayout moduleTitle="Module Ressources Humaines" basePath="/hr" menuItems={menuItems} breadcrumbMap={breadcrumbMap}>
    {children}
  </ModuleLayout>
);

export default HRLayout;
