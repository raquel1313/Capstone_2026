import {
  buildReceipt,
  formatCLP,
  formatReceiptDate,
  receiptFileName,
} from '@/utils/receipt';
import type { Order } from '@/types';

/**
 * Genera el comprobante como PDF estructurado (texto, no una captura).
 * jsPDF se carga solo al descargar para no pesar en el resto de la app.
 */
export async function buildReceiptPdf(order: Order) {
  const { jsPDF } = await import('jspdf');
  const receipt = buildReceipt(order);

  // Ticket angosto (80 mm) con alto según la cantidad de productos.
  const width = 80;
  const margin = 6;
  const right = width - margin;
  const height = Math.max(110, 95 + receipt.lines.length * 9);
  const doc = new jsPDF({ unit: 'mm', format: [width, height] });

  let y = 12;
  const line = () => {
    doc.setDrawColor(150);
    doc.line(margin, y, right, y);
    y += 5;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CAMPUSFOOD', width / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(11);
  doc.text(`Pedido: ${receipt.code}`, margin, y);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Fecha: ${formatReceiptDate(receipt.createdAt)}`, margin, y);
  y += 5;
  doc.text(receipt.customerName, margin, y, { maxWidth: right - margin });
  y += 6;

  line();
  doc.setFont('helvetica', 'bold');
  doc.text('Producto', margin, y);
  doc.text('Cant.', 46, y, { align: 'right' });
  doc.text('Subtotal', right, y, { align: 'right' });
  y += 2;
  line();

  doc.setFont('helvetica', 'normal');

  for (const item of receipt.lines) {
    const nameLines = doc.splitTextToSize(item.name, 34) as string[];

    doc.text(nameLines, margin, y);
    doc.text(String(item.quantity), 46, y, { align: 'right' });
    doc.text(formatCLP(item.subtotal), right, y, { align: 'right' });
    y += nameLines.length * 4;

    if (item.quantity > 1) {
      doc.setFontSize(7.5);
      doc.setTextColor(110);
      doc.text(`${formatCLP(item.unitPrice)} c/u`, margin, y);
      doc.setTextColor(0);
      doc.setFontSize(9);
      y += 3.5;
    }

    y += 1.5;
  }

  y += 1;
  line();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL', margin, y);
  doc.text(formatCLP(receipt.total), right, y, { align: 'right' });
  y += 8;

  doc.setFontSize(9);
  doc.text(`Estado: ${receipt.statusLabel}`, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Pago: ${receipt.paymentStatusLabel}`, margin, y);
  y += 5;

  if (receipt.paymentMethodLabel) {
    doc.text(`Método: ${receipt.paymentMethodLabel}`, margin, y);
    y += 5;
  }

  if (receipt.paymentDate) {
    doc.text(`Fecha de pago: ${formatReceiptDate(receipt.paymentDate)}`, margin, y);
  }

  return { doc, fileName: receiptFileName(receipt.code) };
}

export async function downloadReceiptPdf(order: Order): Promise<void> {
  const { doc, fileName } = await buildReceiptPdf(order);

  doc.save(fileName);
}
