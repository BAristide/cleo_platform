import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import WarehouseList from './WarehouseList';
import StockMoveList from './StockMoveList';
import StockLevelList from './StockLevelList';
import StockAlertList from './StockAlertList';
import InventoryList from './InventoryList';
import InventoryDetail from './InventoryDetail';
import { WarehouseForm, StockMoveForm, InventoryForm } from './forms';

const InventoryRoutes = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/warehouses" element={<WarehouseList />} />
        <Route path="/warehouses/new" element={<WarehouseForm />} />
        <Route path="/warehouses/:id/edit" element={<WarehouseForm />} />

        <Route path="/stock-levels" element={<StockLevelList />} />
        <Route path="/alerts" element={<StockAlertList />} />

        <Route path="/stock-moves" element={<StockMoveList />} />
        <Route path="/stock-moves/new" element={<StockMoveForm />} />

        <Route path="/inventories" element={<InventoryList />} />
        <Route path="/inventories/new" element={<InventoryForm />} />
        <Route path="/inventories/:id" element={<InventoryDetail />} />

        <Route path="/categories" element={<Navigate to="/catalog/categories" replace />} />

        <Route path="*" element={<Navigate to="/inventory" replace />} />
      </Routes>
    </Layout>
  );
};

export default InventoryRoutes;
