import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, UserCog, Briefcase, Users, CheckCircle2 } from "lucide-react";

export default function RoleTemplates({ onApplyTemplate }) {
  const templates = [
    {
      name: "Admin Completo",
      userType: "admin",
      icon: Shield,
      color: "purple",
      description: "Acesso total a todas as funcionalidades",
      permissions: {
        pages: {
          dashboard: true, browse: true, my_listings: true, crm: true, tools: true,
          team: true, franchising: true, user_management: true, contracts: true,
          documents: true, marketing: true, analytics: true
        },
        tools: {
          marketingHub: true, marketingCampaigns: true, socialMedia: true, socialAdCreator: true,
          facebookCampaigns: true, facebookLeads: true, facebookForms: true,
          importProperties: true, importLeads: true, importContacts: true, exportProperties: true,
          description: true, pricing: true, video: true, calendar: true, emailHub: true,
          aiMatching: true, autoMatching: true, duplicateChecker: true, commissions: true, invoices: true
        },
        data: {
          view_all_properties: true, view_all_leads: true, view_all_clients: true,
          view_all_contracts: true, view_team_data: true, export_data: true, delete_records: true
        },
        actions: {
          assign_leads: true, manage_team: true, configure_integrations: true,
          manage_permissions: true, invite_users: true, approve_contracts: true,
          manage_commissions: true
        }
      }
    },
    {
      name: "Gestor",
      userType: "gestor",
      icon: Briefcase,
      color: "blue",
      description: "Gestão de equipa e visualização completa de dados",
      permissions: {
        pages: {
          dashboard: true, browse: true, my_listings: true, crm: true, tools: true,
          team: true, franchising: false, user_management: false, contracts: true,
          documents: true, marketing: true, analytics: true
        },
        tools: {
          marketingHub: true, marketingCampaigns: true, socialMedia: true,
          facebookLeads: true, importProperties: true, importLeads: true, exportProperties: true,
          description: true, pricing: true, video: true, calendar: true, emailHub: true,
          aiMatching: true, autoMatching: true, duplicateChecker: true, commissions: true, reportsExporter: true
        },
        data: {
          view_all_properties: true, view_all_leads: true, view_all_clients: true,
          view_all_contracts: true, view_team_data: true, export_data: true, delete_records: false
        },
        actions: {
          assign_leads: true, manage_team: true, configure_integrations: false,
          manage_permissions: false, invite_users: true, approve_contracts: true,
          manage_commissions: true
        }
      }
    },
    {
      name: "Consultor",
      userType: "consultant",
      icon: UserCog,
      color: "indigo",
      description: "Acesso a ferramentas e alguns dados da equipa",
      permissions: {
        pages: {
          dashboard: true, browse: true, my_listings: true, crm: true, tools: true,
          team: false, franchising: false, user_management: false, contracts: true,
          documents: true, marketing: false, analytics: false
        },
        tools: {
          facebookLeads: true, importProperties: true, importLeads: true,
          description: true, pricing: true, calendar: true, emailHub: true,
          aiMatching: true, duplicateChecker: true
        },
        data: {
          view_all_properties: true, view_all_leads: true, view_all_clients: false,
          view_all_contracts: false, view_team_data: false, export_data: false, delete_records: false
        },
        actions: {
          assign_leads: false, manage_team: false, configure_integrations: false,
          manage_permissions: false, invite_users: false, approve_contracts: false,
          manage_commissions: false
        }
      }
    },
    {
      name: "Agente Básico",
      userType: "agente",
      icon: Users,
      color: "green",
      description: "Acesso básico para gerir próprios imóveis e leads",
      permissions: {
        pages: {
          dashboard: true, browse: true, my_listings: true, crm: true, tools: true,
          team: false, franchising: false, user_management: false, contracts: true,
          documents: true, marketing: false, analytics: false
        },
        tools: {
          description: true, calendar: true
        },
        data: {
          view_all_properties: false, view_all_leads: false, view_all_clients: false,
          view_all_contracts: false, view_team_data: false, export_data: false, delete_records: false
        },
        actions: {
          assign_leads: false, manage_team: false, configure_integrations: false,
          manage_permissions: false, invite_users: false, approve_contracts: false,
          manage_commissions: false
        }
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-2">Modelos de Permissões</h3>
        <p className="text-sm text-slate-600">
          Aplique rapidamente um conjunto de permissões pré-definido ou configure manualmente.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((template) => {
          const Icon = template.icon;
          const bgColors = {
            purple: "from-purple-500 to-purple-600",
            blue: "from-blue-500 to-blue-600",
            indigo: "from-indigo-500 to-indigo-600",
            green: "from-green-500 to-green-600"
          };

          return (
            <Card key={template.name} className="hover:shadow-lg transition-shadow border-2">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={`p-3 bg-gradient-to-br ${bgColors[template.color]} rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base mb-1">{template.name}</CardTitle>
                    <p className="text-sm text-slate-600">{template.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Páginas:</span>
                    <Badge variant="secondary">
                      {Object.values(template.permissions.pages).filter(v => v).length} ativas
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Ferramentas:</span>
                    <Badge variant="secondary">
                      {Object.values(template.permissions.tools).filter(v => v).length} ativas
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Dados:</span>
                    <Badge variant="secondary">
                      {Object.values(template.permissions.data).filter(v => v).length} ativas
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Ações:</span>
                    <Badge variant="secondary">
                      {Object.values(template.permissions.actions).filter(v => v).length} ativas
                    </Badge>
                  </div>
                </div>
                <Button 
                  onClick={() => onApplyTemplate(template.permissions)}
                  className="w-full"
                  variant="outline"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aplicar Modelo
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}