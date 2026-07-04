import { jsPDF } from "jspdf";

export interface ReceiptItem {
  name: string;
  qty?: number;
  price: number;
}

export interface ReceiptData {
  brand?: string;
  receiptNo: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  items: ReceiptItem[];
  subtotal?: number;
  discount?: number;
  shipping?: number;
  total: number;
  paymentMethod?: string;
  notes?: string;
}

export function downloadReceiptPdf(data: ReceiptData) {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(data.brand ?? "Yess Service", w / 2, y, { align: "center" });
  y += 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Official Receipt", w / 2, y, { align: "center" });
  y += 20;

  doc.setDrawColor(200);
  doc.line(30, y, w - 30, y);
  y += 16;

  doc.setFontSize(9);
  doc.text(`Receipt #: ${data.receiptNo}`, 30, y);
  doc.text(`Date: ${data.date}`, w - 30, y, { align: "right" });
  y += 14;
  if (data.customerName) { doc.text(`Customer: ${data.customerName}`, 30, y); y += 12; }
  if (data.customerPhone) { doc.text(`Phone: ${data.customerPhone}`, 30, y); y += 12; }
  if (data.address) {
    const lines = doc.splitTextToSize(`Address: ${data.address}`, w - 60);
    doc.text(lines, 30, y); y += lines.length * 12;
  }

  y += 6;
  doc.line(30, y, w - 30, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Item", 30, y);
  doc.text("Qty", w - 130, y, { align: "right" });
  doc.text("Price", w - 30, y, { align: "right" });
  y += 10;
  doc.line(30, y, w - 30, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  data.items.forEach((it) => {
    const name = doc.splitTextToSize(it.name, w - 180);
    doc.text(name, 30, y);
    doc.text(String(it.qty ?? 1), w - 130, y, { align: "right" });
    doc.text(`BDT ${it.price.toFixed(2)}`, w - 30, y, { align: "right" });
    y += Math.max(12, name.length * 12);
  });

  y += 4;
  doc.line(30, y, w - 30, y);
  y += 14;

  const row = (label: string, val?: number, bold = false) => {
    if (val === undefined) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, w - 130, y, { align: "right" });
    doc.text(`BDT ${val.toFixed(2)}`, w - 30, y, { align: "right" });
    y += 14;
  };
  row("Subtotal", data.subtotal);
  row("Discount", data.discount);
  row("Shipping", data.shipping);
  doc.setDrawColor(150);
  doc.line(w - 180, y - 6, w - 30, y - 6);
  row("Total", data.total, true);

  if (data.paymentMethod) {
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Payment: ${data.paymentMethod}`, 30, y);
    y += 14;
  }
  if (data.notes) {
    const lines = doc.splitTextToSize(data.notes, w - 60);
    doc.text(lines, 30, y); y += lines.length * 12;
  }

  y += 16;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Thank you for choosing Yess Service!", w / 2, y, { align: "center" });

  doc.save(`receipt-${data.receiptNo}.pdf`);
}