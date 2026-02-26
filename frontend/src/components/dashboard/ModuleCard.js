import React from 'react';
import { Link } from 'react-router-dom';
import {
  TeamOutlined, ShoppingCartOutlined, ShoppingOutlined, UserOutlined,
  DollarOutlined, BankOutlined, SolutionOutlined, InboxOutlined, ArrowRightOutlined,
} from '@ant-design/icons';

const ModuleCard = ({ title, icon, description, path, stats, colorClass, color }) => {
  const iconMap = {
    'team': <TeamOutlined />, 'shopping-cart': <ShoppingCartOutlined />, 'shopping': <ShoppingOutlined />,
    'user': <UserOutlined />, 'dollar': <DollarOutlined />, 'bank': <BankOutlined />,
    'solution': <SolutionOutlined />, 'inbox': <InboxOutlined />,
  };

  return (
    <Link to={path} className={`module-card-v2 ${colorClass || ''}`} style={{ textDecoration: 'none' }}>
      <div className="module-header">
        <div className="module-icon-wrap" style={{ background: color || '#3b82f6' }}>{iconMap[icon]}</div>
        <ArrowRightOutlined style={{ color: '#cbd5e1', fontSize: 14 }} />
      </div>
      <div className="module-title">{title}</div>
      <div className="module-desc">{description}</div>
      {stats && (
        <div className="module-stats">
          {stats.count !== undefined && (
            <div className="module-stat-item">
              <span className="module-stat-value">{stats.count}</span>
              <span className="module-stat-label">Total</span>
            </div>
          )}
          {stats.recent !== undefined && (
            <div className="module-stat-item">
              <span className="module-stat-value">{stats.recent}</span>
              <span className="module-stat-label">Récents</span>
            </div>
          )}
        </div>
      )}
    </Link>
  );
};

export default ModuleCard;
