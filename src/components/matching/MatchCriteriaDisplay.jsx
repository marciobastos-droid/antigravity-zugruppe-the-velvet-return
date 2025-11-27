import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const criteriaConfig = {
  price: { label: "Preço", icon: "€", weight: 30 },
  location: { label: "Localização", icon: "📍", weight: 25 },
  property_type: { label: "Tipo", icon: "🏠", weight: 20 },
  bedrooms: { label: "Quartos", icon: "🛏️", weight: 15 },
  listing_type: { label: "Negócio", icon: "🏷️", weight: 10 },
  area: { label: "Área", icon: "📐", weight: 10 },
  bathrooms: { label: "WCs", icon: "🚿", weight: 5 },
  amenities: { label: "Extras", icon: "✨", weight: 5 }
};

export function evaluateCriteria(requirements, property) {
  const criteria = [];
  let totalScore = 0;
  let maxScore = 0;
  let matchedCount = 0;
  let totalCriteria = 0;

  // Price
  if (requirements.budget_min || requirements.budget_max) {
    totalCriteria++;
    maxScore += criteriaConfig.price.weight;
    const price = property.price || 0;
    const min = requirements.budget_min || 0;
    const max = requirements.budget_max || Infinity;
    
    let status = 'miss';
    let score = 0;
    let detail = '';
    
    if (price >= min && price <= max) {
      status = 'match';
      score = criteriaConfig.price.weight;
      detail = `€${price.toLocaleString()} dentro do orçamento`;
      matchedCount++;
    } else if (price >= min * 0.85 && price <= max * 1.15) {
      status = 'partial';
      score = criteriaConfig.price.weight * 0.5;
      detail = `€${price.toLocaleString()} próximo do orçamento (±15%)`;
    } else if (price > max) {
      detail = `€${price.toLocaleString()} acima do máximo (€${max.toLocaleString()})`;
    } else {
      detail = `€${price.toLocaleString()} abaixo do mínimo`;
    }
    
    totalScore += score;
    criteria.push({ key: 'price', ...criteriaConfig.price, status, score, detail });
  }

  // Location
  if (requirements.locations?.length > 0) {
    totalCriteria++;
    maxScore += criteriaConfig.location.weight;
    const city = (property.city || '').toLowerCase();
    const state = (property.state || '').toLowerCase();
    const address = (property.address || '').toLowerCase();
    
    const matchedLoc = requirements.locations.find(loc => {
      const l = loc.toLowerCase();
      return city.includes(l) || state.includes(l) || address.includes(l) ||
             l.includes(city) || l.includes(state);
    });
    
    let status = 'miss';
    let score = 0;
    let detail = '';
    
    if (matchedLoc) {
      status = 'match';
      score = criteriaConfig.location.weight;
      detail = `${property.city} corresponde a "${matchedLoc}"`;
      matchedCount++;
    } else {
      // Check if same district/state
      const sameState = requirements.locations.some(loc => 
        state.includes(loc.toLowerCase()) || loc.toLowerCase().includes(state)
      );
      if (sameState) {
        status = 'partial';
        score = criteriaConfig.location.weight * 0.4;
        detail = `${property.city} - mesmo distrito`;
      } else {
        detail = `${property.city} fora das localizações preferidas`;
      }
    }
    
    totalScore += score;
    criteria.push({ key: 'location', ...criteriaConfig.location, status, score, detail });
  }

  // Property Type
  if (requirements.property_types?.length > 0) {
    totalCriteria++;
    maxScore += criteriaConfig.property_type.weight;
    const propType = property.property_type;
    
    let status = 'miss';
    let score = 0;
    let detail = '';
    
    if (requirements.property_types.includes(propType)) {
      status = 'match';
      score = criteriaConfig.property_type.weight;
      detail = `${propType} é um tipo preferido`;
      matchedCount++;
    } else {
      detail = `${propType} não está nos tipos preferidos`;
    }
    
    totalScore += score;
    criteria.push({ key: 'property_type', ...criteriaConfig.property_type, status, score, detail });
  }

  // Bedrooms
  if (requirements.bedrooms_min || requirements.bedrooms_max) {
    totalCriteria++;
    maxScore += criteriaConfig.bedrooms.weight;
    const bedrooms = property.bedrooms || 0;
    const min = requirements.bedrooms_min || 0;
    const max = requirements.bedrooms_max || Infinity;
    
    let status = 'miss';
    let score = 0;
    let detail = '';
    
    if (bedrooms >= min && bedrooms <= max) {
      status = 'match';
      score = criteriaConfig.bedrooms.weight;
      detail = `T${bedrooms} dentro do intervalo`;
      matchedCount++;
    } else if (bedrooms === min - 1 || bedrooms === max + 1) {
      status = 'partial';
      score = criteriaConfig.bedrooms.weight * 0.5;
      detail = `T${bedrooms} próximo do desejado`;
    } else {
      detail = `T${bedrooms} ${bedrooms < min ? 'abaixo' : 'acima'} do pretendido`;
    }
    
    totalScore += score;
    criteria.push({ key: 'bedrooms', ...criteriaConfig.bedrooms, status, score, detail });
  }

  // Listing Type
  if (requirements.listing_type && requirements.listing_type !== 'both') {
    totalCriteria++;
    maxScore += criteriaConfig.listing_type.weight;
    
    let status = 'miss';
    let score = 0;
    let detail = '';
    
    if (property.listing_type === requirements.listing_type) {
      status = 'match';
      score = criteriaConfig.listing_type.weight;
      detail = requirements.listing_type === 'sale' ? 'Para venda ✓' : 'Para arrendamento ✓';
      matchedCount++;
    } else {
      detail = `É para ${property.listing_type === 'sale' ? 'venda' : 'arrendamento'}, não ${requirements.listing_type === 'sale' ? 'venda' : 'arrendamento'}`;
    }
    
    totalScore += score;
    criteria.push({ key: 'listing_type', ...criteriaConfig.listing_type, status, score, detail });
  }

  // Area
  if (requirements.area_min || requirements.area_max) {
    totalCriteria++;
    maxScore += criteriaConfig.area.weight;
    const area = property.useful_area || property.square_feet || 0;
    const min = requirements.area_min || 0;
    const max = requirements.area_max || Infinity;
    
    let status = 'miss';
    let score = 0;
    let detail = '';
    
    if (area >= min && area <= max) {
      status = 'match';
      score = criteriaConfig.area.weight;
      detail = `${area}m² dentro do intervalo`;
      matchedCount++;
    } else if (area >= min * 0.85 || area <= max * 1.15) {
      status = 'partial';
      score = criteriaConfig.area.weight * 0.5;
      detail = `${area}m² próximo do desejado`;
    } else {
      detail = `${area}m² fora do intervalo pretendido`;
    }
    
    totalScore += score;
    criteria.push({ key: 'area', ...criteriaConfig.area, status, score, detail });
  }

  // Bathrooms
  if (requirements.bathrooms_min) {
    totalCriteria++;
    maxScore += criteriaConfig.bathrooms.weight;
    const bathrooms = property.bathrooms || 0;
    
    let status = 'miss';
    let score = 0;
    let detail = '';
    
    if (bathrooms >= requirements.bathrooms_min) {
      status = 'match';
      score = criteriaConfig.bathrooms.weight;
      detail = `${bathrooms} WC satisfaz o mínimo`;
      matchedCount++;
    } else {
      detail = `${bathrooms} WC abaixo do mínimo (${requirements.bathrooms_min})`;
    }
    
    totalScore += score;
    criteria.push({ key: 'bathrooms', ...criteriaConfig.bathrooms, status, score, detail });
  }

  // Calculate final score
  const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 50;
  
  return {
    criteria,
    score: finalScore,
    matchedCount,
    totalCriteria,
    matchRatio: totalCriteria > 0 ? `${matchedCount}/${totalCriteria}` : 'N/A'
  };
}

