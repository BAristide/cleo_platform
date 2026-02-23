// src/components/payroll/Layout.js
import React, { useState } from 'react';
import { Layout, Menu, Typography, Breadcrumb } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  DollarOutlined,
  HomeOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import UserMenu from '../common/UserMenu';
import './Layout.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const PayrollLayout = ({ children }) => {
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
      <Breadcrumb.Item key="payroll">
        <Link to="/payroll">
          <CalculatorOutlined /> Paie
        </Link>
      </Breadcrumb.Item>
    );

    if (paths.length > 1 && paths[0] === 'payroll') {
      const module = paths[1];
      if (module) {
        const moduleMap = {
          dashboard: 'Tableau de bord',
          periods: 'Périodes de paie',
          runs: 'Lancements de paie',
          payslips: 'Bulletins de paie',
          'employee-payrolls': 'Données de paie employés',
          advances: 'Acomptes',
        };

        result.push(
          <Breadcrumb.Item key={module}>
            <Link to={`/payroll/${module}`}>{moduleMap[module] || module}</Link>
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
      label: <Link to="/payroll">Tableau de bord</Link>,
    },
    {
      key: 'periods',
      icon: <CalendarOutlined />,
      label: <Link to="/payroll/periods">Périodes de paie</Link>,
    },
    {
      key: 'runs',
      icon: <CalculatorOutlined />,
      label: <Link to="/payroll/runs">Lancements de paie</Link>,
    },
    {
      key: 'payslips',
      icon: <FileTextOutlined />,
      label: <Link to="/payroll/payslips">Bulletins de paie</Link>,
    },
    {
      key: 'employee-payrolls',
      icon: <TeamOutlined />,
      label: <Link to="/payroll/employee-payrolls">Données employés</Link>,
    },
    {
      key: 'advances',
      icon: <DollarOutlined />,
      label: <Link to="/payroll/advances">Acomptes</Link>,
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
              Module Paie
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

export default PayrollLayout;
