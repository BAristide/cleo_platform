// src/components/common/ModuleLayout.js
import React, { useState } from 'react';
import { Layout, Menu, Typography, Breadcrumb } from 'antd';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';
import UserMenu from './UserMenu';
import GlobalSearch from './GlobalSearch';
import './ModuleLayout.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const ModuleLayout = ({
  moduleTitle,
  basePath,
  menuItems,
  breadcrumbMap = {},
  useOutlet = false,
  headerExtra,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const getSelectedKey = () => {
    const path = location.pathname;

    if (basePath === '/') {
      if (path === '/') return 'home';
      const segment = path.split('/').filter(Boolean)[0];
      return segment || 'home';
    }

    const relative = path.replace(basePath, '').replace(/^\//, '');
    const segment = relative.split('/')[0];
    return segment || 'dashboard';
  };

  const getBreadcrumbItems = () => {
    const items = [];

    items.push(
      <Breadcrumb.Item key="home">
        <Link to="/"><HomeOutlined /> Home</Link>
      </Breadcrumb.Item>
    );

    if (basePath === '/') {
      return items;
    }

    items.push(
      <Breadcrumb.Item key="module">
        <Link to={basePath}>{moduleTitle}</Link>
      </Breadcrumb.Item>
    );

    const relative = location.pathname.replace(basePath, '').replace(/^\//, '');
    const parts = relative.split('/').filter(Boolean);

    if (parts.length > 0 && parts[0] !== '') {
      const subKey = parts[0];
      if (breadcrumbMap[subKey]) {
        items.push(
          <Breadcrumb.Item key={subKey}>
            <Link to={`${basePath}/${subKey}`}>{breadcrumbMap[subKey]}</Link>
          </Breadcrumb.Item>
        );
      }

      if (parts.length > 1) {
        if (parts[1] === 'new') {
          items.push(<Breadcrumb.Item key="new">Nouveau</Breadcrumb.Item>);
        } else if (!['new', 'edit'].includes(parts[1])) {
          items.push(<Breadcrumb.Item key="detail">Détail</Breadcrumb.Item>);
          if (parts.length > 2 && parts[2] === 'edit') {
            items.push(<Breadcrumb.Item key="edit">Modification</Breadcrumb.Item>);
          }
        }
      }
    }

    return items;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        width={240}
      >
        <div className="module-layout-logo">
          <Link to="/">
            <Title level={4} style={{ color: '#fff', margin: 0, textAlign: 'center' }}>
              {collapsed ? 'C' : 'Cleo ERP'}
            </Title>
          </Link>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header className="module-layout-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Title level={4} style={{ margin: 0 }}>{moduleTitle}</Title>
            {headerExtra}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <GlobalSearch />
            <UserMenu />
          </div>
        </Header>

        <Content className="module-layout-content">
          <Breadcrumb style={{ marginBottom: 16 }}>
            {getBreadcrumbItems()}
          </Breadcrumb>
          <div className="module-layout-inner">
            {useOutlet ? <Outlet /> : children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default ModuleLayout;
