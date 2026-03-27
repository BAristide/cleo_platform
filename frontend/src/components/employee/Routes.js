// src/components/employee/Routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import LeaveList from './LeaveList';
import LeaveRequestForm from './LeaveRequestForm';
import LeaveBalanceDashboard from './LeaveBalanceDashboard';
import TeamCalendar from './TeamCalendar';
import ExpenseList from './ExpenseList';
import ExpenseReportForm from './ExpenseReportForm';
import WorkCertificateList from './WorkCertificateList';
import WorkCertificateForm from './WorkCertificateForm';
import ComplaintManagement from './ComplaintManagement';
import ComplaintForm from './ComplaintForm';
import PaySlipList from './PaySlipList';
import AnnouncementFeed from './AnnouncementFeed';
import RewardBoard from './RewardBoard';

const EmployeeRoutes = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leaves" element={<LeaveList />} />
        <Route path="/leaves/new" element={<LeaveRequestForm />} />
        <Route path="/leaves/calendar" element={<TeamCalendar />} />
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/expenses/new" element={<ExpenseReportForm />} />
        <Route path="/expenses/:id/edit" element={<ExpenseReportForm />} />
        <Route path="/certificates" element={<WorkCertificateList />} />
        <Route path="/certificates/new" element={<WorkCertificateForm />} />
        <Route path="/complaints" element={<ComplaintManagement />} />
        <Route path="/complaints/new" element={<ComplaintForm />} />
        <Route path="/payslips" element={<PaySlipList />} />
        <Route path="/announcements" element={<AnnouncementFeed />} />
        <Route path="/rewards" element={<RewardBoard />} />
        <Route path="*" element={<Navigate to="/my-space" replace />} />
      </Routes>
    </Layout>
  );
};

export default EmployeeRoutes;
