import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Eye, Calendar, Building2, Loader2, FileDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProposalsViewer({ userEmail }) {
  const [downloading, setDownloading] = React.useState({});

  // Buscar oportunidades do utilizador para ver propostas geradas
  const { data: opportunities = [] } = useQuery({
    queryKey: ['userOpportunities', userEmail],
    queryFn: () => base44.entities.Opportunity.filter({ buyer_email: userEmail }),
    enabled: !!userEmail
  });

  // Buscar documentos associados às oportunidades
  const { data: allDocuments = [] } = useQuery({
    queryKey: ['opportunityDocuments', userEmail],
    queryFn: async () => {
      const docs = await base44.entities.PropertyDocument.list();
      const oppIds = opportunities.map(o => o.id);
      return docs.filter(doc => 
        doc.linked_contact_ids?.some(id => oppIds.includes(id)) ||
        opportunities.some(o => o.property_id === doc.property_id)
      );
    },
    enabled: opportunities.length > 0
  });

  // Agrupar documentos por tipo
  const proposals = allDocuments.filter(d => d.document_type === 'proposal');
  const contracts = allDocuments.filter(d => d.document_type === 'contract' || d.document_type === 'cpcv');
  const brochures = allDocuments.filter(d => d.document_type === 'brochure');
  const others = allDocuments.filter(d => !['proposal', 'contract', 'cpcv', 'brochure'].includes(d.document_type));

  const handleDownload = async (doc) => {
    setDownloading({ ...downloading, [doc.id]: true });
    try {
      let url = doc.file_url;
      
      // Se for ficheiro privado, obter URL assinado
      if (doc.file_uri && !doc.file_url) {
        const { data } = await base44.functions.invoke('createSignedUrl', {
          file_uri: doc.file_uri
        });
        url = data.signed_url;
      }

      // Download
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.document_name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao descarregar documento');
    } finally {
      setDownloading({ ...downloading, [doc.id]: false });
    }
  };

  const DocumentCard = ({ doc }) => (
    <Card key={doc.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-sm">{doc.document_name}</h4>
            </div>
            
            {doc.property_title && (
              <div className="flex items-center gap-1 text-xs text-slate-600 mb-2">
                <Building2 className="w-3 h-3" />
                {doc.property_title}
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {doc.document_type === 'proposal' ? 'Proposta' :
                 doc.document_type === 'contract' ? 'Contrato' :
                 doc.document_type === 'cpcv' ? 'CPCV' :
                 doc.document_type === 'brochure' ? 'Brochura' :
                 doc.document_type}
              </Badge>
              <Badge className={
                doc.status === 'signed' ? 'bg-green-100 text-green-800' :
                doc.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                'bg-slate-100 text-slate-800'
              }>
                {doc.status === 'signed' ? 'Assinado' :
                 doc.status === 'pending' ? 'Pendente' :
                 doc.status || 'Rascunho'}
              </Badge>
            </div>

            <p className="text-xs text-slate-500">
              <Calendar className="w-3 h-3 inline mr-1" />
              {format(new Date(doc.upload_date || doc.created_date), "dd MMM yyyy", { locale: pt })}
            </p>

            {doc.description && (
              <p className="text-sm text-slate-600 mt-2">{doc.description}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={() => handleDownload(doc)}
              disabled={downloading[doc.id]}
            >
              {downloading[doc.id] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
            {doc.property_id && (
              <Link to={`${createPageUrl("PropertyDetails")}?id=${doc.property_id}`}>
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ icon: Icon, message }) => (
    <div className="text-center py-12">
      <Icon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
      <p className="text-slate-600">{message}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="w-5 h-5" />
          Propostas e Documentos
        </CardTitle>
        <CardDescription>
          Aceda aos documentos e propostas que preparámos para si
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              Todos ({allDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="proposals">
              Propostas ({proposals.length})
            </TabsTrigger>
            <TabsTrigger value="contracts">
              Contratos ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="brochures">
              Brochuras ({brochures.length})
            </TabsTrigger>
            <TabsTrigger value="others">
              Outros ({others.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-3">
            {allDocuments.length === 0 ? (
              <EmptyState icon={FileText} message="Ainda não tem documentos disponíveis" />
            ) : (
              allDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            )}
          </TabsContent>

          <TabsContent value="proposals" className="mt-4 space-y-3">
            {proposals.length === 0 ? (
              <EmptyState icon={FileText} message="Ainda não tem propostas disponíveis" />
            ) : (
              proposals.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            )}
          </TabsContent>

          <TabsContent value="contracts" className="mt-4 space-y-3">
            {contracts.length === 0 ? (
              <EmptyState icon={FileText} message="Ainda não tem contratos disponíveis" />
            ) : (
              contracts.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            )}
          </TabsContent>

          <TabsContent value="brochures" className="mt-4 space-y-3">
            {brochures.length === 0 ? (
              <EmptyState icon={FileText} message="Ainda não tem brochuras disponíveis" />
            ) : (
              brochures.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            )}
          </TabsContent>

          <TabsContent value="others" className="mt-4 space-y-3">
            {others.length === 0 ? (
              <EmptyState icon={FileText} message="Nenhum outro documento disponível" />
            ) : (
              others.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}