import type { SupabaseClient } from '@supabase/supabase-js';
import type { OtDocument, OtField, OtSection } from '@/lib/ot-document';

/**
 * jsPDF trabaja en milimetros, asi que las constantes de esta pagina estan
 * expresadas en mm y el alto util es el de la pagina menos el margen.
 */
const MARGIN = 14;
const LINE = 5;
const SECTION_BAR = 8;
const LABEL_WIDTH = 44;
const COL_GAP = 4;
const BOX = 4;
const ITEMS_PER_ROW = 2;
const ROW_HEIGHT = 7;

type Doc = import('jspdf').jsPDF;
type AutoTableFn = (doc: Doc, options: Record<string, unknown>) => void;

const FONT = 'helvetica';

async function loadPdfDeps(): Promise<{ jsPDF: typeof import('jspdf').jsPDF; autoTable: AutoTableFn }> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  return { jsPDF, autoTable: autoTable as unknown as AutoTableFn };
}

/** Helvetica no incluye los glifos U+2611/U+2610, asi que el check se dibuja a mano. */
function drawCheckbox(doc: Doc, x: number, y: number, checked: boolean) {
  doc.setDrawColor(120);
  doc.setLineWidth(0.3);
  doc.rect(x, y - BOX, BOX, BOX);

  if (!checked) return;

  doc.setDrawColor(30);
  doc.setLineWidth(0.5);
  doc.line(x + 0.9, y - BOX / 2, x + 1.8, y - BOX + 1.1);
  doc.line(x + 1.8, y - BOX + 1.1, x + BOX - 0.7, y - 1.1);
}

function packRows(fields: OtField[]): OtField[][] {
  const rows: OtField[][] = [];
  let current: OtField[] = [];

  for (const field of fields) {
    if (field.fullWidth) {
      if (current.length) {
        rows.push(current);
        current = [];
      }

      rows.push([field]);
      continue;
    }

    current.push(field);

    if (current.length === 2) {
      rows.push(current);
      current = [];
    }
  }

  if (current.length) rows.push(current);

  return rows;
}

/**
 * Altura aproximada que necesita cada seccion. Sirve para no dejar un
 * encabezado de seccion huérfano al final de una pagina: si no cabe, se
 * salta de pagina antes de dibujar la barra.
 */
function estimateSectionHeight(section: OtSection, hasSignature: boolean): number {
  const header = SECTION_BAR + 4;

  if (section.kind === 'fields') return header + LINE * 2;
  if (section.kind === 'checklist') return header + LINE + ROW_HEIGHT * Math.ceil(section.items.length / ITEMS_PER_ROW) + 6;
  if (section.kind === 'parts') return section.parts.length === 0 ? header + LINE + 6 : header + 40;
  if (section.kind === 'conformity') {
    return header + LINE * 2 + LINE * 2 + (hasSignature ? 60 : LINE * 2);
  }

  return header + LINE * 2 + 6;
}

