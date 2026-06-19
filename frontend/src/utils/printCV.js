/**
 * exportCVAsPDF
 * ─────────────────────────────────────────────────────────────────────────────
 * Smart multi-page PDF export using html2canvas.
 *
 * Key improvements:
 *  1. Section-aware page splitting — measures DOM section positions and finds
 *     the nearest safe split point so sections are NEVER cut mid-block.
 *  2. Proper margins — top + bottom whitespace on EVERY page (including page 2+
 *     which previously started with zero top margin).
 *  3. Footer — optional name label on the left + "Page X / Y" on the right,
 *     drawn directly on each page canvas before encoding.
 *  4. PNG encoding for crisp text (no JPEG compression artifacts).
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/* ─── Constants ─────────────────────────────────────────────── */
const A4_W_MM      = 210;
const A4_H_MM      = 297;
const CV_PX_WIDTH  = 794;   // preview always renders at this CSS px width
const SCALE        = 3;     // canvas device-pixel multiplier

// Page margin settings (mm)
const MARGIN_TOP_MM    = 25;  // white-space added above content on pages 2+
const MARGIN_BOTTOM_MM = 25;  // white-space kept below content on EVERY page
const FOOTER_H_MM      = 12;   // footer zone height (sits inside the bottom margin)

const API_BASE = (
  process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
).replace('/api', '');

/* ─── Helpers ───────────────────────────────────────────────── */

