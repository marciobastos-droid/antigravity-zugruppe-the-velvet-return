import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

// Helper to sanitize text for PDF (remove problematic characters)
const sanitizeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/[^\x00-\x7F]/g, (char) => {
      const replacements = {
        'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c', 'ñ': 'n',
        'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
        'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
        'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'Ç': 'C', 'Ñ': 'N',
        '€': 'EUR', '£': 'GBP', '°': 'o', '²': '2', '³': '3',
        '–': '-', '—': '-', ''': "'", ''': "'", '"': '"', '"': '"',
        '…': '...', '•': '-', '·': '-'
      };
      return replacements[char] || '';
    });
};

// Format currency without special characters
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0.00 EUR';
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_type, filters, invoices_data, title } = await req.json();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 20;

    // Helper function to add new page if needed
    const checkNewPage = (neededSpace = 30) => {
      if (y + neededSpace > pageHeight - 25) {
        doc.addPage();
        y = 25;
        return true;
      }
      return false;
    };

    // Draw header background
    doc.setFillColor(39, 37, 31); // Dark header
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(sanitizeText(title || 'Relatorio Financeiro'), pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('pt-PT');
    const timeStr = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Gerado em: ${dateStr} as ${timeStr}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Por: ${sanitizeText(user.full_name || user.email)}`, pageWidth / 2, 35, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    y = 50;

    // Period info if filters provided
    if (filters) {
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Periodo:', margin + 5, y + 8);
      doc.setFont('helvetica', 'normal');
      let periodText = '';
      if (filters.periodFilter === 'year') periodText = `Ano ${filters.selectedYear}`;
      else if (filters.periodFilter === 'quarter') periodText = `${filters.selectedQuarter}o Trimestre de ${filters.selectedYear}`;
      else if (filters.periodFilter === 'month') periodText = `${filters.selectedMonth}/${filters.selectedYear}`;
      doc.text(periodText, margin + 35, y + 8);
      y += 20;
    }

    // Summary section
    if (invoices_data?.summary) {
      const summary = invoices_data.summary;
      
      // Section title with accent bar
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, y, 4, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Financeiro', margin + 8, y + 8);
      y += 18;

      // Summary cards - 4 columns
      const cardWidth = (pageWidth - margin * 2 - 15) / 4;
      const cardHeight = 35;
      const cardColors = [
        { bg: [219, 234, 254], border: [59, 130, 246], text: [30, 64, 175] },   // Blue
        { bg: [209, 250, 229], border: [16, 185, 129], text: [6, 95, 70] },     // Green
        { bg: [254, 243, 199], border: [245, 158, 11], text: [146, 64, 14] },   // Amber
        { bg: [254, 226, 226], border: [239, 68, 68], text: [153, 27, 27] }     // Red
      ];

      const summaryItems = [
        { label: 'Total Faturado', value: summary.totalFaturado },
        { label: 'Total Recebido', value: summary.totalRecebido },
        { label: 'Pendente', value: summary.totalPendente },
        { label: 'Vencido', value: summary.totalVencido }
      ];

      summaryItems.forEach((item, idx) => {
        const x = margin + idx * (cardWidth + 5);
        const color = cardColors[idx];
        
        // Card background
        doc.setFillColor(...color.bg);
        doc.setDrawColor(...color.border);
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');
        
        // Label
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...color.text);
        doc.text(item.label, x + cardWidth / 2, y + 10, { align: 'center' });
        
        // Value
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(item.value), x + cardWidth / 2, y + 22, { align: 'center' });
      });

      doc.setTextColor(0, 0, 0);
      y += cardHeight + 10;

      // Stats row
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total: ${summary.totalInvoices || 0} faturas`, margin + 10, y + 9);
      doc.text(`Taxa de cobranca: ${summary.collectionRate || 0}%`, margin + 70, y + 9);
      if (summary.growthRate !== null && summary.growthRate !== undefined) {
        const growthText = `Crescimento: ${summary.growthRate > 0 ? '+' : ''}${summary.growthRate}%`;
        doc.text(growthText, pageWidth - margin - 50, y + 9);
      }
      y += 22;
    }

    // Invoices list
    if (invoices_data?.invoices && invoices_data.invoices.length > 0) {
      checkNewPage(50);
      
      // Section title with accent bar
      doc.setFillColor(16, 185, 129);
      doc.rect(margin, y, 4, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Lista de Faturas', margin + 8, y + 8);
      y += 16;

      // Table header
      doc.setFillColor(39, 37, 31);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('No Fatura', margin + 3, y + 1);
      doc.text('Cliente', margin + 35, y + 1);
      doc.text('Data', margin + 95, y + 1);
      doc.text('Estado', margin + 125, y + 1);
      doc.text('Valor', margin + 155, y + 1);
      doc.setTextColor(0, 0, 0);
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      const statusLabels = {
        draft: 'Rascunho',
        pending: 'Pendente',
        sent: 'Enviada',
        paid: 'Paga',
        overdue: 'Vencida',
        cancelled: 'Cancelada'
      };

      for (let i = 0; i < invoices_data.invoices.length; i++) {
        const invoice = invoices_data.invoices[i];
        checkNewPage(10);

        // Alternate row colors
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
        }

        doc.text(sanitizeText(invoice.invoice_number || '-'), margin + 3, y);
        doc.text(sanitizeText((invoice.recipient_name || '-').substring(0, 28)), margin + 35, y);
        doc.text(invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('pt-PT') : '-', margin + 95, y);
        
        // Status
        const status = statusLabels[invoice.status] || invoice.status || '-';
        doc.text(status, margin + 125, y);
        
        doc.text(formatCurrency(invoice.total_amount), margin + 155, y);
        y += 8;
      }

      y += 8;
    }

    // Monthly breakdown
    if (invoices_data?.monthlyData && invoices_data.monthlyData.length > 0) {
      checkNewPage(60);
      
      // Section title with accent bar
      doc.setFillColor(139, 92, 246);
      doc.rect(margin, y, 4, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Evolucao Mensal', margin + 8, y + 8);
      y += 16;

      // Table header
      doc.setFillColor(39, 37, 31);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Mes', margin + 5, y + 1);
      doc.text('Faturado', margin + 40, y + 1);
      doc.text('Recebido', margin + 80, y + 1);
      doc.text('Pendente', margin + 120, y + 1);
      doc.text('Faturas', margin + 160, y + 1);
      doc.setTextColor(0, 0, 0);
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      for (let i = 0; i < invoices_data.monthlyData.length; i++) {
        const month = invoices_data.monthlyData[i];
        checkNewPage(8);
        
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
        }
        
        const monthName = sanitizeText(month.monthFull || monthNames[i] || month.month);
        doc.text(monthName, margin + 5, y);
        doc.text(formatCurrency(month.faturado), margin + 40, y);
        doc.text(formatCurrency(month.recebido), margin + 80, y);
        doc.text(formatCurrency(month.pendente), margin + 120, y);
        doc.text(String(month.count || 0), margin + 165, y);
        y += 8;
      }

      y += 8;
    }

    // Top clients
    if (invoices_data?.topClients && invoices_data.topClients.length > 0) {
      checkNewPage(50);
      
      // Section title with accent bar
      doc.setFillColor(245, 158, 11);
      doc.rect(margin, y, 4, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Clientes', margin + 8, y + 8);
      y += 16;

      // Table header
      doc.setFillColor(39, 37, 31);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('#', margin + 5, y + 1);
      doc.text('Cliente', margin + 15, y + 1);
      doc.text('Faturas', margin + 110, y + 1);
      doc.text('Total', margin + 140, y + 1);
      doc.setTextColor(0, 0, 0);
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      invoices_data.topClients.forEach((client, idx) => {
        checkNewPage(8);
        
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(String(idx + 1), margin + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeText((client.name || '-').substring(0, 45)), margin + 15, y);
        doc.text(String(client.count || 0), margin + 115, y);
        doc.text(formatCurrency(client.total), margin + 140, y);
        y += 8;
      });

      y += 8;
    }

    // By type breakdown
    if (invoices_data?.byType && invoices_data.byType.length > 0) {
      checkNewPage(40);
      
      // Section title with accent bar
      doc.setFillColor(236, 72, 153);
      doc.rect(margin, y, 4, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Por Tipo de Fatura', margin + 8, y + 8);
      y += 16;

      doc.setFontSize(9);
      for (const type of invoices_data.byType) {
        if (type.count > 0) {
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 12, 2, 2, 'F');
          
          doc.setFont('helvetica', 'bold');
          doc.text(sanitizeText(type.name), margin + 5, y + 3);
          doc.setFont('helvetica', 'normal');
          doc.text(`${type.count} faturas`, margin + 80, y + 3);
          doc.setFont('helvetica', 'bold');
          doc.text(formatCurrency(type.value), margin + 130, y + 3);
          y += 14;
        }
      }
    }

    // Footer on all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
      
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Pagina ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text('Zugruppe - Gestao de Faturas', margin, pageHeight - 10);
      doc.text(new Date().toLocaleDateString('pt-PT'), pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=relatorio_faturas_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});