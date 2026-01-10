import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Bed, Bath, Maximize, Star, ExternalLink, Hash, Home as HomeIcon, Building2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CURRENCY_SYMBOLS, convertToEUR } from "@/components/utils/currencyConverter";
import EnhancedPropertyCarousel from "./EnhancedPropertyCarousel";

export default function PropertyCard({ property, hideMetadata = false }) {
  const images = property.images && property.images.length > 0 
    ? property.images 
    : [];

  return (
    <Link 
      to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
      className="group bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 block"
    >
      {/* Enhanced Carousel */}
      <EnhancedPropertyCarousel
        images={images}
        alt={property.title}
        className="h-48 sm:h-56 md:h-64"
      />
      
      {/* Badges Overlay */}
      <div className="absolute top-3 md:top-4 left-3 md:left-4 flex gap-2 flex-wrap z-20">
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
      <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 z-20">
        <div className="bg-slate-900/90 backdrop-blur-sm text-white px-2 py-1 rounded-md font-bold text-xs md:text-sm">
          {CURRENCY_SYMBOLS[property.currency] || '€'}{property.price?.toLocaleString()}
          {property.currency && property.currency !== 'EUR' && (() => {
            const eurValue = convertToEUR(property.price, property.currency);
            return eurValue ? (
              <div className="text-[9px] font-normal text-white/80 mt-0.5">
                ≈ €{eurValue.toLocaleString()}
              </div>
            ) : null;
          })()}
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
            {!hideMetadata && property.documents && property.documents.length > 0 && (
              <Badge className="bg-blue-500 text-white border-0 text-xs flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {property.documents.length} doc
              </Badge>
            )}
            {!hideMetadata && property.ref_id && (
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

           {!hideMetadata && property.unit_number && (
             <Badge variant="secondary" className="text-xs">
               <Hash className="w-3 h-3 mr-1" />
               Fração {property.unit_number}
             </Badge>
           )}

           {!hideMetadata && property.external_id && property.external_id !== 'N/A' && (
             <Badge variant="secondary" className="text-xs">
               <Hash className="w-3 h-3 mr-1" />
               {property.external_id}
             </Badge>
           )}

           {!hideMetadata && property.source_url && (
             <Badge variant="secondary" className="text-xs">
               <ExternalLink className="w-3 h-3 mr-1" />
               Importado
             </Badge>
           )}

           {!hideMetadata && property.published_portals && property.published_portals.filter(p => p !== 'website').length > 0 && (
             <div className="flex items-center gap-1 w-full">
               <span className="text-xs text-slate-500">🌐 Portais:</span>
               {property.published_portals.filter(p => p !== 'website').map(portal => (
                 <Badge key={portal} variant="secondary" className="text-xs">
                   {portal === 'idealista' && 'Idealista'}
                   {portal === 'imovirtual' && 'Imovirtual'}
                   {portal === 'casafari' && 'Casafari'}
                   {portal === 'supercasa' && 'Supercasa'}
                 </Badge>
               ))}
             </div>
           )}

           {!hideMetadata && property.published_pages && property.published_pages.filter(p => p !== 'website').length > 0 && (
             <>
               {property.published_pages
                 .filter(page => page !== 'website')
                 .map(page => (
                   <Badge key={page} variant="secondary" className="text-xs capitalize">
                     {page === 'zuhaus' && '🏠 ZuHaus'}
                     {page === 'zuhandel' && '🏢 ZuHandel'}
                     {page === 'luxury_collection' && '✨ Luxo'}
                     {page === 'investor_section' && '📈 Investidor'}
                     {page === 'worldwide_properties' && '🌍 Worldwide'}
                     {page === 'homepage_featured' && '⭐ Destaque'}
                   </Badge>
                 ))
               }
             </>
           )}
         </div>
      </div>
    </Link>
  );
}