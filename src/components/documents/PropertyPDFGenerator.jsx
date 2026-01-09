import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Download, Mail, Eye, Settings, Image as ImageIcon, Palette, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function PropertyPDFGenerator({ 
  open, 
  onOpenChange, 
  properties = [], 
  recipientEmail = "",
  recipientName = "",
  recipientPhone = "",
  opportunityId = null
}) {
  const [activeTab, setActiveTab] = React.useState("config");
  const [generating, setGenerating] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState(null);
  
  const [config, setConfig] = React.useState({
    // Design
    brandColor: "#4cb5f5",
    logoUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/2e55263db_ZuGruppe.jpg",
    showLogo: true,
    
    // Conteúdo
    title: "Proposta de Imóveis",
    includeDescription: true,
    includeAmenities: true,
    includeLocation: true,
    includeDetails: true,
    maxDescriptionLength: 500,
    
    // Email
    emailSubject: `Sugestões de Imóveis${recipientName ? ` - ${recipientName}` : ''}`,
    emailMessage: `Olá${recipientName ? ` ${recipientName}` : ''},\n\nSelecionámos ${properties.length} imóve${properties.length > 1 ? 'is' : 'l'} que poderão ser do seu interesse.\n\nEstamos disponíveis para qualquer esclarecimento.\n\nCumprimentos,\nEquipa Zugruppe`,
    
    // WhatsApp
    whatsAppPhone: recipientPhone || "",
    whatsAppMessage: `Olá${recipientName ? ` ${recipientName}` : ''}! Segue a proposta com ${properties.length} imóve${properties.length > 1 ? 'is' : 'l'} selecionado${properties.length > 1 ? 's' : ''} para si.`
  });

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 76, g: 181, b: 245 };
  };

  const generatePDF = async () => {
    if (properties.length === 0) {
      toast.error("Nenhum imóvel selecionado");
      return null;
    }

    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const brandRgb = hexToRgb(config.brandColor);
      
      const addImageToPDF = async (imageUrl, x, y, width, height) => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
          });
          doc.addImage(img, 'JPEG', x, y, width, height);
        } catch (error) {
          console.warn('Error loading image:', error);
        }
      };
      
      // === CAPA ===
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Barra superior
      doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
      doc.rect(0, 0, pageWidth, 4, 'F');
      
      // Logo
      if (config.showLogo && config.logoUrl) {
        try {
          await addImageToPDF(config.logoUrl, pageWidth / 2 - 25, 15, 50, 50);
        } catch (e) {
          console.warn('Logo não carregado');
        }
      }
      
      // Título
      doc.setTextColor(39, 37, 31);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(config.title, pageWidth / 2, 70, { align: 'center' });
      
      // Linha separadora
      doc.setDrawColor(brandRgb.r, brandRgb.g, brandRgb.b);
      doc.setLineWidth(1);
      doc.line(pageWidth / 2 - 35, 75, pageWidth / 2 + 35, 75);
      
      // Cliente
      if (recipientName) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(39, 37, 31);
        doc.text('Preparado para:', pageWidth / 2, 90, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b);
        doc.text(recipientName, pageWidth / 2, 100, { align: 'center' });
      }
      
      // Data
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`${new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, 115, { align: 'center' });
      
      // Box contagem
      doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
      doc.roundedRect(pageWidth / 2 - 40, 125, 80, 16, 3, 3, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${properties.length} Imóve${properties.length > 1 ? 'is' : 'l'} Selecionado${properties.length > 1 ? 's' : ''}`, pageWidth / 2, 135, { align: 'center' });
      
      // Contactos
      if (recipientEmail) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Email: ${recipientEmail}`, pageWidth / 2, 160, { align: 'center' });
      }
      
      // Footer capa
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('ZuGruppe - The Velvet Return', pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.setFontSize(8);
      doc.text('Licença IMPIC 11355', pageWidth / 2, pageHeight - 14, { align: 'center' });
      
      // === PÁGINAS DOS IMÓVEIS ===
      for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        doc.addPage();
        
        // Barra superior
        doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
        doc.rect(0, 0, pageWidth, 8, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(39, 37, 31);
        doc.text(`IMÓVEL ${i + 1} DE ${properties.length}`, margin, 18);
        
        if (prop.ref_id) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Ref: ${prop.ref_id}`, pageWidth - margin, 18, { align: 'right' });
        }
        
        let y = 28;
        
        // Imagem principal
        if (prop.images?.[0]) {
          await addImageToPDF(prop.images[0], margin, y, pageWidth - 2 * margin, 85);
          y += 90;
        }
        
        // Galeria miniaturas
        if (prop.images?.length > 1) {
          const thumbWidth = (pageWidth - 2 * margin - 6) / 3;
          for (let j = 1; j < Math.min(4, prop.images.length); j++) {
            const thumbX = margin + (j - 1) * (thumbWidth + 3);
            await addImageToPDF(prop.images[j], thumbX, y, thumbWidth, 25);
          }
          y += 33;
        }
        
        // Título
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(39, 37, 31);
        const titleLines = doc.splitTextToSize(prop.title, pageWidth - 2 * margin);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 6 + 5;
        
        // Preço
        doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
        doc.roundedRect(margin, y, 70, 14, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`€ ${prop.price?.toLocaleString() || 'N/A'}`, margin + 35, y + 9, { align: 'center' });
        
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(margin + 75, y, 35, 14, 3, 3, 'F');
        doc.setTextColor(39, 37, 31);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(prop.listing_type === 'sale' ? 'Venda' : 'Arrendamento', margin + 92.5, y + 9, { align: 'center' });
        y += 20;
        
        // Características
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(margin, y, pageWidth - 2 * margin, 22, 2, 2, 'F');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        
        let featureX = margin + 5;
        if (prop.bedrooms !== undefined && prop.bedrooms !== null) {
          doc.text('QUARTOS', featureX, y + 7);
          doc.setFontSize(14);
          doc.setTextColor(39, 37, 31);
          doc.text(`${prop.bedrooms}`, featureX, y + 15);
          featureX += 45;
        }
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        if (prop.bathrooms !== undefined && prop.bathrooms !== null) {
          doc.text('WC', featureX, y + 7);
          doc.setFontSize(14);
          doc.setTextColor(39, 37, 31);
          doc.text(`${prop.bathrooms}`, featureX, y + 15);
          featureX += 45;
        }
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        if (prop.useful_area || prop.square_feet) {
          doc.text('ÁREA', featureX, y + 7);
          doc.setFontSize(14);
          doc.setTextColor(39, 37, 31);
          doc.text(`${prop.useful_area || prop.square_feet}m²`, featureX, y + 15);
          featureX += 45;
        }
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        if (prop.year_built) {
          doc.text('ANO', featureX, y + 7);
          doc.setFontSize(14);
          doc.setTextColor(39, 37, 31);
          doc.text(`${prop.year_built}`, featureX, y + 15);
        }
        y += 28;
        
        // Localização
        if (config.includeLocation) {
          doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
          doc.roundedRect(margin, y, 65, 7, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('LOCALIZAÇÃO', margin + 32.5, y + 5, { align: 'center' });
          y += 12;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(39, 37, 31);
          
          if (prop.address) {
            doc.text(prop.address, margin + 2, y);
            y += 5;
          }
          doc.text(`${prop.city}, ${prop.state}`, margin + 2, y);
          y += 10;
        }
        
        // Detalhes adicionais
        if (config.includeDetails) {
          const hasDetails = prop.energy_certificate || prop.floor || prop.front_count || (prop.garage && prop.garage !== 'none') || prop.gross_area;
          
          if (hasDetails) {
            doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
            doc.roundedRect(margin, y, 60, 7, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('DETALHES', margin + 30, y + 5, { align: 'center' });
            y += 12;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(39, 37, 31);
            
            const details = [];
            if (prop.energy_certificate) details.push(`Certificado Energético: ${prop.energy_certificate}`);
            if (prop.floor) details.push(`Piso: ${prop.floor}`);
            if (prop.front_count) details.push(`Frentes: ${prop.front_count}`);
            if (prop.garage && prop.garage !== 'none') details.push(`Garagem: ${prop.garage}`);
            if (prop.gross_area) details.push(`Área Bruta: ${prop.gross_area}m²`);
            
            details.forEach((detail, idx) => {
              doc.text(`• ${detail}`, margin + 2, y + idx * 5);
            });
            
            y += details.length * 5 + 5;
          }
        }
        
        // Descrição
        const maxDescriptionY = pageHeight - 35;
        if (config.includeDescription && prop.description && y < maxDescriptionY - 20) {
          doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
          doc.roundedRect(margin, y, 65, 7, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('DESCRIÇÃO', margin + 32.5, y + 5, { align: 'center' });
          y += 12;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(39, 37, 31);
          
          const descText = prop.description.length > config.maxDescriptionLength 
            ? prop.description.substring(0, config.maxDescriptionLength) + '...' 
            : prop.description;
          const descLines = doc.splitTextToSize(descText, pageWidth - 2 * margin - 4);
          
          const availableLines = Math.floor((maxDescriptionY - y) / 4);
          const linesToShow = descLines.slice(0, availableLines);
          doc.text(linesToShow, margin + 2, y);
          y += linesToShow.length * 4 + 5;
        }
        
        // Comodidades
        if (config.includeAmenities && prop.amenities?.length > 0 && y < pageHeight - 60) {
          doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
          doc.roundedRect(margin, y, 70, 7, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('COMODIDADES', margin + 35, y + 5, { align: 'center' });
          y += 12;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(39, 37, 31);
          
          const amenitiesPerColumn = Math.ceil(Math.min(prop.amenities.length, 12) / 2);
          prop.amenities.slice(0, 12).forEach((amenity, idx) => {
            const col = Math.floor(idx / amenitiesPerColumn);
            const row = idx % amenitiesPerColumn;
            const x = margin + 2 + col * (pageWidth / 2 - margin);
            doc.text(`• ${amenity}`, x, y + row * 4);
          });
          
          y += amenitiesPerColumn * 4 + 8;
        }
        
        // Rodapé
        doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
        doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('ZuGruppe - The Velvet Return', margin, pageHeight - 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Licença IMPIC 11355', margin, pageHeight - 2);
        doc.setFontSize(8);
        doc.text(`Página ${i + 2} de ${properties.length + 1}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
      }
      
      return doc;
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = async () => {
    const doc = await generatePDF();
    if (doc) {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setActiveTab("preview");
      toast.success("Pré-visualização gerada!");
    }
  };

  const handleDownload = async () => {
    const doc = await generatePDF();
    if (doc) {
      const filename = `Proposta_${recipientName ? recipientName.replace(/\s+/g, '_') : 'Imoveis'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('PDF descarregado!');
      onOpenChange(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      toast.error("Email do destinatário não definido");
      return;
    }

    setSending(true);
    try {
      const doc = await generatePDF();
      if (!doc) {
        setSending(false);
        return;
      }

      const pdfBlob = doc.output('blob');
      const pdfBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(pdfBlob);
      });

      await base44.functions.invoke('sendResendEmail', {
        to: recipientEmail,
        subject: config.emailSubject,
        text: config.emailMessage,
        attachments: [{
          filename: `Proposta_Imoveis_${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBase64
        }]
      });

      // Atualizar oportunidade se tiver ID
      if (opportunityId) {
        const opp = await base44.entities.Opportunity.filter({ id: opportunityId });
        if (opp[0]?.associated_properties) {
          const updated = opp[0].associated_properties.map(ap => ({
            ...ap,
            presented_date: new Date().toISOString(),
            status: 'visited'
          }));
          await base44.entities.Opportunity.update(opportunityId, { 
            associated_properties: updated 
          });
        }
      }

      toast.success('Email enviado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Erro ao enviar email');
    }
    setSending(false);
  };

  const handleSendWhatsApp = async () => {
    if (!config.whatsAppPhone) {
      toast.error("Preencha o número de telefone");
      return;
    }

    setSendingWhatsApp(true);
    try {
      const doc = await generatePDF();
      if (!doc) {
        setSendingWhatsApp(false);
        return;
      }

      const pdfBlob = doc.output('blob');
      const pdfBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(pdfBlob);
      });

      const filename = `Proposta_${recipientName ? recipientName.replace(/\s+/g, '_') : 'Imoveis'}_${new Date().toISOString().split('T')[0]}.pdf`;

      await base44.functions.invoke('sendWhatsApp', {
        phoneNumber: config.whatsAppPhone,
        message: config.whatsAppMessage,
        file_content_base64: pdfBase64,
        file_name: filename,
        contactName: recipientName || 'Cliente'
      });

      // Atualizar oportunidade se tiver ID
      if (opportunityId) {
        const opp = await base44.entities.Opportunity.filter({ id: opportunityId });
        if (opp[0]?.associated_properties) {
          const updated = opp[0].associated_properties.map(ap => ({
            ...ap,
            presented_date: new Date().toISOString(),
            status: 'visited'
          }));
          await base44.entities.Opportunity.update(opportunityId, { 
            associated_properties: updated 
          });
        }
      }

      toast.success('PDF enviado via WhatsApp!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error('Erro ao enviar WhatsApp: ' + (error.message || 'Erro desconhecido'));
    }
    setSendingWhatsApp(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gerador de PDF Profissional
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!previewUrl}>
              <Eye className="w-4 h-4 mr-2" />
              Pré-visualizar
            </TabsTrigger>
            <TabsTrigger value="send">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="config" className="mt-0 space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título da Proposta</Label>
                      <Input 
                        value={config.title}
                        onChange={(e) => updateConfig('title', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Cor da Marca
                      </Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color"
                          value={config.brandColor}
                          onChange={(e) => updateConfig('brandColor', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input 
                          value={config.brandColor}
                          onChange={(e) => updateConfig('brandColor', e.target.value)}
                          placeholder="#4cb5f5"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Logo (URL)
                    </Label>
                    <Input 
                      value={config.logoUrl}
                      onChange={(e) => updateConfig('logoUrl', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Mostrar Logo</Label>
                    <Switch 
                      checked={config.showLogo}
                      onCheckedChange={(checked) => updateConfig('showLogo', checked)}
                    />
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold text-sm">Secções a Incluir</h4>
                    
                    <div className="flex items-center justify-between">
                      <Label>Localização</Label>
                      <Switch 
                        checked={config.includeLocation}
                        onCheckedChange={(checked) => updateConfig('includeLocation', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Descrição</Label>
                      <Switch 
                        checked={config.includeDescription}
                        onCheckedChange={(checked) => updateConfig('includeDescription', checked)}
                      />
                    </div>

                    {config.includeDescription && (
                      <div className="space-y-2 ml-4">
                        <Label className="text-xs">Comprimento Máximo (caracteres)</Label>
                        <Input 
                          type="number"
                          value={config.maxDescriptionLength}
                          onChange={(e) => updateConfig('maxDescriptionLength', parseInt(e.target.value))}
                          min={100}
                          max={1000}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Label>Comodidades</Label>
                      <Switch 
                        checked={config.includeAmenities}
                        onCheckedChange={(checked) => updateConfig('includeAmenities', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Detalhes Adicionais</Label>
                      <Switch 
                        checked={config.includeDetails}
                        onCheckedChange={(checked) => updateConfig('includeDetails', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              {previewUrl ? (
                <div className="border rounded-lg overflow-hidden bg-slate-100">
                  <iframe 
                    src={previewUrl} 
                    className="w-full h-[600px]"
                    title="PDF Preview"
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Eye className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Gere a pré-visualização primeiro</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="send" className="mt-0 space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Destinatário</Label>
                    <Input 
                      type="email"
                      value={recipientEmail}
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Assunto do Email</Label>
                    <Input 
                      value={config.emailSubject}
                      onChange={(e) => updateConfig('emailSubject', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea 
                      value={config.emailMessage}
                      onChange={(e) => updateConfig('emailMessage', e.target.value)}
                      rows={8}
                      className="whitespace-pre-wrap"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-0 space-y-4">
              <Card className="bg-green-50">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Número de Telefone *</Label>
                    <Input 
                      type="tel"
                      value={config.whatsAppPhone}
                      onChange={(e) => updateConfig('whatsAppPhone', e.target.value)}
                      placeholder="+351 912 345 678"
                    />
                    <p className="text-xs text-slate-500">
                      Formato: +351 9XX XXX XXX ou 9XX XXX XXX
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem (opcional)</Label>
                    <Textarea 
                      value={config.whatsAppMessage}
                      onChange={(e) => updateConfig('whatsAppMessage', e.target.value)}
                      rows={6}
                      placeholder={`Olá! Segue a proposta com os imóveis selecionados...`}
                    />
                  </div>

                  <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-green-200">
                    ℹ️ O PDF será gerado automaticamente e enviado via WhatsApp Business
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <div className="border-t p-4 flex items-center justify-between bg-slate-50">
            <div className="text-sm text-slate-600">
              {properties.length} imóve{properties.length !== 1 ? 'is' : 'l'} selecionado{properties.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              {activeTab === 'config' && (
                <>
                  <Button 
                    variant="outline"
                    onClick={handlePreview}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Pré-visualizar
                  </Button>
                  <Button 
                    onClick={handleDownload}
                    disabled={generating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Descarregar
                  </Button>
                </>
              )}
              {activeTab === 'send' && (
                <Button 
                  onClick={handleSendEmail}
                  disabled={sending || !recipientEmail}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Enviar Email com PDF
                </Button>
              )}
              {activeTab === 'whatsapp' && (
                <Button 
                  onClick={handleSendWhatsApp}
                  disabled={sendingWhatsApp || !config.whatsAppPhone}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {sendingWhatsApp ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4 mr-2" />
                  )}
                  Enviar WhatsApp com PDF
                </Button>
              )}
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}