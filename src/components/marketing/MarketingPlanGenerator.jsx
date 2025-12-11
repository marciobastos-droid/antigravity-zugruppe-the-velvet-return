import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Printer, Save, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const MARKETING_ACTIVITIES = {
  angariacao: {
    title: "PVM1. ATIVIDADES DE ANGARIAÇÃO",
    items: [
      { code: "1.1", task: "Contacto de Prospeção" },
      { code: "1.2", task: "Visita Técnica ao Imóvel" },
      { code: "1.3", task: "Lista de Documentos (Apoio na documentação do imóvel)" }
    ]
  },
  apresentacao: {
    title: "PVM2. APRESENTAÇÃO DE ANGARIAÇÃO",
    items: [
      { code: "2.1", task: "Apresentação de Angariação (Análise Comparativa de Mercado)" },
      { code: "2.2", task: "Plano Marketing" },
      { code: "2.3", task: "Condições Contratuais" },
      { code: "2.4", task: "Contrato de Mediação Imobiliária (CMI)" }
    ]
  },
  marketing_online: {
    title: "PVM3. ATIVIDADES DE MARKETING (Online)",
    items: [
      { code: "3.B.1", task: "Destaque do Imóvel na Internet (\"Landing Page\")" },
      { code: "3.B.2", task: "Presença em Portais Imobiliários Nacionais e Internacionais" },
      { code: "3.B.3", task: "Elaboração e Publicação de Video Presentation" },
      { code: "3.B.4", task: "Publicação nas Redes Sociais" },
      { code: "3.B.5", task: "Newsletter Direcionada Público Alvo" },
      { code: "3.B.6", task: "Partilha do imóvel no MLS (Multi Listing Services)" },
      { code: "3.B.7", task: "Produção do Dossier de Proprietário" },
      { code: "3.P.5", task: "Destaques Portais Imobiliários" },
      { code: "3.P.6", task: "Divulgação digital via email marketing e SMS" }
    ]
  },
  marketing_offline: {
    title: "PVM3. ATIVIDADES DE MARKETING (Offline)",
    items: [
      { code: "3.D.1", task: "Fixação de Sinalética" },
      { code: "3.D.2", task: "Produção e Envio de Folheto do Imóvel" },
      { code: "3.D.3", task: "Sessão Fotográfica Semi Profissional" },
      { code: "3.D.4", task: "Posicionamento Visual na Montra da Agência" },
      { code: "3.P.1", task: "Vídeo com Drone Interior/Exterior" },
      { code: "3.P.2", task: "Virtual Tour 3D" }
    ]
  },
  captacao_clientes: {
    title: "PVM4. CAPTAÇÃO CLIENTES",
    items: [
      { code: "4.1", task: "Análise Oportunidade (Triagem e seleção de potenciais compradores)" },
      { code: "4.2", task: "Contacto Telefónico Cliente Procura" },
      { code: "4.3", task: "Farming ou Cartas de Bairro" },
      { code: "4.4", task: "\"Matching\" Inverso (Enviar Imóveis)" },
      { code: "4.5", task: "Questionário Critérios de Pesquisa" },
      { code: "4.6", task: "Contactos Clientes Comprador/Arrendatário" },
      { code: "4.7", task: "Telefonema/Reunião com Proprietário" }
    ]
  },
  venda_arrendamento: {
    title: "PVM5. VENDA OU ARRENDAMENTO",
    items: [
      { code: "5.1", task: "Agendamento de Visitas" },
      { code: "5.2", task: "Avaliação da Visita e Feedback ao Proprietário" },
      { code: "5.3", task: "Comunicação de Propostas de Clientes" },
      { code: "5.4", task: "Apoio no Processo de Financiamento" }
    ]
  },
  fecho_negocio: {
    title: "PVM6. FECHO DE NEGÓCIO",
    items: [
      { code: "6.1", task: "Organizar Dossier de Fecho (Apoio ao proprietário na documentação obrigatória à escritura)" },
      { code: "6.2", task: "Elaboração CPCV/CA" },
      { code: "6.3", task: "Agendamento Escritura/CA" }
    ]
  }
};

