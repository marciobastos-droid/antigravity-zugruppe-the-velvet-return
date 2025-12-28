import { v4 as uuidv4 } from 'uuid';

/**
 * Centralized Error Logger
 * Logs errors with context and can be extended to send to external services
 */

const ERROR_LOG_KEY = 'app_error_logs';
const MAX_STORED_ERRORS = 50;

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error types
export const ErrorType = {
  RUNTIME: 'runtime',
  API: 'api',
  VALIDATION: 'validation',
  NETWORK: 'network',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
};

/**
 * Log an error with context
 * @param {Error} error - The error object
 * @param {Object} context - Additional context about the error
 * @returns {string} errorId - Unique identifier for the error
 */
export function logError(error, context = {}) {
  const errorId = uuidv4();
  
  const errorLog = {
    id: errorId,
    timestamp: new Date().toISOString(),
    message: error?.message || 'Unknown error',
    stack: error?.stack || null,
    type: context.type || ErrorType.RUNTIME,
    severity: context.severity || ErrorSeverity.MEDIUM,
    ...context,
    // User context
    userAgent: navigator?.userAgent,
    url: window?.location?.href,
    viewport: {
      width: window?.innerWidth,
      height: window?.innerHeight
    }
  };

  // Store in local storage for debugging
  storeErrorLocally(errorLog);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🔴 Error Logged:', errorLog);
  }

  // Send to external service if configured
  // sendToExternalService(errorLog);

  return errorId;
}

/**
 * Store error in local storage (for debugging)
 */
function storeErrorLocally(errorLog) {
  try {
    const stored = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
    stored.unshift(errorLog);
    
    // Keep only the latest errors
    const trimmed = stored.slice(0, MAX_STORED_ERRORS);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to store error locally:', e);
  }
}

/**
 * Get stored error logs (for admin debugging)
 */
export function getStoredErrors() {
  try {
    return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear stored error logs
 */
export function clearStoredErrors() {
  try {
    localStorage.removeItem(ERROR_LOG_KEY);
  } catch (e) {
    console.error('Failed to clear stored errors:', e);
  }
}

/**
 * Log API error with detailed context
 */
export function logApiError(error, endpoint, payload = null) {
  const context = {
    type: ErrorType.API,
    severity: ErrorSeverity.HIGH,
    endpoint,
    payload,
    status: error.response?.status,
    statusText: error.response?.statusText,
    responseData: error.response?.data
  };

  return logError(error, context);
}

/**
 * Log validation error
 */
export function logValidationError(message, field, value) {
  const error = new Error(message);
  const context = {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    field,
    value
  };

  return logError(error, context);
}

/**
 * Send errors to external monitoring service (placeholder)
 * Integrate with Sentry, LogRocket, Bugsnag, etc.
 */
function sendToExternalService(errorLog) {
  // Example: Sentry integration
  // if (window.Sentry) {
  //   window.Sentry.captureException(new Error(errorLog.message), {
  //     extra: errorLog
  //   });
  // }

  // Example: Custom endpoint
  // fetch('/api/log-error', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(errorLog)
  // }).catch(() => {});
}

/**
 * Get error statistics
 */
export function getErrorStats() {
  const errors = getStoredErrors();
  
  return {
    total: errors.length,
    byType: errors.reduce((acc, err) => {
      acc[err.type] = (acc[err.type] || 0) + 1;
      return acc;
    }, {}),
    bySeverity: errors.reduce((acc, err) => {
      acc[err.severity] = (acc[err.severity] || 0) + 1;
      return acc;
    }, {}),
    recent: errors.slice(0, 10)
  };
}