// src/components/accounting/Layout.js
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Typography, Button, Breadcrumb } from 'antd';
import {
  AccountBookOutlined,
  BankOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  BuildOutlined,
  BarChartOutlined,
  DollarOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  BookOutlined,
  DashboardOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import UserMenu from '../common/UserMenu';
import './Layout.css';

const { Header, Sider, Content, Footer } = AntLayout;
const { Title } = Typography;

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/accounting') return '1';
    if (path.includes('/accounting/accounts')) return '2';
    if (path.includes('/accounting/journals')) return '3-1';
    if (path.includes('/accounting/entries')) return '3-2';
    if (path.includes('/accounting/fiscal-years')) return '4-1';
    if (path.includes('/accounting/fiscal-periods')) return '4-2';
    if (path.includes('/accounting/bank-statements')) return '5';
    if (path.includes('/accounting/cash-forecast')) return '5b';
    if (path.includes('/accounting/assets')) return '6-1';
    if (path.includes('/accounting/asset-depreciations')) return '6-2';
    if (path.includes('/accounting/taxes')) return '7';
    if (path.includes('/accounting/reports')) return '8';
    if (path.includes('/accounting/currencies')) return '9';
    return '1';
  };

  const navigateToPath = (path) => {
    navigate(path);
  };

  const sidebarMenuItems = [
    {
      key: '1',
      icon: <DashboardOutlined />,
      label: 'Tableau de bord',
      onClick: () => navigateToPath('/accounting'),
    },
    {
      key: '2',
      icon: <BookOutlined />,
      label: 'Plan comptable',
      onClick: () => navigateToPath('/accounting/accounts'),
    },
    {
      key: '3',
      icon: <AccountBookOutlined />,
      label: 'Écritures comptables',
      children: [
        { key: '3-1', label: 'Journaux', onClick: () => navigateToPath('/accounting/journals') },
        { key: '3-2', label: 'Écritures', onClick: () => navigateToPath('/accounting/entries') },
      ],
    },
    {
      key: '4',
      icon: <CalendarOutlined />,
      label: 'Périodes fiscales',
      children: [
        { key: '4-1', label: 'Exercices', onClick: () => navigateToPath('/accounting/fiscal-years') },
        { key: '4-2', label: 'Périodes', onClick: () => navigateToPath('/accounting/fiscal-periods') },
      ],
    },
    {
      key: '5',
      icon: <BankOutlined />,
      label: 'Relevés bancaires',
      onClick: () => navigateToPath('/accounting/bank-statements'),
    },
    {
      key: '5b',
      icon: <BankOutlined />,
      label: 'Prévision trésorerie',
      onClick: () => navigateToPath('/accounting/cash-forecast'),
    },
    {
      key: '6',
      icon: <BuildOutlined />,
      label: 'Immobilisations',
      children: [
        { key: '6-1', label: 'Actifs', onClick: () => navigateToPath('/accounting/assets') },
        { key: '6-2', label: 'Amortissements', onClick: () => navigateToPath('/accounting/asset-depreciations') },
      ],
    },
    {
      key: '7',
      icon: <CalculatorOutlined />,
      label: 'Taxes & TVA',
      onClick: () => navigateToPath('/accounting/taxes'),
    },
    {
      key: '8',
      icon: <BarChartOutlined />,
      label: 'États et rapports',
      onClick: () => navigateToPath('/accounting/reports'),
    },
    {
      key: '9',
      icon: <DollarOutlined />,
      label: 'Devises',
      onClick: () => navigateToPath('/accounting/currencies'),
    },
  ];

  return (
    <AntLayout className="accounting-layout">
      <Sider trigger={null} collapsible collapsed={collapsed} width={250}>
        <div className="logo">
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <DollarOutlined className="icon" />
            {!collapsed && <span>Cleo ERP</span>}
          </Link>
        </div>

        <Menu theme="dark" mode="inline" selectedKeys={[getSelectedKey()]} items={sidebarMenuItems} />
      </Sider>

      <AntLayout>
        <Header className="site-layout-background" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
              style={{ fontSize: '16px', width: 64, height: 64 }}
            />
            <Title level={4} style={{ margin: 0 }}>
              Comptabilité
            </Title>
          </div>

          <UserMenu />
        </Header>

        <Content className="site-layout-background">
          <Breadcrumb style={{ marginBottom: '16px' }}>
            <Breadcrumb.Item key="home">
              <Link to="/">
                <HomeOutlined /> Home
              </Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item key="accounting">
              <Link to="/accounting">Comptabilité</Link>
            </Breadcrumb.Item>
          </Breadcrumb>

          {children}
        </Content>

        <Footer>Cleo ERP © {new Date().getFullYear()} - Module Comptabilité</Footer>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
