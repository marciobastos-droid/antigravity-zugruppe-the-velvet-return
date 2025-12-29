import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, Users, Building2, Calendar, FileText, 
  Target, Mail, Phone, Sparkles, BarChart3, Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";

const defaultShortcuts = [
  { id: "addProperty", label: "Novo Imóvel", icon: Building2, path: "AddListing", color: "bg-blue-500" },
  { id: "addLead", label: "Novo Lead", icon: Users, path: "CRMAdvanced?tab=opportunities", color: "bg-purple-500" },
  { id: "calendar", label: "Calendário", icon: Calendar, path: "Tools", color: "bg-amber-500" },
  { id: "matching", label: "AI Matching", icon: Sparkles, path: "ClientPreferences", color: "bg-pink-500" },
  { id: "reports", label: "Relatórios", icon: BarChart3, path: "Dashboard", color: "bg-emerald-500" },
  { id: "tools", label: "Ferramentas", icon: Wrench, path: "Tools", color: "bg-slate-500" }
];

export default function QuickShortcutsWidget({ data, config }) {
  const shortcuts = config?.shortcuts 
    ? defaultShortcuts.filter(s => config.shortcuts.includes(s.id))
    : defaultShortcuts;

  const columns = config?.columns || 3;

  return (
    <div className={`h-full grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {shortcuts.map((shortcut) => {
        const Icon = shortcut.icon;
        return (
          <Link
            key={shortcut.id}
            to={createPageUrl(shortcut.path)}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
          >
            <div className={`w-10 h-10 ${shortcut.color} rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-slate-700 text-center">{shortcut.label}</span>
          </Link>
        );
      })}
    </div>
  );
}