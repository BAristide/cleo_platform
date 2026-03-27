import React from 'react';
import { Link } from 'react-router-dom';
import {
  TeamOutlined, ShoppingCartOutlined, ShoppingOutlined, UserOutlined,
  DollarOutlined, BankOutlined, SolutionOutlined, InboxOutlined, ArrowRightOutlined, TagsOutlined, HomeOutlined,
} from '@ant-design/icons';
const ModuleCard = ({ title, icon, description, path, stats, colorClass, color }) => {
  const iconMap = {
    'team': <TeamOutlined />, 'shopping-cart': <ShoppingCartOutlined />, 'shopping': <ShoppingOutlined />,
    'user': <UserOutlined />, 'dollar': <DollarOutlined />, 'bank': <BankOutlined />,
    'solution': <SolutionOutlined />, 'inbox': <InboxOutlined />, 'tag': <TagsOutlined />,
    'home': <HomeOutlined />,
  };
  const cardColor = color || '#3b82f6';
  return (
    <Link to={path} className={`module-card-v2 ${colorClass || ''}`} style={{ textDecoration: 'none' }}>
      <div className="module-strip" style={{ background: `linear-gradient(90deg, ${cardColor}, ${cardColor}80)` }} />
      <div className="module-body">
        <div className="module-header">
          <div className="module-icon-wrap" style={{ background: `${cardColor}14`, color: cardColor }}>
            {iconMap[icon]}
          </div>
          <ArrowRightOutlined className="module-arrow" />
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
                <span className="module-stat-value" style={stats.recent > 0 ? { color: '#059669' } : undefined}>
                  {stats.recent}
                </span>
                <span className="module-stat-label">Récents</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};
export default ModuleCard;
