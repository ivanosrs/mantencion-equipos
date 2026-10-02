import type { SupabaseClient } from '@supabase/supabase-js';
import type { OtDocument, OtField } from '@/lib/ot-document';

/**
 * PDF de la Orden de Trabajo en formato carta, con encabezado azul marino,
 * franja de datos clave y secciones con titulo subrayado.
 *
 * jsPDF trabaja en milimetros, asi que todas las medidas estan en mm.
 * Las fuentes estandar de jsPDF no incluyen el guion largo (—): se usa "-".
 */
const MARGIN = 14;
const GAP = 5.3;
const COL_GAP = 6.35;
const HEADER_HEIGHT = 40;
const ACCENT_HEIGHT = 1.4;
const FOOTER_SPACE = 18;
const LINE = 5.2;
const BOX = 3.2;
const LABEL_WIDTH = 31;
const EMPTY = '-';

const NAVY: RGB = [11, 37, 69];
const ACCENT: RGB = [63, 127, 196];
const INK: RGB = [19, 35, 58];
const MUTED: RGB = [77, 100, 128];
const FAINT: RGB = [138, 155, 176];
const BORDER: RGB = [201, 213, 227];
const HEAD_BG: RGB = [238, 243, 249];
const EYEBROW: RGB = [156, 195, 234];
const SUBTITLE: RGB = [214, 228, 243];

type RGB = [number, number, number];
type Doc = import('jspdf').jsPDF;
type AutoTableFn = (doc: Doc, options: Record<string, unknown>) => void;

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

async function loadPdfDeps(): Promise<{ jsPDF: typeof import('jspdf').jsPDF; autoTable: AutoTableFn }> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  return { jsPDF, autoTable: autoTable as unknown as AutoTableFn };
}

function setText(doc: Doc, size: number, style: 'normal' | 'bold' | 'italic', color: RGB, font = 'helvetica') {
  doc.setFont(font, style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

/** Etiqueta en mayusculas con espaciado, como los rotulos del diseño. */
function caps(doc: Doc, text: string, x: number, y: number, size: number, color: RGB) {
  setText(doc, size, 'bold', color);
  doc.text(text.toUpperCase(), x, y, { charSpace: 0.35 });
}

/** Titulo de seccion subrayado con una linea azul marino. Devuelve la `y` del contenido. */
function sectionTitle(doc: Doc, title: string, x: number, y: number, width: number): number {
  caps(doc, title, x, y + 3.2, 9, NAVY);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.53);
  doc.line(x, y + 5, x + width, y + 5);

  return y + 5 + 5.5;
}

/** Helvetica no incluye los glifos U+2611/U+2610, asi que la casilla se dibuja a mano. */
function drawCheckbox(doc: Doc, x: number, top: number, checked: boolean) {
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, top, BOX, BOX, 0.5, 0.5, 'S');

  if (!checked) return;

  // En jsPDF el eje Y crece hacia abajo: el vertice del check va abajo y el
  // trazo largo sube hacia la esquina superior derecha.
  doc.setLineWidth(0.5);
  doc.line(x + 0.6, top + BOX / 2, x + 1.3, top + BOX - 0.7);
  doc.line(x + 1.3, top + BOX - 0.7, x + BOX - 0.55, top + 0.65);
}

/** Pares etiqueta/valor en dos columnas. Devuelve la `y` final. */
function labelValueGrid(
  doc: Doc,
  rows: { label: string; value: string; bold?: boolean }[],
  x: number,
  y: number,
  width: number
): number {
  for (const row of rows) {
    setText(doc, 10, row.bold ? 'bold' : 'normal', INK);
    const lines = doc.splitTextToSize(row.value || EMPTY, width - LABEL_WIDTH - 2.6) as string[];

    setText(doc, 10, 'normal', MUTED);
    doc.text(row.label, x, y);

    setText(doc, 10, row.bold ? 'bold' : 'normal', INK);
    doc.text(lines, x + LABEL_WIDTH + 2.6, y);

    y += lines.length * LINE + 1.3;
  }

  return y;
}

function loadImage(url: string): Promise<LoadedImage | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.width, height: img.height });
      } catch {
        // El canvas puede quedar "tainted" si el servidor no envia CORS.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function resolveSignature(supabase: SupabaseClient, path: string | null): Promise<LoadedImage | null> {
  if (!path) return null;

  const { data } = await supabase.storage.from('signatures').createSignedUrl(path, 60);

  if (!data?.signedUrl) return null;

  return loadImage(data.signedUrl);
}

