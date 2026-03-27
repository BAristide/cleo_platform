import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin, ConfigProvider, Alert } from 'antd';
import frFR from 'antd/locale/fr_FR';
import './App.css';
import ExecutiveDashboard from './components/dashboard/ExecutiveDashboard';
import CRMRoutes from './components/crm/Routes';
import SalesRoutes from './components/sales/Routes';
import CatalogRoutes from './components/catalog/Routes';
import HRRoutes from './components/hr/Routes';
import EmployeeRoutes from './components/employee/Routes';
import PayrollRoutes from './components/payroll/Routes';
import AccountingRoutes from './components/accounting/Routes';
import RecruitmentRoutes from './components/recruitment/Routes';
import InventoryRoutes from './components/inventory/Routes';
import PurchasingRoutes from './components/purchasing/Routes';
import SetupWizard from './components/setup/SetupWizard';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { CurrencyProvider } from './context/CurrencyContext';
import PrivateRoute from './components/PrivateRoute';
import PermissionRoute from './components/common/PermissionRoute';
import ProfilePage from './components/profile/ProfilePage';
import ChangePassword from './components/profile/ChangePassword';
import UserRoutes from './components/users/UserRoutes';
import AdminRoute from './components/common/AdminRoute';
import NotificationCenter from './components/notifications/NotificationCenter';
import NotificationPreferences from './components/notifications/NotificationPreferences';
import PlatformSettings from './components/settings/PlatformSettings';
import axios from './utils/axiosConfig';

const CLEO_THEME = {
  token: {
    colorPrimary: '#10B981',
    colorInfo: '#10B981',
    colorSuccess: '#10B981',
    colorLink: '#10B981',
    borderRadius: 8,
    colorBgLayout: '#F8FAFC',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  },
  components: {
    Button: {
      colorPrimary: '#10B981',
      colorPrimaryHover: '#059669',
      colorPrimaryActive: '#047857',
      borderRadius: 8,
    },
    Menu: {
      darkItemBg: '#0F172A',
      darkSubMenuItemBg: '#0F172A',
      darkItemSelectedBg: 'rgba(16, 185, 129, 0.15)',
      darkItemSelectedColor: '#10B981',
    },
    Input: {
      activeBorderColor: '#10B981',
      hoverBorderColor: '#6EE7B7',
      activeShadow: '0 0 0 2px rgba(16, 185, 129, 0.12)',
    },
    Select: {
      optionSelectedBg: 'rgba(16, 185, 129, 0.08)',
    },
    Table: {
      headerBg: '#F8FAFC',
      headerColor: '#64748B',
      rowHoverBg: '#F0FDF4',
    },
    Tabs: {
      inkBarColor: '#10B981',
      itemActiveColor: '#10B981',
      itemSelectedColor: '#10B981',
      itemHoverColor: '#059669',
    },
    Tag: {
      borderRadiusSM: 6,
    },
  },
};


const MODULE_PATHS = {
  crm: '/crm',
  sales: '/sales',
  employee: '/my-space',
  hr: '/hr',
  payroll: '/payroll',
  accounting: '/accounting',
  inventory: '/inventory',
  purchasing: '/purchasing',
  recruitment: '/recruitment',
};

const SKIP_MODULES = ['core', 'notifications', 'dashboard'];

const HomeRedirect = () => {
  const { user } = React.useContext(
    require('./context/AuthContext').AuthContext
  );

  if (!user) return <Spin size="large" />;

  // Superuser → toujours le dashboard exécutif
  if (user.isSuperuser) return <ExecutiveDashboard />;

  const modulesAccess = user.modulesAccess || {};

  // Modules fonctionnels accessibles (hors core, notifications, dashboard)
  const accessibleModules = Object.entries(modulesAccess)
    .filter(([mod, level]) => !SKIP_MODULES.includes(mod) && level !== 'no_access')
    .map(([mod]) => mod);

  // Un seul module → redirection directe
  if (accessibleModules.length === 1) {
    const target = MODULE_PATHS[accessibleModules[0]];
    if (target) return <Navigate to={target} replace />;
  }

  // Dashboard accessible → dashboard exécutif
  if (modulesAccess.dashboard && modulesAccess.dashboard !== 'no_access') {
    return <ExecutiveDashboard />;
  }

  // Plusieurs modules mais pas dashboard → premier module
  if (accessibleModules.length > 0) {
    const target = MODULE_PATHS[accessibleModules[0]];
    if (target) return <Navigate to={target} replace />;
  }

  // Aucun module → message
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Alert message="Aucun module accessible" description="Contactez votre administrateur pour obtenir les accès nécessaires." type="info" showIcon />
    </div>
  );
};

