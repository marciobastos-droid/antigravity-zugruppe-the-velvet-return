import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Plus, Home, Building2, MapPin, Settings, Image as ImageIcon, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import PropertyFormSection from "@/components/property/PropertyFormSection";
import LocationAutocomplete from "@/components/property/LocationAutocomplete";
import ValidatedInput from "@/components/property/ValidatedInput";

export default function AddListing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    property_type: "house",
    listing_type: "sale",
    price: "",
    bedrooms: "",
    bathrooms: "",
    square_feet: "",
    gross_area: "",
    useful_area: "",
    front_count: "",
    finishes: "",
    energy_certificate: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    year_built: "",
    year_renovated: "",
    garage: "",
    sun_exposure: "",
    status: "active",
    featured: false,
    internal_notes: ""
  });

  const [images, setImages] = React.useState([]);
  const [amenities, setAmenities] = React.useState([]);
  const [amenityInput, setAmenityInput] = React.useState("");
  const [uploading, setUploading] = React.useState(false);

  // Fetch existing properties for autocomplete suggestions
  const { data: existingProperties = [] } = useQuery({
    queryKey: ['propertiesForAutocomplete'],
    queryFn: () => base44.entities.Property.list('-created_date', 500)
  });

  // Extract unique cities and states from existing properties
  const existingCities = React.useMemo(() => 
    [...new Set(existingProperties.map(p => p.city).filter(Boolean))].sort()
  , [existingProperties]);

  const existingStates = React.useMemo(() => 
    [...new Set(existingProperties.map(p => p.state).filter(Boolean))].sort()
  , [existingProperties]);

  const createListingMutation = useMutation({
    mutationFn: async (data) => {
      const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'Property' });
      return await base44.entities.Property.create({ ...data, ref_id: refData.ref_id });
    },
    onSuccess: () => {
      toast.success("Imóvel adicionado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigate(createPageUrl("MyListings"));
    },
    onError: () => {
      toast.error("Erro ao criar anúncio. Tente novamente.");
    }
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setImages([...images, ...urls]);
      toast.success("Imagens carregadas com sucesso!");
    } catch (error) {
      toast.error("Erro ao carregar imagens");
    }
    setUploading(false);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const addAmenity = () => {
    if (amenityInput.trim()) {
      setAmenities([...amenities, amenityInput.trim()]);
      setAmenityInput("");
    }
  };

  const removeAmenity = (index) => {
    setAmenities(amenities.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title || !formData.price || !formData.address || !formData.city || !formData.state) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const listingData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      bedrooms: parseInt(formData.bedrooms) || 0,
      bathrooms: parseInt(formData.bathrooms) || 0,
      square_feet: parseInt(formData.square_feet) || 0,
      gross_area: parseInt(formData.gross_area) || 0,
      useful_area: parseInt(formData.useful_area) || 0,
      front_count: parseInt(formData.front_count) || 0,
      year_built: parseInt(formData.year_built) || null,
      year_renovated: parseInt(formData.year_renovated) || null,
      images,
      amenities
    };

    createListingMutation.mutate(listingData);
  };

  const quickAmenities = [
    "Piscina", "Garagem", "Jardim", "Varanda", "Terraço", "Elevador",
    "Ar Condicionado", "Aquecimento Central", "Lareira", "Suite", 
    "Arrecadação", "Despensa", "Vista Mar", "Vista Rio"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Adicionar Novo Anúncio</h1>
              <p className="text-slate-600">Partilhe o seu imóvel com potenciais compradores</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <PropertyFormSection title="Informação Básica" icon={Home} defaultOpen={true}>
            <div>
              <Label htmlFor="title">Título do Imóvel *</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Moradia T3 com Jardim"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva o seu imóvel..."
                rows={5}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="property_type">Tipo de Imóvel *</Label>
                <Select 
                  value={formData.property_type} 
                  onValueChange={(value) => setFormData({...formData, property_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">Moradia</SelectItem>
                    <SelectItem value="apartment">Apartamento</SelectItem>
                    <SelectItem value="condo">Condomínio</SelectItem>
                    <SelectItem value="townhouse">Casa Geminada</SelectItem>
                    <SelectItem value="building">Prédio</SelectItem>
                    <SelectItem value="land">Terreno</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                    <SelectItem value="warehouse">Armazém</SelectItem>
                    <SelectItem value="office">Escritório</SelectItem>
                    <SelectItem value="store">Loja</SelectItem>
                    <SelectItem value="farm">Quinta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="listing_type">Tipo de Anúncio *</Label>
                <Select 
                  value={formData.listing_type} 
                  onValueChange={(value) => setFormData({...formData, listing_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Venda</SelectItem>
                    <SelectItem value="rent">Arrendamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ValidatedInput
                id="price"
                label="Preço (€)"
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="250000"
                validator="price"
              />
            </div>
          </PropertyFormSection>

          {/* Property Details */}
          <PropertyFormSection title="Detalhes do Imóvel" icon={Building2} defaultOpen={true}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ValidatedInput
                id="bedrooms"
                label="Quartos"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                placeholder="3"
                validator="integer"
              />

              <ValidatedInput
                id="bathrooms"
                label="Casas de Banho"
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                placeholder="2"
                validator="integer"
              />

              <ValidatedInput
                id="square_feet"
                label="Área Total (m²)"
                type="number"
                value={formData.square_feet}
                onChange={(e) => setFormData({...formData, square_feet: e.target.value})}
                placeholder="150"
                validator="positiveNumber"
              />

              <ValidatedInput
                id="useful_area"
                label="Área Útil (m²)"
                type="number"
                value={formData.useful_area}
                onChange={(e) => setFormData({...formData, useful_area: e.target.value})}
                placeholder="120"
                validator="positiveNumber"
              />

              <ValidatedInput
                id="gross_area"
                label="Área Bruta (m²)"
                type="number"
                value={formData.gross_area}
                onChange={(e) => setFormData({...formData, gross_area: e.target.value})}
                placeholder="180"
                validator="positiveNumber"
              />

              <ValidatedInput
                id="front_count"
                label="Número de Frentes"
                type="number"
                value={formData.front_count}
                onChange={(e) => setFormData({...formData, front_count: e.target.value})}
                placeholder="2"
                validator="integer"
              />

              <ValidatedInput
                id="year_built"
                label="Ano de Construção"
                type="number"
                value={formData.year_built}
                onChange={(e) => setFormData({...formData, year_built: e.target.value})}
                placeholder="2020"
                validator="year"
              />

              <ValidatedInput
                id="year_renovated"
                label="Ano de Renovação"
                type="number"
                value={formData.year_renovated}
                onChange={(e) => setFormData({...formData, year_renovated: e.target.value})}
                placeholder="2024"
                validator="year"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="energy_certificate">Certificado Energético</Label>
                <Select 
                  value={formData.energy_certificate} 
                  onValueChange={(value) => setFormData({...formData, energy_certificate: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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

              <div>
                <Label htmlFor="garage">Garagem</Label>
                <Select 
                  value={formData.garage} 
                  onValueChange={(value) => setFormData({...formData, garage: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem garagem</SelectItem>
                    <SelectItem value="1">1 lugar</SelectItem>
                    <SelectItem value="2">2 lugares</SelectItem>
                    <SelectItem value="3">3 lugares</SelectItem>
                    <SelectItem value="4+">4+ lugares</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="exterior">Exterior</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sun_exposure">Exposição Solar</Label>
                <Select 
                  value={formData.sun_exposure} 
                  onValueChange={(value) => setFormData({...formData, sun_exposure: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north">Norte</SelectItem>
                    <SelectItem value="south">Sul</SelectItem>
                    <SelectItem value="east">Nascente</SelectItem>
                    <SelectItem value="west">Poente</SelectItem>
                    <SelectItem value="north_south">Norte/Sul</SelectItem>
                    <SelectItem value="east_west">Nascente/Poente</SelectItem>
                    <SelectItem value="all">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="finishes">Acabamentos</Label>
              <Textarea
                id="finishes"
                value={formData.finishes}
                onChange={(e) => setFormData({...formData, finishes: e.target.value})}
                placeholder="ex: Pavimento em madeira, janelas PVC com vidro duplo..."
                rows={3}
              />
            </div>
          </PropertyFormSection>

          {/* Location */}
          <PropertyFormSection title="Localização" icon={MapPin} defaultOpen={true}>
            <div>
              <Label htmlFor="address">Morada *</Label>
              <Input
                id="address"
                required
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Rua Principal, 123"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LocationAutocomplete
                field="state"
                label="Distrito"
                value={formData.state}
                onChange={(val) => setFormData({...formData, state: val})}
                placeholder="Lisboa"
                required
                existingData={existingStates}
              />

              <LocationAutocomplete
                field="city"
                label="Concelho"
                value={formData.city}
                onChange={(val) => setFormData({...formData, city: val})}
                placeholder="Lisboa"
                required
                otherFieldValue={formData.state}
                existingData={existingCities}
              />

              <ValidatedInput
                id="zip_code"
                label="Código Postal"
                value={formData.zip_code}
                onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                placeholder="1000-001"
                validator="postalCode"
                hint="Formato: 1234-567"
              />
            </div>
          </PropertyFormSection>

          {/* Images */}
          <PropertyFormSection title="Imagens do Imóvel" icon={ImageIcon} defaultOpen={false}>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={uploading}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-700 font-medium mb-1">
                    {uploading ? "A carregar..." : "Clique para carregar imagens"}
                  </p>
                  <p className="text-sm text-slate-500">PNG, JPG até 10MB</p>
                </label>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt=""
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {idx === 0 && (
                        <Badge className="absolute bottom-2 left-2 bg-blue-600">Principal</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PropertyFormSection>

          {/* Amenities */}
          <PropertyFormSection title="Comodidades" icon={Sparkles} defaultOpen={false}>
            <div className="space-y-4">
              {/* Quick amenities */}
              <div>
                <Label className="mb-2 block">Adicionar rapidamente:</Label>
                <div className="flex flex-wrap gap-2">
                  {quickAmenities.map((amenity) => (
                    <Button
                      key={amenity}
                      type="button"
                      variant={amenities.includes(amenity) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (amenities.includes(amenity)) {
                          setAmenities(amenities.filter(a => a !== amenity));
                        } else {
                          setAmenities([...amenities, amenity]);
                        }
                      }}
                    >
                      {amenities.includes(amenity) ? "✓ " : ""}{amenity}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                  placeholder="Adicionar outra comodidade..."
                />
                <Button type="button" onClick={addAmenity}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {amenities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {amenities.map((amenity, idx) => (
                    <Badge key={idx} variant="secondary" className="text-sm">
                      {amenity}
                      <button
                        type="button"
                        onClick={() => removeAmenity(idx)}
                        className="ml-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </PropertyFormSection>

          {/* Status and Internal Notes */}
          <PropertyFormSection title="Gestão Interna" icon={Settings} defaultOpen={false}>
            <div>
              <Label htmlFor="status">Estado do Anúncio</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="rented">Arrendado</SelectItem>
                  <SelectItem value="off_market">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="internal_notes">Notas Internas (privadas)</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes}
                onChange={(e) => setFormData({...formData, internal_notes: e.target.value})}
                placeholder="Notas internas sobre negociações, comissões, observações privadas..."
                rows={4}
              />
              <p className="text-sm text-slate-500 mt-1">Estas notas são privadas e não são visíveis publicamente</p>
            </div>
          </PropertyFormSection>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Browse"))}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-slate-900 hover:bg-slate-800"
              disabled={createListingMutation.isPending}
            >
              {createListingMutation.isPending ? "A criar..." : "Criar Anúncio"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}