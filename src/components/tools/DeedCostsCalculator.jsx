import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Home, Building2, Receipt, FileText, AlertCircle, Info, Euro } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

export default function DeedCostsCalculator() {
  const [propertyValue, setPropertyValue] = useState("");
  const [propertyType, setPropertyType] = useState("residential");
  const [isPermanentResidence, setIsPermanentResidence] = useState(false);
  const [isFirstHome, setIsFirstHome] = useState(false);
  const [hasLoan, setHasLoan] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");

  // Cálculo do IMT (Imposto Municipal sobre Transmissões)
  const calculateIMT = (value, type, isPermanent, isFirst) => {
    if (!value || value <= 0) return 0;

    // Habitação própria e permanente - isenção até 101,917€
    if (type === "residential" && isPermanent) {
      if (value <= 101917) return 0;

      // Tabela progressiva para habitação própria e permanente
      if (value <= 151816) {
        return value * 0.02 - 2038.34;
      } else if (value <= 214673) {
        return value * 0.05 - 6594.70;
      } else if (value <= 317883) {
        return value * 0.07 - 10890.36;
      } else if (value <= 633997) {
        return value * 0.08 - 14071.19;
      } else {
        return value * 0.06 - 1405.87;
      }
    }

    // Habitação secundária
    if (type === "residential") {
      if (value <= 102417) {
        return value * 0.01;
      } else if (value <= 153135) {
        return value * 0.02 - 1024.17;
      } else if (value <= 204270) {
        return value * 0.05 - 5617.88;
      } else if (value <= 306405) {
        return value * 0.07 - 9703.38;
      } else if (value <= 612810) {
        return value * 0.08 - 12766.13;
      } else {
        return value * 0.06;
      }
    }

    // Imóveis comerciais/rústicos
    if (type === "commercial" || type === "rustic") {
      if (value <= 102417) {
        return value * 0.01;
      } else if (value <= 153135) {
        return value * 0.02 - 1024.17;
      } else if (value <= 204270) {
        return value * 0.05 - 5617.88;
      } else if (value <= 306405) {
        return value * 0.07 - 9703.38;
      } else if (value <= 612810) {
        return value * 0.08 - 12766.13;
      } else {
        return value * 0.06;
      }
    }

    return 0;
  };

  // Imposto de Selo sobre aquisição
  const calculateStampDuty = (value) => {
    if (!value || value <= 0) return 0;
    return value * 0.008; // 0.8%
  };

  // Imposto de Selo sobre empréstimo
  const calculateLoanStampDuty = (loanValue) => {
    if (!loanValue || loanValue <= 0) return 0;
    return loanValue * 0.006; // 0.6%
  };

  // Emolumentos notariais (valores aproximados 2025)
  const calculateNotaryFees = (value) => {
    if (!value || value <= 0) return 0;
    
    if (value <= 30000) return 375;
    if (value <= 50000) return 425;
    if (value <= 100000) return 500;
    if (value <= 200000) return 625;
    if (value <= 500000) return 875;
    if (value <= 1000000) return 1125;
    return 1375;
  };

  // Registo predial
  const calculateLandRegistry = (value) => {
    if (!value || value <= 0) return 0;
    
    if (value <= 30000) return 250;
    if (value <= 50000) return 275;
    if (value <= 100000) return 300;
    if (value <= 250000) return 325;
    if (value <= 500000) return 350;
    return 375;
  };

  // Cálculos
  const value = parseFloat(propertyValue) || 0;
  const loan = parseFloat(loanAmount) || 0;

  const imt = useMemo(() => 
    calculateIMT(value, propertyType, isPermanentResidence, isFirstHome),
    [value, propertyType, isPermanentResidence, isFirstHome]
  );

  const stampDuty = useMemo(() => 
    calculateStampDuty(value),
    [value]
  );

  const loanStampDuty = useMemo(() => 
    hasLoan ? calculateLoanStampDuty(loan) : 0,
    [hasLoan, loan]
  );

  const notaryFees = useMemo(() => 
    calculateNotaryFees(value),
    [value]
  );

  const landRegistry = useMemo(() => 
    calculateLandRegistry(value),
    [value]
  );

  const lawyerFees = value * 0.005; // Estimativa 0.5%
  const otherCosts = 150; // Certidões, procurações, etc.

  const totalCosts = imt + stampDuty + loanStampDuty + notaryFees + landRegistry + lawyerFees + otherCosts;

  const resetForm = () => {
    setPropertyValue("");
    setPropertyType("residential");
    setIsPermanentResidence(false);
    setIsFirstHome(false);
    setHasLoan(false);
    setLoanAmount("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Calculadora de Custos de Escritura
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Calcule os custos estimados de escritura e impostos para aquisição de imóveis em Portugal
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dados do Imóvel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Home className="w-4 h-4 text-blue-600" />
              Dados do Imóvel
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Valor do Imóvel (€) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 250000"
                  value={propertyValue}
                  onChange={(e) => setPropertyValue(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Tipo de Imóvel</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Habitação</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                    <SelectItem value="rustic">Rústico/Terreno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {propertyType === "residential" && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="permanent"
                    checked={isPermanentResidence}
                    onCheckedChange={setIsPermanentResidence}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="permanent" className="text-sm font-medium cursor-pointer">
                      Habitação Própria e Permanente
                    </label>
                    <p className="text-xs text-slate-600 mt-1">
                      Isenção de IMT até €101,917 e taxas reduzidas
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="firstHome"
                    checked={isFirstHome}
                    onCheckedChange={setIsFirstHome}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="firstHome" className="text-sm font-medium cursor-pointer">
                      Primeira Habitação (idade ≤ 35 anos)
                    </label>
                    <p className="text-xs text-slate-600 mt-1">
                      Pode ter direito a isenção adicional até €316,772
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Financiamento */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="w-4 h-4 text-blue-600" />
              Financiamento
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="hasLoan"
                checked={hasLoan}
                onCheckedChange={setHasLoan}
              />
              <div className="flex-1">
                <label htmlFor="hasLoan" className="text-sm font-medium cursor-pointer">
                  Tenho crédito habitação/comercial
                </label>
              </div>
            </div>

            {hasLoan && (
              <div>
                <Label>Valor do Empréstimo (€)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 200000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Imposto de selo: 0.6% sobre o valor do empréstimo
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Resultados */}
          {value > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Receipt className="w-4 h-4 text-green-600" />
                Estimativa de Custos
              </div>

              <div className="space-y-3">
                {/* IMT */}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">IMT (Imposto Municipal sobre Transmissões)</p>
                    <p className="text-xs text-slate-600">
                      {propertyType === "residential" && isPermanentResidence
                        ? "Habitação própria e permanente"
                        : propertyType === "residential"
                        ? "Habitação secundária"
                        : "Imóvel comercial/rústico"}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    €{imt.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Imposto de Selo - Aquisição */}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Imposto de Selo - Aquisição</p>
                    <p className="text-xs text-slate-600">0.8% sobre o valor</p>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    €{stampDuty.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Imposto de Selo - Empréstimo */}
                {hasLoan && loan > 0 && (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Imposto de Selo - Empréstimo</p>
                      <p className="text-xs text-slate-600">0.6% sobre o valor do crédito</p>
                    </div>
                    <span className="text-lg font-bold text-slate-900">
                      €{loanStampDuty.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Emolumentos Notariais */}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Emolumentos Notariais</p>
                    <p className="text-xs text-slate-600">Escritura pública</p>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    €{notaryFees.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Registo Predial */}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Registo Predial</p>
                    <p className="text-xs text-slate-600">Conservatória</p>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    €{landRegistry.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Advogado */}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Honorários de Advogado</p>
                    <p className="text-xs text-slate-600">Estimativa: 0.5% do valor</p>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    €{lawyerFees.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Outros Custos */}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Outros Custos</p>
                    <p className="text-xs text-slate-600">Certidões, procurações, etc.</p>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    €{otherCosts.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <div>
                  <p className="text-lg font-bold text-slate-900">Custo Total Estimado</p>
                  <p className="text-sm text-slate-600">
                    {((totalCosts / value) * 100).toFixed(2)}% do valor do imóvel
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-green-700">
                    €{totalCosts.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Isenções Alert */}
              {propertyType === "residential" && isFirstHome && value <= 316772 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    <strong>Benefício Jovem (≤ 35 anos):</strong> Pode ter direito a isenção de IMT até €316,772 
                    para aquisição da primeira habitação própria e permanente. Consulte as condições específicas.
                  </AlertDescription>
                </Alert>
              )}

              {propertyType === "residential" && isPermanentResidence && imt === 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <Info className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-900">
                    <strong>Isenção de IMT:</strong> Este imóvel está isento de IMT por ser habitação própria 
                    e permanente com valor até €101,917.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Avisos */}
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs text-slate-600">
              <strong>Nota:</strong> Estes valores são estimativas baseadas na legislação atual (2025). 
              Os custos reais podem variar consoante circunstâncias específicas. Consulte sempre um 
              profissional qualificado (advogado, notário ou consultor imobiliário) para valores exactos.
            </AlertDescription>
          </Alert>

          {/* Ações */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetForm} className="flex-1">
              Limpar
            </Button>
            <Button 
              onClick={() => window.print()} 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={!value || value <= 0}
            >
              <FileText className="w-4 h-4 mr-2" />
              Imprimir/Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informação Adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">IMT - Imposto Municipal sobre Transmissões</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Habitação própria e permanente: isenção até €101,917</li>
              <li>Jovens até 35 anos podem ter isenção até €316,772 (primeira habitação)</li>
              <li>Habitação secundária: taxas superiores sem isenção</li>
              <li>Imóveis comerciais: taxas específicas conforme valor</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Imposto de Selo</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Aquisição de imóvel: 0.8% sobre o valor</li>
              <li>Crédito habitação/comercial: 0.6% sobre o valor do empréstimo</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Outros Custos</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Emolumentos notariais: variam entre €375 e €1,375</li>
              <li>Registo predial: entre €250 e €375</li>
              <li>Advogado: tipicamente 0.5% a 1% do valor</li>
              <li>Certidões e documentação: cerca de €150</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}