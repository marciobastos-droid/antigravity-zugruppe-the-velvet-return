import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Home, Save, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import LocationAutocomplete from "../components/property/LocationAutocomplete";
import { Upload, X } from "lucide-react";

export default function AddListing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    property_type: "apartment",
    listing_type: "sale",
    price: "",
    currency: "EUR",
    bedrooms: "",
    bathrooms: "",
    useful_area: "",
    gross_area: "",
    address: "",
    city: "",
    state: "",
    country: "Portugal",
    zip_code: "",
    year_built: "",
    energy_certificate: "",
    images: [],
    amenities: [],
    status: "pending",
    visibility: "team_only"
  });

  const [amenityInput, setAmenityInput] = React.useState("");
  const [generating, setGenerating] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData) => {
      // Gerar ref_id
      const refResponse = await base44.functions.invoke('generateRefId', { entity_type: 'Property' });
      const ref_id = refResponse.data.ref_id;

      // Gerar slug
      const slugResponse = await base44.functions.invoke('generatePropertySlug', { 
        title: propertyData.title,
        city: propertyData.city,
        property_type: propertyData.property_type
      });
      const slug = slugResponse.data.slug;

      return await base44.entities.Property.create({
        ...propertyData,
        ref_id,
        slug
      });
    },
    onSuccess: () => {
      toast.success("✅ Imóvel criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigate(createPageUrl("MyListings"));
    },
    onError: (error) => {
      console.error('[AddListing] Error creating property:', error);
      toast.error("Erro ao criar imóvel: " + (error.message || "Erro desconhecido"));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title || !formData.price || !formData.city || !formData.state) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const dataToSubmit = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
      useful_area: formData.useful_area ? parseFloat(formData.useful_area) : 0,
      gross_area: formData.gross_area ? parseFloat(formData.gross_area) : 0,
      year_built: formData.year_built ? parseInt(formData.year_built) : null,
      assigned_consultant: user?.email,
      assigned_consultant_name: user?.display_name || user?.full_name
    };

    createPropertyMutation.mutate(dataToSubmit);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAmenity = () => {
    if (amenityInput.trim()) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenityInput.trim()]
      }));
      setAmenityInput("");
    }
  };

  const removeAmenity = (index) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Adicionar Imóvel</h1>
            <p className="text-slate-600">Preencha os detalhes do novo imóvel</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("MyListings"))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informação Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Informação Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Ex: Apartamento T2 moderno em Cascais"
                    required
                  />
                </div>
                <div>
                  <Label>Tipo de Negócio *</Label>
                  <Select value={formData.listing_type} onValueChange={(v) => updateField('listing_type', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Venda</SelectItem>
                      <SelectItem value="rent">Arrendamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Descrição detalhada do imóvel..."
                  rows={6}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo de Imóvel *</Label>
                  <Select value={formData.property_type} onValueChange={(v) => updateField('property_type', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartamento</SelectItem>
                      <SelectItem value="house">Moradia</SelectItem>
                      <SelectItem value="land">Terreno</SelectItem>
                      <SelectItem value="building">Prédio</SelectItem>
                      <SelectItem value="farm">Quinta</SelectItem>
                      <SelectItem value="store">Loja</SelectItem>
                      <SelectItem value="warehouse">Armazém</SelectItem>
                      <SelectItem value="office">Escritório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preço *</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    placeholder="250000"
                    required
                  />
                </div>
                <div>
                  <Label>Moeda</Label>
                  <Select value={formData.currency} onValueChange={(v) => updateField('currency', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="AED">AED (د.إ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label>Quartos</Label>
                  <Input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => updateField('bedrooms', e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label>Casas de Banho</Label>
                  <Input
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => updateField('bathrooms', e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label>Área Útil (m²)</Label>
                  <Input
                    type="number"
                    value={formData.useful_area}
                    onChange={(e) => updateField('useful_area', e.target.value)}
                    placeholder="80"
                  />
                </div>
                <div>
                  <Label>Área Bruta (m²)</Label>
                  <Input
                    type="number"
                    value={formData.gross_area}
                    onChange={(e) => updateField('gross_area', e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader>
              <CardTitle>Localização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocationAutocomplete
                onLocationSelect={(location) => {
                  updateField('address', location.address || '');
                  updateField('city', location.city || '');
                  updateField('state', location.state || '');
                  updateField('zip_code', location.zip_code || '');
                  updateField('latitude', location.latitude || null);
                  updateField('longitude', location.longitude || null);
                }}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Morada</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Rua, número"
                  />
                </div>
                <div>
                  <Label>Código Postal</Label>
                  <Input
                    value={formData.zip_code}
                    onChange={(e) => updateField('zip_code', e.target.value)}
                    placeholder="1000-001"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Concelho *</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Lisboa"
                    required
                  />
                </div>
                <div>
                  <Label>Distrito *</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="Lisboa"
                    required
                  />
                </div>
                <div>
                  <Label>País</Label>
                  <Select value={formData.country} onValueChange={(v) => updateField('country', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Portugal">Portugal</SelectItem>
                      <SelectItem value="Spain">Espanha</SelectItem>
                      <SelectItem value="France">França</SelectItem>
                      <SelectItem value="United Kingdom">Reino Unido</SelectItem>
                      <SelectItem value="United States">Estados Unidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Características Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle>Características Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Ano de Construção</Label>
                  <Input
                    type="number"
                    value={formData.year_built}
                    onChange={(e) => updateField('year_built', e.target.value)}
                    placeholder="2020"
                  />
                </div>
                <div>
                  <Label>Certificado Energético</Label>
                  <Select value={formData.energy_certificate} onValueChange={(v) => updateField('energy_certificate', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                      <SelectItem value="isento">Isento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Comodidades</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    placeholder="Ex: Piscina, Jardim, Garagem..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAmenity();
                      }
                    }}
                  />
                  <Button type="button" onClick={addAmenity} variant="outline">
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity, idx) => (
                    <div key={idx} className="bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2">
                      <span className="text-sm">{amenity}</span>
                      <button type="button" onClick={() => removeAmenity(idx)}>
                        <X className="w-3 h-3 text-slate-600 hover:text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Imagens */}
          <Card>
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Carregar Imagens</Label>
                <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      if (files.length === 0) return;

                      try {
                        const uploadPromises = files.map(file => 
                          base44.integrations.Core.UploadFile({ file })
                        );
                        
                        const results = await Promise.all(uploadPromises);
                        const newUrls = results.map(r => r.file_url);
                        
                        updateField('images', [...formData.images, ...newUrls]);
                        toast.success(`${files.length} imagens carregadas`);
                      } catch (error) {
                        toast.error("Erro ao carregar imagens");
                      }
                    }}
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 text-slate-500" />
                  <span className="text-sm text-slate-600">Clique para carregar imagens</span>
                </label>
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.images.map((url, idx) => (
                    <div key={idx} className="relative group aspect-video">
                      <img
                        src={url}
                        alt={`Imagem ${idx + 1}`}
                        className="w-full h-full object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => updateField('images', formData.images.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {idx === 0 && (
                        <div className="absolute top-1 left-1 px-2 py-0.5 bg-amber-400 text-amber-900 rounded text-xs font-semibold">
                          Principal
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visibilidade */}
          <Card>
            <CardHeader>
              <CardTitle>Visibilidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Estado do Anúncio</Label>
                  <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="off_market">Desativado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Visibilidade</Label>
                  <Select value={formData.visibility} onValueChange={(v) => updateField('visibility', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="team_only">Apenas Equipa</SelectItem>
                      <SelectItem value="private">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("MyListings"))}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createPropertyMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {createPropertyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A criar...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Criar Imóvel
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}