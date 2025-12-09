import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Bed, Bath, Maximize, Eye } from "lucide-react";
import { CURRENCY_SYMBOLS, convertToEUR } from "../utils/currencyConverter";
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Coordenadas aproximadas por cidade portuguesa (principais)
const CITY_COORDINATES = {
  'Porto': [41.1579, -8.6291],
  'Lisboa': [38.7223, -9.1393],
  'Braga': [41.5454, -8.4265],
  'Coimbra': [40.2033, -8.4103],
  'Faro': [37.0194, -7.9322],
  'Aveiro': [40.6443, -8.6455],
  'Évora': [38.5667, -7.9089],
  'Setúbal': [38.5244, -8.8882],
  'Viseu': [40.6567, -7.9139],
  'Leiria': [39.7438, -8.8071],
  'Vila Nova de Gaia': [41.1239, -8.6109],
  'Matosinhos': [41.1820, -8.6896],
  'Gondomar': [41.1443, -8.5327],
  'Guimarães': [41.4416, -8.2918],
  'Funchal': [32.6669, -16.9241],
  'Ponta Delgada': [37.7412, -25.6756],
  'Cascais': [38.6968, -9.4215],
  'Oeiras': [38.6927, -9.3108],
  'Sintra': [38.8029, -9.3817],
  'Almada': [38.6789, -9.1567]
};

// Adiciona pequena variação às coordenadas para evitar sobreposição de marcadores
function addJitter(coord, index, total) {
  const jitterAmount = 0.01; // ~1km
  const angle = (index / total) * 2 * Math.PI;
  const distance = jitterAmount * (0.5 + Math.random() * 0.5);
  return [
    coord[0] + distance * Math.cos(angle),
    coord[1] + distance * Math.sin(angle)
  ];
}

// Componente para ajustar o mapa aos marcadores
function MapBounds({ properties }) {
  const map = useMap();
  
  React.useEffect(() => {
    if (properties.length > 0) {
      const bounds = properties.map(p => getPropertyCoordinates(p, 0, properties.length));
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [properties, map]);
  
  return null;
}

// Obter coordenadas do imóvel
function getPropertyCoordinates(property, index, total) {
  // Se tiver coordenadas definidas, usar essas
  if (property.latitude && property.longitude) {
    return [property.latitude, property.longitude];
  }
  
  // Caso contrário, usar coordenadas da cidade
  const cityCoords = CITY_COORDINATES[property.city];
  if (cityCoords) {
    return addJitter(cityCoords, index, total);
  }
  
  // Fallback: centro de Portugal
  return addJitter([39.5, -8.0], index, total);
}

// Ícone personalizado por tipo de imóvel
function getCustomIcon(property, brandColor) {
  const color = property.featured ? '#f59e0b' : (brandColor || '#3b82f6');
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: 16px;
          font-weight: bold;
        ">📍</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

export default function PropertiesMap({ properties = [], brandColor = "#3b82f6", height = "500px" }) {
  const [selectedProperty, setSelectedProperty] = React.useState(null);

  if (properties.length === 0) {
    return (
      <div className="w-full bg-slate-100 rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">Nenhum imóvel para mostrar no mapa</p>
        </div>
      </div>
    );
  }

  // Calcular centro inicial baseado nas propriedades
  const centerCoords = properties.length > 0 
    ? getPropertyCoordinates(properties[0], 0, properties.length)
    : [39.5, -8.0]; // Portugal central

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-lg border-2 border-slate-200" style={{ height }}>
      <MapContainer 
        center={centerCoords}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBounds properties={properties} />
        
        {properties.map((property, index) => {
          const coords = getPropertyCoordinates(property, index, properties.length);
          
          return (
            <Marker 
              key={property.id} 
              position={coords}
              icon={getCustomIcon(property, brandColor)}
              eventHandlers={{
                click: () => setSelectedProperty(property)
              }}
            >
              <Popup maxWidth={300} className="custom-popup">
                <div className="p-2">
                  {/* Imagem */}
                  {property.images?.[0] && (
                    <img 
                      src={property.images[0]} 
                      alt={property.title}
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                  )}
                  
                  {/* Título e Badges */}
                  <div className="mb-2">
                    <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">
                      {property.title}
                    </h3>
                    <div className="flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-600">{property.city}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                      </Badge>
                      {property.featured && (
                        <Badge className="bg-amber-400 text-slate-900 text-xs">Destaque</Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Preço */}
                  <div className="mb-2 pb-2 border-b border-slate-200">
                    <div className="text-lg font-bold" style={{ color: brandColor }}>
                      {CURRENCY_SYMBOLS[property.currency] || '€'}{property.price?.toLocaleString()}
                      {property.listing_type === 'rent' && <span className="text-xs font-normal">/mês</span>}
                    </div>
                    {property.currency && property.currency !== 'EUR' && (() => {
                      const eurValue = convertToEUR(property.price, property.currency);
                      return eurValue ? (
                        <div className="text-xs text-slate-500">
                          ≈ €{eurValue.toLocaleString()}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  {/* Características */}
                  <div className="flex items-center gap-3 text-xs text-slate-600 mb-3">
                    {property.bedrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bed className="w-3 h-3" />
                        T{property.bedrooms}
                      </span>
                    )}
                    {property.bathrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bath className="w-3 h-3" />
                        {property.bathrooms}
                      </span>
                    )}
                    {(property.useful_area || property.square_feet) > 0 && (
                      <span className="flex items-center gap-1">
                        <Maximize className="w-3 h-3" />
                        {property.useful_area || property.square_feet}m²
                      </span>
                    )}
                  </div>
                  
                  {/* Botão Ver Detalhes */}
                  <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
                    <Button 
                      size="sm" 
                      className="w-full text-xs"
                      style={{ backgroundColor: brandColor }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver Detalhes
                    </Button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      <style>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 0;
          width: 100% !important;
        }
      `}</style>
    </div>
  );
}