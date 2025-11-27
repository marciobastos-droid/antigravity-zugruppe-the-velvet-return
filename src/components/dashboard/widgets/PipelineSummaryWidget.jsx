import React from "react";
import { Badge } from "@/components/ui/badge";

const stageConfig = {
  new: { label: "Novo", color: "bg-slate-100 text-slate-700" },
  contacted: { label: "Contactado", color: "bg-blue-100 text-blue-700" },
  qualified: { label: "Qualificado", color: "bg-cyan-100 text-cyan-700" },
  proposal: { label: "Proposta", color: "bg-amber-100 text-amber-700" },
  negotiation: { label: "Negociação", color: "bg-purple-100 text-purple-700" },
  won: { label: "Ganho", color: "bg-green-100 text-green-700" },
  lost: { label: "Perdido", color: "bg-red-100 text-red-700" }
};

export default function PipelineSummaryWidget({ config, data }) {
  const { show_values = true } = config;
  const pipeline = data?.pipeline || {};

  const stages = Object.entries(stageConfig).filter(([key]) => key !== 'lost');

  return (
    <div className="h-full flex items-center gap-1 overflow-x-auto p-2">
      {stages.map(([key, stage], idx) => {
        const count = pipeline[key]?.count || 0;
        const value = pipeline[key]?.value || 0;
        return (
          <React.Fragment key={key}>
            <div className="flex-1 min-w-[80px] text-center">
              <Badge className={`${stage.color} mb-1`}>{stage.label}</Badge>
              <div className="text-xl font-bold text-slate-900">{count}</div>
              {show_values && value > 0 && (
                <div className="text-xs text-slate-500">€{(value/1000).toFixed(0)}k</div>
              )}
            </div>
            {idx < stages.length - 1 && (
              <div className="text-slate-300 flex-shrink-0">→</div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}