function drawHeader(doc: Doc, ot: OtDocument, logo: LoadedImage | null) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');
  doc.setFillColor(...ACCENT);
  doc.rect(0, HEADER_HEIGHT, pageWidth, ACCENT_HEIGHT, 'F');

  let textX = MARGIN;

  if (logo) {
    const logoHeight = 20;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    doc.addImage(logo.dataUrl, 'PNG', MARGIN, (HEADER_HEIGHT - logoHeight) / 2, logoWidth, logoHeight, undefined, 'FAST');
    textX = MARGIN + logoWidth + 6;
  }

  caps(doc, 'MJ Grupo Lab · Servicio técnico', textX, 14.5, 8.5, EYEBROW);

  setText(doc, 26, 'bold', [255, 255, 255]);
  doc.text(ot.title, textX, 25);

  setText(doc, 10.5, 'normal', SUBTITLE);
  doc.text(`${ot.equipment.type} - ${ot.equipment.serial_number}`, textX, 31.5);

  setText(doc, 8, 'bold', EYEBROW);
  doc.text('N° OT', pageWidth - MARGIN, 14.5, { align: 'right' });

  setText(doc, 24, 'normal', [255, 255, 255], 'courier');
  doc.text(ot.otNumber, pageWidth - MARGIN, 26, { align: 'right' });
}

function drawFooters(doc: Doc, ot: OtDocument) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.26);
    doc.line(MARGIN, pageHeight - 14, pageWidth - MARGIN, pageHeight - 14);

    setText(doc, 8, 'bold', NAVY);
    doc.text('MJ Grupo Lab', MARGIN, pageHeight - 9);

    setText(doc, 8, 'normal', MUTED, 'courier');
    doc.text(`OT ${ot.otNumber} · Página ${page} de ${total}`, pageWidth - MARGIN, pageHeight - 9, { align: 'right' });
  }
}

