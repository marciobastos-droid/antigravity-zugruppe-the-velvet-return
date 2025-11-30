import React from "react";
import MetricCardWidget from "./MetricCardWidget";
import PieChartWidget from "./PieChartWidget";
import BarChartWidget from "./BarChartWidget";
import LineChartWidget from "./LineChartWidget";
import RecentListWidget from "./RecentListWidget";
import QuickActionsWidget from "./QuickActionsWidget";
import PipelineSummaryWidget from "./PipelineSummaryWidget";
import FollowupAlertsWidget from "./FollowupAlertsWidget";
import TextNoteWidget from "./TextNoteWidget";
import AgentStatsWidget from "./AgentStatsWidget";
import SalesByMonthWidget from "./SalesByMonthWidget";
import LeadsBySourceWidget from "./LeadsBySourceWidget";
import TopAgentsWidget from "./TopAgentsWidget";
import UpcomingTasksWidget from "./UpcomingTasksWidget";

const widgetComponents = {
  metric_card: MetricCardWidget,
  pie_chart: PieChartWidget,
  bar_chart: BarChartWidget,
  line_chart: LineChartWidget,
  recent_list: RecentListWidget,
  quick_actions: QuickActionsWidget,
  pipeline_summary: PipelineSummaryWidget,
  followup_alerts: FollowupAlertsWidget,
  text_note: TextNoteWidget,
  agent_stats: AgentStatsWidget,
  sales_by_month: SalesByMonthWidget,
  leads_by_source: LeadsBySourceWidget,
  top_agents: TopAgentsWidget,
  upcoming_tasks: UpcomingTasksWidget
};

export default function WidgetRenderer({ widget, data }) {
  const Component = widgetComponents[widget.type];
  
  if (!Component) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        Widget não encontrado: {widget.type}
      </div>
    );
  }

  return <Component config={widget.config || {}} data={data} />;
}