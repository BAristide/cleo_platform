// src/components/recruitment/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, FileSearchOutlined, TeamOutlined, BarChartOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/recruitment">Tableau de bord</Link> },
  { key: 'job-openings', icon: <FileSearchOutlined />, label: <Link to="/recruitment/job-openings">Offres d'emploi</Link> },
  { key: 'applications', icon: <TeamOutlined />, label: <Link to="/recruitment/applications">Candidatures</Link> },
  { key: 'statistics', icon: <BarChartOutlined />, label: <Link to="/recruitment/statistics">Statistiques</Link> },
];

const breadcrumbMap = {
  'job-openings': "Offres d'emploi", applications: 'Candidatures',
  evaluations: 'Évaluations', statistics: 'Statistiques',
};

const RecruitmentLayout = ({ children }) => (
  <ModuleLayout moduleTitle="Module Recrutement" basePath="/recruitment" menuItems={menuItems} breadcrumbMap={breadcrumbMap}>
    {children}
  </ModuleLayout>
);

export default RecruitmentLayout;
