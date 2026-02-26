// src/components/crm/Routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';

import CRMDashboard from './Dashboard';
import ContactList from './ContactList';
import ContactDetail from './ContactDetail';
import ContactForm from './forms/ContactForm';
import CompanyList from './CompanyList';
import CompanyDetail from './CompanyDetail';
import CompanyForm from './forms/CompanyForm';
import OpportunityList from './OpportunityList';
import OpportunityDetail from './OpportunityDetail';
import OpportunityForm from './forms/OpportunityForm';
import ActivityList from './ActivityList';
import ActivityDetail from './ActivityDetail';
import ActivityForm from './forms/ActivityForm';

const CRMRoutes = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/crm/dashboard" replace />} />
        <Route path="dashboard" element={<CRMDashboard />} />

        <Route path="contacts" element={<ContactList />} />
        <Route path="contacts/:id" element={<ContactDetail />} />
        <Route path="contacts/new" element={<ContactForm />} />
        <Route path="contacts/:id/edit" element={<ContactForm />} />

        <Route path="companies" element={<CompanyList />} />
        <Route path="companies/:id" element={<CompanyDetail />} />
        <Route path="companies/new" element={<CompanyForm />} />
        <Route path="companies/:id/edit" element={<CompanyForm />} />
        <Route path="companies/:id/contacts" element={<ContactList />} />
        <Route path="companies/:id/opportunities" element={<OpportunityList />} />

        <Route path="opportunities" element={<OpportunityList />} />
        <Route path="opportunities/:id" element={<OpportunityDetail />} />
        <Route path="opportunities/new" element={<OpportunityForm />} />
        <Route path="opportunities/:id/edit" element={<OpportunityForm />} />

        <Route path="activities" element={<ActivityList />} />
        <Route path="activities/:id" element={<ActivityDetail />} />
        <Route path="activities/new" element={<ActivityForm />} />
        <Route path="activities/:id/edit" element={<ActivityForm />} />

        <Route path="*" element={<Navigate to="/crm/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default CRMRoutes;
