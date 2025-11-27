import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Search, Calendar, Users, Tag } from "lucide-react";

export default function FacebookLeadsFilters({
  campaigns = [],
  filters,
  onFilterChange,
  totalLeads,
  filteredCount
}) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      status: 'all',
      campaign: 'all',
      dateFrom: '',
      dateTo: '',
      syncDateFrom: '',
      syncDateTo: ''
    });
  };

  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.campaign !== 'all' || 
    filters.dateFrom || 
    filters.dateTo ||
    filters.syncDateFrom ||
    filters.syncDateTo;

  return (
    <Card className="border-slate-200 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">Filtros</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {filteredCount} de {totalLeads}
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-slate-700">
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Pesquisar</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Nome, email, telefone..."
                value={filters.search || ''}
                onChange={(e) => handleChange('search', e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Estado</Label>
            <Select value={filters.status || 'all'} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="new">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Novos
                  </div>
                </SelectItem>
                <SelectItem value="contacted">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    Contactados
                  </div>
                </SelectItem>
                <SelectItem value="converted">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Convertidos
                  </div>
                </SelectItem>
                <SelectItem value="archived">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    Arquivados
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaign */}
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Campanha</Label>
            <Select value={filters.campaign || 'all'} onValueChange={(v) => handleChange('campaign', v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as campanhas</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.form_id} value={c.form_id}>
                    {c.campaign_name || c.form_name || c.form_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range - Lead Created */}
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Data do Lead</Label>
            <div className="flex gap-1">
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleChange('dateFrom', e.target.value)}
                className="h-9 text-xs flex-1"
                placeholder="De"
              />
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleChange('dateTo', e.target.value)}
                className="h-9 text-xs flex-1"
                placeholder="Até"
              />
            </div>
          </div>
        </div>

        {/* Advanced Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
          {/* Sync Date Range */}
          <div>
            <Label className="text-xs text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Data de Sincronização
            </Label>
            <div className="flex gap-1">
              <Input
                type="date"
                value={filters.syncDateFrom || ''}
                onChange={(e) => handleChange('syncDateFrom', e.target.value)}
                className="h-9 text-xs flex-1"
                placeholder="De"
              />
              <Input
                type="date"
                value={filters.syncDateTo || ''}
                onChange={(e) => handleChange('syncDateTo', e.target.value)}
                className="h-9 text-xs flex-1"
                placeholder="Até"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Filtros Rápidos</Label>
            <div className="flex flex-wrap gap-1">
              <Button
                variant={filters.status === 'new' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleChange('status', filters.status === 'new' ? 'all' : 'new')}
              >
                <Tag className="w-3 h-3 mr-1" />
                Novos
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  handleChange('syncDateFrom', today);
                  handleChange('syncDateTo', today);
                }}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Sync Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  handleChange('dateFrom', weekAgo);
                  handleChange('dateTo', '');
                }}
              >
                <Users className="w-3 h-3 mr-1" />
                Última Semana
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}