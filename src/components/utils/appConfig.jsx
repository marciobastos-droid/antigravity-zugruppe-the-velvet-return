/**
 * Application Configuration
 * Centralized settings for the application
 */

export const APP_CONFIG = {
  // Custom domain - use this for all generated absolute URLs
  CUSTOM_DOMAIN: 'https://zuhaus.pt',
  
  // App name
  APP_NAME: 'Zugruppe',
  
  // Default language
  DEFAULT_LANGUAGE: 'pt',
  
  // Default currency
  DEFAULT_CURRENCY: 'EUR'
};

/**
 * Get the full URL for a page route using custom domain
 * @param {string} pageName - Name of the page
 * @param {object} params - Query parameters
 * @returns {string} Full URL with custom domain
 */
export function getFullPageUrl(pageName, params = {}) {
  const baseUrl = APP_CONFIG.CUSTOM_DOMAIN;
  let url = `${baseUrl}/${pageName}`;
  
  // Add query parameters if provided
  const queryString = Object.keys(params)
    .filter(key => params[key] !== null && params[key] !== undefined)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * Get base domain (without protocol)
 * @returns {string} Domain without https://
 */
export function getBaseDomain() {
  return APP_CONFIG.CUSTOM_DOMAIN.replace(/^https?:\/\//, '');
}