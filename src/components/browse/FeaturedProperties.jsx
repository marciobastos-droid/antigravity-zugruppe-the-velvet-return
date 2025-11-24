import React from "react";
import { Star } from "lucide-react";
import PropertyCard from "./PropertyCard";

export default function FeaturedProperties({ properties }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-[#4cb5f5] rounded-xl w-12 h-12 from-amber-400 to-amber-500 flex items-center justify-center shadow-lg">
          <Star className="w-6 h-6 text-white fill-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Imóveis em Destaque</h2>
          <p className="text-slate-600">Anúncios excecionais selecionados</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.slice(0, 3).map((property) =>
        <PropertyCard key={property.id} property={property} />
        )}
      </div>
    </div>);

}