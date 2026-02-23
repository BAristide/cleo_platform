// src/components/users/UserRoutes.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserList from './UserList';

const UserRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<UserList />} />
    </Routes>
  );
};

export default UserRoutes;
