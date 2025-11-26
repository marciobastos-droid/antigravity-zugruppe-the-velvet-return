import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, MapPin, Euro, Calendar, Home, 
  Globe, Mail, Phone, Link2, Plus, X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DevelopmentDetail({ development, open, onOpenChange, properties }) {
  const queryClient = useQueryClient();
  const [linkPropertyId, setLinkPropertyId] = React.useState("");

  const linkedProperties = properties.filter(p => p.development_id === development.id);
  const availableProperties = properties.filter(p => !p.development_id);

  const linkMutation = useMutation({
    mutationFn: async ({ propertyId, developmentId, developmentName }) => {
      await base44.entities.Property.update(propertyId, {
        development_id: developmentId,
        development_name: developmentName
      });
    },
    onSuccess: () => {
      toast.success("Imóvel vinculado ao empreendimento");
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setLinkPropertyId("");
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: async (propertyId) => {
      await base44.entities.Property.update(propertyId, {
        development_id: null,
        development_name: null
      });
    },
    onSuccess: () => {
      toast.success("Imóvel desvinculado");
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    }
  });

  const handleLinkProperty = () => {
    if (!linkPropertyId) return;
    linkMutation.mutate({
      propertyId: linkPropertyId,
      developmentId: development.id,
      developmentName: development.name
    });
  };

  const statusLabels = {
    planning: "Em Planeamento",
    under_construction: "Em Construção",
    completed: "Concluído",
    selling: "Em Comercialização"
  };

  const statusColors = {
    planning: "bg-amber-100 text-amber-800",
    under_construction: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    selling: "bg-purple-100 text-purple-800"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            {development.name}
            <Badge className={statusColors[development.status]}>
              {statusLabels[development.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="properties">Imóveis ({linkedProperties.length})</TabsTrigger>
            <TabsTrigger value="gallery">Galeria</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900">Informação Geral</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                    <span>
                      {development.address && `${development.address}, `}
                      {development.city}
                      {development.postal_code && ` - ${development.postal_code}`}
                    </span>
                  </div>

                  {development.developer && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span>Promotor: {development.developer}</span>
                    </div>
                  )}

                  {(development.price_from || development.price_to) && (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-slate-500" />
                      <span>
                        Preços: {development.price_from ? `€${development.price_from.toLocaleString()}` : ''}
                        {development.price_from && development.price_to ? ' - ' : ''}
                        {development.price_to ? `€${development.price_to.toLocaleString()}` : ''}
                      </span>
                    </div>
                  )}

                  {development.completion_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span>Conclusão: {format(new Date(development.completion_date), "MMMM yyyy", { locale: ptBR })}</span>
                    </div>
                  )}

                  {development.total_units && (
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-slate-500" />
                      <span>{development.available_units || 0} de {development.total_units} unidades disponíveis</span>
                    </div>
                  )}
                </div>

                {development.description && (
                  <div className="mt-4">
                    <h5 className="font-medium text-slate-900 mb-2">Descrição</h5>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{development.description}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900">Contactos</h4>
                
                <div className="space-y-2 text-sm">
                  {development.website_url && (
                    <a 
                      href={development.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  )}
                  
                  {development.contact_email && (
                    <a 
                      href={`mailto:${development.contact_email}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      {development.contact_email}
                    </a>
                  )}
                  
                  {development.contact_phone && (
                    <a 
                      href={`tel:${development.contact_phone}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Phone className="w-4 h-4" />
                      {development.contact_phone}
                    </a>
                  )}
                </div>

                {development.amenities?.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-slate-900 mb-2">Comodidades</h5>
                    <div className="flex flex-wrap gap-2">
                      {development.amenities.map((amenity, idx) => (
                        <Badge key={idx} variant="secondary">{amenity}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {development.features?.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-slate-900 mb-2">Características</h5>
                    <div className="flex flex-wrap gap-2">
                      {development.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="properties" className="mt-4">
            <div className="space-y-4">
              {/* Link Property */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Vincular Imóvel ao Empreendimento
                  </h4>
                  <div className="flex gap-2">
                    <Select value={linkPropertyId} onValueChange={setLinkPropertyId}>
                      <SelectTrigger className="flex-1 bg-white">
                        <SelectValue placeholder="Selecione um imóvel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProperties.length === 0 ? (
                          <SelectItem value="none" disabled>Nenhum imóvel disponível</SelectItem>
                        ) : (
                          availableProperties.map((prop) => (
                            <SelectItem key={prop.id} value={prop.id}>
                              {prop.title?.substring(0, 50)}...
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleLinkProperty}
                      disabled={!linkPropertyId || linkMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Vincular
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Linked Properties */}
              {linkedProperties.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Home className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum imóvel vinculado a este empreendimento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedProperties.map((prop) => (
                    <Card key={prop.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {prop.images?.[0] ? (
                            <img 
                              src={prop.images[0]} 
                              alt={prop.title}
                              className="w-20 h-16 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-20 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Home className="w-6 h-6 text-slate-300" />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900">{prop.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                              {prop.unit_number && <span>Fração: {prop.unit_number}</span>}
                              <span>€{prop.price?.toLocaleString()}</span>
                              {prop.bedrooms && <span>{prop.bedrooms} quartos</span>}
                            </div>
                          </div>

                          <Badge className={prop.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                            {prop.status === 'active' ? 'Ativo' : prop.status === 'sold' ? 'Vendido' : prop.status}
                          </Badge>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unlinkMutation.mutate(prop.id)}
                            disabled={unlinkMutation.isPending}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            {development.images?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {development.images.map((img, idx) => (
                  <div key={idx} className="aspect-video rounded-lg overflow-hidden">
                    <img 
                      src={img} 
                      alt={`${development.name} - ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma imagem disponível</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}