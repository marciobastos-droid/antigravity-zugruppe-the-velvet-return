import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Sparkles } from "lucide-react";

const actionConfig = {
  add_property: { label: "Novo Imóvel", icon: Plus, href: createPageUrl("AddListing"), color: "bg-blue-600 hover:bg-blue-700" },
  add_lead: { label: "Nova Lead", icon: Plus, href: createPageUrl("CRMAdvanced"), color: "bg-green-600 hover:bg-green-700" },
  import_properties: { label: "Importar", icon: Upload, href: createPageUrl("Tools"), color: "bg-purple-600 hover:bg-purple-700" },
  run_matching: { label: "Matching", icon: Sparkles, href: createPageUrl("Tools"), color: "bg-amber-600 hover:bg-amber-700" }
};

export default function QuickActionsWidget({ config }) {
  const { actions = ["add_property", "add_lead"] } = config;

  return (
    <div className="h-full flex flex-wrap gap-2 items-center justify-center p-2">
      {actions.map(actionKey => {
        const action = actionConfig[actionKey];
        if (!action) return null;
        const Icon = action.icon;
        return (
          <Link key={actionKey} to={action.href}>
            <Button className={`${action.color} text-white gap-2`} size="sm">
              <Icon className="w-4 h-4" />
              {action.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}