async function urlToDataURL(src) {
  if (!src || src.startsWith('data:')) return src;
  const abs = src.startsWith('http') ? src : `${API_BASE}${src}`;
  try {
    const res = await fetch(abs, { mode: 'cors', cache: 'no-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function buildImageMap(el) {
  const map = new Map();
  await Promise.all(
    Array.from(el.querySelectorAll('img')).map(async img => {
      const src = img.getAttribute('src');
      if (!src || map.has(src) || src.startsWith('data:')) return;
      const b64 = await urlToDataURL(src);
      if (b64) map.set(src, b64);
    })
  );
  return map;
}

/** Create a new canvas filled with white, then draw a slice of `src` into it,
 *  offset downward by `yDest` pixels from the top. */
function buildPageCanvas(src, yStart, contentH, destWidth, destHeight, yDest) {
  const out = document.createElement('canvas');
  out.width  = destWidth;
  out.height = destHeight;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  // Draw only what fits
  const drawH = Math.min(contentH, destHeight - yDest);
  if (drawH > 0) {
    ctx.drawImage(
      src,
      0, yStart, src.width, drawH,    // source slice
      0, yDest,  src.width, drawH     // destination (offset by top margin)
    );
  }
  return out;
}

/** Draw page footer onto canvas context. */
function drawFooter(ctx, canvasW, canvasH, footerY, pageNum, pageCount, cvTitle) {
  const fs = Math.round(9 * SCALE);   // font size in canvas px
  const lineY = footerY;

  // Separator line
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(Math.round(24 * SCALE), lineY, canvasW - Math.round(48 * SCALE), 1);

  // Text baseline
  const textY = lineY + Math.round(5 * SCALE);

  ctx.font = `${fs}px Arial, Helvetica, sans-serif`;

  // Left: CV title (clipped)
  if (cvTitle) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9ca3af';
    const maxTitle = 40;
    const label = cvTitle.length > maxTitle ? cvTitle.slice(0, maxTitle) + '…' : cvTitle;
    ctx.fillText(label, Math.round(24 * SCALE), textY + fs);
  }

  // Right: Page X / Y
  ctx.textAlign = 'right';
  ctx.fillStyle = '#6b7280';
  ctx.font = `bold ${fs}px Arial, Helvetica, sans-serif`;
  ctx.fillText(`${pageNum} / ${pageCount}`, canvasW - Math.round(24 * SCALE), textY + fs);
}

/* ─── Main export ───────────────────────────────────────────── */

export async function exportCVAsPDF(filename = 'CV', options = {}) {
  const {
    showFooter = true,
    footerLabel = filename,
  } = options;

  const el = document.getElementById('cv-preview-root');
  if (!el) {
    console.error('[exportCVAsPDF] #cv-preview-root not found');
    return;
  }

  // ── 1. Pre-fetch photos ──────────────────────────────────────
  const imageMap = await buildImageMap(el);

  // ── 2. Remove CSS transform from the wrapper so it renders at full 794 px ─
  const wrapper = el.parentElement;
  const prevTransform       = wrapper.style.transform;
  const prevTransformOrigin = wrapper.style.transformOrigin;
  wrapper.style.transform        = 'none';
  wrapper.style.transformOrigin  = 'top left';

  try {
    // ── 3. Measure section boundaries (before html2canvas clones the DOM) ──
    //
    // The CV root has one child (the 794-px wide container). That container's
    // direct children are: header block, separator, then one div per section.
    // We collect the top & bottom canvas-pixel positions of every child so we
    // know where it is safe to split a page.

    const elRect       = el.getBoundingClientRect();
    const safeBreakSet = new Set([0]);
    const forcedBreaks = [];

    const cvContainer = el.firstElementChild;
    if (cvContainer) {
      // 1. Direct children (the main sections)
      Array.from(cvContainer.children).forEach(child => {
        const r   = child.getBoundingClientRect();
        const top = Math.round((r.top    - elRect.top) * SCALE);
        const bot = Math.round((r.bottom - elRect.top) * SCALE);
        if (top > 0) safeBreakSet.add(top);
        if (bot > 0) safeBreakSet.add(bot);
        if (child.getAttribute('data-force-break') === 'true') {
          forcedBreaks.push(top);
        }
      });
      // 2. Also find any fine-grained breakable items inside sections
      const breakables = cvContainer.querySelectorAll('.cv-breakable');
      breakables.forEach(child => {
        const r   = child.getBoundingClientRect();
        const top = Math.round((r.top    - elRect.top) * SCALE);
        const bot = Math.round((r.bottom - elRect.top) * SCALE);
        // Add a slight padding to the break points so we don't slice borders
        if (top > 0) safeBreakSet.add(top - Math.round(4 * SCALE));
        if (bot > 0) safeBreakSet.add(bot + Math.round(4 * SCALE));
      });
    }
    const sortedBreaks = [...safeBreakSet].sort((a, b) => a - b);

    // ── 4. Render the full CV canvas ────────────────────────────
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 400)); // allow DOM reflow for fonts // Ensure all fonts are loaded before capturing
    const canvas = await html2canvas(el, {
      scale:           SCALE,
      useCORS:         true,
      allowTaint:      false,
      backgroundColor: '#ffffff',
      logging:         false,
      windowWidth:     CV_PX_WIDTH,
      scrollX:         0,
      scrollY:         0,
      onclone: (_clonedDoc, clonedEl) => {
        if (imageMap.size === 0) return;
        clonedEl.querySelectorAll('img').forEach(img => {
          const orig = img.getAttribute('src');
          if (orig && imageMap.has(orig)) img.setAttribute('src', imageMap.get(orig));
        });
      },
    });

    // ── 5. Compute page layout in canvas pixels ─────────────────
    const pxToMm        = A4_W_MM / (CV_PX_WIDTH * SCALE);
    const pageHeightPx  = Math.round(A4_H_MM / pxToMm);      // full A4 page in canvas px
    const marginTopPx   = Math.round(MARGIN_TOP_MM / pxToMm); // top whitespace for pages 2+
    const marginBotPx   = Math.round(MARGIN_BOTTOM_MM / pxToMm);
    const footerZonePx  = Math.round(FOOTER_H_MM / pxToMm);

    // Usable content height per page (space between top & bottom margins)
    // Page 1: top margin comes from the component's own padding, so we use full height - bottom
    // Page 2+: top margin added by us, so usable = pageH - topMargin - bottomMargin
    const contentPage1Px  = pageHeightPx - marginBotPx;
    const contentPageNPx  = pageHeightPx - marginTopPx - marginBotPx;

    const totalContentPx = canvas.height;

    // ── 6. Smart page breaking ───────────────────────────────────
    //
    // For each page we find the LARGEST safe break point that is:
    //   - greater than the start of this page's content
    //   - no greater than (start + usable content height)
    // If no safe break fits (e.g. a single section is taller than a page),
    // we fall back to a hard cut at the usable height.

    const pageContentStarts = []; // canvas Y where each page's content begins
    let curY = 0;

    while (curY < totalContentPx) {
      pageContentStarts.push(curY);
      const usable    = pageContentStarts.length === 1 ? contentPage1Px : contentPageNPx;
      const idealEnd  = curY + usable;

      if (idealEnd >= totalContentPx) break;

      // Find best safe break point <= idealEnd, > curY
      let bestBreak = idealEnd; // hard-cut fallback
      
      const nextForced = forcedBreaks.find(b => b > curY && b <= idealEnd);
      if (nextForced !== undefined) {
        bestBreak = nextForced;
      } else {
        for (let i = sortedBreaks.length - 1; i >= 0; i--) {
          if (sortedBreaks[i] <= idealEnd && sortedBreaks[i] > curY) {
            bestBreak = sortedBreaks[i];
            break;
          }
        }
      }
      curY = bestBreak;
    }

    const pageCount = pageContentStarts.length;

    // ── 7. Build PDF ─────────────────────────────────────────────
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit:        'mm',
      format:      'a4',
      compress:    true,
    });

    for (let p = 0; p < pageCount; p++) {
      if (p > 0) pdf.addPage();

      const yStart  = pageContentStarts[p];
      const yEnd    = p + 1 < pageCount ? pageContentStarts[p + 1] : totalContentPx;
      const sliceH  = yEnd - yStart;

      // Top offset for content on this page canvas
      // Page 1: no extra top margin (component has its own header padding)
      // Page 2+: add the top margin as white space
      const yDest = p === 0 ? 0 : marginTopPx;

      // Build the full A4-sized page canvas with white background
      const pageCanvas = buildPageCanvas(
        canvas,
        yStart, sliceH,
        canvas.width, pageHeightPx,
        yDest
      );

      // Draw footer
      if (showFooter) {
        const footerY = pageHeightPx - footerZonePx - Math.round(4 * SCALE);
        drawFooter(
          pageCanvas.getContext('2d'),
          pageCanvas.width,
          pageCanvas.height,
          footerY,
          p + 1,
          pageCount,
          footerLabel
        );
      }

      // Encode as PNG for crisp text
      const imgData = pageCanvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, A4_W_MM, A4_H_MM, undefined, 'FAST');
    }

    // ── 8. Save ──────────────────────────────────────────────────
    const safe = filename.replace(/[^a-zA-Z0-9\-_. ]/g, '_');
    pdf.save(`${safe}.pdf`);

  } finally {
    // Restore transform
    wrapper.style.transform       = prevTransform;
    wrapper.style.transformOrigin = prevTransformOrigin;
  }
}
