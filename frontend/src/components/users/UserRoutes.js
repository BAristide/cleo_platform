// src/components/users/UserRoutes.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserList from './UserList';
import RolePermissionMatrix from './RolePermissionMatrix';

const UserRoutes = () => (
  <Routes>
    <Route path="/" element={<UserList />} />
    <Route path="/roles" element={<RolePermissionMatrix />} />
  </Routes>
);

export default UserRoutes;
