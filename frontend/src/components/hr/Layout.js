// src/components/hr/Layout.js
import React, { useState } from 'react';
import { Layout, Menu, Typography, Breadcrumb } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  TeamOutlined,
  BranchesOutlined,
  CarOutlined,
  ScheduleOutlined,
  BookOutlined,
  ToolOutlined,
  HomeOutlined,
  IdcardOutlined,
  BankOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons';
import './Layout.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const HRLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Déterminer le chemin actuel pour la navigation
  const selectedKey = location.pathname.split('/')[2] || 'dashboard';

  // Définir les éléments du fil d'Ariane
  const getBreadcrumbItems = () => {
    const paths = location.pathname.split('/').filter(i => i);
    const result = [];

    // Élément Home
    result.push(
      <Breadcrumb.Item key="home">
        <Link to="/">
          <HomeOutlined /> Accueil
        </Link>
      </Breadcrumb.Item>
    );

    // Élément HR
    result.push(
      <Breadcrumb.Item key="hr">
        <Link to="/hr">
          <TeamOutlined /> Ressources Humaines
        </Link>
      </Breadcrumb.Item>
    );

    // Autres éléments basés sur le chemin
    if (paths.length > 1 && paths[0] === 'hr') {
      const module = paths[1];
      if (module) {
        const moduleMap = {
          'dashboard': 'Tableau de bord',
          'employees': 'Employés',
          'departments': 'Départements',
          'job-titles': 'Postes',
          'missions': 'Missions',
          'availabilities': 'Disponibilités',
          'skills': 'Compétences',
          'training-courses': 'Formations',
          'training-plans': 'Plans de formation'
        };

        result.push(
          <Breadcrumb.Item key={module}>
            <Link to={`/hr/${module}`}>
              {moduleMap[module] || module}
            </Link>
          </Breadcrumb.Item>
        );
      }

      // Si c'est un détail d'élément
      if (paths.length > 2 && !['new', 'edit'].includes(paths[2])) {
        result.push(
          <Breadcrumb.Item key="detail">
            Détail {paths[2]}
          </Breadcrumb.Item>
        );
      }

      // Si c'est un nouveau ou édition
      if (paths.length > 2 && paths[2] === 'new') {
        result.push(
          <Breadcrumb.Item key="new">
            Nouveau
          </Breadcrumb.Item>
        );
      }

      if (paths.length > 3 && paths[3] === 'edit') {
        result.push(
          <Breadcrumb.Item key="edit">
            Modification
          </Breadcrumb.Item>
        );
      }
    }

    return result;
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/hr">Tableau de bord</Link>,
    },
    {
      key: 'employees',
      icon: <IdcardOutlined />,
      label: <Link to="/hr/employees">Employés</Link>,
    },
    {
      key: 'departments',
      icon: <BranchesOutlined />,
      label: <Link to="/hr/departments">Départements</Link>,
    },
    {
      key: 'job-titles',
      icon: <UsergroupAddOutlined />,
      label: <Link to="/hr/job-titles">Postes</Link>,
    },
    {
      key: 'missions',
      icon: <CarOutlined />,
      label: <Link to="/hr/missions">Missions</Link>,
    },
    {
      key: 'availabilities',
      icon: <ScheduleOutlined />,
      label: <Link to="/hr/availabilities">Disponibilités</Link>,
    },
    {
      key: 'skills',
      icon: <ToolOutlined />,
      label: <Link to="/hr/skills">Compétences</Link>,
    },
    {
      key: 'training-courses',
      icon: <BookOutlined />,
      label: <Link to="/hr/training-courses">Formations</Link>,
    },
    {
      key: 'training-plans',
      icon: <BankOutlined />,
      label: <Link to="/hr/training-plans">Plans de formation</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={value => setCollapsed(value)}
        breakpoint="lg"
      >
        <div className="logo">
          <Link to="/" style={{ textDecoration: 'none' }}>
            {!collapsed && <Title level={4} style={{ color: 'white', margin: '16px 0', textAlign: 'center' }}>Cleo ERP</Title>}
            {collapsed && <Title level={4} style={{ color: 'white', margin: '16px 0', textAlign: 'center' }}>C</Title>}
          </Link>
        </div>
        <Menu
          theme="dark"
          selectedKeys={[selectedKey]}
          mode="inline"
          items={menuItems}
        />
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: 0, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
            <Title level={3} style={{ margin: 0 }}>Module Ressources Humaines</Title>
          </div>
        </Header>
        <Content style={{ margin: '0 16px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            {getBreadcrumbItems()}
          </Breadcrumb>
          <div className="site-layout-background" style={{ padding: 24, minHeight: 360 }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default HRLayout;
