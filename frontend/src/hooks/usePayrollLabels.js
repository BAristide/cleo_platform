import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';

const DEFAULT_LABELS = {
  social: 'Cotisations sociales',
  health: 'Cotisation complémentaire',
  tax: 'Impôt sur le revenu',
  social_number: 'N° immatriculation sociale',
  social_number_short: 'N° immatriculation',
  social_organism: 'Organisme social',
  retirement_label: 'Retraite',
  tax_short: 'Impôt',
  social_employer: 'Cotisations sociales employeur',
  health_employer: 'Cotisation complémentaire employeur',
};

/* Cache au niveau module — partagé entre toutes les instances du hook.
   Évite les appels réseau multiples quand plusieurs composants
   du module Paie sont montés simultanément. */
let cachedLabels = null;
let fetchPromise = null;

const usePayrollLabels = () => {
  const [labels, setLabels] = useState(cachedLabels || DEFAULT_LABELS);

  useEffect(() => {
    if (cachedLabels) {
      setLabels(cachedLabels);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = axios
        .get('/api/payroll/labels/')
        .then((r) => {
          cachedLabels = { ...DEFAULT_LABELS, ...r.data };
          return cachedLabels;
        })
        .catch(() => {
          cachedLabels = DEFAULT_LABELS;
          return cachedLabels;
        });
    }

    fetchPromise.then((data) => setLabels(data));
  }, []);

  return labels;
};

export default usePayrollLabels;
