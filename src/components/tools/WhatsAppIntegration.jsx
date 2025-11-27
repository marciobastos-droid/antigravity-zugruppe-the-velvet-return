import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ExternalLink, CheckCircle2, Bot, Users, Building2, Calendar } from "lucide-react";

export default function WhatsAppIntegration() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const whatsappUrl = base44.agents.getWhatsAppConnectURL('whatsapp_assistant');

  const features = [
    { icon: Building2, title: "Pesquisa de Imóveis", description: "Clientes podem pesquisar imóveis por localização, preço e características" },
    { icon: Users, title: "Registo de Interesse", description: "Cria automaticamente oportunidades quando há interesse" },
    { icon: Calendar, title: "Agendamento de Visitas", description: "Permite agendar visitas a imóveis diretamente" },
    { icon: Bot, title: "Atendimento 24/7", description: "Responde a clientes a qualquer hora do dia" }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Integração WhatsApp Business
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-900 mb-2">Assistente WhatsApp Imobiliário</h3>
                <p className="text-green-700 mb-4">
                  O seu assistente virtual está pronto para atender clientes via WhatsApp. 
                  Ele pode pesquisar imóveis, registar interesse e agendar visitas automaticamente.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="bg-green-100 text-green-800">Pesquisa de Imóveis</Badge>
                  <Badge className="bg-green-100 text-green-800">Registo de Leads</Badge>
                  <Badge className="bg-green-100 text-green-800">Agendamento</Badge>
                  <Badge className="bg-green-100 text-green-800">Perfis de Cliente</Badge>
                </div>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Conectar WhatsApp
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <Card key={idx} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{feature.title}</h4>
                      <p className="text-sm text-slate-600">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Como funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <span className="text-slate-700">Clique em "Conectar WhatsApp" para abrir o chat com o assistente</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <span className="text-slate-700">Envie a primeira mensagem para ativar a conexão</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <span className="text-slate-700">Partilhe o link com os seus clientes para que possam interagir com o assistente</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Integração Automática</h4>
                <p className="text-sm text-blue-700">
                  Todas as interações são registadas automaticamente no CRM. 
                  Novos leads são criados como oportunidades e visitas são agendadas no calendário.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}