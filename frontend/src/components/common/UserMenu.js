// src/components/common/UserMenu.js
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Avatar, Typography } from 'antd';
import {
  UserOutlined,
  KeyOutlined,
  TeamOutlined,
  LogoutOutlined,
  BellOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';

const { Text } = Typography;

const stringToColor = () => {
  return '#0F172A';
};

const getDisplayInfo = (user) => {
  if (!user) return { displayName: '', initials: '?' };
  const fullName = user.fullName ? user.fullName.trim() : '';
  let displayName;
  if (fullName && fullName !== ' ') {
    displayName = fullName;
  } else if (user.email) {
    displayName = user.email.split('@')[0];
  } else {
    displayName = user.username || '?';
  }
  const parts = displayName.split(/[\s.]+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : displayName.substring(0, 2).toUpperCase();
  return { displayName, initials };
};

const UserMenu = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return null;

  const { displayName, initials } = getDisplayInfo(user);
  const avatarColor = stringToColor(user.email || user.username);
  const isAdmin = user.isSuperuser || user.modulesAccess?.core === 'admin';

  const menuItems = [
    {
      key: 'header',
      type: 'group',
      label: (
        <div style={{ padding: '4px 0' }}>
          <Text strong>{displayName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{user.email}</Text>
        </div>
      ),
    },
    { type: 'divider' },
    { key: 'profile', icon: <UserOutlined />, label: 'Mon profil', onClick: () => navigate('/profile') },
    { key: 'password', icon: <KeyOutlined />, label: 'Changer mot de passe', onClick: () => navigate('/profile/password') },
    { key: 'notifications', icon: <BellOutlined />, label: 'Notifications', onClick: () => navigate('/notifications') },
    ...(isAdmin
      ? [
          { type: 'divider' },
          { key: 'settings', icon: <SettingOutlined />, label: 'Configuration', onClick: () => navigate('/settings') },
          { key: 'users', icon: <TeamOutlined />, label: 'Gestion utilisateurs', onClick: () => navigate('/users') },
        ]
      : []),
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Deconnexion', danger: true, onClick: () => { window.location.href = '/logout/'; } },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <NotificationBell />
      <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar style={{ backgroundColor: avatarColor }}>{initials}</Avatar>
          <Text style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </Text>
        </div>
      </Dropdown>
    </div>
  );
};

export default UserMenu;
