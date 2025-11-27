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
  agent_stats: AgentStatsWidget
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