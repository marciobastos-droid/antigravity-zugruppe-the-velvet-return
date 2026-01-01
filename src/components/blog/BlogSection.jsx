import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import OptimizedImage from "../common/OptimizedImage";

export default function BlogSection({ maxPosts = 3, showHeader = true }) {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blogPosts', 'published', maxPosts],
    queryFn: async () => {
      try {
        const allPosts = await base44.entities.BlogPost.filter({ published: true }, '-published_date', maxPosts);
        return allPosts;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000
  });

  const categoryLabels = {
    mercado: "Mercado Imobiliário",
    investimento: "Investimento",
    guias: "Guias",
    noticias: "Notícias",
    tendencias: "Tendências",
    dicas: "Dicas"
  };

  const categoryColors = {
    mercado: "bg-blue-100 text-blue-800",
    investimento: "bg-green-100 text-green-800",
    guias: "bg-purple-100 text-purple-800",
    noticias: "bg-red-100 text-red-800",
    tendencias: "bg-amber-100 text-amber-800",
    dicas: "bg-teal-100 text-teal-800"
  };

  if (isLoading) {
    return (
      <div className="py-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) return null;

  return (
    <div className="bg-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showHeader && (
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <h2 className="text-3xl font-bold text-slate-900">Blog & Notícias</h2>
              </div>
              <p className="text-slate-600">Artigos, insights e tendências do mercado imobiliário</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <Card key={post.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
              {post.featured_image && (
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <OptimizedImage
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                    width={600}
                    height={400}
                  />
                </div>
              )}
              
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={categoryColors[post.category] || "bg-slate-100 text-slate-800"}>
                    {categoryLabels[post.category] || post.category}
                  </Badge>
                  {post.published_date && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(post.published_date), "d MMM yyyy", { locale: ptBR })}
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h3>
                
                {post.excerpt && (
                  <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                    {post.excerpt}
                  </p>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <User className="w-4 h-4" />
                    <span>{post.author_name || 'Zugruppe'}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    Ler mais
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}