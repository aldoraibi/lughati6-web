import { el, rtl, ar, clear, credit } from './ui.js';
import { C, S } from './store.js';

/** تدريب الخطّ: الحرف الباهت من خطّ الجهاز، والتقويم على صورته الحقيقيّة */
export function traceScreen(w, autoChar) {
  const set = C.letters;
  if (!set) { w.append(el('div', { class: 'card' }, 'تعذّر تحميل حروف الخط')); return; }
  const best = S.get('trace', {});

  w.append(el('div', { class: 'card center' },
    el('div', { style: 'font-size:36px' }, '✍️'),
    el('h2', {}, rtl('أَتَدَرَّبُ عَلَى الخَطِّ')),
    el('div', { class: 'muted' }, rtl('اخترْ حرفًا، ثم ارسمْه بالقلم فوق الحرف الباهت. يُنبِّهُك التطبيق إن بدأتَ من مكانٍ خطأ أو رسمتَ في اتجاهٍ معكوس.'))));

  const grid = el('div', { class: 'grid g3' });
  set.letters.forEach(L => {
    const sc = best[L.char] || 0;
    grid.append(el('button', {
      class: 'card center', style: `cursor:pointer;border:0;padding:12px${sc >= 70 ? ';outline:2px solid var(--accent)' : ''}`,
      onclick: () => open(L)
    },
      el('div', { style: 'font-size:42px;line-height:1.3' }, L.char),
      el('div', { class: 'muted', style: 'font-size:12px' }, L.name),
      el('div', { style: `font-size:12px;font-weight:700;color:${sc >= 70 ? 'var(--accent)' : 'var(--warm)'}` },
        sc ? ar(sc) + '٪' : ' ')));
  });
  w.append(grid, credit());

  // قادمًا من لوح العبارة: يُفتَحُ الحرفُ المطلوبُ رأسًا
  if (autoChar) {
    const L = set.letters.find(l => l.char === autoChar);
    if (L) requestAnimationFrame(() => open(L));
  }

  function open(L) {
    const S1 = Math.min(380, window.innerWidth - 60);
    const cv = el('canvas', { width: S1, height: S1, style: `width:${S1}px;height:${S1}px;touch-action:none;border-radius:16px;background:var(--card);box-shadow:var(--shadow)` });
    const ctx = cv.getContext('2d');
    const out = el('div');
    let si = 0, pts = [], drawing = false, verdict = null, mask = null, ink = null;

    const build = () => {
      // قناع الحرف: يُرسم الحرف نفسه ثم يُقرأ، فالتقويم على صورته لا على تقديرنا
      const m = document.createElement('canvas'); m.width = m.height = 220;
      const c2 = m.getContext('2d');
      c2.fillStyle = '#fff'; c2.fillRect(0, 0, 220, 220);
      c2.fillStyle = '#000'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
      c2.font = `${Math.round(220 * 0.72)}px -apple-system, "Geeza Pro", serif`;
      c2.fillText(L.char, 110, 110);
      const d = c2.getImageData(0, 0, 220, 220).data;
      mask = new Uint8Array(220 * 220);
      let x0 = 220, y0 = 220, x1 = -1, y1 = -1;
      for (let y = 0; y < 220; y++) for (let x = 0; x < 220; x++) {
        if (d[(y * 220 + x) * 4] < 150) {
          mask[y * 220 + x] = 1;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      ink = x1 > x0 ? { x: x0 / 220, y: y0 / 220, w: (x1 - x0) / 220, h: (y1 - y0) / 220 }
                    : { x: 0, y: 0, w: 1, h: 1 };
      // توسيع القناع سماحةً
      const dil = new Uint8Array(mask); const R = 9;
      for (let y = 0; y < 220; y++) for (let x = 0; x < 220; x++) if (mask[y * 220 + x])
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < 220 && ny >= 0 && ny < 220) dil[ny * 220 + nx] = 1;
        }
      mask = dil;
    };

    // مسار القلم مركَّبٌ على صندوق حبر الحرف
    const srcBox = () => {
      const all = L.strokes.flat().concat(L.dots.map(d => [d.x, d.y]));
      const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
      return { x: Math.min(...xs), y: Math.min(...ys),
               w: Math.max(...xs) - Math.min(...xs) || .001, h: Math.max(...ys) - Math.min(...ys) || .001 };
    };
    const ref = () => {
      const s = srcBox();
      return (L.strokes[si] || []).map(([x, y]) => [
        ink.x + (x - s.x) / s.w * ink.w, ink.y + (y - s.y) / s.h * ink.h]);
    };

    const paint = () => {
      ctx.clearRect(0, 0, S1, S1);
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--card'); ctx.fillRect(0, 0, S1, S1);
      // سطر الكتابة
      ctx.strokeStyle = 'rgba(242,158,77,.5)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(14, S1 * .70); ctx.lineTo(S1 - 14, S1 * .70); ctx.stroke();
      ctx.setLineDash([]);
      // الحرف الباهت
      ctx.fillStyle = 'rgba(42,140,184,.15)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(S1 * 0.72)}px -apple-system, "Geeza Pro", serif`;
      ctx.fillText(L.char, S1 / 2, S1 / 2);
      // الدليل
      const R = ref();
      if (R.length) {
        ctx.strokeStyle = 'rgba(51,166,115,.6)'; ctx.lineWidth = 5; ctx.setLineDash([9, 7]); ctx.lineCap = 'round';
        ctx.beginPath(); R.forEach(([x, y], i) => i ? ctx.lineTo(x * S1, y * S1) : ctx.moveTo(x * S1, y * S1));
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#2ea043'; ctx.beginPath(); ctx.arc(R[0][0] * S1, R[0][1] * S1, 13, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui'; ctx.fillText('١', R[0][0] * S1, R[0][1] * S1 + 1);
        ctx.strokeStyle = '#d9534f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(R.at(-1)[0] * S1, R.at(-1)[1] * S1, 11, 0, 7); ctx.stroke();
      }
      // خطّ الطالب
      if (pts.length > 1) {
        ctx.strokeStyle = '#2a8cb8'; ctx.lineWidth = 7; ctx.lineJoin = ctx.lineCap = 'round';
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * S1, y * S1) : ctx.moveTo(x * S1, y * S1));
        ctx.stroke();
      }
    };

    const pos = e => {
      const r = cv.getBoundingClientRect();
      return [Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1),
              Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1)];
    };
    cv.addEventListener('pointerdown', e => { if (verdict) return; drawing = true; pts = [pos(e)]; cv.setPointerCapture(e.pointerId); paint(); });
    cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e);
      if (Math.hypot(p[0] - pts.at(-1)[0], p[1] - pts.at(-1)[1]) > .008) { pts.push(p); paint(); } });
    cv.addEventListener('pointerup', () => { if (!drawing) return; drawing = false; score(); });

    function score() {
      const R = ref(); if (pts.length < 4 || !R.length) return;
      const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      const near = p => { let bi = 0, bd = 9; R.forEach((r, i) => { const x = d(p, r); if (x < bd) { bd = x; bi = i; } }); return bi; };
      const idx = pts.map(near);
      let fwd = 0, bwd = 0;
      for (let i = 1; i < idx.length; i++) idx[i] > idx[i - 1] ? fwd++ : idx[i] < idx[i - 1] && bwd++;
      const startD = d(pts[0], R[0]);
      const inside = pts.filter(([x, y]) => mask[Math.floor(y * 220) * 220 + Math.floor(x * 220)]).length;
      const v = {
        start: startD <= .20,
        dir: fwd >= bwd,
        cover: Math.min(1, new Set(idx).size / Math.max(R.length - 1, 1)),
        acc: inside / pts.length
      };
      v.score = Math.round((v.start ? 25 : 0) + (v.dir ? 25 : 0) + v.cover * 25 + v.acc * 25);
      verdict = v;
      if (si === L.strokes.length - 1 && v.score > (best[L.char] || 0)) {
        best[L.char] = v.score; S.set('trace', best);
      }
      show();
    }

    const line = (ok, y, n) => el('div', { class: 'row', style: 'gap:8px' },
      el('span', { style: `color:${ok ? 'var(--accent)' : '#d9534f'};font-weight:700` }, ok ? '✓' : '✕'),
      el('span', {}, rtl(ok ? y : n)));

    function show() {
      clear(out);
      if (!verdict) {
        out.append(el('div', { class: 'box key' }, rtl(L.tip || 'ابدأْ من الدائرة الخضراء وانتهِ عند الحمراء.')));
        return;
      }
      const v = verdict, pass = v.start && v.dir && v.score >= 70;
      out.append(el('div', { class: 'card' },
        el('div', { class: 'row', style: 'justify-content:space-between' },
          el('b', { style: `font-size:20px;color:${pass ? 'var(--accent)' : 'var(--warm)'}` },
            pass ? '✅ أحسنتَ!' : '↻ قريبٌ — أعِدْ'),
          el('b', { style: 'font-size:20px' }, ar(v.score) + '٪')),
        line(v.start, 'بدأتَ من المكان الصحيح', 'بدأتَ من مكانٍ خطأ — ابدأْ من الدائرة الخضراء'),
        line(v.dir, 'اتجاهُ الرسم صحيح', 'اتجاهُ الرسم معكوس — امضِ نحو الدائرة الحمراء'),
        line(v.cover >= .75, 'أتممتَ الحرف', 'لم تُتمَّ الحرفَ إلى آخره'),
        line(v.acc >= .75, 'بقيتَ على جسم الحرف', 'خرجتَ عن جسم الحرف كثيرًا')));
    }

    build(); paint(); show();
    const bar = el('div', { class: 'row', style: 'justify-content:center;margin-top:12px' },
      el('button', { class: 'btn ghost sm', onclick: () => { pts = []; verdict = null; paint(); show(); } }, '↻ أعِدْ'),
      L.strokes.length > 1 ? el('button', { class: 'btn sm', onclick: () => {
        si = (si + 1) % L.strokes.length; pts = []; verdict = null; paint(); show();
      } }, `السكتة التالية (${ar(si + 1)}/${ar(L.strokes.length)})`) : null,
      el('button', { class: 'btn ghost sm', onclick: () => ov.remove() }, '✕ إغلاق'));

    const ov = el('div', {
      style: 'position:fixed;inset:0;z-index:140;background:var(--page);overflow:auto;padding:20px',
    }, el('div', { class: 'wrap center' },
      el('h3', {}, `${L.name} — ${L.char}`), cv, bar, out));
    document.body.append(ov);
  }
}
