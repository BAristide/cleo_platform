// src/context/CompanyContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from '../utils/axiosConfig';

const CompanyContext = createContext({
  companyInfo: null,
  refreshCompanyInfo: () => {},
});

export const CompanyProvider = ({ children }) => {
  const [companyInfo, setCompanyInfo] = useState(null);

  const refreshCompanyInfo = useCallback(async () => {
    try {
      const res = await axios.get('/api/core/company/');
      setCompanyInfo(res.data);
    } catch {
      // Setup non effectué ou non authentifié — silencieux
    }
  }, []);

  useEffect(() => {
    refreshCompanyInfo();
  }, [refreshCompanyInfo]);

  return (
    <CompanyContext.Provider value={{ companyInfo, refreshCompanyInfo }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
export default CompanyContext;