export async function buildWorkOrderPdf(supabase: SupabaseClient, ot: OtDocument): Promise<Doc> {
  const { jsPDF, autoTable } = await loadPdfDeps();
  const doc = new jsPDF({ format: 'letter' });
  // Interlineado del diseño (1.45): a 10pt equivale a LINE en mm.
  doc.setLineHeightFactor(1.45);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const colWidth = (contentWidth - COL_GAP) / 2;
  const rightX = MARGIN + colWidth + COL_GAP;

  const checklist = ot.sections.find((section) => section.kind === 'checklist');
  const partsSection = ot.sections.find((section) => section.kind === 'parts');
  const conformity = ot.sections.find((section) => section.kind === 'conformity');
  const attachment = ot.sections.find((section) => section.kind === 'attachment');

  const fields: OtField[] = ot.sections.flatMap((section) =>
    section.kind === 'fields' || section.kind === 'conformity' ? section.fields : []
  );
  const field = (label: string) => fields.find((item) => item.label === label)?.value || '';

  const [logo, signature] = await Promise.all([
    loadImage('/logo-v2.png'),
    resolveSignature(supabase, conformity?.kind === 'conformity' ? conformity.signaturePath : null),
  ]);

  const ensureSpace = (y: number, needed: number) => {
    if (y + needed <= pageHeight - FOOTER_SPACE) return y;
    doc.addPage();
    return MARGIN + 4;
  };

  drawHeader(doc, ot, logo);
  let y = HEADER_HEIGHT + ACCENT_HEIGHT + 8;

  // Franja con los tres datos clave de la orden.
  const stripHeight = 14;
  const cellWidth = contentWidth / 3;
  const keyFacts = [
    { label: 'Fecha de intervención', value: field('Fecha de Intervención') },
    { label: 'Tipo de servicio', value: field('Tipo de Servicio') },
    { label: 'Técnico', value: ot.technicianName },
  ];

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.26);
  doc.roundedRect(MARGIN, y, contentWidth, stripHeight, 1, 1, 'S');

  keyFacts.forEach((fact, index) => {
    const cellX = MARGIN + cellWidth * index;
    if (index > 0) doc.line(cellX, y, cellX, y + stripHeight);

    caps(doc, fact.label, cellX + 3.7, y + 5, 7, MUTED);
    setText(doc, 10.5, 'bold', INK);
    const value = (doc.splitTextToSize(fact.value || EMPTY, cellWidth - 7.4) as string[])[0];
    doc.text(value, cellX + 3.7, y + 10.5);
  });

  y += stripHeight + GAP;

  // Cliente y descripcion del problema, lado a lado.
  setText(doc, 10, 'normal', INK);
  const problemLines = doc.splitTextToSize(field('Descripción del Problema') || EMPTY, colWidth) as string[];
  y = ensureSpace(y, 10.5 + Math.max(3 * (LINE + 1.3), problemLines.length * LINE));

  const leftStart = sectionTitle(doc, 'Información del cliente', MARGIN, y, colWidth);
  const leftEnd = labelValueGrid(
    doc,
    [
      { label: 'Nombre / Empresa', value: field('Nombre/Empresa Cliente'), bold: true },
      { label: 'Teléfono', value: field('Teléfono') },
      { label: 'Dirección', value: field('Dirección') },
    ],
    MARGIN,
    leftStart,
    colWidth
  );

  const rightStart = sectionTitle(doc, 'Descripción del problema', rightX, y, colWidth);
  setText(doc, 10, 'normal', INK);
  doc.text(problemLines, rightX, rightStart);
  const rightEnd = rightStart + problemLines.length * LINE;

  y = Math.max(leftEnd, rightEnd) + GAP;

  // Acciones ejecutadas en dos columnas.
  if (checklist?.kind === 'checklist') {
    const rows = Math.ceil(checklist.items.length / 2);
    y = ensureSpace(y, 10.5 + rows * 6.8);
    y = sectionTitle(doc, 'Acciones ejecutadas', MARGIN, y, contentWidth);

    checklist.items.forEach((item, index) => {
      const itemX = index % 2 === 0 ? MARGIN : rightX;
      const itemY = y + Math.floor(index / 2) * 6.8;

      drawCheckbox(doc, itemX, itemY - 2.7, item.checked);
      setText(doc, 10, 'normal', INK);
      doc.text(item.label, itemX + BOX + 2.6, itemY);
    });

    y += rows * 6.8 + GAP - 2;
  }

  // Repuestos / insumos.
  if (partsSection?.kind === 'parts') {
    y = ensureSpace(y, 30);
    y = sectionTitle(doc, 'Repuestos / insumos utilizados', MARGIN, y, contentWidth) - 3;

    const body =
      partsSection.parts.length === 0
        ? [[{ content: 'Sin repuestos registrados', colSpan: 3, styles: { fontStyle: 'italic', textColor: MUTED } }]]
        : partsSection.parts.map((part) => [
            part.observations ? `${part.description}\nObs.: ${part.observations}` : part.description,
            String(part.quantity),
            part.code || EMPTY,
          ]);

    autoTable(doc, {
      startY: y,
      theme: 'plain',
      head: [['DESCRIPCIÓN', 'CANTIDAD', 'CÓDIGO']],
      body,
      styles: {
        font: 'helvetica',
        fontSize: 10,
        textColor: INK,
        cellPadding: { top: 2.4, bottom: 2.4, left: 2.6, right: 2.6 },
        lineColor: BORDER,
        lineWidth: { bottom: 0.26 },
      },
      headStyles: { fillColor: HEAD_BG, textColor: MUTED, fontSize: 7.5, fontStyle: 'bold', lineWidth: 0 },
      columnStyles: {
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 32, halign: 'right', font: 'courier' },
      },
      didParseCell: (data: { section: string; column: { index: number }; cell: { styles: Record<string, unknown> } }) => {
        if (data.section === 'head' && data.column.index > 0) data.cell.styles.halign = 'right';
      },
      margin: { left: MARGIN, right: MARGIN, top: MARGIN + 4, bottom: FOOTER_SPACE },
    });

    const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    y = (last?.finalY ?? y) + GAP;
  }

  // Conformidad del cliente y firma.
  if (conformity?.kind === 'conformity') {
    const signatureBox = signature ? 22 : 14.3;
    y = ensureSpace(y, 10.5 + signatureBox + 6);
    const start = sectionTitle(doc, 'Conformidad del cliente', MARGIN, y, contentWidth);

    const leftBottom = labelValueGrid(
      doc,
      [
        { label: 'Nombre', value: field('Nombre del Cliente') },
        { label: 'RUT', value: field('RUT del Cliente') },
        { label: 'Recepción', value: conformity.checkbox.checked ? 'Conforme' : 'No conforme', bold: true },
      ],
      MARGIN,
      start,
      colWidth
    );

    // La firma se alinea al pie del bloque, como en el diseño.
    const lineY = Math.max(start - 3.5 + signatureBox, leftBottom - LINE);

    if (signature) {
      const maxWidth = colWidth;
      const maxHeight = signatureBox - 2;
      const scale = Math.min(maxWidth / signature.width, maxHeight / signature.height);
      const width = signature.width * scale;
      const height = signature.height * scale;
      doc.addImage(signature.dataUrl, 'PNG', rightX + (colWidth - width) / 2, lineY - height - 1, width, height, undefined, 'FAST');
    } else {
      setText(doc, 9, 'italic', FAINT);
      doc.text('Sin firma registrada', rightX + colWidth / 2, lineY - signatureBox / 2 + 1, { align: 'center' });
    }

    doc.setDrawColor(...INK);
    doc.setLineWidth(0.26);
    doc.line(rightX, lineY, rightX + colWidth, lineY);

    setText(doc, 7.5, 'bold', MUTED);
    doc.text('FIRMA DIGITAL DEL CLIENTE', rightX + colWidth / 2, lineY + 4, { align: 'center' });

    y = Math.max(leftBottom, lineY + 4) + GAP;
  }

  // Adjunto.
  if (attachment?.kind === 'attachment') {
    y = ensureSpace(y, 16);
    y = sectionTitle(doc, 'Adjunto', MARGIN, y, contentWidth);

    if (attachment.fileName) {
      setText(doc, 10, 'normal', INK);
      doc.text(attachment.fileName, MARGIN, y);
    } else {
      setText(doc, 10, 'italic', MUTED);
      doc.text('Sin adjunto (foto o PDF de la OT física)', MARGIN, y);
    }
  }

  drawFooters(doc, ot);

  return doc;
}

export async function downloadWorkOrderPdf(supabase: SupabaseClient, ot: OtDocument): Promise<void> {
  const doc = await buildWorkOrderPdf(supabase, ot);

  doc.save(`OT-${ot.otNumber}.pdf`);
}
