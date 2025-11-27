import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Calculator, Euro, Percent, Calendar, TrendingUp, TrendingDown,
  PiggyBank, Home, AlertTriangle, CheckCircle2, Info, Download,
  Building2, Users, BarChart3, Sparkles, Loader2
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CreditSimulator() {
  // Inputs
  const [propertyValue, setPropertyValue] = useState(250000);
  const [downPayment, setDownPayment] = useState(50000);
  const [loanTerm, setLoanTerm] = useState(30);
  const [interestRate, setInterestRate] = useState(3.5);
  const [rateType, setRateType] = useState("variable"); // fixed, variable, mixed
  const [euribor, setEuribor] = useState(3.0);
  const [spread, setSpread] = useState(0.5);
  const [insuranceType, setInsuranceType] = useState("bank"); // bank, external, none
  const [lifeInsuranceRate, setLifeInsuranceRate] = useState(0.03);
  const [multiRiskRate, setMultiRiskRate] = useState(0.015);
  
  // Borrower info
  const [grossIncome, setGrossIncome] = useState(2500);
  const [otherCredits, setOtherCredits] = useState(0);
  const [age, setAge] = useState(35);
  
  // Options
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [includeStampDuty, setIncludeStampDuty] = useState(true);
  const [showAmortization, setShowAmortization] = useState(false);
  
  // AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const loanAmount = propertyValue - downPayment;
  const ltv = (loanAmount / propertyValue) * 100;
  const maxAge = age + loanTerm;

  // Calculate monthly payment (French system)
  const calculateMonthlyPayment = (principal, annualRate, years) => {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    if (monthlyRate === 0) return principal / numPayments;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  };

  const effectiveRate = rateType === "variable" ? euribor + spread : interestRate;
  const baseMonthlyPayment = calculateMonthlyPayment(loanAmount, effectiveRate, loanTerm);
  
  // Insurance calculations
  const monthlyLifeInsurance = includeInsurance ? (loanAmount * lifeInsuranceRate / 100 / 12) : 0;
  const monthlyMultiRisk = includeInsurance ? (propertyValue * multiRiskRate / 100 / 12) : 0;
  const totalMonthlyPayment = baseMonthlyPayment + monthlyLifeInsurance + monthlyMultiRisk;

  // Stamp duty (Portugal)
  const stampDutyLoan = includeStampDuty ? loanAmount * 0.006 : 0; // 0.6% on loan
  const stampDutyInterest = includeStampDuty ? loanAmount * effectiveRate / 100 * loanTerm * 0.04 : 0; // 4% on total interest
  
  // Effort rate
  const effortRate = ((totalMonthlyPayment + otherCredits) / grossIncome) * 100;
  
  // Total costs
  const totalInterest = (baseMonthlyPayment * loanTerm * 12) - loanAmount;
  const totalInsurance = (monthlyLifeInsurance + monthlyMultiRisk) * loanTerm * 12;
  const totalCost = loanAmount + totalInterest + totalInsurance + stampDutyLoan;
  const taeg = ((totalCost / loanAmount - 1) / loanTerm) * 100;

  // Generate amortization table
  const amortizationData = useMemo(() => {
    const data = [];
    let balance = loanAmount;
    const monthlyRate = effectiveRate / 100 / 12;
    
    for (let year = 1; year <= Math.min(loanTerm, 40); year++) {
      let yearlyInterest = 0;
      let yearlyPrincipal = 0;
      
      for (let month = 1; month <= 12; month++) {
        const interest = balance * monthlyRate;
        const principal = baseMonthlyPayment - interest;
        yearlyInterest += interest;
        yearlyPrincipal += principal;
        balance -= principal;
      }
      
      data.push({
        year,
        principal: Math.round(yearlyPrincipal),
        interest: Math.round(yearlyInterest),
        balance: Math.max(0, Math.round(balance)),
        total: Math.round(yearlyPrincipal + yearlyInterest)
      });
    }
    return data;
  }, [loanAmount, effectiveRate, loanTerm, baseMonthlyPayment]);

  // Rate scenarios
  const rateScenarios = useMemo(() => {
    const scenarios = [];
    const baseRate = rateType === "variable" ? euribor : interestRate;
    
    for (let delta = -1; delta <= 2; delta += 0.5) {
      const rate = Math.max(0, baseRate + delta);
      const payment = calculateMonthlyPayment(loanAmount, rate + (rateType === "variable" ? spread : 0), loanTerm);
      scenarios.push({
        rate: (rate + (rateType === "variable" ? spread : 0)).toFixed(2),
        payment: Math.round(payment),
        delta: delta > 0 ? `+${delta}%` : `${delta}%`,
        diff: Math.round(payment - baseMonthlyPayment)
      });
    }
    return scenarios;
  }, [loanAmount, loanTerm, euribor, spread, interestRate, rateType, baseMonthlyPayment]);

  // Cost breakdown for pie chart
  const costBreakdown = [
    { name: "Capital", value: loanAmount },
    { name: "Juros", value: Math.round(totalInterest) },
    { name: "Seguros", value: Math.round(totalInsurance) },
    { name: "Impostos", value: Math.round(stampDutyLoan) }
  ];

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa este pedido de crédito habitação em Portugal e dá conselhos personalizados:

DADOS DO CRÉDITO:
- Valor do imóvel: €${propertyValue.toLocaleString()}
- Entrada: €${downPayment.toLocaleString()} (${(downPayment/propertyValue*100).toFixed(1)}%)
- Montante a financiar: €${loanAmount.toLocaleString()}
- LTV: ${ltv.toFixed(1)}%
- Prazo: ${loanTerm} anos
- Taxa: ${effectiveRate.toFixed(2)}% (${rateType === 'variable' ? 'variável' : 'fixa'})
- Prestação mensal: €${totalMonthlyPayment.toFixed(0)}

DADOS DO MUTUÁRIO:
- Idade: ${age} anos (termina com ${maxAge} anos)
- Rendimento bruto mensal: €${grossIncome}
- Outros créditos: €${otherCredits}/mês
- Taxa de esforço: ${effortRate.toFixed(1)}%

CUSTOS TOTAIS:
- Total juros: €${Math.round(totalInterest).toLocaleString()}
- Total seguros: €${Math.round(totalInsurance).toLocaleString()}
- Custo total do crédito: €${Math.round(totalCost).toLocaleString()}
- TAEG estimada: ${taeg.toFixed(2)}%

Analisa:
1. Viabilidade do crédito (taxa esforço, LTV, idade)
2. Pontos de atenção e riscos
3. Sugestões de otimização
4. Comparação com benchmarks do mercado português
5. Recomendações específicas`,
        response_json_schema: {
          type: "object",
          properties: {
            viability: { type: "string", enum: ["excellent", "good", "acceptable", "risky", "not_recommended"] },
            viability_score: { type: "number" },
            summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            warnings: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            market_comparison: { type: "string" },
            optimal_term: { type: "number" },
            optimal_down_payment: { type: "number" }
          }
        }
      });
      setAiAnalysis(result);
    } catch (error) {
      toast.error("Erro na análise IA");
    }
    setAnalyzing(false);
  };

  const getViabilityColor = (viability) => {
    const colors = {
      excellent: "text-green-600 bg-green-100",
      good: "text-blue-600 bg-blue-100",
      acceptable: "text-amber-600 bg-amber-100",
      risky: "text-orange-600 bg-orange-100",
      not_recommended: "text-red-600 bg-red-100"
    };
    return colors[viability] || "text-slate-600 bg-slate-100";
  };

  const getEffortRateStatus = () => {
    if (effortRate <= 30) return { status: "Excelente", color: "text-green-600", icon: CheckCircle2 };
    if (effortRate <= 35) return { status: "Aceitável", color: "text-amber-600", icon: Info };
    if (effortRate <= 40) return { status: "Elevada", color: "text-orange-600", icon: AlertTriangle };
    return { status: "Crítica", color: "text-red-600", icon: AlertTriangle };
  };

  const effortStatus = getEffortRateStatus();
  const EffortIcon = effortStatus.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Simulador de Crédito Habitação</h2>
            <p className="text-sm text-slate-500">Simulação avançada com análise IA</p>
          </div>
        </div>
        <Button onClick={runAIAnalysis} disabled={analyzing} className="bg-purple-600 hover:bg-purple-700">
          {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Análise IA
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-4 h-4" />
                Dados do Imóvel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Valor do Imóvel</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={propertyValue}
                    onChange={(e) => setPropertyValue(Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
                <Slider
                  value={[propertyValue]}
                  onValueChange={([v]) => setPropertyValue(v)}
                  min={50000}
                  max={2000000}
                  step={5000}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Entrada ({((downPayment/propertyValue)*100).toFixed(0)}%)</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
                <Slider
                  value={[downPayment]}
                  onValueChange={([v]) => setDownPayment(v)}
                  min={0}
                  max={propertyValue * 0.5}
                  step={1000}
                  className="mt-2"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Montante a financiar</span>
                  <span className="font-bold text-blue-700">€{loanAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-600">LTV</span>
                  <Badge variant={ltv > 80 ? "destructive" : ltv > 70 ? "warning" : "default"}>
                    {ltv.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Condições do Crédito
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tipo de Taxa</Label>
                <Select value={rateType} onValueChange={setRateType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="variable">Taxa Variável (Euribor + Spread)</SelectItem>
                    <SelectItem value="fixed">Taxa Fixa</SelectItem>
                    <SelectItem value="mixed">Taxa Mista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {rateType === "variable" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Euribor 12M (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={euribor}
                      onChange={(e) => setEuribor(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Spread (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={spread}
                      onChange={(e) => setSpread(Number(e.target.value))}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Taxa Fixa (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                  />
                </div>
              )}

              <div>
                <Label>Prazo (anos): {loanTerm}</Label>
                <Slider
                  value={[loanTerm]}
                  onValueChange={([v]) => setLoanTerm(v)}
                  min={5}
                  max={40}
                  step={1}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Dados do Mutuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Idade</Label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                />
                {maxAge > 75 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Termina com {maxAge} anos (limite 75)</p>
                )}
              </div>
              
              <div>
                <Label>Rendimento Bruto Mensal</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={grossIncome}
                    onChange={(e) => setGrossIncome(Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label>Outros Créditos (mensal)</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={otherCredits}
                    onChange={(e) => setOtherCredits(Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Opções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Incluir Seguros</Label>
                <Switch checked={includeInsurance} onCheckedChange={setIncludeInsurance} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Incluir Imposto Selo</Label>
                <Switch checked={includeStampDuty} onCheckedChange={setIncludeStampDuty} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Results */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <p className="text-blue-100 text-sm">Prestação Mensal</p>
                <p className="text-3xl font-bold">€{Math.round(totalMonthlyPayment).toLocaleString()}</p>
                <p className="text-xs text-blue-200 mt-1">Capital + Juros + Seguros</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-slate-500 text-sm">Taxa Efetiva</p>
                <p className="text-2xl font-bold text-slate-900">{effectiveRate.toFixed(2)}%</p>
                <p className="text-xs text-slate-500 mt-1">
                  {rateType === "variable" ? `Euribor ${euribor}% + Spread ${spread}%` : "Taxa fixa"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 text-sm">Taxa de Esforço</p>
                  <EffortIcon className={`w-4 h-4 ${effortStatus.color}`} />
                </div>
                <p className={`text-2xl font-bold ${effortStatus.color}`}>{effortRate.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-1">{effortStatus.status}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-slate-500 text-sm">TAEG Estimada</p>
                <p className="text-2xl font-bold text-slate-900">{taeg.toFixed(2)}%</p>
                <p className="text-xs text-slate-500 mt-1">Taxa Anual Efetiva Global</p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Decomposição de Custos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Capital</span>
                    <span className="font-semibold">€{loanAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                    <span className="text-slate-600">Total Juros</span>
                    <span className="font-semibold text-amber-700">€{Math.round(totalInterest).toLocaleString()}</span>
                  </div>
                  {includeInsurance && (
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-slate-600">Total Seguros</span>
                      <span className="font-semibold text-purple-700">€{Math.round(totalInsurance).toLocaleString()}</span>
                    </div>
                  )}
                  {includeStampDuty && (
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-slate-600">Imposto Selo</span>
                      <span className="font-semibold text-red-700">€{Math.round(stampDutyLoan).toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center p-3 bg-blue-100 rounded-lg">
                    <span className="font-semibold text-blue-900">Custo Total</span>
                    <span className="font-bold text-blue-900 text-lg">€{Math.round(totalCost).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius="50%"
                        outerRadius="80%"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {costBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `€${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rate Scenarios */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Cenários de Taxa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Variação</th>
                      <th className="text-left py-2 px-3">Taxa</th>
                      <th className="text-left py-2 px-3">Prestação</th>
                      <th className="text-left py-2 px-3">Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateScenarios.map((scenario, idx) => (
                      <tr key={idx} className={`border-b ${scenario.delta === '0%' ? 'bg-blue-50' : ''}`}>
                        <td className="py-2 px-3">
                          <Badge variant={scenario.delta.startsWith('+') ? "destructive" : scenario.delta.startsWith('-') ? "default" : "secondary"}>
                            {scenario.delta}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 font-medium">{scenario.rate}%</td>
                        <td className="py-2 px-3 font-semibold">€{scenario.payment.toLocaleString()}</td>
                        <td className={`py-2 px-3 ${scenario.diff > 0 ? 'text-red-600' : scenario.diff < 0 ? 'text-green-600' : ''}`}>
                          {scenario.diff > 0 ? '+' : ''}{scenario.diff !== 0 ? `€${scenario.diff}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Amortization Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Evolução do Crédito
                </span>
                <Button variant="outline" size="sm" onClick={() => setShowAmortization(!showAmortization)}>
                  {showAmortization ? "Ver Gráfico" : "Ver Tabela"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showAmortization ? (
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Ano</th>
                        <th className="text-right py-2 px-2">Capital</th>
                        <th className="text-right py-2 px-2">Juros</th>
                        <th className="text-right py-2 px-2">Total</th>
                        <th className="text-right py-2 px-2">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amortizationData.map((row) => (
                        <tr key={row.year} className="border-b">
                          <td className="py-1.5 px-2">{row.year}</td>
                          <td className="py-1.5 px-2 text-right text-green-600">€{row.principal.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right text-amber-600">€{row.interest.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right font-medium">€{row.total.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right text-slate-500">€{row.balance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={amortizationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => `€${v.toLocaleString()}`} />
                      <Legend />
                      <Area type="monotone" dataKey="principal" stackId="1" stroke="#10b981" fill="#10b981" name="Capital" />
                      <Area type="monotone" dataKey="interest" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Juros" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {aiAnalysis && (
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Análise Inteligente
                  <Badge className={getViabilityColor(aiAnalysis.viability)}>
                    {aiAnalysis.viability === "excellent" ? "Excelente" :
                     aiAnalysis.viability === "good" ? "Bom" :
                     aiAnalysis.viability === "acceptable" ? "Aceitável" :
                     aiAnalysis.viability === "risky" ? "Arriscado" : "Não Recomendado"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700">{aiAnalysis.summary}</p>
                
                {aiAnalysis.strengths?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">✅ Pontos Fortes</h4>
                    <ul className="space-y-1">
                      {aiAnalysis.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAnalysis.warnings?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-amber-700 mb-2">⚠️ Pontos de Atenção</h4>
                    <ul className="space-y-1">
                      {aiAnalysis.warnings.map((w, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAnalysis.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-700 mb-2">💡 Recomendações</h4>
                    <ul className="space-y-1">
                      {aiAnalysis.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAnalysis.market_comparison && (
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-700 mb-1">📊 Comparação com Mercado</h4>
                    <p className="text-sm text-slate-600">{aiAnalysis.market_comparison}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}