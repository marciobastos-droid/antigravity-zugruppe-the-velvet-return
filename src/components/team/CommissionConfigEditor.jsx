import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Percent, Save, Info, Plus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function CommissionConfigEditor({ user, onSave }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    default_split_percentage: user?.commission_config?.default_split_percentage || 50,
    company_split_percentage: user?.commission_config?.company_split_percentage || 50,
    default_commission_percentage: user?.commission_config?.default_commission_percentage || 3,
    sale_commission_percentage: user?.commission_config?.sale_commission_percentage || null,
    rent_commission_percentage: user?.commission_config?.rent_commission_percentage || null,
    tiered_rates: user?.commission_config?.tiered_rates || [],
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

  const addTier = () => {
    setConfig({
      ...config,
      tiered_rates: [
        ...config.tiered_rates,
        { min_value: 0, max_value: 100000, commission_percentage: 3 }
      ]
    });
  };

  const removeTier = (index) => {
    setConfig({
      ...config,
      tiered_rates: config.tiered_rates.filter((_, i) => i !== index)
    });
  };

  const updateTier = (index, field, value) => {
    const newTiers = [...config.tiered_rates];
    newTiers[index][field] = parseFloat(value) || 0;
    setConfig({ ...config, tiered_rates: newTiers });
  };

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
          {/* Commission Percentages */}
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                Percentagem de Comissão Padrão
                <Badge variant="outline" className="text-xs">Base</Badge>
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
                Usado quando não há regra específica
              </p>
            </div>

            {/* Deal Type Specific */}
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <Label className="text-sm flex items-center gap-2">
                  Comissão Vendas
                  <Badge variant="outline" className="text-xs">Específico</Badge>
                </Label>
                <div className="relative mt-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={config.sale_commission_percentage || ''}
                    onChange={(e) => setConfig({...config, sale_commission_percentage: e.target.value ? parseFloat(e.target.value) : null})}
                    placeholder="Usar padrão"
                    className="pr-8"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div>
                <Label className="text-sm flex items-center gap-2">
                  Comissão Arrendamentos
                  <Badge variant="outline" className="text-xs">Específico</Badge>
                </Label>
                <div className="relative mt-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={config.rent_commission_percentage || ''}
                    onChange={(e) => setConfig({...config, rent_commission_percentage: e.target.value ? parseFloat(e.target.value) : null})}
                    placeholder="Usar padrão"
                    className="pr-8"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Tiered Rates */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Taxas Escalonadas por Valor
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addTier}>
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar Escalão
                </Button>
              </div>
              
              {config.tiered_rates.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">
                  Sem escalões definidos - será usada a comissão padrão
                </p>
              ) : (
                <div className="space-y-2">
                  {config.tiered_rates.map((tier, index) => (
                    <div key={index} className="flex gap-2 items-center bg-white p-2 rounded border">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <Input
                            type="number"
                            placeholder="Mín"
                            value={tier.min_value}
                            onChange={(e) => updateTier(index, 'min_value', e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            placeholder="Máx"
                            value={tier.max_value}
                            onChange={(e) => updateTier(index, 'max_value', e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="%"
                            value={tier.commission_percentage}
                            onChange={(e) => updateTier(index, 'commission_percentage', e.target.value)}
                            className="text-xs h-8 pr-6"
                          />
                          <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTier(index)}
                        className="h-8 text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">
                Escalões permitem comissões diferentes por faixa de valor (ex: até €100k = 5%, €100k-€500k = 4%)
              </p>
            </div>
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

          {/* Example Calculations */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-slate-900 mb-3">Exemplos de Cálculo</h4>
            <div className="space-y-3 text-sm">
              {/* Sale Example */}
              <div className="p-3 bg-white rounded border">
                <div className="font-medium text-slate-700 mb-2">Venda de €200.000</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Comissão ({config.sale_commission_percentage || config.default_commission_percentage}%):</span>
                    <span className="font-medium text-green-700">
                      €{((200000 * (config.sale_commission_percentage || config.default_commission_percentage)) / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Agente ({config.default_split_percentage}%):</span>
                    <span className="text-blue-600">
                      €{((200000 * (config.sale_commission_percentage || config.default_commission_percentage) / 100 * config.default_split_percentage) / 100).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rent Example */}
              <div className="p-3 bg-white rounded border">
                <div className="font-medium text-slate-700 mb-2">Arrendamento €1.200/mês</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Comissão ({config.rent_commission_percentage || config.default_commission_percentage}%):</span>
                    <span className="font-medium text-green-700">
                      €{((1200 * (config.rent_commission_percentage || config.default_commission_percentage)) / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Agente ({config.default_split_percentage}%):</span>
                    <span className="text-blue-600">
                      €{((1200 * (config.rent_commission_percentage || config.default_commission_percentage) / 100 * config.default_split_percentage) / 100).toLocaleString()}
                    </span>
                  </div>
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