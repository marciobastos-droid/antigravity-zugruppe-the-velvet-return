import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Store, Briefcase, ShoppingBag, Home, Hammer, Leaf, Coins, Ruler } from "lucide-react";

const BRAND_CATEGORIES = {
  "Mediação": {
    color: "bg-blue-600",
    lightColor: "bg-blue-50 border-blue-200",
    textColor: "text-blue-700",
    brands: [
      { name: "ZuHaus", icon: Home, description: "Mediação Imobiliária Residencial" },
      { name: "ZuHandel", icon: Briefcase, description: "Mediação Imobiliária Comercial" }
    ]
  },
  "Serviços": {
    color: "bg-emerald-600",
    lightColor: "bg-emerald-50 border-emerald-200",
    textColor: "text-emerald-700",
    brands: [
      { name: "ZuProjeckt", icon: Hammer, description: "Projetos e Obras" },
      { name: "ZuGarden", icon: Leaf, description: "Jardins e Paisagismo" },
      { name: "Zufinance", icon: Coins, description: "Serviços Financeiros" }
    ]
  }
};

const PHYSICAL_TYPES = [
  { type: "Loja", icon: Store, description: "Espaço comercial de rua" },
  { type: "Escritório", icon: Building2, description: "Espaço em edifício de escritórios" },
  { type: "Kiosk", icon: ShoppingBag, description: "Espaço em centro comercial" }
];

const SIZE_OPTIONS = ["> 50m2", "< 50m2"];

export default function FranchiseMatrix({ franchises = [], onCellClick }) {
  // Count franchises per combination
  const getCount = (brand, physicalType, size) => {
    return franchises.filter(f => 
      f.brand_name === brand && 
      f.physical_type === physicalType && 
      f.physical_size === size
    ).length;
  };

  const getTotalByBrand = (brand) => {
    return franchises.filter(f => f.brand_name === brand).length;
  };

  const getTotalByPhysical = (physicalType, size) => {
    return franchises.filter(f => f.physical_type === physicalType && f.physical_size === size).length;
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-600" />
          <span className="text-sm font-medium">Mediação</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-600" />
          <span className="text-sm font-medium">Serviços</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Ruler className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-600">Dimensão Física</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left bg-slate-100 border" rowSpan={2}>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-600" />
                  <span>Dimensão Marcas</span>
                </div>
              </th>
              {PHYSICAL_TYPES.map(({ type, icon: Icon }) => (
                <th key={type} colSpan={2} className="p-3 text-center bg-slate-100 border">
                  <div className="flex items-center justify-center gap-2">
                    <Icon className="w-5 h-5 text-slate-600" />
                    <span>{type}</span>
                  </div>
                </th>
              ))}
              <th className="p-3 text-center bg-slate-200 border font-bold" rowSpan={2}>
                Total
              </th>
            </tr>
            <tr>
              {PHYSICAL_TYPES.map(({ type }) => (
                <React.Fragment key={`size-${type}`}>
                  {SIZE_OPTIONS.map(size => (
                    <th key={`${type}-${size}`} className="p-2 text-center bg-slate-50 border text-sm font-medium text-slate-600">
                      {size}
                    </th>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(BRAND_CATEGORIES).map(([category, { color, lightColor, textColor, brands }]) => (
              <React.Fragment key={category}>
                {/* Category Header */}
                <tr>
                  <td 
                    colSpan={PHYSICAL_TYPES.length * 2 + 2} 
                    className={`p-3 font-bold text-white ${color}`}
                  >
                    {category}
                  </td>
                </tr>
                {/* Brand Rows */}
                {brands.map(({ name, icon: BrandIcon, description }) => (
                  <tr key={name} className="hover:bg-slate-50">
                    <td className={`p-3 border ${lightColor}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                          <BrandIcon className={`w-5 h-5 ${textColor}`} />
                        </div>
                        <div>
                          <p className={`font-semibold ${textColor}`}>{name}</p>
                          <p className="text-xs text-slate-500">{description}</p>
                        </div>
                      </div>
                    </td>
                    {PHYSICAL_TYPES.map(({ type }) => (
                      <React.Fragment key={`${name}-${type}`}>
                        {SIZE_OPTIONS.map(size => {
                          const count = getCount(name, type, size);
                          return (
                            <td 
                              key={`${name}-${type}-${size}`} 
                              className="p-3 border text-center cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => onCellClick && onCellClick({ brand: name, physicalType: type, size })}
                            >
                              {count > 0 ? (
                                <Badge className={`${color} text-white`}>
                                  {count}
                                </Badge>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    <td className="p-3 border text-center bg-slate-50 font-bold">
                      {getTotalByBrand(name)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {/* Totals Row */}
            <tr className="bg-slate-200 font-bold">
              <td className="p-3 border">Total</td>
              {PHYSICAL_TYPES.map(({ type }) => (
                <React.Fragment key={`total-${type}`}>
                  {SIZE_OPTIONS.map(size => (
                    <td key={`total-${type}-${size}`} className="p-3 border text-center">
                      {getTotalByPhysical(type, size)}
                    </td>
                  ))}
                </React.Fragment>
              ))}
              <td className="p-3 border text-center bg-slate-300">
                {franchises.length}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Brand Cards Summary */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {Object.entries(BRAND_CATEGORIES).map(([category, { color, lightColor, textColor, brands }]) => (
          <Card key={category} className={`border-2 ${lightColor}`}>
            <CardHeader className={`${color} text-white rounded-t-lg`}>
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {brands.map(({ name, icon: BrandIcon, description }) => {
                  const brandTotal = getTotalByBrand(name);
                  return (
                    <div key={name} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-3">
                        <BrandIcon className={`w-6 h-6 ${textColor}`} />
                        <div>
                          <p className="font-semibold">{name}</p>
                          <p className="text-xs text-slate-500">{description}</p>
                        </div>
                      </div>
                      <Badge variant={brandTotal > 0 ? "default" : "outline"} className={brandTotal > 0 ? color : ""}>
                        {brandTotal} franquias
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}