// src/components/sales/Routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import QuoteList from './QuoteList';
import QuoteDetail from './QuoteDetail';
import OrderList from './OrderList';
import OrderDetail from './OrderDetail';
import InvoiceList from './InvoiceList';
import InvoiceDetail from './InvoiceDetail';
import BankAccountList from './BankAccountList';
import PaymentList from './PaymentList';
import CreditNoteList from './CreditNoteList';
import { QuoteForm, OrderForm, InvoiceForm } from './forms';

const SalesRoutes = () => {
  return (
    <Layout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Quotes (Devis) */}
        <Route path="/quotes" element={<QuoteList />} />
        <Route path="/quotes/new" element={<QuoteForm />} />
        <Route path="/quotes/:id" element={<QuoteDetail />} />
        <Route path="/quotes/:id/edit" element={<QuoteForm />} />

        {/* Orders (Commandes) */}
        <Route path="/orders" element={<OrderList />} />
        <Route path="/orders/new" element={<OrderForm />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/orders/:id/edit" element={<OrderForm />} />

        {/* Invoices (Factures) */}
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/new" element={<InvoiceForm />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/invoices/:id/edit" element={<InvoiceForm />} />

        {/* Credit Notes (Avoirs) */}
        <Route path="/credit-notes" element={<CreditNoteList />} />

        {/* Products redirige vers Catalogue */}
        <Route path="/products" element={<Navigate to="/catalog/products" replace />} />
        <Route path="/products/:id" element={<Navigate to="/catalog/products" replace />} />

        {/* Bank Accounts (Comptes bancaires) */}
        <Route path="/bank-accounts" element={<BankAccountList />} />

        {/* Payments (Paiements) */}
        <Route path="/payments" element={<PaymentList />} />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/sales" replace />} />
      </Routes>
    </Layout>
  );
};

export default SalesRoutes;
