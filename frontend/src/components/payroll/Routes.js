// src/components/payroll/Routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import PayrollPeriodList from './PayrollPeriodList';
import PayrollRunList from './PayrollRunList';
import PayrollRunDetail from './PayrollRunDetail';
import PaySlipList from './PaySlipList';
import PaySlipDetail from './PaySlipDetail';
import EmployeePayrollList from './EmployeePayrollList';
import AdvanceSalaryList from './AdvanceSalaryList';
import PayrollSettings from './PayrollSettings';
import {
  PayrollPeriodForm,
  PayrollRunForm,
  EmployeePayrollForm,
  AdvanceSalaryForm,
} from './forms';

const PayrollRoutes = () => {
  return (
    <Layout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Periodes de paie */}
        <Route path="/periods" element={<PayrollPeriodList />} />
        <Route path="/periods/new" element={<PayrollPeriodForm />} />
        <Route path="/periods/:id" element={<PayrollPeriodForm />} />

        {/* Lancements de paie */}
        <Route path="/runs" element={<PayrollRunList />} />
        <Route path="/runs/new" element={<PayrollRunForm />} />
        <Route path="/runs/:id" element={<PayrollRunDetail />} />

        {/* Bulletins de paie */}
        <Route path="/payslips" element={<PaySlipList />} />
        <Route path="/payslips/:id" element={<PaySlipDetail />} />

        {/* Donnees de paie des employes */}
        <Route path="/employee-payrolls" element={<EmployeePayrollList />} />
        <Route path="/employee-payrolls/new" element={<EmployeePayrollForm />} />
        <Route path="/employee-payrolls/:id" element={<EmployeePayrollForm />} />

        {/* Acomptes */}
        <Route path="/advances" element={<AdvanceSalaryList />} />
        <Route path="/advances/new" element={<AdvanceSalaryForm />} />
        <Route path="/advances/:id" element={<AdvanceSalaryForm />} />

        {/* Configuration (PAIE-22) */}
        <Route path="/settings" element={<PayrollSettings />} />

        {/* Redirection par defaut */}
        <Route path="*" element={<Navigate to="/payroll" replace />} />
      </Routes>
    </Layout>
  );
};

export default PayrollRoutes;
