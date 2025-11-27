import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Users, UserCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function RecentListWidget({ config, data }) {
  const { entity, limit = 5 } = config;
  const items = (data?.lists?.[entity] || []).slice(0, limit);

  const icons = {
    properties: Building2,
    leads: Users,
    clients: UserCircle
  };

  const getLink = (item) => {
    if (entity === "properties") return `${createPageUrl("PropertyDetails")}?id=${item.id}`;
    if (entity === "leads") return createPageUrl("CRMAdvanced");
    return createPageUrl("CRMAdvanced");
  };

  const Icon = icons[entity] || Building2;

  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        Sem itens recentes
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto space-y-2">
        {items.map((item, idx) => (
          <Link 
            key={item.id || idx}
            to={getLink(item)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{item.title || item.name}</p>
              <p className="text-xs text-slate-500">
                {item.subtitle || (item.created_date && format(new Date(item.created_date), 'dd/MM/yy'))}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}