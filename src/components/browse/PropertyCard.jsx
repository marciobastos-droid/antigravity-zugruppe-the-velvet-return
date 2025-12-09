import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Bed, Bath, Maximize, Star, ExternalLink, Hash, Home as HomeIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CURRENCY_SYMBOLS, convertToEUR } from "@/components/utils/currencyConverter";
import OptimizedImage from "../common/OptimizedImage";

export default function PropertyCard({ property }) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  
  // Reset image index when property changes
  React.useEffect(() => {
    setCurrentImageIndex(0);
  }, [property.id]);
  
  const images = property.images && property.images.length > 0 
    ? property.images 
    : ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80"];
  
  const hasMultipleImages = images.length > 1;

  const handlePrevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Link 
      to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
      className="group bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200"
    >
      {/* Image */}
      <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden bg-slate-100">
        <OptimizedImage
          src={images[currentImageIndex]}
          alt={property.title}
          className="w-full h-full group-hover:scale-110 transition-transform duration-500"
          fallbackIcon={HomeIcon}
          strategy="lazy"
        />
        
        {/* Image Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            {/* Image Counter */}
            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs">
              {currentImageIndex + 1} / {images.length}
            </div>
          </>
        )}
        
        <div className="absolute top-3 md:top-4 left-3 md:left-4 flex gap-2 flex-wrap">
          {property.featured && (
            <Badge className="bg-amber-400 text-slate-900 border-0 text-xs">
              <Star className="w-3 h-3 mr-1" />
              Destaque
            </Badge>
          )}
          <Badge className="bg-white/95 text-slate-900 border-0 text-xs">
            {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
          </Badge>
        </div>
        <div className="absolute bottom-3 md:bottom-4 right-3 md:right-4">
          <div className="bg-slate-900/90 backdrop-blur-sm text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-bold text-base md:text-lg">
            {CURRENCY_SYMBOLS[property.currency] || '€'}{property.price?.toLocaleString()}
            {property.currency && property.currency !== 'EUR' && (() => {
              const eurValue = convertToEUR(property.price, property.currency);
              return eurValue ? (
                <div className="text-xs font-normal text-white/80 mt-0.5">
                  ≈ €{eurValue.toLocaleString()}
                </div>
              ) : null;
            })()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 group-hover:text-amber-600 transition-colors duration-200 line-clamp-2">
          {property.title}
        </h3>
        
        <div className="flex items-center text-slate-600 mb-3 md:mb-4">
          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="text-sm truncate">
            {property.city}, {property.state}
            {property.country && property.country !== 'Portugal' && ` • ${property.country}`}
          </span>
        </div>

        {/* Property Details */}
        {(property.bedrooms > 0 || property.bathrooms > 0 || property.square_feet > 0) && (
          <div className="flex items-center gap-3 md:gap-4 text-slate-600 border-t border-slate-100 pt-3 md:pt-4">
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4" />
                <span className="text-sm font-medium">{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4" />
                <span className="text-sm font-medium">{property.bathrooms}</span>
              </div>
            )}
            {property.square_feet > 0 && (
              <div className="flex items-center gap-1">
                <Maximize className="w-4 h-4" />
                <span className="text-sm font-medium">{property.square_feet.toLocaleString()} m²</span>
              </div>
            )}
          </div>
        )}

        {/* Property Type and Source Info */}
        <div className="mt-3 md:mt-4 flex flex-wrap items-center gap-2">
          {property.ref_id && (
            <Badge className="bg-slate-900 text-white border-0 text-xs font-mono">
              {property.ref_id}
            </Badge>
          )}
          <Badge variant="outline" className="text-slate-700 text-xs">
            {property.property_type === 'house' ? 'Moradia' : 
             property.property_type === 'apartment' ? 'Apartamento' :
             property.property_type === 'condo' ? 'Condomínio' :
             property.property_type === 'townhouse' ? 'Casa Geminada' :
             property.property_type === 'building' ? 'Prédio' :
             property.property_type === 'land' ? 'Terreno' :
             property.property_type === 'commercial' ? 'Comercial' :
             property.property_type?.charAt(0).toUpperCase() + property.property_type?.slice(1)}
          </Badge>

          {property.external_id && property.external_id !== 'N/A' && (
            <Badge variant="secondary" className="text-xs">
              <Hash className="w-3 h-3 mr-1" />
              {property.external_id}
            </Badge>
          )}

          {property.source_url && (
            <Badge variant="secondary" className="text-xs">
              <ExternalLink className="w-3 h-3 mr-1" />
              Importado
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}