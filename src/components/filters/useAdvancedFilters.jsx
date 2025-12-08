import React from "react";

/**
 * Hook para aplicar filtros avançados a uma lista de itens
 * @param {Array} items - Lista de itens a filtrar
 * @param {Object} filters - Estado dos filtros
 * @param {Object} filterConfig - Configuração dos filtros
 * @param {string} filterLogic - "AND" ou "OR"
 * @returns {Array} Lista filtrada
 */
export function useAdvancedFilters(items, filters, filterConfig, filterLogic = "AND") {
  return React.useMemo(() => {
    if (!items || items.length === 0) return [];

    return items.filter(item => {
      const results = Object.entries(filters).map(([key, value]) => {
        const config = filterConfig[key];
        if (!config) return true;

        // Verificar se o filtro está vazio
        if (value === "" || value === "all" || value === null || value === undefined) return true;
        if (Array.isArray(value) && value.length === 0) return true;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const hasValue = Object.values(value).some(v => v !== null && v !== "" && v !== undefined);
          if (!hasValue) return true;
        }

        // Pesquisa de texto
        if (config.type === "text" && config.searchFields) {
          const searchValue = String(value).toLowerCase();
          return config.searchFields.some(field => {
            const fieldValue = item[field];
            return fieldValue && String(fieldValue).toLowerCase().includes(searchValue);
          });
        }

        // Select simples
        if (config.type === "select") {
          return item[config.field] === value;
        }

        // Multi-select
        if (config.type === "multiSelect") {
          const itemValue = item[config.field];
          if (!itemValue) return false;
          if (Array.isArray(itemValue)) {
            return value.some(v => itemValue.includes(v));
          }
          return value.includes(itemValue);
        }

        // Date range
        if (config.type === "dateRange") {
          const dateValue = item[config.field];
          if (!dateValue) return true;
          const date = new Date(dateValue);
          if (value.from) {
            const fromDate = new Date(value.from);
            fromDate.setHours(0, 0, 0, 0);
            if (date < fromDate) return false;
          }
          if (value.to) {
            const toDate = new Date(value.to);
            toDate.setHours(23, 59, 59, 999);
            if (date > toDate) return false;
          }
          return true;
        }

        // Number range - optimized
        if (config.type === "numberRange") {
          const numValue = item[config.field];
          if (numValue === null || numValue === undefined) return true;
          
          const min = value.min !== null && value.min !== undefined ? Number(value.min) : null;
          const max = value.max !== null && value.max !== undefined ? Number(value.max) : null;
          
          if (min !== null && numValue < min) return false;
          if (max !== null && numValue > max) return false;
          return true;
        }

        // Boolean
        if (config.type === "boolean") {
          return item[config.field] === value;
        }

        return true;
      });

      return filterLogic === "OR" ? results.some(r => r) : results.every(r => r);
    });
  }, [items, filters, filterConfig, filterLogic]);
}

export default useAdvancedFilters;