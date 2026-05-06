import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Rasterize a DOM subtree to a multi-page A4 PDF (visual print of the UI).
 * Elements with `data-pdf-exclude` are omitted from the capture (toolbar, nav, etc.).
 *
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @param {string} [options.filename]
 * @param {number} [options.scale] - devicePixelRatio multiplier for sharper text (default 2)
 */
export async function captureElementToPdf(element, options = {}) {
  const { filename = 'export.pdf', scale = 2 } = options;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    ignoreElements: (node) =>
      node?.nodeType === 1 &&
      typeof node.hasAttribute === 'function' &&
      node.hasAttribute('data-pdf-exclude'),
  });

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pdfPageWidth = pdf.internal.pageSize.getWidth();
  const pdfPageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const contentWidth = pdfPageWidth - margin * 2;
  const contentHeight = pdfPageHeight - margin * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let yOffset = 0;
  while (yOffset < imgHeight) {
    if (yOffset > 0) {
      pdf.addPage();
    }
    const sliceHeight = Math.min(contentHeight, imgHeight - yOffset);
    const sourceY = (yOffset / imgHeight) * canvas.height;
    const sourceH = (sliceHeight / imgHeight) * canvas.height;

    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.max(1, Math.round(sourceH));
    const ctx = slice.getContext('2d');
    ctx.drawImage(
      canvas,
      0,
      Math.round(sourceY),
      canvas.width,
      Math.round(sourceH),
      0,
      0,
      canvas.width,
      slice.height
    );

    const sliceData = slice.toDataURL('image/jpeg', 0.92);
    pdf.addImage(sliceData, 'JPEG', margin, margin, imgWidth, sliceHeight);
    yOffset += sliceHeight;
  }

  const name = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(name);
}