export default function MarketingPlanGenerator({ property, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const printRef = useRef();
  const [saving, setSaving] = useState(false);

  const { data: existingPlan } = useQuery({
    queryKey: ['marketingPlan', property?.id],
    queryFn: async () => {
      const plans = await base44.entities.MarketingPlan.filter({ property_id: property.id });
      return plans[0] || null;
    },
    enabled: !!property?.id
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const planData = {
        property_id: property.id,
        property_ref_id: property.ref_id,
        property_title: property.title,
        start_date: new Date().toISOString().split('T')[0],
        assigned_agent: user?.email,
        activities: {}
      };

      // Initialize all activities with empty completion data
      Object.keys(MARKETING_ACTIVITIES).forEach(category => {
        planData.activities[category] = MARKETING_ACTIVITIES[category].items.map(item => ({
          code: item.code,
          task: item.task,
          completed_weeks: [],
          notes: ""
        }));
      });

      return await base44.entities.MarketingPlan.create(planData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingPlan'] });
      toast.success("Plano de marketing criado!");
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAndCreate = async () => {
    setSaving(true);
    try {
      if (!existingPlan) {
        await createPlanMutation.mutateAsync();
      }
      setSaving(false);
      toast.success("Plano guardado!");
    } catch (error) {
      setSaving(false);
      toast.error("Erro ao guardar plano");
    }
  };

  if (!property) return null;

  const today = new Date();
  const formattedDate = format(today, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0">
        <div className="print:hidden p-6 border-b bg-white sticky top-0 z-10">
          <DialogHeader>
            <DialogTitle className="text-xl">Plano de Marketing - {property.title}</DialogTitle>
            <p className="text-sm text-slate-600 mt-1">
              Ref: {property.ref_id || property.id.slice(0, 8).toUpperCase()}
            </p>
          </DialogHeader>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSaveAndCreate} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Plano
                </>
              )}
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="p-6 sm:p-8 bg-white">
          <style>
            {`
              @media print {
                body * {
                  visibility: hidden;
                }
                .print-content, .print-content * {
                  visibility: visible;
                }
                .print-content {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
                .page-break {
                  page-break-before: always;
                }
                .no-break {
                  page-break-inside: avoid;
                }
                .print-checkbox {
                  width: 12px;
                  height: 12px;
                  border: 1.5px solid #333;
                  display: inline-block;
                  margin-right: 6px;
                  vertical-align: middle;
                }
                table {
                  border-collapse: collapse;
                  width: 100%;
                }
                table td {
                  border: 1px solid #cbd5e1;
                  padding: 8px 6px;
                  text-align: center;
                }
                table th {
                  border: 1px solid #cbd5e1;
                  padding: 6px;
                  background-color: #f1f5f9;
                  font-weight: 600;
                }
              }
            `}
          </style>

          <div className="print-content">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 no-break">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                alt="ZuGruppe Logo"
                className="h-12"
              />
              <div className="text-right">
                <h1 className="text-2xl font-bold text-slate-900">Plano de marketing</h1>
                <p className="text-sm text-slate-600">{formattedDate}</p>
              </div>
            </div>

            <div className="mb-6 pb-4 border-b-2 border-slate-200 no-break">
              <div className="text-xl font-bold text-slate-900 mb-1">{property.ref_id || property.id.slice(0, 8).toUpperCase()}</div>
            </div>

            {/* Marketing Activities Tables */}
            {Object.entries(MARKETING_ACTIVITIES).map(([category, section]) => (
              <div key={category} className="mb-6 no-break">
                <table className="w-full text-xs border border-slate-300">
                  <thead>
                    <tr>
                      <th className="text-left bg-slate-100 font-bold" style={{ width: '50%' }}>
                        {section.title}
                      </th>
                      <th colSpan="4" className="bg-slate-50 text-center">1 Mês</th>
                      <th colSpan="4" className="bg-slate-50 text-center">2 Mês</th>
                      <th colSpan="4" className="bg-slate-50 text-center">3 Mês</th>
                    </tr>
                    <tr>
                      <th className="bg-white"></th>
                      <th className="bg-slate-50">1</th>
                      <th className="bg-slate-50">2</th>
                      <th className="bg-slate-50">3</th>
                      <th className="bg-slate-50">4</th>
                      <th className="bg-slate-50">1</th>
                      <th className="bg-slate-50">2</th>
                      <th className="bg-slate-50">3</th>
                      <th className="bg-slate-50">4</th>
                      <th className="bg-slate-50">1</th>
                      <th className="bg-slate-50">2</th>
                      <th className="bg-slate-50">3</th>
                      <th className="bg-slate-50">4</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={item.code}>
                        <td className="text-left px-3 py-2 font-medium text-slate-700">
                          {item.code} {item.task}
                        </td>
                        {[...Array(12)].map((_, weekIndex) => (
                          <td key={weekIndex} className="bg-white">
                            <span className="print-checkbox"></span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t-2 border-blue-600 text-xs text-slate-600 no-break">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                    alt="ZuGruppe Logo"
                    className="h-8"
                  />
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">AMI 11355 | Privileged Approach Unipessoal Lda</div>
                  <div>Contactos: Telefone: 234026223 (Chamada para rede fixa nacional) | Email: info@zugruppe.com | https://zugruppe.com</div>
                  <div>Morada: Praça Marquês de Pombal 2, 3800-166 Glória e Vera Cruz</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}