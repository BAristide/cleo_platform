// src/components/accounting/Layout.js
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Typography, Button, Dropdown, Avatar, Space } from 'antd';
import {
  AccountBookOutlined,
  BankOutlined,
  FileTextOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  BuildOutlined,
  BarChartOutlined,
  DollarOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  LogoutOutlined,
  BookOutlined,
  FileExcelOutlined,
  FileSearchOutlined,
  DashboardOutlined
} from '@ant-design/icons';
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

  // Détermine la clé sélectionnée dans le menu
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/accounting') return '1';
    if (path.includes('/accounting/accounts')) return '2';
    if (path.includes('/accounting/journals')) return '3-1';
    if (path.includes('/accounting/entries')) return '3-2';
    if (path.includes('/accounting/fiscal-years')) return '4-1';
    if (path.includes('/accounting/fiscal-periods')) return '4-2';
    if (path.includes('/accounting/bank-statements')) return '5';
    if (path.includes('/accounting/assets')) return '6-1';
    if (path.includes('/accounting/asset-depreciations')) return '6-2';
    if (path.includes('/accounting/taxes')) return '7';
    if (path.includes('/accounting/reports')) return '8';
    return '1';
  };

  // Items du menu utilisateur
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Mon profil'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Déconnexion',
      onClick: () => {
        window.location.href = '/logout/';
      }
    }
  ];

  // Fonction de navigation pour le menu
  const navigateToPath = (path) => {
    navigate(path);
  };

  // Menu items pour le sidebar
  const sidebarMenuItems = [
    {
      key: '1',
      icon: <DashboardOutlined />,
      label: 'Tableau de bord',
      onClick: () => navigateToPath('/accounting')
    },
    {
      key: '2',
      icon: <BookOutlined />,
      label: 'Plan comptable',
      onClick: () => navigateToPath('/accounting/accounts')
    },
    {
      key: '3',
      icon: <AccountBookOutlined />,
      label: 'Écritures comptables',
      children: [
        {
          key: '3-1',
          label: 'Journaux',
          onClick: () => navigateToPath('/accounting/journals')
        },
        {
          key: '3-2',
          label: 'Écritures',
          onClick: () => navigateToPath('/accounting/entries')
        }
      ]
    },
    {
      key: '4',
      icon: <CalendarOutlined />,
      label: 'Périodes fiscales',
      children: [
        {
          key: '4-1',
          label: 'Exercices',
          onClick: () => navigateToPath('/accounting/fiscal-years')
        },
        {
          key: '4-2',
          label: 'Périodes',
          onClick: () => navigateToPath('/accounting/fiscal-periods')
        }
      ]
    },
    {
      key: '5',
      icon: <BankOutlined />,
      label: 'Relevés bancaires',
      onClick: () => navigateToPath('/accounting/bank-statements')
    },
    {
      key: '6',
      icon: <BuildOutlined />,
      label: 'Immobilisations',
      children: [
        {
          key: '6-1',
          label: 'Actifs',
          onClick: () => navigateToPath('/accounting/assets')
        },
        {
          key: '6-2',
          label: 'Amortissements',
          onClick: () => navigateToPath('/accounting/asset-depreciations')
        }
      ]
    },
    {
      key: '7',
      icon: <CalculatorOutlined />,
      label: 'Taxes & TVA',
      onClick: () => navigateToPath('/accounting/taxes')
    },
    {
      key: '8',
      icon: <BarChartOutlined />,
      label: 'États et rapports',
      onClick: () => navigateToPath('/accounting/reports')
    }
  ];

  return (
    <AntLayout className="accounting-layout">
      <Sider trigger={null} collapsible collapsed={collapsed} width={250}>
        <div className="logo">
          <DollarOutlined className="icon" />
          {!collapsed && <span>Comptabilité</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={sidebarMenuItems}
        />
      </Sider>
      <AntLayout>
        <Header className="site-layout-background">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapsed}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <Space>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <Button type="text">
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {/* Remplacer par le nom de l'utilisateur connecté */}
                  <span>Utilisateur</span>
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>
        <Content className="site-layout-background">
          {children}
        </Content>
        <Footer>Cleo ERP © {new Date().getFullYear()} - Module Comptabilité</Footer>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
