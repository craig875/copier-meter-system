import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Row bands in PDF vertical space (same units as imgHeight from canvas).
 * @param {HTMLElement} root
 * @param {string} rowSelector
 * @param {number} scrollHeight
 * @param {number} imgHeight
 * @returns {{ top: number; bottom: number }[]|null}
 */
function collectRowBandsPdf(root, rowSelector, scrollHeight, imgHeight) {
  if (!scrollHeight || scrollHeight <= 0) return null;
  const rowEls = [...root.querySelectorAll(rowSelector)];
  if (rowEls.length === 0) return null;

  const rootRect = root.getBoundingClientRect();
  const bands = rowEls.map((row) => {
    const rr = row.getBoundingClientRect();
    const top = rr.top - rootRect.top + root.scrollTop;
    const bottom = rr.bottom - rootRect.top + root.scrollTop;
    const t = (Math.max(0, top) / scrollHeight) * imgHeight;
    const b = (Math.min(scrollHeight, bottom) / scrollHeight) * imgHeight;
    return { top: t, bottom: Math.max(t + 0.5, b) };
  });
  return bands.sort((a, b) => a.top - b.top);
}

/**
 * Slice heights so page breaks avoid bisecting a row when possible.
 * @param {number} imgHeight
 * @param {number} pageMax
 * @param {{ top: number; bottom: number }[]} bands
 * @returns {number[]}
 */
function computeRowAwareSliceHeights(imgHeight, pageMax, bands) {
  const eps = 1;
  const sorted = [...bands].sort((a, b) => a.top - b.top);
  const slices = [];
  let y = 0;

  while (y < imgHeight - eps) {
    let yEnd = Math.min(y + pageMax, imgHeight);

    if (yEnd >= imgHeight - eps) {
      slices.push(imgHeight - y);
      break;
    }

    const inside = sorted.find((r) => r.top <= y + eps && r.bottom > y + eps);
    if (inside && inside.bottom > yEnd - eps && inside.bottom - y <= pageMax + eps) {
      yEnd = inside.bottom;
    } else {
      for (const r of sorted) {
        if (r.top > y + eps && r.top < yEnd - eps && r.bottom > yEnd - eps) {
          yEnd = r.top;
          break;
        }
      }
    }

    if (yEnd <= y + eps) {
      yEnd = Math.min(y + pageMax, imgHeight);
    }

    slices.push(yEnd - y);
    y = yEnd;
  }

  return slices;
}

/**
 * Rasterize a DOM subtree to a multi-page A4 PDF (visual print of the UI).
 * Elements with `data-pdf-exclude` are omitted from the capture (toolbar, nav, etc.).
 * Mark the root with `data-pdf-capture-root` to apply optional `layoutScale` in the clone only.
 * Mark logical blocks with `data-pdf-row` so page breaks prefer not to cut through them (e.g. machine rows).
 *
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @param {string} [options.filename]
 * @param {number} [options.scale] - html2canvas scale (sharpness; default 2.5)
 * @param {'portrait'|'landscape'} [options.orientation] - default 'portrait' (taller pages → fewer mid-tile page breaks)
 * @param {number} [options.margin] - PDF margin in pt (default 18)
 * @param {number} [options.layoutScale] - Scale cloned DOM (e.g. 1.05–1.12). Default 1.08 for slightly larger capture.
 * @param {string} [options.rowSelector] - Elements that should stay intact across pages (default '[data-pdf-row]')
 */
export async function captureElementToPdf(element, options = {}) {
  const {
    filename = 'export.pdf',
    scale = 2.5,
    orientation = 'portrait',
    margin = 18,
    layoutScale = 1.08,
    rowSelector = '[data-pdf-row]',
  } = options;

  const scrollHeight = element.scrollHeight || element.offsetHeight;

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

  const rowBands = collectRowBandsPdf(element, rowSelector, scrollHeight, imgHeight);
  const sliceHeights =
    rowBands && rowBands.length > 0
      ? computeRowAwareSliceHeights(imgHeight, contentHeight, rowBands)
      : null;

  let yOffset = 0;
  let pageIndex = 0;

  const heights =
    sliceHeights && sliceHeights.length > 0
      ? sliceHeights
      : (() => {
          const h = [];
          let y = 0;
          while (y < imgHeight) {
            const sh = Math.min(contentHeight, imgHeight - y);
            h.push(sh);
            y += sh;
          }
          return h;
        })();

  for (const sliceHeight of heights) {
    if (pageIndex > 0) {
      pdf.addPage();
    }
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
    pageIndex += 1;
  }

  const name = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(name);
}
