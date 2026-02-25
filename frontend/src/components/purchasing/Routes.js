import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import SupplierList from './SupplierList';
import SupplierForm from './SupplierForm';
import PurchaseOrderList from './PurchaseOrderList';
import PurchaseOrderDetail from './PurchaseOrderDetail';
import PurchaseOrderForm from './PurchaseOrderForm';
import ReceptionList from './ReceptionList';
import ReceptionDetail from './ReceptionDetail';
import ReceptionForm from './ReceptionForm';
import SupplierInvoiceList from './SupplierInvoiceList';
import SupplierInvoiceDetail from './SupplierInvoiceDetail';
import SupplierInvoiceForm from './SupplierInvoiceForm';
import PaymentList from './PaymentList';
import PaymentForm from './PaymentForm';

export default function PurchasingRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="suppliers" element={<SupplierList />} />
        <Route path="suppliers/new" element={<SupplierForm />} />
        <Route path="suppliers/:id/edit" element={<SupplierForm />} />
        <Route path="orders" element={<PurchaseOrderList />} />
        <Route path="orders/new" element={<PurchaseOrderForm />} />
        <Route path="orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="receptions" element={<ReceptionList />} />
        <Route path="receptions/new" element={<ReceptionForm />} />
        <Route path="receptions/:id" element={<ReceptionDetail />} />
        <Route path="invoices" element={<SupplierInvoiceList />} />
        <Route path="invoices/new" element={<SupplierInvoiceForm />} />
        <Route path="invoices/:id" element={<SupplierInvoiceDetail />} />
        <Route path="payments" element={<PaymentList />} />
        <Route path="payments/new" element={<PaymentForm />} />
      </Route>
    </Routes>
  );
}
