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
import ProductList from './ProductList';
import ProductDetail from './ProductDetail';
import BankAccountList from './BankAccountList';
import PaymentList from './PaymentList';
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

        {/* Products (Produits) */}
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/:id" element={<ProductDetail />} />

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
