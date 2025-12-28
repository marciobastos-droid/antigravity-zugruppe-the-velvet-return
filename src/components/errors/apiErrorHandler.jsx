import { toast } from "sonner";
import { logApiError, ErrorSeverity } from "./ErrorLogger";

/**
 * Centralized API Error Handler
 * Provides consistent error handling across all API calls
 */

// User-friendly error messages
const ERROR_MESSAGES = {
  400: "Pedido inválido. Verifique os dados e tente novamente.",
  401: "Não autenticado. Por favor, faça login novamente.",
  403: "Sem permissão para realizar esta ação.",
  404: "Recurso não encontrado.",
  409: "Conflito. O recurso já existe ou está em uso.",
  422: "Dados inválidos. Verifique os campos e tente novamente.",
  429: "Demasiados pedidos. Por favor, aguarde um momento.",
  500: "Erro no servidor. Tente novamente mais tarde.",
  502: "Servidor temporariamente indisponível.",
  503: "Serviço em manutenção. Tente novamente em breve.",
  NETWORK_ERROR: "Erro de conexão. Verifique sua internet.",
  TIMEOUT: "Pedido expirou. Tente novamente.",
  UNKNOWN: "Erro inesperado. Contacte o suporte se persistir."
};

/**
 * Handle API errors consistently
 * @param {Error} error - The error object
 * @param {Object} options - Configuration options
 * @returns {Object} - Structured error object
 */
export function handleApiError(error, options = {}) {
  const {
    showToast = true,
    customMessage = null,
    endpoint = 'unknown',
    silent = false,
    rethrow = false
  } = options;

  // Parse error details
  const errorDetails = parseError(error);
  
  // Log error
  const errorId = logApiError(error, endpoint);
  errorDetails.errorId = errorId;

  // Show toast notification (unless silent)
  if (showToast && !silent) {
    const message = customMessage || errorDetails.userMessage;
    
    if (errorDetails.severity === ErrorSeverity.CRITICAL) {
      toast.error(message, {
        duration: 5000,
        description: `Erro ID: ${errorId}`
      });
    } else {
      toast.error(message);
    }
  }

  // Rethrow if needed
  if (rethrow) {
    throw error;
  }

  return errorDetails;
}

/**
 * Parse error into structured format
 */
function parseError(error) {
  // Network errors
  if (!error.response && error.request) {
    return {
      type: 'network',
      status: null,
      userMessage: ERROR_MESSAGES.NETWORK_ERROR,
      technicalMessage: error.message,
      severity: ErrorSeverity.HIGH
    };
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED') {
    return {
      type: 'timeout',
      status: null,
      userMessage: ERROR_MESSAGES.TIMEOUT,
      technicalMessage: error.message,
      severity: ErrorSeverity.MEDIUM
    };
  }

  // HTTP errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    return {
      type: 'http',
      status,
      userMessage: data?.message || ERROR_MESSAGES[status] || ERROR_MESSAGES.UNKNOWN,
      technicalMessage: data?.error || error.message,
      details: data?.details || null,
      severity: getSeverityFromStatus(status)
    };
  }

  // Unknown errors
  return {
    type: 'unknown',
    status: null,
    userMessage: ERROR_MESSAGES.UNKNOWN,
    technicalMessage: error.message || 'Unknown error',
    severity: ErrorSeverity.MEDIUM
  };
}

/**
 * Determine error severity from HTTP status
 */
function getSeverityFromStatus(status) {
  if (status >= 500) return ErrorSeverity.CRITICAL;
  if (status === 401 || status === 403) return ErrorSeverity.HIGH;
  if (status >= 400) return ErrorSeverity.MEDIUM;
  return ErrorSeverity.LOW;
}

/**
 * Wrapper for API calls with automatic error handling
 * @param {Function} apiCall - The API function to call
 * @param {Object} options - Error handling options
 */
export async function withErrorHandling(apiCall, options = {}) {
  try {
    return await apiCall();
  } catch (error) {
    return handleApiError(error, options);
  }
}

/**
 * Create a retry wrapper for failed API calls
 */
export async function withRetry(apiCall, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = (error) => error.response?.status >= 500
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries && shouldRetry(error)) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }
      
      // Max retries reached or shouldn't retry
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Batch error handler for multiple API calls
 */
export async function handleBatchErrors(promises, options = {}) {
  const results = await Promise.allSettled(promises);
  
  const errors = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);
  
  if (errors.length > 0) {
    const errorId = logApiError(
      new Error(`Batch operation failed: ${errors.length} errors`),
      'batch_operation',
      { errorCount: errors.length }
    );
    
    if (options.showToast !== false) {
      toast.error(
        `${errors.length} operações falharam`,
        { description: `Erro ID: ${errorId}` }
      );
    }
  }
  
  return results;
}

/**
 * Check if error is retriable
 */
export function isRetriableError(error) {
  // Network errors are retriable
  if (!error.response) return true;
  
  // 5xx errors are retriable
  if (error.response.status >= 500) return true;
  
  // 429 (rate limit) is retriable
  if (error.response.status === 429) return true;
  
  return false;
}

/**
 * Get user-friendly message for specific error scenarios
 */
export function getContextualErrorMessage(error, context) {
  const messages = {
    create: "Erro ao criar. Verifique os dados e tente novamente.",
    update: "Erro ao atualizar. Tente novamente.",
    delete: "Erro ao eliminar. Tente novamente.",
    fetch: "Erro ao carregar dados. Recarregue a página.",
    upload: "Erro ao enviar ficheiro. Verifique o tamanho e formato."
  };
  
  return messages[context] || ERROR_MESSAGES.UNKNOWN;
}