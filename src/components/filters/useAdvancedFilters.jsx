import React from "react";

/**
 * Hook para aplicar filtros avançados a um array de dados
 * Suporta lógica AND/OR e vários tipos de filtros
 */
export function useAdvancedFilters(data, filters, filterConfig, logic = "AND") {
  return React.useMemo(() => {
    if (!data || data.length === 0) return data;
    
    return data.filter(item => {
      const results = Object.entries(filters).map(([key, value]) => {
        const config = filterConfig[key];
        if (!config) return true;
        
        // Ignorar filtros vazios
        if (value === "" || value === "all" || value === null || value === undefined) return true;
        if (Array.isArray(value) && value.length === 0) return true;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const hasValue = Object.values(value).some(v => v !== null && v !== "" && v !== undefined);
          if (!hasValue) return true;
        }

        // Obter valor do item (suporta nested paths como "property.city")
        const getNestedValue = (obj, path) => {
          return path.split('.').reduce((current, key) => current?.[key], obj);
        };
        
        const itemValue = config.field ? getNestedValue(item, config.field) : item[key];

        switch (config.type) {
          case "text":
            if (!value) return true;
            const searchValue = String(value).toLowerCase();
            // Pesquisar em múltiplos campos se definido
            if (config.searchFields) {
              return config.searchFields.some(field => {
                const fieldValue = getNestedValue(item, field);
                return fieldValue && String(fieldValue).toLowerCase().includes(searchValue);
              });
            }
            return itemValue && String(itemValue).toLowerCase().includes(searchValue);

          case "select":
            if (value === "all") return true;
            return itemValue === value;

          case "multiSelect":
            if (!value || value.length === 0) return true;
            // Se for array, verificar se algum valor coincide
            if (Array.isArray(itemValue)) {
              return value.some(v => itemValue.includes(v));
            }
            return value.includes(itemValue);

          case "dateRange":
            if (!value || (!value.from && !value.to)) return true;
            const dateField = config.field || key;
            const itemDate = getNestedValue(item, dateField);
            if (!itemDate) return true;
            
            const date = new Date(itemDate);
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

          case "numberRange":
            if (!value || (value.min === null && value.max === null)) return true;
            const numField = config.field || key;
            const numValue = getNestedValue(item, numField);
            if (numValue === null || numValue === undefined) return true;
            
            if (value.min !== null && numValue < value.min) return false;
            if (value.max !== null && numValue > value.max) return false;
            return true;

          case "boolean":
            if (value === null || value === undefined) return true;
            return itemValue === value;

          default:
            return true;
        }
      });

      // Aplicar lógica AND ou OR
      if (logic === "OR") {
        // Se todos os filtros estão vazios, mostrar tudo
        const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
          if (value === "" || value === "all" || value === null || value === undefined) return false;
          if (Array.isArray(value) && value.length === 0) return false;
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return Object.values(value).some(v => v !== null && v !== "" && v !== undefined);
          }
          return true;
        });
        
        if (!hasActiveFilters) return true;
        return results.some(r => r === true);
      }
      
      return results.every(r => r === true);
    });
  }, [data, filters, filterConfig, logic]);
}

/**
 * Função utilitária para criar configuração de filtro
 */
export function createFilterConfig(config) {
  return config;
}

/**
 * Configurações predefinidas para filtros comuns
 */
export const commonFilterConfigs = {
  createdDate: {
    type: "dateRange",
    label: "Data de Criação",
    field: "created_date",
    advanced: true
  },
  updatedDate: {
    type: "dateRange",
    label: "Data de Atualização",
    field: "updated_date",
    advanced: true
  },
  price: {
    type: "numberRange",
    label: "Preço",
    field: "price",
    prefix: "€"
  },
  status: {
    type: "select",
    label: "Estado"
  }
};