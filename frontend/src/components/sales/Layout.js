// src/components/sales/Layout.js
import React, { useState } from 'react';
import { Layout, Menu, Typography, Breadcrumb } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  BankOutlined,
  DollarOutlined,
  AppstoreOutlined,
  HomeOutlined
} from '@ant-design/icons';
import './Layout.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const SalesLayout = ({ children }) => {
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
          <HomeOutlined /> Home
        </Link>
      </Breadcrumb.Item>
    );
    
    // Élément Sales
    result.push(
      <Breadcrumb.Item key="sales">
        <Link to="/sales">
          <AppstoreOutlined /> Ventes
        </Link>
      </Breadcrumb.Item>
    );
    
    // Autres éléments basés sur le chemin
    if (paths.length > 1 && paths[0] === 'sales') {
      const module = paths[1];
      if (module) {
        const moduleMap = {
          'dashboard': 'Tableau de bord',
          'quotes': 'Devis',
          'orders': 'Commandes',
          'invoices': 'Factures',
          'payments': 'Paiements',
          'products': 'Produits',
          'bank-accounts': 'Comptes bancaires'
        };
        
        result.push(
          <Breadcrumb.Item key={module}>
            <Link to={`/sales/${module}`}>
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
      
      if (paths.length > 2 && paths[2] === 'edit') {
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
      label: <Link to="/sales">Tableau de bord</Link>,
    },
    {
      key: 'quotes',
      icon: <FileTextOutlined />,
      label: <Link to="/sales/quotes">Devis</Link>,
    },
    {
      key: 'orders',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/sales/orders">Commandes</Link>,
    },
    {
      key: 'invoices',
      icon: <FileTextOutlined />,
      label: <Link to="/sales/invoices">Factures</Link>,
    },
    {
      key: 'payments',
      icon: <DollarOutlined />,
      label: <Link to="/sales/payments">Paiements</Link>,
    },
    {
      key: 'products',
      icon: <AppstoreOutlined />,
      label: <Link to="/sales/products">Produits</Link>,
    },
    {
      key: 'bank-accounts',
      icon: <BankOutlined />,
      label: <Link to="/sales/bank-accounts">Comptes bancaires</Link>,
    },
  ];

  const onBreakpoint = (broken) => {
    console.log(broken);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={value => setCollapsed(value)}
        breakpoint="lg"
        onBreakpoint={onBreakpoint}
      >
        <div className="logo">
          {!collapsed && <Title level={4} style={{ color: 'white', margin: '16px 0', textAlign: 'center' }}>Cleo ERP</Title>}
          {collapsed && <Title level={4} style={{ color: 'white', margin: '16px 0', textAlign: 'center' }}>C</Title>}
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
            <Title level={3} style={{ margin: 0 }}>Module Ventes</Title>
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

export default SalesLayout;
