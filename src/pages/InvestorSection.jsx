import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Lock, Unlock, Calendar, AlertCircle, Loader2, 
  Building2, MapPin, Bed, Bath, Maximize, Euro, ExternalLink 
} from "lucide-react";

export default function InvestorSection() {
  const urlParams = new URLSearchParams(window.location.search);
  const accessKey = urlParams.get('key');
  
  const [validationStatus, setValidationStatus] = React.useState('validating'); // validating, valid, invalid, expired
  const [keyData, setKeyData] = React.useState(null);
  
  // Validate access key
  React.useEffect(() => {
    const validateKey = async () => {
      if (!accessKey) {
        setValidationStatus('invalid');
        return;
      }
      
      try {
        // Find the access key
        const keys = await base44.entities.InvestorAccessKey.filter({ access_key: accessKey });
        
        if (keys.length === 0) {
          setValidationStatus('invalid');
          return;
        }
        
        const key = keys[0];
        
        // Check if active
        if (!key.is_active) {
          setValidationStatus('invalid');
          return;
        }
        
        // Check if expired
        const now = new Date();
        const expiresAt = new Date(key.expires_at);
        
        if (now > expiresAt) {
          setValidationStatus('expired');
          setKeyData(key);
          return;
        }
        
        // Valid key - update access count
        await base44.entities.InvestorAccessKey.update(key.id, {
          access_count: (key.access_count || 0) + 1,
          last_access_date: now.toISOString()
        });
        
        setValidationStatus('valid');
        setKeyData(key);
        
      } catch (error) {
        console.error('Error validating key:', error);
        setValidationStatus('invalid');
      }
    };
    
    validateKey();
  }, [accessKey]);
  
  // Fetch investor properties only if valid
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['investorProperties'],
    queryFn: async () => {
      const allProperties = await base44.entities.Property.list('-created_date');
      return allProperties.filter(p => 
        p.published_investor_section === true && 
        p.status === 'active'
      );
    },
    enabled: validationStatus === 'valid'
  });
  
  // Loading state
  if (validationStatus === 'validating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">A validar acesso...</h2>
            <p className="text-slate-600">Por favor aguarde</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Invalid or expired key
  if (validationStatus === 'invalid' || validationStatus === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {validationStatus === 'expired' ? 'Acesso Expirado' : 'Acesso Negado'}
            </h2>
            <p className="text-slate-600 mb-6">
              {validationStatus === 'expired' 
                ? 'A sua chave de acesso expirou. Por favor contacte-nos para renovar o acesso.'
                : 'Chave de acesso inválida. Verifique o link fornecido ou contacte-nos para obter acesso.'}
            </p>
            {validationStatus === 'expired' && keyData && (
              <div className="text-sm text-slate-500 mb-6">
                <Calendar className="w-4 h-4 inline mr-1" />
                Expirou em: {new Date(keyData.expires_at).toLocaleDateString('pt-PT')}
              </div>
            )}
            <Link to={createPageUrl("ZuGruppe")}>
              <Button className="bg-slate-900 hover:bg-slate-800">
                Ver Imóveis Públicos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Valid access - show investor properties
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Unlock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Secção de Investidores</h1>
                <p className="text-slate-300">Oportunidades Exclusivas</p>
              </div>
            </div>
            <Badge className="bg-green-500 text-white">
              Acesso Ativo
            </Badge>
          </div>
          
          {keyData && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 mb-1">Cliente</p>
                  <p className="font-semibold">{keyData.client_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Válido até</p>
                  <p className="font-semibold">
                    {new Date(keyData.expires_at).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Acessos</p>
                  <p className="font-semibold">{keyData.access_count || 0} visualizações</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : properties.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Nenhum imóvel disponível
              </h3>
              <p className="text-slate-600">
                Não existem oportunidades publicadas neste momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {properties.length} {properties.length === 1 ? 'Oportunidade' : 'Oportunidades'}
              </h2>
              <p className="text-slate-600">Selecionadas especialmente para investidores</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="relative h-48">
                    {property.images && property.images.length > 0 ? (
                      <img 
                        src={property.images[0]} 
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className="bg-blue-600 text-white">
                        {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                      </Badge>
                      {property.featured && (
                        <Badge className="bg-amber-500 text-white">Destaque</Badge>
                      )}
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">
                      {property.title}
                    </h3>
                    
                    <div className="flex items-center gap-1 text-sm text-slate-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      {property.city}, {property.state}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                      {property.bedrooms > 0 && (
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          {property.bedrooms}
                        </div>
                      )}
                      {property.bathrooms > 0 && (
                        <div className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          {property.bathrooms}
                        </div>
                      )}
                      {(property.useful_area || property.square_feet) > 0 && (
                        <div className="flex items-center gap-1">
                          <Maximize className="w-4 h-4" />
                          {property.useful_area || property.square_feet}m²
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-1 text-2xl font-bold text-green-700">
                        <Euro className="w-5 h-5" />
                        {property.price?.toLocaleString()}
                      </div>
                      <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
                        <Button size="sm" className="bg-slate-900 hover:bg-slate-800">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Ver Detalhes
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="bg-slate-100 border-t border-slate-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-600">
            Para mais informações sobre estas oportunidades, por favor contacte-nos
          </p>
          <p className="text-xs text-slate-500 mt-2">
            © {new Date().getFullYear()} Zugruppe - Secção de Investidores
          </p>
        </div>
      </div>
    </div>
  );
}