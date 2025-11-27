// Widget Registry - defines all available widget types
export const widgetTypes = {
  metric_card: {
    id: "metric_card",
    name: "Cartão de Métrica",
    description: "Exibe um valor numérico com tendência",
    icon: "Hash",
    category: "metrics",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    configSchema: {
      metric: { type: "select", label: "Métrica", options: [
        { value: "total_properties", label: "Total de Imóveis" },
        { value: "active_properties", label: "Imóveis Ativos" },
        { value: "total_leads", label: "Total de Leads" },
        { value: "new_leads", label: "Novos Leads" },
        { value: "hot_leads", label: "Leads Quentes" },
        { value: "total_clients", label: "Total de Clientes" },
        { value: "total_value", label: "Valor Total Portfólio" },
        { value: "avg_price", label: "Preço Médio" }
      ]},
      show_trend: { type: "boolean", label: "Mostrar tendência", default: true },
      color: { type: "select", label: "Cor", options: [
        { value: "blue", label: "Azul" },
        { value: "green", label: "Verde" },
        { value: "purple", label: "Roxo" },
        { value: "amber", label: "Âmbar" },
        { value: "red", label: "Vermelho" }
      ]}
    }
  },
  pie_chart: {
    id: "pie_chart",
    name: "Gráfico Circular",
    description: "Distribuição de dados em formato circular",
    icon: "PieChart",
    category: "charts",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    configSchema: {
      data_source: { type: "select", label: "Dados", options: [
        { value: "property_types", label: "Tipos de Imóvel" },
        { value: "property_status", label: "Estado dos Imóveis" },
        { value: "lead_status", label: "Estado dos Leads" },
        { value: "lead_sources", label: "Origens dos Leads" },
        { value: "listing_types", label: "Venda vs Arrendamento" }
      ]},
      show_legend: { type: "boolean", label: "Mostrar legenda", default: true }
    }
  },
  bar_chart: {
    id: "bar_chart",
    name: "Gráfico de Barras",
    description: "Comparação de valores em barras",
    icon: "BarChart3",
    category: "charts",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    configSchema: {
      data_source: { type: "select", label: "Dados", options: [
        { value: "properties_by_city", label: "Imóveis por Cidade" },
        { value: "leads_by_month", label: "Leads por Mês" },
        { value: "value_by_type", label: "Valor por Tipo" },
        { value: "leads_by_agent", label: "Leads por Agente" }
      ]},
      orientation: { type: "select", label: "Orientação", options: [
        { value: "vertical", label: "Vertical" },
        { value: "horizontal", label: "Horizontal" }
      ]}
    }
  },
  line_chart: {
    id: "line_chart",
    name: "Gráfico de Linhas",
    description: "Evolução temporal de métricas",
    icon: "TrendingUp",
    category: "charts",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    configSchema: {
      data_source: { type: "select", label: "Dados", options: [
        { value: "properties_timeline", label: "Imóveis ao Longo do Tempo" },
        { value: "leads_timeline", label: "Leads ao Longo do Tempo" },
        { value: "value_timeline", label: "Valor ao Longo do Tempo" }
      ]},
      period: { type: "select", label: "Período", options: [
        { value: "7d", label: "Últimos 7 dias" },
        { value: "30d", label: "Últimos 30 dias" },
        { value: "90d", label: "Últimos 90 dias" },
        { value: "12m", label: "Últimos 12 meses" }
      ]}
    }
  },
  recent_list: {
    id: "recent_list",
    name: "Lista Recente",
    description: "Lista de itens recentes",
    icon: "List",
    category: "lists",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    configSchema: {
      entity: { type: "select", label: "Entidade", options: [
        { value: "properties", label: "Imóveis" },
        { value: "leads", label: "Leads" },
        { value: "clients", label: "Clientes" }
      ]},
      limit: { type: "number", label: "Limite", default: 5, min: 3, max: 10 }
    }
  },
  quick_actions: {
    id: "quick_actions",
    name: "Ações Rápidas",
    description: "Botões de ações frequentes",
    icon: "Zap",
    category: "actions",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    configSchema: {
      actions: { type: "multi_select", label: "Ações", options: [
        { value: "add_property", label: "Adicionar Imóvel" },
        { value: "add_lead", label: "Adicionar Lead" },
        { value: "import_properties", label: "Importar Imóveis" },
        { value: "run_matching", label: "Executar Matching" }
      ]}
    }
  },
  pipeline_summary: {
    id: "pipeline_summary",
    name: "Resumo do Pipeline",
    description: "Visão geral do pipeline de vendas",
    icon: "GitBranch",
    category: "crm",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 2 },
    configSchema: {
      show_values: { type: "boolean", label: "Mostrar valores", default: true }
    }
  },
  followup_alerts: {
    id: "followup_alerts",
    name: "Alertas de Follow-up",
    description: "Follow-ups pendentes e atrasados",
    icon: "Bell",
    category: "crm",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    configSchema: {
      show_overdue_only: { type: "boolean", label: "Apenas atrasados", default: false }
    }
  },
  text_note: {
    id: "text_note",
    name: "Nota de Texto",
    description: "Bloco de texto personalizado",
    icon: "FileText",
    category: "other",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 1 },
    configSchema: {
      content: { type: "textarea", label: "Conteúdo", default: "" },
      background: { type: "select", label: "Fundo", options: [
        { value: "white", label: "Branco" },
        { value: "blue", label: "Azul" },
        { value: "green", label: "Verde" },
        { value: "yellow", label: "Amarelo" }
      ]}
    }
  }
};

export const widgetCategories = {
  metrics: { name: "Métricas", icon: "Hash" },
  charts: { name: "Gráficos", icon: "BarChart3" },
  lists: { name: "Listas", icon: "List" },
  crm: { name: "CRM", icon: "Users" },
  actions: { name: "Ações", icon: "Zap" },
  other: { name: "Outros", icon: "MoreHorizontal" }
};

export const getWidgetsByCategory = () => {
  const result = {};
  Object.values(widgetTypes).forEach(widget => {
    if (!result[widget.category]) result[widget.category] = [];
    result[widget.category].push(widget);
  });
  return result;
};