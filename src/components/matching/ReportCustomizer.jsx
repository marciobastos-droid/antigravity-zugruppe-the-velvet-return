import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings, Building2, User, FileText, Palette, 
  Save, RotateCcw, Eye, Download
} from "lucide-react";

const DEFAULT_CONFIG = {
  // Property fields
  propertyFields: {
    title: true,
    price: true,
    location: true,
    bedrooms: true,
    bathrooms: true,
    area: true,
    propertyType: true,
    description: true,
    amenities: true,
    images: true,
    energyCertificate: false,
    yearBuilt: false,
    parking: true,
    views: false,
  },
  // Client fields
  clientFields: {
    name: true,
    email: true,
    phone: true,
    requirements: true,
    notes: false,
  },
  // Report settings
  reportSettings: {
    showMatchScore: true,
    showMatchDetails: true,
    showAgentInfo: true,
    showCompanyLogo: true,
    maxProperties: 10,
    sortBy: 'score', // 'score', 'price_asc', 'price_desc'
    includeMap: false,
    includeComparison: true,
  },
  // Styling
  styling: {
    primaryColor: '#4f46e5',
    accentColor: '#10b981',
    headerText: 'Relatório de Imóveis Selecionados',
    footerText: 'Obrigado pela sua preferência!',
    showWatermark: false,
  }
};

export default function ReportCustomizer({ config, onConfigChange, onPreview, onSave }) {
  const [localConfig, setLocalConfig] = useState(config || DEFAULT_CONFIG);

  const updateConfig = (section, field, value) => {
    const newConfig = {
      ...localConfig,
      [section]: {
        ...localConfig[section],
        [field]: value
      }
    };
    setLocalConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const resetToDefault = () => {
    setLocalConfig(DEFAULT_CONFIG);
    onConfigChange?.(DEFAULT_CONFIG);
  };

  const handleSave = () => {
    onSave?.(localConfig);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="property" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="property" className="text-xs">
            <Building2 className="w-3 h-3 mr-1" />
            Imóvel
          </TabsTrigger>
          <TabsTrigger value="client" className="text-xs">
            <User className="w-3 h-3 mr-1" />
            Cliente
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Relatório
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            <Palette className="w-3 h-3 mr-1" />
            Estilo
          </TabsTrigger>
        </TabsList>

        {/* Property Fields */}
        <TabsContent value="property" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Campos do Imóvel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(localConfig.propertyFields).map(([field, enabled]) => (
                  <div key={field} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <Label className="text-xs capitalize">
                      {field === 'title' ? 'Título' :
                       field === 'price' ? 'Preço' :
                       field === 'location' ? 'Localização' :
                       field === 'bedrooms' ? 'Quartos' :
                       field === 'bathrooms' ? 'Casas de Banho' :
                       field === 'area' ? 'Área' :
                       field === 'propertyType' ? 'Tipo de Imóvel' :
                       field === 'description' ? 'Descrição' :
                       field === 'amenities' ? 'Comodidades' :
                       field === 'images' ? 'Imagens' :
                       field === 'energyCertificate' ? 'Certificado Energético' :
                       field === 'yearBuilt' ? 'Ano Construção' :
                       field === 'parking' ? 'Estacionamento' :
                       field === 'views' ? 'Vistas' : field}
                    </Label>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => updateConfig('propertyFields', field, v)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Fields */}
        <TabsContent value="client" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Campos do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(localConfig.clientFields).map(([field, enabled]) => (
                <div key={field} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <Label className="text-xs capitalize">
                    {field === 'name' ? 'Nome' :
                     field === 'email' ? 'Email' :
                     field === 'phone' ? 'Telefone' :
                     field === 'requirements' ? 'Requisitos' :
                     field === 'notes' ? 'Notas' : field}
                  </Label>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => updateConfig('clientFields', field, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Settings */}
        <TabsContent value="report" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Configurações do Relatório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <Label className="text-xs">Mostrar Score</Label>
                  <Switch
                    checked={localConfig.reportSettings.showMatchScore}
                    onCheckedChange={(v) => updateConfig('reportSettings', 'showMatchScore', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <Label className="text-xs">Detalhes do Match</Label>
                  <Switch
                    checked={localConfig.reportSettings.showMatchDetails}
                    onCheckedChange={(v) => updateConfig('reportSettings', 'showMatchDetails', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <Label className="text-xs">Info do Agente</Label>
                  <Switch
                    checked={localConfig.reportSettings.showAgentInfo}
                    onCheckedChange={(v) => updateConfig('reportSettings', 'showAgentInfo', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <Label className="text-xs">Logo da Empresa</Label>
                  <Switch
                    checked={localConfig.reportSettings.showCompanyLogo}
                    onCheckedChange={(v) => updateConfig('reportSettings', 'showCompanyLogo', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <Label className="text-xs">Tabela Comparativa</Label>
                  <Switch
                    checked={localConfig.reportSettings.includeComparison}
                    onCheckedChange={(v) => updateConfig('reportSettings', 'includeComparison', v)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Máx. Imóveis</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={localConfig.reportSettings.maxProperties}
                    onChange={(e) => updateConfig('reportSettings', 'maxProperties', parseInt(e.target.value) || 10)}
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Ordenar Por</Label>
                  <Select
                    value={localConfig.reportSettings.sortBy}
                    onValueChange={(v) => updateConfig('reportSettings', 'sortBy', v)}
                  >
                    <SelectTrigger className="h-8 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Score (maior primeiro)</SelectItem>
                      <SelectItem value="price_asc">Preço (menor primeiro)</SelectItem>
                      <SelectItem value="price_desc">Preço (maior primeiro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Styling */}
        <TabsContent value="style" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Personalização Visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cor Principal</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={localConfig.styling.primaryColor}
                      onChange={(e) => updateConfig('styling', 'primaryColor', e.target.value)}
                      className="w-12 h-8 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={localConfig.styling.primaryColor}
                      onChange={(e) => updateConfig('styling', 'primaryColor', e.target.value)}
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Cor de Destaque</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={localConfig.styling.accentColor}
                      onChange={(e) => updateConfig('styling', 'accentColor', e.target.value)}
                      className="w-12 h-8 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={localConfig.styling.accentColor}
                      onChange={(e) => updateConfig('styling', 'accentColor', e.target.value)}
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Título do Relatório</Label>
                <Input
                  value={localConfig.styling.headerText}
                  onChange={(e) => updateConfig('styling', 'headerText', e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Texto do Rodapé</Label>
                <Textarea
                  value={localConfig.styling.footerText}
                  onChange={(e) => updateConfig('styling', 'footerText', e.target.value)}
                  className="text-sm mt-1"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={resetToDefault} className="flex-1">
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
        {onPreview && (
          <Button variant="outline" size="sm" onClick={() => onPreview(localConfig)} className="flex-1">
            <Eye className="w-3 h-3 mr-1" />
            Pré-visualizar
          </Button>
        )}
        <Button size="sm" onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
          <Save className="w-3 h-3 mr-1" />
          Guardar
        </Button>
      </div>
    </div>
  );
}

export { DEFAULT_CONFIG };