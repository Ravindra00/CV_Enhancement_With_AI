/**
 * exportCVAsPDF
 * ─────────────────────────────────────────────────────────────────────────────
 * Captures the live CV preview using html2canvas + jsPDF.
 *
 * Key fixes vs previous version:
 *  1. Photo: images are pre-fetched as base64 then swapped in the
 *     html2canvas `onclone` document so CORS never blocks them.
 *  2. Empty last page: the canvas is sliced into A4-sized pieces,
 *     so the last page only contains real content — no blank overflow.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// A4 at 96 dpi → 794 × 1123 px. Dimensions in mm:
const A4_W_MM = 210;
const A4_H_MM = 297;
const CV_PX_WIDTH = 794;      // the preview always renders at this width

const API_BASE = (
  process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
).replace('/api', '');

// ─── Fetch any URL (including cross-origin backend /uploads/) as a base64 data URL ───
async function urlToDataURL(src) {
  if (!src || src.startsWith('data:')) return src;

  // Build absolute URL
  const abs = src.startsWith('http') ? src : `${API_BASE}${src}`;

  try {
    const res = await fetch(abs, { mode: 'cors', cache: 'no-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Build a map of original src → base64 for all images inside el ───────────
async function buildImageMap(el) {
  const map = new Map();
  const imgs = Array.from(el.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src || map.has(src) || src.startsWith('data:')) return;
      const b64 = await urlToDataURL(src);
      if (b64) map.set(src, b64);
    })
  );
  return map;
}

// ─── Draw a slice of `src` canvas onto a new canvas ──────────────────────────
function sliceCanvas(src, yStart, height) {
  const out = document.createElement('canvas');
  out.width  = src.width;
  out.height = height;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, yStart, src.width, height, 0, 0, src.width, height);
  return out;
}

// ─── Main export function ─────────────────────────────────────────────────────
export async function exportCVAsPDF(filename = 'CV') {
  const el = document.getElementById('cv-preview-root');
  if (!el) {
    console.error('[exportCVAsPDF] #cv-preview-root not found');
    return;
  }

  // ── 1. Pre-fetch all photos as base64 (before touching the DOM) ───────────
  const imageMap = await buildImageMap(el);

  // ── 2. Remove scale transform so html2canvas sees the real 794 px width ────
  const prevTransform       = el.style.transform;
  const prevTransformOrigin = el.style.transformOrigin;
  el.style.transform        = 'none';
  el.style.transformOrigin  = 'top left';

  try {
    // ── 3. Render canvas ────────────────────────────────────────────────────
    const canvas = await html2canvas(el, {
      scale: 3,                       // 3× for print-quality sharpness
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: CV_PX_WIDTH,
      scrollX: 0,
      scrollY: 0,

      // onclone is called with the *cloned* document — safe to mutate.
      // We swap every img src with its preloaded base64 so html2canvas
      // can draw the photo without any CORS restriction.
      onclone: (_clonedDoc, clonedEl) => {
        if (imageMap.size === 0) return;
        clonedEl.querySelectorAll('img').forEach((img) => {
          const orig = img.getAttribute('src');
          if (orig && imageMap.has(orig)) {
            img.setAttribute('src', imageMap.get(orig));
          }
        });
      },
    });

    // ── 4. Calculate dimensions ─────────────────────────────────────────────
    // mm per canvas pixel at scale=3
    const pxToMm = A4_W_MM / (CV_PX_WIDTH * 3);

    // Canvas pixels that fit in one A4 page
    const pageHeightPx = Math.round(A4_H_MM / pxToMm);

    // Total real content height in mm
    const totalHeightMm = canvas.height * pxToMm;

    // Page count — subtract a tiny tolerance (0.5 mm) so near-integer
    // heights don't accidentally push us into an extra blank page.
    const pageCount = Math.max(1, Math.ceil((totalHeightMm - 0.5) / A4_H_MM));

    // ── 5. Build the PDF page by page ───────────────────────────────────────
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let page = 0; page < pageCount; page++) {
      if (page > 0) pdf.addPage();

      const yStart   = page * pageHeightPx;
      const sliceH   = Math.min(pageHeightPx, canvas.height - yStart);

      // Slice just the rows for this page into a new canvas
      const pageCanvas = sliceCanvas(canvas, yStart, sliceH);

      // Height of this slice in mm (last page may be shorter)
      const sliceHmm = sliceH * pxToMm;

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.97);

      pdf.addImage(
        imgData,
        'JPEG',
        0,          // x (mm)
        0,          // y — always 0 because we slice per page
        A4_W_MM,    // fit full A4 width
        sliceHmm,   // exact height of this slice — no blank padding
      );
    }

    // ── 6. Download ─────────────────────────────────────────────────────────
    const safe = filename.replace(/[^a-zA-Z0-9\-_. ]/g, '_');
    pdf.save(`${safe}.pdf`);

  } finally {
    // ── 7. Restore transform ────────────────────────────────────────────────
    el.style.transform       = prevTransform;
    el.style.transformOrigin = prevTransformOrigin;
  }
}
