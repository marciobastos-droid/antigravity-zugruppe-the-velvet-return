import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CheckSquare, Trash2, Star, Users, Tag, Eye, 
  Building2, Navigation, X, Loader2, Plus, Image
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  onBulkVisibilityChange,
  onBulkFeaturedToggle,
  onBulkAssignConsultant,
  onBulkAddTag,
  onBulkAssignDevelopment,
  onBulkDelete,
  onGenerateVisitRoute,
  onBulkCreateDevelopment,
  onBulkPhotoAssign,
  consultants = [],
  developments = [],
  propertyTags = [],
  isProcessing = false
}) {
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [visibilityPopoverOpen, setVisibilityPopoverOpen] = useState(false);
  const [consultantPopoverOpen, setConsultantPopoverOpen] = useState(false);
  const [developmentPopoverOpen, setDevelopmentPopoverOpen] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedVisibility, setSelectedVisibility] = useState("");
  const [selectedConsultant, setSelectedConsultant] = useState("");
  const [selectedDevelopment, setSelectedDevelopment] = useState("");

  return (
    <Card className="border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg text-blue-900">
                {selectedCount} {selectedCount === 1 ? 'Imóvel Selecionado' : 'Imóveis Selecionados'}
              </p>
              <p className="text-xs text-blue-700">Escolha uma ação para aplicar em massa</p>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status */}
            <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300">
                  <CheckSquare className="w-4 h-4 mr-1.5" />
                  Estado
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Alterar estado para:</p>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">✅ Ativo</SelectItem>
                      <SelectItem value="pending">⏳ Pendente</SelectItem>
                      <SelectItem value="sold">💰 Vendido</SelectItem>
                      <SelectItem value="rented">🔑 Arrendado</SelectItem>
                      <SelectItem value="off_market">⛔ Desativado</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setStatusPopoverOpen(false);
                        setSelectedStatus("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      disabled={!selectedStatus || isProcessing}
                      onClick={() => {
                        onBulkStatusChange(selectedStatus);
                        setStatusPopoverOpen(false);
                        setSelectedStatus("");
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Featured Toggle */}
            <Button 
              size="sm" 
              onClick={() => onBulkFeaturedToggle(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white border-0"
              disabled={isProcessing}
            >
              <Star className="w-4 h-4 mr-1.5 fill-current" />
              Destaque
            </Button>

            {/* Visibility */}
            <Popover open={visibilityPopoverOpen} onOpenChange={setVisibilityPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300">
                  <Eye className="w-4 h-4 mr-1.5" />
                  Visibilidade
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Alterar visibilidade:</p>
                  <Select value={selectedVisibility} onValueChange={setSelectedVisibility}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">🌐 Público</SelectItem>
                      <SelectItem value="team_only">👥 Apenas Equipa</SelectItem>
                      <SelectItem value="private">🔒 Privado</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setVisibilityPopoverOpen(false);
                        setSelectedVisibility("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      disabled={!selectedVisibility || isProcessing}
                      onClick={() => {
                        onBulkVisibilityChange(selectedVisibility);
                        setVisibilityPopoverOpen(false);
                        setSelectedVisibility("");
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-8 hidden sm:block" />

            {/* Assign Consultant */}
            <Popover open={consultantPopoverOpen} onOpenChange={setConsultantPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300">
                  <Users className="w-4 h-4 mr-1.5" />
                  Consultor
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Atribuir consultor:</p>
                  <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolher..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {consultants.filter(c => c.is_active !== false).map((consultant) => (
                        <SelectItem key={consultant.id} value={consultant.email}>
                          {consultant.display_name || consultant.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setConsultantPopoverOpen(false);
                        setSelectedConsultant("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      disabled={!selectedConsultant || isProcessing}
                      onClick={() => {
                        onBulkAssignConsultant(selectedConsultant);
                        setConsultantPopoverOpen(false);
                        setSelectedConsultant("");
                      }}
                    >
                      Atribuir
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>



            {/* Add Tag */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300">
                  <Tag className="w-4 h-4 mr-1.5" />
                  Etiqueta
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {propertyTags.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-2">Sem etiquetas disponíveis</p>
                  ) : (
                    propertyTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => onBulkAddTag(tag.name)}
                        className="w-full flex items-center p-2 rounded-lg text-left hover:bg-slate-50 transition-colors"
                        disabled={isProcessing}
                      >
                        <Badge
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            borderColor: tag.color
                          }}
                          className="border"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag.name}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-8 hidden sm:block" />

            {/* Assign Development */}
            <Popover open={developmentPopoverOpen} onOpenChange={setDevelopmentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300">
                  <Building2 className="w-4 h-4 mr-1.5" />
                  Atribuir
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Atribuir a empreendimento existente:</p>
                  <Select value={selectedDevelopment} onValueChange={setSelectedDevelopment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolher..." />
                    </SelectTrigger>
                    <SelectContent>
                      {developments.map((dev) => (
                        <SelectItem key={dev.id} value={dev.id}>
                          {dev.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setDevelopmentPopoverOpen(false);
                        setSelectedDevelopment("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      disabled={!selectedDevelopment || isProcessing}
                      onClick={() => {
                        onBulkAssignDevelopment(selectedDevelopment);
                        setDevelopmentPopoverOpen(false);
                        setSelectedDevelopment("");
                      }}
                    >
                      Atribuir
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Create New Development */}
            <Button 
              size="sm" 
              onClick={onBulkCreateDevelopment}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-0"
              disabled={isProcessing}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Criar Empreendimento</span>
              <span className="sm:hidden">Criar</span>
            </Button>

            <Separator orientation="vertical" className="h-8 hidden sm:block" />

            {/* Bulk Photo Assign */}
            <Button 
              size="sm" 
              onClick={onBulkPhotoAssign}
              className="bg-purple-600 hover:bg-purple-700 text-white border-0"
              disabled={isProcessing}
            >
              <Image className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Fotos</span>
            </Button>

            {/* Visit Route */}
            <Button 
              size="sm" 
              onClick={onGenerateVisitRoute}
              className="bg-green-600 hover:bg-green-700 text-white border-0"
              disabled={isProcessing}
            >
              <Navigation className="w-4 h-4 mr-1.5" />
              Roteiro
            </Button>

            <Separator orientation="vertical" className="h-8 hidden sm:block" />

            {/* Delete */}
            <Button
              size="sm"
              onClick={onBulkDelete}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Eliminar
            </Button>

            {/* Clear Selection */}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onClearSelection}
              className="border-slate-400"
            >
              <X className="w-4 h-4 mr-1.5" />
              Cancelar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}