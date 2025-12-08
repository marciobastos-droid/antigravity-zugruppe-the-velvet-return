import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Eye, EyeOff, Search, MapPin, Euro, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function InvestorPropertiesManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });
  
  const togglePublishMutation = useMutation({
    mutationFn: ({ id, published }) => 
      base44.entities.Property.update(id, { 
        published_investor_section: !published 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success("Estado de publicação atualizado");
    },
  });
  
  const filteredProperties = properties.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.title?.toLowerCase().includes(search) ||
      p.city?.toLowerCase().includes(search) ||
      p.ref_id?.toLowerCase().includes(search)
    );
  });
  
  const publishedCount = properties.filter(p => p.published_investor_section).length;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Imóveis na Secção de Investidores
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Selecione os imóveis a publicar na secção exclusiva
            </p>
          </div>
          <Badge className="bg-blue-600 text-white">
            {publishedCount} publicados
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por título, cidade ou referência..."
              className="pl-10"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum imóvel encontrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Publicar</TableHead>
                <TableHead>Imóvel</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <Checkbox
                      checked={property.published_investor_section || false}
                      onCheckedChange={() => 
                        togglePublishMutation.mutate({
                          id: property.id,
                          published: property.published_investor_section
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium line-clamp-1">{property.title}</div>
                      {property.ref_id && (
                        <div className="text-xs text-slate-500 font-mono">{property.ref_id}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {property.city}, {property.state}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-semibold text-green-700">
                      <Euro className="w-4 h-4" />
                      {property.price?.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {property.published_investor_section ? (
                      <Badge className="bg-blue-100 text-blue-800">
                        <Eye className="w-3 h-3 mr-1" />
                        Visível
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Oculto
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}