import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Clock, MapPin, Euro, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export default function ViewingHistory({ userEmail }) {
  const { data: viewHistory = [], isLoading } = useQuery({
    queryKey: ['viewHistory', userEmail],
    queryFn: async () => {
      const history = await base44.entities.PropertyViewHistory.filter({ user_email: userEmail }, '-created_date');
      return history.slice(0, 50); // Last 50 views
    },
    enabled: !!userEmail
  });

  // Group by property to show unique views
  const uniqueViews = React.useMemo(() => {
    const grouped = {};
    viewHistory.forEach(view => {
      if (!grouped[view.property_id]) {
        grouped[view.property_id] = {
          ...view,
          totalViews: 1,
          lastViewed: view.created_date,
          totalTimeSpent: view.view_duration_seconds || 0
        };
      } else {
        grouped[view.property_id].totalViews += 1;
        grouped[view.property_id].totalTimeSpent += view.view_duration_seconds || 0;
        if (new Date(view.created_date) > new Date(grouped[view.property_id].lastViewed)) {
          grouped[view.property_id].lastViewed = view.created_date;
        }
      }
    });
    return Object.values(grouped);
  }, [viewHistory]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (uniqueViews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Histórico de Visualizações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Eye className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Ainda não visualizou nenhum imóvel</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Histórico de Visualizações
          </span>
          <Badge variant="outline">{uniqueViews.length} imóveis</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {uniqueViews.map((view) => (
            <Link 
              key={view.property_id} 
              to={`${createPageUrl("PropertyDetails")}?id=${view.property_id}`}
              className="block"
            >
              <div className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 hover:border-slate-300">
                {view.property_image && (
                  <img 
                    src={view.property_image} 
                    alt={view.property_title}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 mb-1 truncate">
                    {view.property_title}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{view.property_city}</span>
                    <span className="text-slate-400">•</span>
                    <Euro className="w-3 h-3" />
                    <span>{view.property_price?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {view.totalViews} {view.totalViews === 1 ? 'visualização' : 'visualizações'}
                    </span>
                    {view.totalTimeSpent > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(view.totalTimeSpent / 60)}min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDistanceToNow(new Date(view.lastViewed), { locale: pt, addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}