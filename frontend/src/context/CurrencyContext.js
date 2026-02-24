import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from '../utils/axiosConfig';

const CurrencyContext = createContext(null);

export const CurrencyProvider = ({ children }) => {
  const [defaultCurrency, setDefaultCurrency] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDefaultCurrency = useCallback(async () => {
    try {
      const response = await axios.get('/api/core/currencies/default/');
      setDefaultCurrency(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement de la devise par défaut:', error);
      // Fallback — pas de hardcode MAD
      setDefaultCurrency(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefaultCurrency();
  }, [fetchDefaultCurrency]);

  // Code ISO de la devise par défaut (ex: "MAD", "XOF", "EUR")
  const currencyCode = defaultCurrency?.code || '???';

  // Symbole de la devise par défaut (ex: "MAD", "F CFA", "€")
  const currencySymbol = defaultCurrency?.symbol || '?';

  // ID de la devise par défaut (pour comparaison devise étrangère)
  const currencyId = defaultCurrency?.id || null;

  // Statut de verrouillage
  const isLocked = defaultCurrency?.is_locked || false;

  // Vérifie si une devise (par son ID) est étrangère
  const isForeignCurrency = useCallback((currId) => {
    if (!currencyId) return false;
    return currId !== currencyId;
  }, [currencyId]);

  // Recharger après modification de la devise par défaut
  const refreshCurrency = useCallback(() => {
    setLoading(true);
    fetchDefaultCurrency();
  }, [fetchDefaultCurrency]);

  return (
    <CurrencyContext.Provider value={{
      defaultCurrency,
      currencyCode,
      currencySymbol,
      currencyId,
      isLocked,
      isForeignCurrency,
      refreshCurrency,
      loading,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency doit être utilisé dans un CurrencyProvider');
  }
  return context;
};

export default CurrencyContext;
