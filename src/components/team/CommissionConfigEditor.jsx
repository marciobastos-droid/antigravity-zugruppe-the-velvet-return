import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Percent, Save, Info } from "lucide-react";
import { toast } from "sonner";

export default function CommissionConfigEditor({ user, onSave }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    default_split_percentage: user?.commission_config?.default_split_percentage || 50,
    company_split_percentage: user?.commission_config?.company_split_percentage || 50,
    default_commission_percentage: user?.commission_config?.default_commission_percentage || 3,
    auto_generate_commissions: user?.commission_config?.auto_generate_commissions !== false
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.auth.updateMe({ commission_config: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success("Configuração de comissões atualizada!");
      if (onSave) onSave();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate splits add up to 100
    const totalSplit = config.default_split_percentage + config.company_split_percentage;
    if (totalSplit !== 100) {
      toast.error(`Os splits devem somar 100% (atualmente: ${totalSplit}%)`);
      return;
    }

    updateUserMutation.mutate(config);
  };

  const handleSplitChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    if (field === 'default_split_percentage') {
      setConfig({
        ...config,
        default_split_percentage: numValue,
        company_split_percentage: 100 - numValue
      });
    } else {
      setConfig({
        ...config,
        company_split_percentage: numValue,
        default_split_percentage: 100 - numValue
      });
    }
  };

  const totalSplit = config.default_split_percentage + config.company_split_percentage;
  const isValid = totalSplit === 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-green-600" />
          Configuração de Comissões
        </CardTitle>
        <p className="text-sm text-slate-600">
          Configure os valores padrão para cálculo automático de comissões
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Commission Percentage */}
          <div>
            <Label className="flex items-center gap-2">
              Percentagem de Comissão sobre o Negócio
              <Badge variant="outline" className="text-xs">Padrão</Badge>
            </Label>
            <div className="relative mt-2">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={config.default_commission_percentage}
                onChange={(e) => setConfig({...config, default_commission_percentage: parseFloat(e.target.value) || 0})}
                className="pr-8"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ex: 3% sobre um negócio de €200.000 = €6.000 de comissão total
            </p>
          </div>

          {/* Split Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Divisão de Comissão (Splits)</Label>
              <Badge className={isValid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                Total: {totalSplit}%
              </Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Minha Percentagem (Agente)</Label>
                <div className="relative mt-2">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={config.default_split_percentage}
                    onChange={(e) => handleSplitChange('default_split_percentage', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <Label className="text-sm">Percentagem da Empresa</Label>
                <div className="relative mt-2">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={config.company_split_percentage}
                    onChange={(e) => handleSplitChange('company_split_percentage', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {!isValid && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  As percentagens devem somar 100%
                </p>
              </div>
            )}
          </div>

          {/* Example Calculation */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-slate-900 mb-3">Exemplo de Cálculo</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Valor do Negócio:</span>
                <span className="font-medium">€200.000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Comissão ({config.default_commission_percentage}%):</span>
                <span className="font-medium text-green-700">
                  €{((200000 * config.default_commission_percentage) / 100).toLocaleString()}
                </span>
              </div>
              <div className="border-t border-slate-300 pt-2 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Sua Parte ({config.default_split_percentage}%):</span>
                  <span className="font-semibold text-blue-700">
                    €{((200000 * config.default_commission_percentage / 100 * config.default_split_percentage) / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Empresa ({config.company_split_percentage}%):</span>
                  <span className="font-semibold text-slate-700">
                    €{((200000 * config.default_commission_percentage / 100 * config.company_split_percentage) / 100).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-generation Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-1">
              <Label className="font-medium">Gerar Comissões Automaticamente</Label>
              <p className="text-xs text-slate-600 mt-1">
                Criar comissões automaticamente quando uma oportunidade for fechada
              </p>
            </div>
            <Switch
              checked={config.auto_generate_commissions}
              onCheckedChange={(checked) => setConfig({...config, auto_generate_commissions: checked})}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isValid || updateUserMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {updateUserMutation.isPending ? (
              <>Guardando...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Configuração
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}