export default function MatchCriteriaDisplay({ criteria, compact = false }) {
  if (!criteria || criteria.length === 0) {
    return null;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'match': return <Check className="w-3 h-3 text-green-600" />;
      case 'partial': return <Minus className="w-3 h-3 text-amber-600" />;
      default: return <X className="w-3 h-3 text-red-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'match': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-1">
          {criteria.map((c) => (
            <Tooltip key={c.key}>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={`text-xs px-1.5 py-0.5 cursor-help ${getStatusColor(c.status)}`}
                >
                  {c.icon} {getStatusIcon(c.status)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">{c.label}</p>
                <p className="text-xs text-slate-600">{c.detail}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-1.5">
      {criteria.map((c) => (
        <div 
          key={c.key}
          className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
            c.status === 'match' ? 'bg-green-50' : 
            c.status === 'partial' ? 'bg-amber-50' : 'bg-red-50'
          }`}
        >
          <span className="w-4">{c.icon}</span>
          <span className="font-medium w-20">{c.label}</span>
          {getStatusIcon(c.status)}
          <span className={`flex-1 text-xs ${
            c.status === 'match' ? 'text-green-700' : 
            c.status === 'partial' ? 'text-amber-700' : 'text-red-600'
          }`}>
            {c.detail}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MatchScoreBadge({ score, matchRatio, size = 'default' }) {
  const getScoreColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-400';
  };

  if (size === 'compact') {
    return (
      <Badge className={`${getScoreColor()} text-white text-xs`}>
        {score}%
      </Badge>
    );
  }

  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${getScoreColor()} text-white font-bold`}>
        {score}%
      </div>
      {matchRatio && (
        <p className="text-xs text-slate-500 mt-1">{matchRatio} critérios</p>
      )}
    </div>
  );
}