async function renderSection(
  doc: Doc,
  section: OtSection,
  startY: number,
  signatureDataUrl: string | null
): Promise<number> {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const colWidth = (contentWidth - COL_GAP) / 2;

  const ensureSpace = (y: number, needed: number) => {
    if (y + needed <= pageHeight - MARGIN) return y;
    doc.addPage();
    return MARGIN;
  };

  // jsPDF trabaja en milimetros: el alto util es el de la pagina menos el margen.
  const needed = estimateSectionHeight(section, Boolean(signatureDataUrl));
  let y = ensureSpace(startY, needed);

  // Barra de encabezado de seccion, equivalente al CardHeader del formulario.
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, y - SECTION_BAR + 1.5, contentWidth, SECTION_BAR, 'F');
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(section.title, MARGIN + 2, y);
  y += SECTION_BAR + 2;

  doc.setFontSize(9);

  if (section.kind === 'fields' || section.kind === 'conformity') {
    const { autoTable } = await loadPdfDeps();

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      body: packRows(section.fields).map((row) =>
        row.length === 1
          ? [
              { content: row[0].label, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: LABEL_WIDTH } },
              { content: row[0].value || '-', colSpan: 3 },
            ]
          : [
              { content: row[0].label, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: LABEL_WIDTH } },
              row[0].value || '-',
              { content: row[1].label, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: LABEL_WIDTH } },
              row[1].value || '-',
            ]
      ),
      columnStyles: {
        0: { cellWidth: LABEL_WIDTH },
        1: { cellWidth: colWidth - LABEL_WIDTH },
        2: { cellWidth: LABEL_WIDTH },
        3: { cellWidth: colWidth - LABEL_WIDTH },
      },
      styles: { fontSize: 9, cellPadding: 2, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
      margin: { left: MARGIN, right: MARGIN },
    });

    y = readFinalY(doc, y) + 6;
  }

  if (section.kind === 'checklist') {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(section.subtitle, MARGIN + 2, y);
    y += LINE + 1;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);

    // El checklist se arma por filas de ITEMS_PER_ROW columnas. Hay que
    // avanzar `y` al cerrar cada fila: si no, todas las filas se dibujan
    // superpuestas en la misma coordenada.
    let index = 0;

    while (index < section.items.length) {
      y = ensureSpace(y, ROW_HEIGHT);

      for (let column = 0; column < ITEMS_PER_ROW && index + column < section.items.length; column += 1) {
        const item = section.items[index + column];
        const x = MARGIN + column * colWidth;

        drawCheckbox(doc, x, y, item.checked);
        doc.text(item.label, x + BOX + 2, y);
      }

      y += ROW_HEIGHT;
      index += ITEMS_PER_ROW;
    }

    y += 6;
  }

  if (section.kind === 'parts') {
    if (section.parts.length === 0) {
      y = ensureSpace(y, LINE);
      doc.text('- Sin repuestos registrados', MARGIN, y);
      y += LINE + 6;
    } else {
      const { autoTable } = await loadPdfDeps();

      autoTable(doc, {
        startY: y,
        head: [['Código', 'Descripción', 'Cantidad', 'Observaciones']],
        body: section.parts.map((part) => [
          part.code || '-',
          part.description,
          String(part.quantity),
          part.observations || '-',
        ]),
        headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.2 },
        margin: { left: MARGIN, right: MARGIN },
      });

      y = readFinalY(doc, y) + 6;
    }
  }

  if (section.kind === 'conformity') {
    drawCheckbox(doc, MARGIN, y, section.checkbox.checked);
    doc.setFontSize(9);
    doc.text(section.checkbox.label, MARGIN + BOX + 2, y);
    y += LINE * 2;

    if (signatureDataUrl) {
      y = ensureSpace(y, 58);
      doc.setFont(FONT, 'bold');
      doc.text('Firma Digital del Cliente', MARGIN, y);
      y += 3;
      doc.setFont(FONT, 'normal');
      doc.addImage(signatureDataUrl, 'PNG', MARGIN, y, 110, 50, undefined, 'FAST');
      y += 50 + 6;
    } else {
      doc.text('Firma Digital del Cliente: sin firma registrada', MARGIN, y);
      y += LINE * 2;
    }
  }

  if (section.kind === 'attachment') {
    y = ensureSpace(y, LINE * 2);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(section.subtitle, MARGIN, y);
    y += LINE;
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(section.fileName || '- Sin adjunto', MARGIN, y);
    y += LINE + 6;
  }

  return y;
}

function readFinalY(doc: Doc, fallback: number): number {
  const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;

  return last?.finalY ?? fallback;
}

function loadImageAsDataUrl(url: string): Promise<string | null> {
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
        resolve(canvas.toDataURL('image/png'));
      } catch {
        // El canvas puede quedar "tainted" si el servidor no envia CORS.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function resolveSignature(
  supabase: SupabaseClient,
  path: string | null
): Promise<string | null> {
  if (!path) return null;

  const { data } = await supabase.storage.from('signatures').createSignedUrl(path, 60);

  if (!data?.signedUrl) return null;

  return loadImageAsDataUrl(data.signedUrl);
}

export async function buildWorkOrderPdf(
  supabase: SupabaseClient,
  document: OtDocument
): Promise<Doc> {
  const { jsPDF } = await loadPdfDeps();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;

  const conformity = document.sections.find((section) => section.kind === 'conformity');
  const signatureDataUrl = await resolveSignature(
    supabase,
    conformity?.kind === 'conformity' ? conformity.signaturePath : null
  );

  doc.setFontSize(16);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(document.title, pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(11);
  doc.text(`N° ${document.otNumber}`, pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(document.equipmentSubtitle, pageWidth / 2, 30.5, { align: 'center' });
  doc.text(`Técnico: ${document.technicianName}`, pageWidth / 2, 35.5, { align: 'center' });

  let y = 44;

  for (const section of document.sections) {
    y = await renderSection(doc, section, y, signatureDataUrl);
  }

  // Pie de pagina con numeracion.
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${document.otNumber} · Página ${page} de ${total}`, contentWidth, doc.internal.pageSize.getHeight() - 8, {
      align: 'right',
    });
  }

  return doc;
}

export async function downloadWorkOrderPdf(
  supabase: SupabaseClient,
  document: OtDocument
): Promise<void> {
  const doc = await buildWorkOrderPdf(supabase, document);

  doc.save(`OT-${document.otNumber}.pdf`);
}
