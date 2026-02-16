// src/utils/apiUtils.js
export const extractResultsFromResponse = (response) => {
  if (!response || !response.data) return [];
  
  // Gestion des différents formats de réponse possibles
  if (response.data.results) {
    return response.data.results;
  } else if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data.data && response.data.data.results) {
    return response.data.data.results;
  }
  
  return [];
};
