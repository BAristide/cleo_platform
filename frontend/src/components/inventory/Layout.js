import React, { useState } from 'react';
import { Layout, Menu, Typography, Breadcrumb } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  HomeOutlined,
  InboxOutlined,
  SwapOutlined,
  BarChartOutlined,
  WarningOutlined,
  AuditOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import UserMenu from '../common/UserMenu';
import './Layout.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const InventoryLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const selectedKey = location.pathname.split('/')[2] || 'dashboard';

  const getBreadcrumbItems = () => {
    const paths = location.pathname.split('/').filter((i) => i);
    const result = [];

    result.push(
      <Breadcrumb.Item key="home">
        <Link to="/">
          <HomeOutlined /> Home
        </Link>
      </Breadcrumb.Item>
    );

    result.push(
      <Breadcrumb.Item key="inventory">
        <Link to="/inventory">
          <InboxOutlined /> Stocks
        </Link>
      </Breadcrumb.Item>
    );

    if (paths.length > 1 && paths[0] === 'inventory') {
      const module = paths[1];
      if (module) {
        const moduleMap = {
          dashboard: 'Tableau de bord',
          warehouses: 'Entrepôts',
          'stock-moves': 'Mouvements',
          'stock-levels': 'Niveaux de stock',
          alerts: 'Alertes',
          inventories: 'Inventaires',
          categories: 'Catégories',
        };

        result.push(
          <Breadcrumb.Item key={module}>
            <Link to={`/inventory/${module}`}>{moduleMap[module] || module}</Link>
          </Breadcrumb.Item>
        );
      }

      if (paths.length > 2 && !['new', 'edit'].includes(paths[2])) {
        result.push(<Breadcrumb.Item key="detail">Détail {paths[2]}</Breadcrumb.Item>);
      }

      if (paths.length > 2 && paths[2] === 'new') {
        result.push(<Breadcrumb.Item key="new">Nouveau</Breadcrumb.Item>);
      }

      if (paths.length > 2 && paths[2] === 'edit') {
        result.push(<Breadcrumb.Item key="edit">Modification</Breadcrumb.Item>);
      }
    }

    return result;
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/inventory">Tableau de bord</Link>,
    },
    {
      key: 'warehouses',
      icon: <HomeOutlined />,
      label: <Link to="/inventory/warehouses">Entrepôts</Link>,
    },
    {
      key: 'stock-levels',
      icon: <BarChartOutlined />,
      label: <Link to="/inventory/stock-levels">Niveaux de stock</Link>,
    },
    {
      key: 'stock-moves',
      icon: <SwapOutlined />,
      label: <Link to="/inventory/stock-moves">Mouvements</Link>,
    },
    {
      key: 'alerts',
      icon: <WarningOutlined />,
      label: <Link to="/inventory/alerts">Alertes</Link>,
    },
    {
      key: 'inventories',
      icon: <AuditOutlined />,
      label: <Link to="/inventory/inventories">Inventaires</Link>,
    },
    {
      key: 'categories',
      icon: <AppstoreOutlined />,
      label: <Link to="/inventory/categories">Catégories</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} breakpoint="lg">
        <div className="logo">
          <Link to="/" style={{ textDecoration: 'none' }}>
            {!collapsed && (
              <Title level={4} style={{ color: 'white', margin: '16px 0', textAlign: 'center' }}>
                Cleo ERP
              </Title>
            )}
            {collapsed && (
              <Title level={4} style={{ color: 'white', margin: '16px 0', textAlign: 'center' }}>
                C
              </Title>
            )}
          </Link>
        </div>
        <Menu theme="dark" selectedKeys={[selectedKey]} mode="inline" items={menuItems} />
      </Sider>

      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: 0, background: '#fff' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 24px',
            }}
          >
            <Title level={3} style={{ margin: 0 }}>
              Gestion des Stocks
            </Title>
            <UserMenu />
          </div>
        </Header>

        <Content style={{ margin: '0 16px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>{getBreadcrumbItems()}</Breadcrumb>
          <div className="site-layout-background" style={{ padding: 24, minHeight: 360 }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default InventoryLayout;
