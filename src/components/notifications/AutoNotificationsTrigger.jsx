import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, CheckCircle2, Settings } from "lucide-react";
import { toast } from "sonner";

export default function AutoNotificationsTrigger() {
  const [settings, setSettings] = useState({
    new_leads: true,
    property_status_changes: true,
    property_sold: true,
    low_quality_scores: true
  });
  const [testing, setTesting] = useState(false);

  const handleTest = async (type) => {
    setTesting(true);
    try {
      // Create a test notification
      const testData = {
        new_lead: {
          type: 'new_lead',
          entity_data: {
            buyer_name: 'Cliente Teste',
            lead_type: 'comprador',
            location: 'Lisboa',
            status: 'new'
          }
        },
        property_status_change: {
          type: 'property_status_change',
          entity_data: {
            title: 'Apartamento T3 em Lisboa',
            ref_id: 'IMO-TEST',
            availability_status: 'reserved'
          }
        },
        property_sold: {
          type: 'property_sold',
          entity_data: {
            title: 'Moradia V4 no Porto',
            ref_id: 'IMO-TEST',
            price: 450000
          }
        },
        low_quality_score: {
          type: 'low_quality_score',
          entity_data: {
            title: 'Imóvel com Dados Incompletos',
            ref_id: 'IMO-TEST',
            quality_score: 35
          }
        }
      };

      await base44.functions.invoke('autoNotifications', testData[type]);
      
      toast.success("Notificação de teste criada!");
    } catch (error) {
      toast.error("Erro ao criar notificação");
      console.error(error);
    }
    setTesting(false);
  };

  const settingsConfig = [
    {
      key: 'new_leads',
      label: 'Novos Leads',
      description: 'Notificar quando um novo lead é criado',
      icon: BellRing,
      testType: 'new_lead'
    },
    {
      key: 'property_status_changes',
      label: 'Mudanças de Estado',
      description: 'Notificar quando o estado de um imóvel muda',
      icon: Bell,
      testType: 'property_status_change'
    },
    {
      key: 'property_sold',
      label: 'Imóveis Vendidos',
      description: 'Notificar toda a equipa quando um imóvel é vendido',
      icon: CheckCircle2,
      testType: 'property_sold'
    },
    {
      key: 'low_quality_scores',
      label: 'Pontuações Baixas',
      description: 'Notificar quando um imóvel tem pontuação inferior a 60',
      icon: Settings,
      testType: 'low_quality_score'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notificações Automáticas
        </CardTitle>
        <p className="text-sm text-slate-600">
          Configure alertas automáticos para eventos importantes
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {settingsConfig.map((config) => {
          const Icon = config.icon;
          return (
            <div key={config.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-start gap-3 flex-1">
                <Icon className="w-5 h-5 text-slate-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium text-slate-900">{config.label}</Label>
                    <Badge variant="outline" className="text-xs">
                      {settings[config.key] ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(config.testType)}
                  disabled={testing}
                >
                  Testar
                </Button>
                <Switch
                  checked={settings[config.key]}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, [config.key]: checked })
                  }
                />
              </div>
            </div>
          );
        })}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>ℹ️ Como funciona:</strong> As notificações são criadas automaticamente quando:
            eventos importantes acontecem no sistema. Pode testar cada tipo para ver como aparecem.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}