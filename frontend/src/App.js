// src/App.js (mise à jour)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import MainDashboard from './components/dashboard/MainDashboard';
import CRMRoutes from './components/crm/Routes';
import SalesRoutes from './components/sales/Routes';
import HRRoutes from './components/hr/Routes';
import PayrollRoutes from './components/payroll/Routes';
import AccountingRoutes from './components/accounting/Routes';
import RecruitmentRoutes from './components/recruitment/Routes';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Route principale pour le dashboard central */}
          <Route path="/" element={
            <PrivateRoute>
              <MainDashboard />
            </PrivateRoute>
          } />

          {/* Module CRM */}
          <Route path="/crm/*" element={
            <PrivateRoute>
              <CRMRoutes />
            </PrivateRoute>
          } />

          {/* Module Sales */}
          <Route path="/sales/*" element={
            <PrivateRoute>
              <SalesRoutes />
            </PrivateRoute>
          } />

          {/* Module RH */}
          <Route path="/hr/*" element={
            <PrivateRoute>
              <HRRoutes />
            </PrivateRoute>
          } />

          {/* Module Paie */}
          <Route path="/payroll/*" element={
            <PrivateRoute>
              <PayrollRoutes />
            </PrivateRoute>
          } />

          {/* Module Comptabilité */}
          <Route path="/accounting/*" element={
            <PrivateRoute>
              <AccountingRoutes />
            </PrivateRoute>
          } />

          {/* Module Recrutement */}
          <Route path="/recruitment/*" element={
            <PrivateRoute>
              <RecruitmentRoutes />
            </PrivateRoute>
          } />

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
