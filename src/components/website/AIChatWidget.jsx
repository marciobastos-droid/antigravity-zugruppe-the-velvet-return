import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, User, Bot, Phone, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [inputMessage, setInputMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [leadCaptured, setLeadCaptured] = React.useState(false);
  const [leadInfo, setLeadInfo] = React.useState({ name: "", email: "", phone: "" });
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Welcome message
      setMessages([
        {
          role: "assistant",
          content: "👋 Olá! Sou o assistente virtual inteligente da ZuGruppe. Como posso ajudá-lo hoje?\n\n💡 Posso ajudar com:\n• Pesquisa de imóveis por características e localização\n• Informações sobre preços e custos de aquisição\n• Processo de compra/arrendamento em Portugal\n• Financiamento e calculadora de prestações\n• Agendamento de visitas e tours virtuais\n• Documentação e procedimentos legais\n• Dicas sobre investimento imobiliário\n\n✨ Sou capaz de responder a perguntas específicas sobre qualquer imóvel do nosso portefólio!"
        }
      ]);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    
    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Check if we should capture lead info
      const shouldCaptureLead = !leadCaptured && messages.length >= 3;

      let responseContent;

      if (shouldCaptureLead && !userMessage.includes('@')) {
        // Prompt for contact info
        responseContent = "Fico feliz em poder ajudar! 😊\n\nPara que possamos oferecer um serviço personalizado e entrar em contacto consigo, pode partilhar o seu email ou telefone?";
      } else {
        // Fetch properties for context if needed
        let propertiesContext = '';
        try {
          const properties = await base44.entities.Property.list('-created_date', 10);
          const activeProps = properties.filter(p => p.status === 'active').slice(0, 5);
          
          if (activeProps.length > 0) {
            propertiesContext = `\n\nIMÓVEIS DESTACADOS DISPONÍVEIS (para referência):\n${activeProps.map(p => 
              `- REF ${p.ref_id || p.id.substring(0,8)}: ${p.property_type} ${p.listing_type === 'sale' ? 'venda' : 'arrendamento'} em ${p.city}, T${p.bedrooms || '?'}, ${p.useful_area || p.square_feet || '?'}m², €${p.price?.toLocaleString()}`
            ).join('\n')}`;
          }
        } catch (e) {
          console.warn('Could not fetch properties:', e);
        }

        // Regular AI response with enhanced context
        const context = messages.map(m => `${m.role === 'user' ? 'Cliente' : 'Assistente'}: ${m.content}`).join('\n');
        
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `És um assistente virtual especializado e inteligente da ZuGruppe, empresa imobiliária de luxo em Portugal.

CONTEXTO DA CONVERSA:
${context}

NOVA MENSAGEM DO CLIENTE:
${userMessage}
${propertiesContext}

INSTRUÇÕES AVANÇADAS:
- És um especialista em mercado imobiliário português e internacional
- Fornece informações detalhadas sobre:
  * Processo de compra/arrendamento em Portugal (IMT, IMI, escrituras, etc.)
  * Custos de aquisição e taxas aplicáveis
  * Financiamento bancário e simulações de crédito habitação
  * Investimento imobiliário (Golden Visa, rendibilidade, etc.)
  * Documentação necessária (NIF, conta bancária, etc.)
  * Zonas e localizações (características, infraestruturas, valorização)

- Se perguntarem sobre imóveis específicos:
  * Usa a lista de imóveis disponíveis acima para dar informações reais
  * Destaca características únicas e vantagens
  * Sugere visitas online ou presenciais
  * Menciona que podem filtrar por características no site

- Se pedirem contacto direto:
  * Email: info@zugruppe.com
  * Telefone: +351 XXX XXX XXX
  * Horário: Segunda a Sexta, 9h-18h

- Dá respostas completas mas concisas (máx 4 parágrafos curtos)
- Usa emojis estrategicamente (1-2 por mensagem)
- Termina com pergunta ou call-to-action quando apropriado
- Se detetares email/telefone, agradece e confirma contacto em breve
- Para perguntas sobre custos, sê específico com percentagens e valores típicos

IMPORTANTE: És uma IA avançada, não digas "não tenho acesso a". Se não tens info específica, dá orientações gerais e sugere contacto direto com a equipa para detalhes.

Responde APENAS com o texto da resposta, sem introduções.`,
          add_context_from_internet: false
        });

        responseContent = response;

        // Try to extract lead info from message
        const emailMatch = userMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const phoneMatch = userMessage.match(/[\d\s+()-]{9,}/);

        if (emailMatch || phoneMatch) {
          setLeadCaptured(true);
          
          // Create lead in background
          try {
            const { data: refData } = await base44.functions.invoke('generateRefId', { 
              entity_type: 'Opportunity' 
            });

            await base44.entities.Opportunity.create({
              ref_id: refData.ref_id,
              lead_type: 'comprador',
              buyer_name: leadInfo.name || "Chat Website",
              buyer_email: emailMatch ? emailMatch[0] : "",
              buyer_phone: phoneMatch ? phoneMatch[0].replace(/\s/g, '') : "",
              message: `Chat Website - Conversa:\n\n${messages.map(m => `${m.role === 'user' ? 'Cliente' : 'Assistente'}: ${m.content}`).join('\n\n')}\n\nCliente: ${userMessage}`,
              status: 'new',
              lead_source: 'website',
              source_detail: 'AI Chat Widget'
            });
          } catch (e) {
            console.warn('Failed to create lead:', e);
          }
        }
      }

      // Add AI response
      setMessages(prev => [...prev, { role: "assistant", content: responseContent }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Desculpe, ocorreu um erro. Pode entrar em contacto diretamente através de info@zugruppe.com ou +351 XXX XXX XXX." 
      }]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 z-50"
          size="icon"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">Assistente ZuGruppe</CardTitle>
                  <p className="text-xs text-blue-100">Online</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-slate-100 rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escreva a sua mensagem..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Disponível 24/7 para ajudá-lo
            </p>
          </div>
        </Card>
      )}
    </>
  );
}