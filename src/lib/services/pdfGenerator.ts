import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtDate, formatPdfINR } from '../utils/formatters';

// Bookzee Brand Design Tokens for PDF
const PRIMARY_COLOR: [number, number, number] = [13, 92, 86]; // Forest Teal #0D5C56
const TEXT_DARK: [number, number, number] = [26, 43, 40]; // Deep Charcoal #1A2B28
const TEXT_MUTED: [number, number, number] = [92, 110, 107]; // Muted Sage #5C6E6B
const BORDER_COLOR: [number, number, number] = [216, 210, 197]; // Stone Linen #D8D2C5
const BG_WARM: [number, number, number] = [250, 249, 246]; // Warm Linen #FAF9F6
const BG_TEAL_TINT: [number, number, number] = [232, 243, 241]; // Teal Tint #E8F3F1
const SUCCESS_COLOR: [number, number, number] = [39, 103, 73]; // Forest Green #276749
const WARNING_COLOR: [number, number, number] = [183, 121, 31]; // Warm Ochre #B7791F
const ACCENT_COLOR: [number, number, number] = [196, 85, 50]; // Terracotta #C45532

export async function generateBookingInvoicePDF(
  booking: any,
  payments: any[],
  property: any,
  customer: any,
  businessSettings: any,
  totalPaid: number,
  balanceDue: number
) {
  const doc = new jsPDF();
  let yPos = 20;

  const invoicePrefix = businessSettings?.invoicePrefix || 'INV-';
  const cleanBookingNo = booking.booking_no?.replace(/^BK-/, '') || booking.booking_no;
  const invoiceNumber = `${invoicePrefix}${cleanBookingNo}`;

  // Header / Property Info
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(businessSettings?.name || property?.name || 'Bookzee Stays', 14, yPos);

  yPos += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);

  if (property?.name && property.name !== businessSettings?.name) {
    doc.text(property.name, 14, yPos);
    yPos += 5;
  }
  if (property?.address) {
    const splitAddress = doc.splitTextToSize(property.address, 95);
    doc.text(splitAddress, 14, yPos);
    yPos += 4.5 * splitAddress.length;
  }
  if (property?.city || property?.state || property?.pincode) {
    doc.text(
      `${property.city || ''} ${property.state || ''} ${property.pincode || ''}`.trim(),
      14,
      yPos
    );
    yPos += 4.5;
  }

  let contactStr = '';
  if (property?.phone) contactStr += property.phone;
  if (property?.phone && property?.email) contactStr += ' | ';
  if (property?.email) contactStr += property.email;
  if (contactStr) {
    doc.text(contactStr, 14, yPos);
    yPos += 4.5;
  }
  if (property?.gstin || businessSettings?.gstin) {
    doc.text(`GSTIN: ${property.gstin || businessSettings.gstin}`, 14, yPos);
    yPos += 4.5;
  }

  // Right side header (Invoice details)
  let rightY = 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('STAY FOLIO INVOICE', 196, rightY, { align: 'right' });

  rightY += 8;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Invoice Number', 196, rightY, { align: 'right' });
  rightY += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text(invoiceNumber, 196, rightY, { align: 'right' });

  rightY += 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Booking Ref', 196, rightY, { align: 'right' });
  rightY += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text(booking.booking_no, 196, rightY, { align: 'right' });

  rightY += 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Issue Date', 196, rightY, { align: 'right' });
  rightY += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text(fmtDate(booking.created_at || new Date().toISOString()), 196, rightY, { align: 'right' });

  rightY += 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Folio Status', 196, rightY, { align: 'right' });
  rightY += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  let statusText = 'UNPAID';
  if (balanceDue <= 0) {
    statusText = 'PAID IN FULL';
    doc.setTextColor(...SUCCESS_COLOR);
  } else if (totalPaid > 0) {
    statusText = 'PARTIALLY PAID';
    doc.setTextColor(...WARNING_COLOR);
  } else {
    doc.setTextColor(...ACCENT_COLOR);
  }

  doc.text(statusText, 196, rightY, { align: 'right' });
  doc.setTextColor(...TEXT_DARK);

  yPos = Math.max(yPos, rightY) + 10;

  // Divider
  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, yPos, 196, yPos);
  yPos += 8;

  // Billed To & Stay
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('GUEST DETAILS', 14, yPos);
  doc.text('STAY ITINERARY', 105, yPos);
  yPos += 5.5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  const guestName = customer?.name || 'Valued Guest';
  doc.text(guestName, 14, yPos);
  doc.text(`${fmtDate(booking.check_in)} to ${fmtDate(booking.check_out)}`, 105, yPos);

  yPos += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (customer?.phone) doc.text(customer.phone, 14, yPos);
  doc.text(
    `${booking.nights} night${booking.nights !== 1 ? 's' : ''}, ${booking.rooms} room${
      booking.rooms !== 1 ? 's' : ''
    } (${booking.guests || 2} guests)`,
    105,
    yPos
  );

  yPos += 4.5;
  if (customer?.email) doc.text(customer.email, 14, yPos);
  doc.text(`${booking.room_type || 'Standard'} Room`, 105, yPos);

  yPos += 10;

  // CHARGES TABLE
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('TARIFF & CHARGES BREAKDOWN', 14, yPos);
  yPos += 3.5;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Units & Nights', 'Total']],
    body: [
      [
        `Accommodation Charges — ${booking.room_type || 'Room'}\n${booking.rooms} room${
          booking.rooms > 1 ? 's' : ''
        } × ${booking.nights} night${booking.nights > 1 ? 's' : ''}`,
        `${booking.rooms} rm × ${booking.nights} nts`,
        formatPdfINR(booking.base_amount)
      ]
    ],
    theme: 'plain',
    headStyles: {
      fillColor: BG_TEAL_TINT,
      textColor: PRIMARY_COLOR,
      fontStyle: 'bold'
    },
    styles: { fontSize: 9.5, cellPadding: 4, textColor: TEXT_DARK },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // Totals Breakdown
  const summaryRows = [];
  summaryRows.push(['Base Tariff', formatPdfINR(booking.base_amount)]);
  const discountAmt = Number(booking.discount || 0);
  if (discountAmt > 0) {
    summaryRows.push(['Special Discount', `-${formatPdfINR(discountAmt)}`]);
  }
  if (booking.tax_enabled && booking.tax_amount > 0) {
    summaryRows.push([`Tax Assessment (${booking.tax_rate}%)`, formatPdfINR(booking.tax_amount)]);
  }

  autoTable(doc, {
    startY: yPos,
    body: summaryRows,
    theme: 'plain',
    styles: { fontSize: 9.5, halign: 'right', textColor: TEXT_MUTED },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 42 }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // Total Booking Amount
  doc.setDrawColor(...BORDER_COLOR);
  doc.line(100, yPos, 196, yPos);
  yPos += 5.5;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Grand Total Amount', 130, yPos);
  doc.text(formatPdfINR(booking.grand_total), 196, yPos, { align: 'right' });

  yPos += 12;

  // PAYMENT SUMMARY
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('PAYMENT & BALANCE POSITION', 14, yPos);
  yPos += 7;

  // Draw simple stats
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  doc.text('Grand Total', 14, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(formatPdfINR(booking.grand_total), 14, yPos + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.text('Net Paid', 74, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SUCCESS_COLOR);
  doc.text(formatPdfINR(totalPaid), 74, yPos + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text('Remaining Due', 134, yPos);
  doc.setFont('helvetica', 'bold');
  if (balanceDue > 0) doc.setTextColor(...ACCENT_COLOR);
  else doc.setTextColor(...SUCCESS_COLOR);
  doc.text(formatPdfINR(balanceDue), 134, yPos + 4.5);

  yPos += 14;

  // Progress Bar
  const barWidth = 182;
  const barHeight = 4.5;
  let percent = 0;
  if (booking.grand_total > 0) {
    percent = Math.min(100, Math.max(0, (totalPaid / booking.grand_total) * 100));
  }

  // Bar background
  doc.setFillColor(...BG_WARM);
  doc.rect(14, yPos, barWidth, barHeight, 'F');

  // Bar fill
  if (percent > 0) {
    if (percent >= 100) doc.setFillColor(...SUCCESS_COLOR);
    else doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(14, yPos, (barWidth * percent) / 100, barHeight, 'F');
  }

  yPos += 8.5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  if (percent >= 100) {
    doc.setTextColor(...SUCCESS_COLOR);
    doc.text('[SETTLED] FULLY PAID AND SETTLED', 14, yPos);
  } else if (percent > 0) {
    doc.setTextColor(...WARNING_COLOR);
    doc.text(`${percent.toFixed(0)}% PAID -- ${formatPdfINR(balanceDue)} OUTSTANDING`, 14, yPos);
  } else {
    doc.setTextColor(...ACCENT_COLOR);
    doc.text('UNPAID -- NO SETTLEMENT RECORDED', 14, yPos);
  }

  yPos += 12;

  // PAYMENT TIMELINE
  const validPayments = (payments || [])
    .filter((p) => p.status === 'Completed' || p.status === 'Recorded' || p.status === 'Refunded')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (validPayments.length > 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('TRANSACTION LEDGER', 14, yPos);
    yPos += 3.5;

    let cumulative = 0;
    const paymentRows = validPayments.map((p) => {
      const pAmt = p.status === 'Refunded' ? -p.amount : p.amount;
      cumulative += pAmt;
      const remaining = Math.max(0, booking.grand_total - cumulative);
      return [
        fmtDate(p.date),
        p.purpose || (p.status === 'Refunded' ? 'Refund adjustment' : 'Stay payment'),
        p.method,
        formatPdfINR(pAmt),
        formatPdfINR(cumulative),
        formatPdfINR(remaining)
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Purpose / Description', 'Mode', 'Amount', 'Total Paid', 'Balance']],
      body: paymentRows,
      theme: 'striped',
      headStyles: {
        fillColor: BG_TEAL_TINT,
        textColor: PRIMARY_COLOR,
        fontStyle: 'bold'
      },
      styles: { fontSize: 8.5, cellPadding: 3.5, textColor: TEXT_DARK },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // Footer on all pages
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const footY = pageHeight - 20;

    doc.setDrawColor(...BORDER_COLOR);
    doc.line(14, footY, 196, footY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Electronically recorded stay folio -- Bookzee Hospitality Workspace', 14, footY + 5);
    doc.text(`Page ${i} of ${pageCount}`, 196, footY + 5, { align: 'right' });

    if (property?.phone || property?.email) {
      doc.text(
        `Property Contact: ${property.phone || ''} ${property.email ? `| ${property.email}` : ''}`.trim(),
        14,
        footY + 10
      );
    }
  }

  return doc;
}

export async function generatePaymentReceiptPDF(
  booking: any,
  payment: any,
  property: any,
  customer: any,
  businessSettings: any,
  previouslyPaid: number,
  balanceDue: number
) {
  const doc = new jsPDF();
  let yPos = 20;

  // Differentiate Receipt Title based on financial position
  let receiptTitle = 'PAYMENT RECEIPT';
  if (previouslyPaid === 0 && balanceDue > 0) {
    receiptTitle = 'ADVANCE PAYMENT RECEIPT';
  } else if (previouslyPaid > 0 && balanceDue > 0) {
    receiptTitle = 'PARTIAL PAYMENT RECEIPT';
  } else if (balanceDue <= 0) {
    receiptTitle = 'FINAL SETTLEMENT RECEIPT';
  }

  // Header / Property
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(businessSettings?.name || property?.name || 'Bookzee Stays', 14, yPos);

  yPos += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);

  if (property?.name && property.name !== businessSettings?.name) {
    doc.text(property.name, 14, yPos);
    yPos += 5;
  }
  if (property?.address) {
    const splitAddress = doc.splitTextToSize(property.address, 95);
    doc.text(splitAddress, 14, yPos);
    yPos += 4.5 * splitAddress.length;
  }
  if (property?.city || property?.state || property?.pincode) {
    doc.text(
      `${property.city || ''} ${property.state || ''} ${property.pincode || ''}`.trim(),
      14,
      yPos
    );
    yPos += 4.5;
  }
  if (property?.phone || property?.email) {
    doc.text(`${property.phone || ''} ${property.email ? `| ${property.email}` : ''}`.trim(), 14, yPos);
    yPos += 4.5;
  }

  // Right side header (Receipt details)
  let rightY = 20;
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(receiptTitle, 196, rightY, { align: 'right' });

  rightY += 8;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Receipt Number', 196, rightY, { align: 'right' });
  rightY += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text(payment.payment_no, 196, rightY, { align: 'right' });

  rightY += 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Payment Date', 196, rightY, { align: 'right' });
  rightY += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text(fmtDate(payment.date), 196, rightY, { align: 'right' });

  rightY += 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Booking Ref', 196, rightY, { align: 'right' });
  rightY += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text(booking.booking_no, 196, rightY, { align: 'right' });

  yPos = Math.max(yPos, rightY) + 12;

  // Divider
  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, yPos, 196, yPos);
  yPos += 14;

  // BIG PAYMENT DISPLAY
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('AMOUNT RECEIVED', 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SUCCESS_COLOR);
  doc.text(formatPdfINR(payment.amount), 105, yPos, { align: 'center' });
  yPos += 7.5;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    `Received via ${payment.method}${payment.ref_id ? ` (Txn / UTR: ${payment.ref_id})` : ''}`,
    105,
    yPos,
    { align: 'center' }
  );

  yPos += 18;

  // Received From & Booking Info
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('RECEIVED FROM', 14, yPos);
  doc.text('RESERVATION DETAILS', 105, yPos);
  yPos += 5.5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text(customer?.name || 'Valued Guest', 14, yPos);
  doc.text(property?.name || 'Property', 105, yPos);

  yPos += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (customer?.phone) doc.text(customer.phone, 14, yPos);
  doc.text(`${fmtDate(booking.check_in)} to ${fmtDate(booking.check_out)}`, 105, yPos);

  yPos += 4.5;
  if (customer?.email) doc.text(customer.email, 14, yPos);
  doc.text(`${booking.nights} night${booking.nights !== 1 ? 's' : ''} -- ${booking.room_type || 'Standard'}`, 105, yPos);

  yPos += 14;

  // Settlement Breakdown Table
  const totalSettled = previouslyPaid + payment.amount;
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Reservation Tariff Total', formatPdfINR(booking.grand_total)],
      ['Previously Settled Amount', formatPdfINR(previouslyPaid)],
      ['Current Transaction Amount', formatPdfINR(payment.amount)],
      ['Cumulative Total Paid', formatPdfINR(totalSettled)],
      ['Outstanding Balance Due', formatPdfINR(Math.max(0, balanceDue))]
    ],
    theme: 'plain',
    headStyles: {
      fillColor: BG_TEAL_TINT,
      textColor: PRIMARY_COLOR,
      fontStyle: 'bold'
    },
    styles: { fontSize: 9.5, cellPadding: 4, textColor: TEXT_DARK },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // Balance status note
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  if (balanceDue <= 0) {
    doc.setTextColor(...SUCCESS_COLOR);
    doc.text('[SETTLED] Booking is fully paid and settled in full.', 14, yPos);
  } else {
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`[BALANCE DUE] ${formatPdfINR(balanceDue)} remains outstanding on this reservation.`, 14, yPos);
  }

  // Footer on receipt
  const pageHeight = doc.internal.pageSize.getHeight();
  const footY = pageHeight - 20;

  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, footY, 196, footY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Payment acknowledgment recorded in Bookzee Hospitality Workspace', 14, footY + 5);
  doc.text('Page 1 of 1', 196, footY + 5, { align: 'right' });

  return doc;
}