function App() {
  const [setupStatus, setSetupStatus] = useState(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await axios.get('/api/core/setup/status/');
        setSetupStatus(res.data);
      } catch (err) {
        setSetupStatus({ setup_completed: true });
      } finally {
        setCheckingSetup(false);
      }
    };
    checkSetup();
  }, []);

  if (checkingSetup) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Vérification de la configuration..." />
      </div>
    );
  }

  if (!setupStatus?.setup_completed) {
    return (
      <AuthProvider>
        <ConfigProvider locale={frFR} theme={CLEO_THEME}>
          <Router>
            <Routes>
              <Route path="/setup" element={
                <PrivateRoute>
                  <AdminRoute>
                    <SetupWizard />
                  </AdminRoute>
                </PrivateRoute>
              } />
              <Route path="*" element={<Navigate to="/setup" replace />} />
            </Routes>
          </Router>
        </ConfigProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CompanyProvider>
        <CurrencyProvider>
        <ConfigProvider locale={frFR} theme={CLEO_THEME}>
          <Router>
            <Routes>
              <Route path="/" element={
                <PrivateRoute>
                  <HomeRedirect />
                </PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              } />
              <Route path="/profile/password" element={
                <PrivateRoute>
                  <ChangePassword />
                </PrivateRoute>
              } />
              <Route path="/users/*" element={
                <PrivateRoute>
                  <AdminRoute>
                    <UserRoutes />
                  </AdminRoute>
                </PrivateRoute>
              } />
              <Route path="/crm/*" element={
                <PrivateRoute>
                  <PermissionRoute module="crm">
                    <CRMRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/catalog/*" element={
                <PrivateRoute>
                  <PermissionRoute module="sales">
                    <CatalogRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/sales/*" element={
                <PrivateRoute>
                  <PermissionRoute module="sales">
                    <SalesRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/hr/*" element={
                <PrivateRoute>
                  <PermissionRoute module="hr">
                    <HRRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/my-space/*" element={
                <PrivateRoute>
                  <PermissionRoute module="employee">
                    <EmployeeRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/payroll/*" element={
                <PrivateRoute>
                  <PermissionRoute module="payroll">
                    <PayrollRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/accounting/*" element={
                <PrivateRoute>
                  <PermissionRoute module="accounting">
                    <AccountingRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/recruitment/*" element={
                <PrivateRoute>
                  <PermissionRoute module="recruitment">
                    <RecruitmentRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/purchasing/*" element={
                <PrivateRoute>
                  <PermissionRoute module="purchasing">
                    <PurchasingRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/inventory/*" element={
                <PrivateRoute>
                  <PermissionRoute module="inventory">
                    <InventoryRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />

              <Route path="/settings" element={
                <PrivateRoute>
                  <AdminRoute>
                    <PlatformSettings />
                  </AdminRoute>
                </PrivateRoute>
              } />

              <Route path="/notifications" element={
                <PrivateRoute>
                  <NotificationCenter />
                </PrivateRoute>
              } />
              <Route path="/notifications/preferences" element={
                <PrivateRoute>
                  <NotificationPreferences />
                </PrivateRoute>
              } />
              <Route path="/setup" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ConfigProvider>
      </CurrencyProvider>
        </CompanyProvider>
    </AuthProvider>
  );
}

export default App;
