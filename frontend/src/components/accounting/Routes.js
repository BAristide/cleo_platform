// src/components/accounting/Routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import AccountList from './AccountList';
import AccountDetail from './AccountDetail';
import JournalList from './JournalList';
import JournalDetail from './JournalDetail';
import JournalEntryList from './JournalEntryList';
import JournalEntryDetail from './JournalEntryDetail';
import FiscalYearList from './FiscalYearList';
import FiscalPeriodList from './FiscalPeriodList';
import BankStatementList from './BankStatementList';
import BankStatementDetail from './BankStatementDetail';
import AssetList from './AssetList';
import AssetDetail from './AssetDetail';
import AssetDepreciationList from './AssetDepreciationList';
import TaxList from './TaxList';
import ReportsList from './ReportsList';
import { JournalEntryForm, BankStatementForm, AssetForm } from './forms';
import CurrencyList from './CurrencyList';
const AccountingRoutes = () => {
  return (
    <Layout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Comptes comptables */}
        <Route path="/accounts" element={<AccountList />} />
        <Route path="/accounts/:id" element={<AccountDetail />} />

        {/* Journaux */}
        <Route path="/journals" element={<JournalList />} />
        <Route path="/journals/:id" element={<JournalDetail />} />

        {/* Écritures comptables */}
        <Route path="/entries" element={<JournalEntryList />} />
        <Route path="/entries/new" element={<JournalEntryForm />} />
        <Route path="/entries/:id" element={<JournalEntryDetail />} />
        <Route path="/entries/:id/edit" element={<JournalEntryForm />} />

        {/* Périodes fiscales */}
        <Route path="/fiscal-years" element={<FiscalYearList />} />
        <Route path="/fiscal-periods" element={<FiscalPeriodList />} />

        {/* Relevés bancaires */}
        <Route path="/bank-statements" element={<BankStatementList />} />
        <Route path="/bank-statements/new" element={<BankStatementForm />} />
        <Route path="/bank-statements/:id" element={<BankStatementDetail />} />
        <Route path="/bank-statements/:id/edit" element={<BankStatementForm />} />

        {/* Immobilisations */}
        <Route path="/assets" element={<AssetList />} />
        <Route path="/assets/new" element={<AssetForm />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/assets/:id/edit" element={<AssetForm />} />
        <Route path="/asset-depreciations" element={<AssetDepreciationList />} />
        {/* Devises */}
        <Route path="/currencies" element={<CurrencyList />} />

        {/* Taxes */}
        <Route path="/taxes" element={<TaxList />} />

        {/* États et rapports */}
        <Route path="/reports" element={<ReportsList />} />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/accounting" replace />} />
      </Routes>
    </Layout>
  );
};

export default AccountingRoutes;
