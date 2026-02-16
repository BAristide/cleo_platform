import axios from 'axios';

const instance = axios.create({
  baseURL: window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : ''),
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  withCredentials: true
});

// Intercepteur pour gérer les erreurs
instance.interceptors.response.use(
  response => response,
  error => {
    // Gérer les erreurs d'authentification
    if (error.response && error.response.status === 401) {
      // Rediriger vers la page de login
      window.location.href = '/login/?next=' + window.location.pathname;
    }
    
    // Propager l'erreur pour qu'elle puisse être traitée par les composants
    return Promise.reject(error);
  }
);

export default instance;
