import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target, Users, Percent } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function CampaignROICalculator({ campaign, opportunities }) {
  // Calculate ROI metrics
  const campaignLeads = opportunities.filter(opp => 
    opp.source_detail === campaign.tracking_config?.utm_campaign ||
    opp.lead_source === campaign.name ||
    (campaign.properties?.length > 0 && campaign.properties.includes(opp.property_id))
  );

  const totalLeads = campaignLeads.length;
  const qualifiedLeads = campaignLeads.filter(l => 
    ['hot', 'warm'].includes(l.qualification_status)
  ).length;
  
  const conversions = campaignLeads.filter(l => l.status === 'won').length;
  const conversionRate = totalLeads > 0 ? ((conversions / totalLeads) * 100).toFixed(1) : 0;
  
  const revenue = campaignLeads
    .filter(l => l.status === 'won')
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  
  const spent = campaign.spent || 0;
  const roi = spent > 0 ? (((revenue - spent) / spent) * 100).toFixed(1) : 0;
  const costPerLead = totalLeads > 0 ? (spent / totalLeads).toFixed(2) : 0;
  const costPerConversion = conversions > 0 ? (spent / conversions).toFixed(2) : 0;

  const roiPositive = parseFloat(roi) > 0;
  const budgetUsage = campaign.budget > 0 ? ((spent / campaign.budget) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      {/* ROI Overview */}
      <Card className={roiPositive ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Retorno sobre Investimento (ROI)</p>
              <div className="flex items-center gap-3">
                <p className={`text-4xl font-bold ${roiPositive ? "text-green-700" : "text-red-700"}`}>
                  {roi > 0 ? "+" : ""}{roi}%
                </p>
                {roiPositive ? (
                  <TrendingUp className="w-8 h-8 text-green-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Receita: €{revenue.toLocaleString()} | Gasto: €{spent.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <Badge className={roiPositive ? "bg-green-600" : "bg-red-600"}>
                {roiPositive ? "Rentável" : "Prejuízo"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Total Leads</p>
                <p className="text-2xl font-bold text-slate-900">{totalLeads}</p>
                <p className="text-xs text-blue-600 mt-1">{qualifiedLeads} qualificados</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Conversões</p>
                <p className="text-2xl font-bold text-slate-900">{conversions}</p>
                <p className="text-xs text-green-600 mt-1">{conversionRate}% taxa</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">CPL</p>
                <p className="text-2xl font-bold text-slate-900">€{costPerLead}</p>
                <p className="text-xs text-slate-600 mt-1">Custo por Lead</p>
              </div>
              <DollarSign className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">CPA</p>
                <p className="text-2xl font-bold text-slate-900">€{costPerConversion}</p>
                <p className="text-xs text-slate-600 mt-1">Custo/Conversão</p>
              </div>
              <Percent className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Usage */}
      {campaign.budget > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Utilização de Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>€{spent.toLocaleString()} de €{campaign.budget.toLocaleString()}</span>
                <span className="font-bold">{budgetUsage}%</span>
              </div>
              <Progress value={parseFloat(budgetUsage)} className="h-3" />
              {parseFloat(budgetUsage) > 90 && (
                <p className="text-xs text-amber-600">⚠️ Orçamento quase esgotado</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Details */}
      {totalLeads > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads Gerados ({totalLeads})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {campaignLeads.slice(0, 10).map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{lead.buyer_name}</p>
                    <p className="text-xs text-slate-600">{lead.buyer_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.qualification_status && (
                      <Badge variant="outline" className={
                        lead.qualification_status === 'hot' ? 'border-red-500 text-red-700' :
                        lead.qualification_status === 'warm' ? 'border-orange-500 text-orange-700' :
                        'border-blue-500 text-blue-700'
                      }>
                        {lead.qualification_status}
                      </Badge>
                    )}
                    <Badge className={
                      lead.status === 'won' ? 'bg-green-100 text-green-800' :
                      lead.status === 'lost' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {lead.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {campaignLeads.length > 10 && (
                <p className="text-xs text-slate-500 text-center pt-2">
                  E mais {campaignLeads.length - 10} leads...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}