import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Rasterize a DOM subtree to a multi-page A4 PDF (visual print of the UI).
 * Elements with `data-pdf-exclude` are omitted from the capture (toolbar, nav, etc.).
 * Mark the root with `data-pdf-capture-root` to apply optional `layoutScale` in the clone only.
 *
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @param {string} [options.filename]
 * @param {number} [options.scale] - html2canvas scale (sharpness; default 2.5)
 * @param {'portrait'|'landscape'} [options.orientation] - default 'portrait' (taller pages → fewer mid-tile page breaks)
 * @param {number} [options.margin] - PDF margin in pt (default 18)
 * @param {number} [options.layoutScale] - Scale cloned DOM (e.g. 1.05–1.12). Default 1.08 for slightly larger capture.
 */
export async function captureElementToPdf(element, options = {}) {
  const {
    filename = 'export.pdf',
    scale = 2.5,
    orientation = 'portrait',
    margin = 18,
    layoutScale = 1.08,
  } = options;

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
    onclone: (clonedDoc) => {
      if (!layoutScale || layoutScale <= 1) return;
      const node = clonedDoc.querySelector('[data-pdf-capture-root]');
      if (node instanceof HTMLElement) {
        node.style.transform = `scale(${layoutScale})`;
        node.style.transformOrigin = 'top left';
      }
    },
  });

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation });
  const pdfPageWidth = pdf.internal.pageSize.getWidth();
  const pdfPageHeight = pdf.internal.pageSize.getHeight();
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
