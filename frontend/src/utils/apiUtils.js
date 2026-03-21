// src/utils/apiUtils.js
import { message } from 'antd';

export const extractResultsFromResponse = (response) => {
  if (!response || !response.data) return [];

  if (response.data.results) {
    return response.data.results;
  } else if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data.data && response.data.data.results) {
    return response.data.data.results;
  }

  return [];
};

/**
 * Gère les erreurs API : remonte les erreurs de champs sur le formulaire Ant Design
 * et affiche un message global pour les erreurs non liées à un champ.
 *
 * @param {Error}  error           - L'erreur Axios capturée dans le catch
 * @param {object} form            - Instance de formulaire Ant Design (ou null)
 * @param {string} fallbackMessage - Message affiché si aucune erreur de champ n'est trouvée
 */
export const handleApiError = (error, form = null, fallbackMessage = 'Une erreur est survenue') => {
  if (error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data;

    // Mapper les erreurs sur les champs du formulaire
    const fieldErrors = Object.entries(data)
      .filter(([key]) => key !== 'non_field_errors' && key !== 'detail')
      .map(([name, errors]) => ({
        name,
        errors: Array.isArray(errors) ? errors : [String(errors)],
      }));

    if (fieldErrors.length > 0 && form) {
      form.setFields(fieldErrors);
      message.error('Veuillez corriger les erreurs indiquées dans le formulaire');
      return;
    }

    // Erreurs globales non liées à un champ
    const globalError = data.non_field_errors || data.detail;
    if (globalError) {
      message.error(Array.isArray(globalError) ? globalError.join(' ') : String(globalError));
      return;
    }
  }

  message.error(fallbackMessage);
};
