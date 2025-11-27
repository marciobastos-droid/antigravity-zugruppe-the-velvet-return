import React from "react";
import DashboardBuilder from "@/components/dashboard/DashboardBuilder";
import { LayoutDashboard } from "lucide-react";

export default function CustomDashboards() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboards Personalizados</h1>
          <p className="text-slate-500">Crie e personalize dashboards com widgets interativos</p>
        </div>
      </div>

      <DashboardBuilder />
    </div>
  );
}