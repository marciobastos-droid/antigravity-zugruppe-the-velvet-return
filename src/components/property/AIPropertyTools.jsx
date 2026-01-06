import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";
import AIPriceSuggestion from "./AIPriceSuggestion";
import AIDescriptionGenerator from "./AIDescriptionGenerator";
import AIBuyerMatcher from "./AIBuyerMatcher";
import PropertyMediaUploader from "./PropertyMediaUploader";
import AITitleGenerator from "./AITitleGenerator";
import AIMultilingualDescriptionGenerator from "./AIMultilingualDescriptionGenerator";
import AISEOOptimizer from "./AISEOOptimizer";
import AutoTranslateButton from "./AutoTranslateButton";

export default function AIPropertyTools({ property, onUpdate }) {
  const [activeTab, setActiveTab] = React.useState("price");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Ferramentas IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8 h-auto">
            <TabsTrigger value="title" className="text-xs">Título</TabsTrigger>
            <TabsTrigger value="description" className="text-xs">Descrição</TabsTrigger>
            <TabsTrigger value="translate" className="text-xs">🌐 Traduzir</TabsTrigger>
            <TabsTrigger value="multilingual" className="text-xs">🌍 Multi-Idioma</TabsTrigger>
            <TabsTrigger value="seo" className="text-xs">🔍 SEO</TabsTrigger>
            <TabsTrigger value="price" className="text-xs">Preço</TabsTrigger>
            <TabsTrigger value="buyers" className="text-xs">Compradores</TabsTrigger>
            <TabsTrigger value="media" className="text-xs">Média</TabsTrigger>
          </TabsList>

          <TabsContent value="title" className="mt-4">
            <AITitleGenerator property={property} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="description" className="mt-4">
            <AIDescriptionGenerator property={property} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="multilingual" className="mt-4">
            <AIMultilingualDescriptionGenerator property={property} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="seo" className="mt-4">
            <AISEOOptimizer property={property} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="price" className="mt-4">
            <AIPriceSuggestion property={property} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="buyers" className="mt-4">
            <AIBuyerMatcher property={property} />
          </TabsContent>

          <TabsContent value="media" className="mt-4">
            <PropertyMediaUploader property={property} onUpdate={onUpdate} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}