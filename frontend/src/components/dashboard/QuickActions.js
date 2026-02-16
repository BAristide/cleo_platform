// src/components/dashboard/QuickActions.js
import React from 'react';
import { Card, Button, Space } from 'antd';
import { Link } from 'react-router-dom';
import {
  PlusOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  BankOutlined,
  DollarOutlined
} from '@ant-design/icons';

const QuickActions = () => {
  const actions = [
    {
      title: "Nouveau devis",
      icon: <FileTextOutlined />,
      path: "/sales/quotes/new",
      type: "primary"
    },
    {
      title: "Nouvelle facture",
      icon: <BankOutlined />,
      path: "/sales/invoices/new",
      type: "default"
    },
    {
      title: "Nouveau contact",
      icon: <UserOutlined />,
      path: "/crm/contacts/new",
      type: "default"
    },
    {
      title: "Nouvelle opportunité",
      icon: <DollarOutlined />,
      path: "/crm/opportunities/new",
      type: "default"
    },
    {
      title: "Nouvel employé",
      icon: <UserOutlined />,
      path: "/hr/employees/new",
      type: "default"
    }
  ];

  return (
    <Card title="Actions rapides">
      <Space direction="vertical" style={{ width: '100%' }}>
        {actions.map((action, index) => (
          <Link to={action.path} key={index} style={{ display: 'block', width: '100%' }}>
            <Button 
              type={action.type} 
              icon={action.icon}
              style={{ width: '100%', textAlign: 'left' }}
            >
              {action.title}
            </Button>
          </Link>
        ))}
      </Space>
    </Card>
  );
};

export default QuickActions;
