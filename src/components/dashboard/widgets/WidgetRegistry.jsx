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
  },
  agent_stats: {
    id: "agent_stats",
    name: "Estatísticas por Agente",
    description: "Performance e métricas de cada agente",
    icon: "Users",
    category: "crm",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 3 },
    configSchema: {
      displayMode: { type: "select", label: "Modo de exibição", options: [
        { value: "cards", label: "Cartões detalhados" },
        { value: "chart", label: "Gráfico comparativo" }
      ]}
    }
  },
  sales_by_month: {
    id: "sales_by_month",
    name: "Resumo de Vendas por Mês",
    description: "Volume e valor de vendas mensais",
    icon: "TrendingUp",
    category: "charts",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    configSchema: {
      show_value: { type: "boolean", label: "Mostrar valores (€)", default: true },
      show_count: { type: "boolean", label: "Mostrar quantidade", default: true },
      months: { type: "select", label: "Período", options: [
        { value: "6", label: "Últimos 6 meses" },
        { value: "12", label: "Últimos 12 meses" }
      ]}
    }
  },
  leads_by_source: {
    id: "leads_by_source",
    name: "Novos Leads por Origem",
    description: "Distribuição de leads por fonte de aquisição",
    icon: "PieChart",
    category: "crm",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    configSchema: {
      chart_type: { type: "select", label: "Tipo de gráfico", options: [
        { value: "pie", label: "Circular" },
        { value: "bar", label: "Barras" }
      ]},
      show_percentage: { type: "boolean", label: "Mostrar percentagem", default: true }
    }
  },
  top_agents: {
    id: "top_agents",
    name: "Performance de Agentes Chave",
    description: "Ranking dos melhores agentes",
    icon: "Users",
    category: "crm",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    configSchema: {
      metric: { type: "select", label: "Ordenar por", options: [
        { value: "leads", label: "Total de Leads" },
        { value: "conversions", label: "Conversões" },
        { value: "value", label: "Valor Total" }
      ]},
      limit: { type: "number", label: "Nº de agentes", default: 5, min: 3, max: 10 }
    }
  },
  upcoming_tasks: {
    id: "upcoming_tasks",
    name: "Próximas Tarefas/Compromissos",
    description: "Tarefas e visitas agendadas",
    icon: "Bell",
    category: "crm",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    configSchema: {
      show_tasks: { type: "boolean", label: "Mostrar tarefas", default: true },
      show_appointments: { type: "boolean", label: "Mostrar visitas", default: true },
      days_ahead: { type: "number", label: "Dias à frente", default: 7, min: 1, max: 30 }
    }
  },
  leads_by_category: {
    id: "leads_by_category",
    name: "Leads por Categoria",
    description: "Distribuição Hot/Warm/Cold",
    icon: "Flame",
    category: "crm",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    configSchema: {
      showChart: { type: "boolean", label: "Mostrar gráfico", default: true }
    }
  },
  sales_kpi: {
    id: "sales_kpi",
    name: "KPIs de Vendas",
    description: "Métricas chave de vendas",
    icon: "DollarSign",
    category: "metrics",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    configSchema: {
      kpis: { type: "multi_select", label: "KPIs", options: [
        { value: "total_value", label: "Valor Portfolio" },
        { value: "conversion_rate", label: "Taxa Conversão" },
        { value: "avg_deal_value", label: "Valor Médio" },
        { value: "deals_this_month", label: "Negócios do Mês" }
      ]}
    }
  },
  recent_activity: {
    id: "recent_activity",
    name: "Atividades Recentes",
    description: "Timeline de atividades",
    icon: "Clock",
    category: "lists",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    configSchema: {
      limit: { type: "number", label: "Limite", default: 6, min: 3, max: 15 }
    }
  },
  quick_shortcuts: {
    id: "quick_shortcuts",
    name: "Atalhos Rápidos",
    description: "Acesso rápido às tarefas frequentes",
    icon: "Zap",
    category: "actions",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    configSchema: {
      columns: { type: "number", label: "Colunas", default: 3, min: 2, max: 4 },
      shortcuts: { type: "multi_select", label: "Atalhos", options: [
        { value: "addProperty", label: "Novo Imóvel" },
        { value: "addLead", label: "Novo Lead" },
        { value: "calendar", label: "Calendário" },
        { value: "matching", label: "AI Matching" },
        { value: "reports", label: "Relatórios" },
        { value: "tools", label: "Ferramentas" }
      ]}
    }
  },
  team_leaderboard: {
    id: "team_leaderboard",
    name: "Ranking da Equipa",
    description: "Leaderboard de performance",
    icon: "Trophy",
    category: "crm",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    configSchema: {
      metric: { type: "select", label: "Ordenar por", options: [
        { value: "leads", label: "Total Leads" },
        { value: "closed", label: "Fechados" },
        { value: "properties", label: "Imóveis" },
        { value: "conversionRate", label: "Conversão" }
      ]},
      limit: { type: "number", label: "Limite", default: 5, min: 3, max: 10 }
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