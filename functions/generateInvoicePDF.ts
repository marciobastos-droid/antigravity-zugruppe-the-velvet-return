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
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Período:', 20, y);
      doc.setFont('helvetica', 'normal');
      let periodText = '';
      if (filters.periodFilter === 'year') periodText = `Ano ${filters.selectedYear}`;
      else if (filters.periodFilter === 'quarter') periodText = `${filters.selectedQuarter}º Trimestre de ${filters.selectedYear}`;
      else if (filters.periodFilter === 'month') periodText = `${filters.selectedMonth}/${filters.selectedYear}`;
      doc.text(periodText, 50, y);
      y += 10;
    }

    // Summary section
    if (invoices_data?.summary) {
      const summary = invoices_data.summary;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Financeiro', 20, y);
      y += 8;

      // Draw summary box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, y, pageWidth - 40, 45, 3, 3, 'FD');
      y += 8;

      doc.setFontSize(10);
      const col1 = 30;
      const col2 = 75;
      const col3 = 120;
      const col4 = 165;

      doc.setFont('helvetica', 'normal');
      doc.text('Total Faturado:', col1, y);
      doc.text('Total Recebido:', col2, y);
      doc.text('Pendente:', col3, y);
      doc.text('Vencido:', col4, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`€${summary.totalFaturado?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0.00'}`, col1, y);
      doc.setTextColor(16, 185, 129);
      doc.text(`€${summary.totalRecebido?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0.00'}`, col2, y);
      doc.setTextColor(245, 158, 11);
      doc.text(`€${summary.totalPendente?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0.00'}`, col3, y);
      doc.setTextColor(239, 68, 68);
      doc.text(`€${summary.totalVencido?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0.00'}`, col4, y);
      doc.setTextColor(0, 0, 0);
      y += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${summary.totalInvoices || 0} faturas | Taxa de cobrança: ${summary.collectionRate || 0}%`, col1, y);
      if (summary.growthRate !== null && summary.growthRate !== undefined) {
        doc.text(`Crescimento: ${summary.growthRate > 0 ? '+' : ''}${summary.growthRate}%`, col3, y);
      }
      y += 25;
    }

    // Invoices list
    if (invoices_data?.invoices && invoices_data.invoices.length > 0) {
      checkNewPage(50);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Lista de Faturas', 20, y);
      y += 10;

      // Table header
      doc.setFillColor(241, 245, 249);
      doc.rect(20, y - 5, pageWidth - 40, 8, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Nº Fatura', 22, y);
      doc.text('Cliente', 55, y);
      doc.text('Data', 110, y);
      doc.text('Estado', 135, y);
      doc.text('Valor', 165, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      for (const invoice of invoices_data.invoices) {
        checkNewPage(10);

        // Alternate row colors
        if (invoices_data.invoices.indexOf(invoice) % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(20, y - 4, pageWidth - 40, 7, 'F');
        }

        doc.text(invoice.invoice_number || '-', 22, y);
        doc.text((invoice.recipient_name || '-').substring(0, 25), 55, y);
        doc.text(invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('pt-PT') : '-', 110, y);
        
        // Status with color
        const statusLabels = {
          draft: 'Rascunho',
          pending: 'Pendente',
          sent: 'Enviada',
          paid: 'Paga',
          overdue: 'Vencida',
          cancelled: 'Cancelada'
        };
        doc.text(statusLabels[invoice.status] || invoice.status || '-', 135, y);
        
        doc.text(`€${invoice.total_amount?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0.00'}`, 165, y);
        y += 7;
      }

      y += 10;
    }

    // Monthly breakdown
    if (invoices_data?.monthlyData && invoices_data.monthlyData.length > 0) {
      checkNewPage(60);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Evolução Mensal', 20, y);
      y += 10;

      // Table header
      doc.setFillColor(241, 245, 249);
      doc.rect(20, y - 5, pageWidth - 40, 8, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Mês', 25, y);
      doc.text('Faturado', 60, y);
      doc.text('Recebido', 100, y);
      doc.text('Pendente', 140, y);
      doc.text('Nº Faturas', 170, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      for (const month of invoices_data.monthlyData) {
        checkNewPage(8);
        
        doc.text(month.monthFull || month.month, 25, y);
        doc.text(`€${month.faturado?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0.00'}`, 60, y);
        doc.text(`€${month.recebido?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0.00'}`, 100, y);
        doc.text(`€${month.pendente?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0.00'}`, 140, y);
        doc.text(String(month.count || 0), 175, y);
        y += 6;
      }

      y += 10;
    }

    // Top clients
    if (invoices_data?.topClients && invoices_data.topClients.length > 0) {
      checkNewPage(50);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Clientes', 20, y);
      y += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('#', 25, y);
      doc.text('Cliente', 35, y);
      doc.text('Nº Faturas', 120, y);
      doc.text('Total', 160, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      invoices_data.topClients.forEach((client, idx) => {
        checkNewPage(8);
        doc.text(String(idx + 1), 25, y);
        doc.text((client.name || '-').substring(0, 40), 35, y);
        doc.text(String(client.count || 0), 125, y);
        doc.text(`€${client.total?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0.00'}`, 160, y);
        y += 6;
      });

      y += 10;
    }

    // By type breakdown
    if (invoices_data?.byType && invoices_data.byType.length > 0) {
      checkNewPage(40);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Por Tipo de Fatura', 20, y);
      y += 10;

      doc.setFontSize(9);
      for (const type of invoices_data.byType) {
        doc.setFont('helvetica', 'bold');
        doc.text(type.name, 25, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${type.count} faturas - €${type.value?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0.00'}`, 80, y);
        y += 6;
      }
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text('Zugruppe - Gestão de Faturas', 20, pageHeight - 10);
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