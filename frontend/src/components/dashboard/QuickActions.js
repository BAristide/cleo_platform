import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileTextOutlined, BankOutlined, UserOutlined,
  DollarOutlined, InboxOutlined, ThunderboltOutlined,
} from '@ant-design/icons';

const QuickActions = () => {
  const actions = [
    { title: "Nouveau devis", icon: <FileTextOutlined />, path: "/sales/quotes/new", color: "#10b981" },
    { title: "Nouvelle facture", icon: <BankOutlined />, path: "/sales/invoices/new", color: "#3b82f6" },
    { title: "Nouveau contact", icon: <UserOutlined />, path: "/crm/contacts/new", color: "#6366f1" },
    { title: "Nouvelle opportunité", icon: <DollarOutlined />, path: "/crm/opportunities/new", color: "#f59e0b" },
    { title: "Nouvel employé", icon: <UserOutlined />, path: "/hr/employees/new", color: "#8b5cf6" },
    { title: "Mouvement stock", icon: <InboxOutlined />, path: "/inventory/stock-moves/new", color: "#14b8a6" },
  ];

  return (
    <div>
      <div className="section-title">
        <span className="section-icon" style={{ background: '#6366f1' }}><ThunderboltOutlined /></span>
        Actions rapides
      </div>
      <div className="quick-actions-grid">
        {actions.map((action, i) => (
          <Link to={action.path} key={i} className="quick-action-btn">
            <span className="qa-icon" style={{ background: action.color }}>{action.icon}</span>
            {action.title}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
