import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, ExternalLink, Eye, Copy, Edit, Trash2, Globe, 
  BarChart3, TrendingUp, Check, Clock, Archive 
} from "lucide-react";
import { toast } from "sonner";
import CreateLandingPageDialog from "./CreateLandingPageDialog";
import EditLandingPageDialog from "./EditLandingPageDialog";

export default function LandingPageManager() {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingPage, setEditingPage] = React.useState(null);
  const queryClient = useQueryClient();

  const { data: landingPages = [], isLoading } = useQuery({
    queryKey: ['landingPages'],
    queryFn: () => base44.entities.LandingPage.list('-created_date')
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['marketingCampaigns'],
    queryFn: () => base44.entities.MarketingCampaign.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LandingPage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      toast.success('Landing page eliminada!');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.LandingPage.update(id, { 
      status,
      published_at: status === 'published' ? new Date().toISOString() : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      toast.success('Estado atualizado!');
    }
  });

  const copyLinkToClipboard = (slug) => {
    const url = `${window.location.origin}/lp/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published': return <Check className="w-3 h-3" />;
      case 'draft': return <Clock className="w-3 h-3" />;
      case 'archived': return <Archive className="w-3 h-3" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Landing Pages</h2>
          <p className="text-slate-600">Crie e gira landing pages para as suas campanhas</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Landing Page
        </Button>
      </div>

      {landingPages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhuma landing page criada
            </h3>
            <p className="text-slate-600 mb-4 text-center max-w-md">
              Crie landing pages personalizadas para promover imóveis e campanhas de marketing
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Landing Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {landingPages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">
                        {page.title}
                      </h3>
                      <Badge className={getStatusColor(page.status)}>
                        {getStatusIcon(page.status)}
                        <span className="ml-1">{page.status === 'published' ? 'Publicada' : page.status === 'draft' ? 'Rascunho' : 'Arquivada'}</span>
                      </Badge>
                      {page.campaign_name && (
                        <Badge variant="outline" className="text-xs">
                          {page.campaign_name}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                      <Globe className="w-4 h-4" />
                      <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {window.location.origin}/lp/{page.slug}
                      </code>
                    </div>

                    {/* Analytics */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">
                          {page.analytics?.views || 0} visualizações
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">
                          {page.analytics?.conversions || 0} conversões
                        </span>
                      </div>
                      {page.analytics?.conversion_rate > 0 && (
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">
                            {page.analytics.conversion_rate.toFixed(1)}% taxa
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/lp/${page.slug}?preview=true`, '_blank')}
                      title={page.status === 'draft' ? 'Pré-visualizar' : 'Ver página'}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {page.status === 'draft' ? 'Preview' : 'Ver'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLinkToClipboard(page.slug)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPage(page)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    {page.status === 'draft' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: page.id, status: 'published' })}
                      >
                        Publicar
                      </Button>
                    )}

                    {page.status === 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: page.id, status: 'archived' })}
                      >
                        Arquivar
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja eliminar esta landing page?')) {
                          deleteMutation.mutate(page.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateLandingPageDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        campaigns={campaigns}
      />

      {editingPage && (
        <EditLandingPageDialog
          page={editingPage}
          open={!!editingPage}
          onOpenChange={(open) => !open && setEditingPage(null)}
          campaigns={campaigns}
        />
      )}
    </div>
  );
}