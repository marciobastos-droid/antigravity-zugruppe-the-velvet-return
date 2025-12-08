import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BarChart3, Sparkles, Settings } from "lucide-react";
import PublicationScheduler from "./PublicationScheduler";
import PublicationAnalytics from "./PublicationAnalytics";
import OptimizationSuggestions from "./OptimizationSuggestions";

export default function PublicationHub({ property, open, onOpenChange }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Central de Publicação</h2>
          {property && <p className="text-slate-600 mt-1">{property.title}</p>}
        </div>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Análise
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Agendamento
          </TabsTrigger>
          <TabsTrigger value="optimize" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Otimização
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <PublicationAnalytics propertyId={property?.id} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <PublicationScheduler
            open={true}
            onOpenChange={() => {}}
            propertyId={property?.id}
            propertyTitle={property?.title}
          />
        </TabsContent>

        <TabsContent value="optimize" className="mt-6">
          <OptimizationSuggestions property={property} />
        </TabsContent>
      </Tabs>
    </div>
  );
}