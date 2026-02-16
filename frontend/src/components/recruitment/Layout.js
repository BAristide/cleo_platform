// src/components/recruitment/Layout.js
import React, { useState } from 'react';
import { Layout, Menu, Typography, Breadcrumb, Badge, Avatar } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  FileSearchOutlined,
  TeamOutlined,
  FileTextOutlined,
  BarChartOutlined,
  BellOutlined
} from '@ant-design/icons';
import './Layout.css';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;
const { SubMenu } = Menu;

const RecruitmentLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Déterminer l'élément de menu actif à partir de l'URL
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === '/recruitment') return ['dashboard'];
    if (path.includes('/job-openings')) return ['job-openings'];
    if (path.includes('/applications')) return ['applications'];
    if (path.includes('/statistics')) return ['statistics'];
    return [];
  };
  
  // Définir les éléments du fil d'Ariane
  const getBreadcrumbItems = () => {
    const path = location.pathname;
    const items = [
      { title: <Link to="/recruitment">Recrutement</Link>, key: 'recruitment' }
    ];
    
    if (path === '/recruitment') {
      items.push({ title: 'Tableau de bord', key: 'dashboard' });
    } else if (path.includes('/job-openings')) {
      items.push({ title: <Link to="/recruitment/job-openings">Offres d'emploi</Link>, key: 'job-openings' });
      
      if (path.includes('/new')) {
        items.push({ title: 'Nouvelle offre', key: 'new-job' });
      } else if (path.includes('/edit')) {
        items.push({ title: 'Modifier l\'offre', key: 'edit-job' });
      } else if (path.match(/\/job-openings\/\d+$/)) {
        items.push({ title: 'Détails de l\'offre', key: 'job-details' });
      } else if (path.includes('/applications')) {
        items.push({ title: 'Candidatures', key: 'job-applications' });
      }
    } else if (path.includes('/applications')) {
      items.push({ title: <Link to="/recruitment/applications">Candidatures</Link>, key: 'applications' });
      
      if (path.match(/\/applications\/\d+$/)) {
        items.push({ title: 'Détails de la candidature', key: 'application-details' });
      } else if (path.includes('/schedule-interview')) {
        items.push({ title: 'Planifier un entretien', key: 'schedule-interview' });
      } else if (path.includes('/evaluate')) {
        items.push({ title: 'Évaluer le candidat', key: 'evaluate' });
      }
    } else if (path.includes('/evaluations')) {
      items.push({ title: <Link to="/recruitment/applications">Évaluations</Link>, key: 'evaluations' });
      
      if (path.match(/\/evaluations\/\d+$/)) {
        items.push({ title: 'Détails de l\'évaluation', key: 'evaluation-details' });
      }
    } else if (path.includes('/statistics')) {
      items.push({ title: 'Statistiques', key: 'statistics' });
    }
    
    return items;
  };
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light">
        <div className="logo" style={{ textAlign: 'center', margin: '16px 0' }}>
          <Title level={4} style={{ marginBottom: 0, color: '#1890ff' }}>
            {collapsed ? 'CR' : 'Recrutement'}
          </Title>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={['applications']}
        >
          <Menu.Item key="dashboard" icon={<HomeOutlined />}>
            <Link to="/recruitment">Tableau de bord</Link>
          </Menu.Item>
          <Menu.Item key="job-openings" icon={<FileSearchOutlined />}>
            <Link to="/recruitment/job-openings">Offres d'emploi</Link>
          </Menu.Item>
          <Menu.Item key="applications" icon={<TeamOutlined />}>
            <Link to="/recruitment/applications">Candidatures</Link>
          </Menu.Item>
          <Menu.Item key="statistics" icon={<BarChartOutlined />}>
            <Link to="/recruitment/statistics">Statistiques</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-header" style={{ padding: 0, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
            <Breadcrumb style={{ margin: '16px 24px' }}>
              {getBreadcrumbItems().map(item => (
                <Breadcrumb.Item key={item.key}>{item.title}</Breadcrumb.Item>
              ))}
            </Breadcrumb>
            <div>
              <Badge count={5} style={{ marginRight: 24 }}>
                <Avatar icon={<BellOutlined />} style={{ cursor: 'pointer' }} />
              </Badge>
            </div>
          </div>
        </Header>
        <Content style={{ margin: '16px' }}>
          <div className="site-layout-content" style={{ padding: 24, minHeight: 360, background: '#fff' }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default RecruitmentLayout;
