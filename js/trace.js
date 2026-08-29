import { el, rtl, ar, clear, credit } from './ui.js';
import { C, S } from './store.js';

/* تدريبُ الخطّ.
   الشكلُ الباهتُ صورةُ الحرفِ من كرّاسة «مبادرة خطي أجمل — خطّ النسخ»،
   والخطواتُ بعددِ أسهمِ الكرّاسةِ وترتيبِها واتّجاهِها، ثمّ نقطُ الحرف.
   ولا يتمُّ الحرفُ حتّى تُرسَمَ خطواتُه كلُّها ونُقَطُه. */

const GLYPH = 'content/glyphs/';
const cache = {};

function glyphImage(name) {
  if (cache[name]) return cache[name];
  const im = new Image();
  im.src = GLYPH + name + '.png';
  cache[name] = im;
  return im;
}

/** صندوقُ الشكلِ ونقطِه داخلَ المربّع — كما في نسخةِ الآيباد تمامًا */
function layout(L, side, img) {
  const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight
                                           : (L.aspect || 1);
  // صندوقُ الشكلِ وحدَه (0..1 داخليًّا)، ثمّ نضمُّ إليه النقطَ ولو خرجت
  let x0 = 0, y0 = 0, x1 = 1, y1 = 1;
  (L.dots || []).forEach(d => {
    x0 = Math.min(x0, d.x); x1 = Math.max(x1, d.x);
    y0 = Math.min(y0, d.y); y1 = Math.max(y1, d.y);
  });
  const pad = 0.10;
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  // أبعادُ الشكلِ الحقيقيّةُ بنسبةِ الصورة
  const gw = aspect >= 1 ? 1 : aspect;
  const gh = aspect >= 1 ? 1 / aspect : 1;
  const totalW = (x1 - x0) * gw, totalH = (y1 - y0) * gh;
  const k = Math.min(side / totalW, side / totalH);
  const ox = (side - totalW * k) / 2, oy = (side - totalH * k) / 2;
  const glyph = { x: ox + (0 - x0) * gw * k, y: oy + (0 - y0) * gh * k,
                  w: gw * k, h: gh * k };
  return {
    glyph,
    pt: (x, y) => [glyph.x + x * glyph.w, glyph.y + y * glyph.h],
    dotSize: Math.max(10, Math.min(glyph.w, glyph.h) * 0.13)
  };
}

export function traceScreen(w, autoChar) {
  const set = C.letters;
  if (!set) { w.append(el('div', { class: 'card' }, 'تعذّر تحميل حروف الخط')); return; }
  const best = S.get('trace', {});

  w.append(el('div', { class: 'card center' },
    el('div', { style: 'font-size:36px' }, '✍️'),
    el('h2', {}, rtl('أَتَدَرَّبُ عَلَى الخَطِّ')),
    el('div', { class: 'muted' }, rtl('الحُرُوفُ وَمَسَارُ القَلَمِ فِيهَا مَأْخُوذَةٌ مِنْ كُرَّاسَةِ «مُبَادَرَةِ خَطِّي أَجْمَلُ — خَطِّ النَّسْخِ».')),
    el('div', { style: 'color:var(--warm);font-weight:700;margin-top:6px' },
      rtl('لَا يَتِمُّ الحَرْفُ حَتَّى تُرْسَمَ خُطُوَاتُهُ كُلُّهَا وَنُقَطُهُ.'))));

  const grid = el('div', { class: 'grid g3' });
  set.letters.forEach(L => {
    const sc = best[L.char] || 0;
    grid.append(el('button', {
      class: 'card center',
      style: `cursor:pointer;border:0;padding:12px${sc >= 70 ? ';outline:2px solid var(--accent)' : ''}`,
      onclick: () => open(L)
    },
      el('div', { style: 'font-size:42px;line-height:1.3' }, L.char),
      el('div', { class: 'muted', style: 'font-size:12px' }, L.name),
      el('div', { style: `font-size:12px;font-weight:700;color:${sc >= 70 ? 'var(--accent)' : 'var(--warm)'}` },
        sc ? ar(sc) + '٪' : ' ')));
  });
  w.append(grid, credit());

  if (autoChar) {
    const L = set.letters.find(l => l.char === autoChar);
    if (L) requestAnimationFrame(() => open(L));
  }

  function open(L) {
    const side = Math.min(460, window.innerWidth - 48);
    const cv = el('canvas', { width: side, height: side,
      style: `width:${side}px;height:${side}px;touch-action:none;border-radius:16px;background:var(--card);box-shadow:var(--shadow)` });
    const ctx = cv.getContext('2d');
    const out = el('div'), chips = el('div', { class: 'row', style: 'gap:6px;justify-content:center;flex-wrap:wrap;margin:8px 0' });

    const img = glyphImage(L.glyph);
    const nStroke = L.strokes.length, nDot = (L.dots || []).length;
    const nStep = nStroke + nDot;
    let step = 0, pts = [], drawing = false, verdict = null, dotOk = null;
    const results = [];
    let LT = layout(L, side, img), mask = null;

    /* قناعُ الحرف: يُرسَمُ الشكلُ ونقطُه ثمّ يُقرأُ، فالتقويمُ على صورةِ
       الكرّاسةِ نفسِها لا على تقديرٍ منّا. */
    const build = () => {
      const P = 260, m = document.createElement('canvas');
      m.width = m.height = P;
      const c2 = m.getContext('2d'), s = P / side;
      c2.fillStyle = '#fff'; c2.fillRect(0, 0, P, P);
      if (img.complete && img.naturalWidth) {
        c2.drawImage(img, LT.glyph.x * s, LT.glyph.y * s, LT.glyph.w * s, LT.glyph.h * s);
      }
      c2.fillStyle = '#000';
      (L.dots || []).forEach(d => {
        const [x, y] = LT.pt(d.x, d.y), r = LT.dotSize * s / 2;
        c2.beginPath(); c2.arc(x * s, y * s, r, 0, 7); c2.fill();
      });
      const data = c2.getImageData(0, 0, P, P).data;
      const raw = new Uint8Array(P * P);
      for (let i = 0; i < P * P; i++) if (data[i * 4 + 3] > 40 && data[i * 4] < 160) raw[i] = 1;
      const dil = new Uint8Array(raw), R = 9;
      for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) if (raw[y * P + x])
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < P && ny >= 0 && ny < P) dil[ny * P + nx] = 1;
        }
      mask = { m: dil, P };
    };

    const isDot = () => step >= nStroke;
    const dotAt = () => L.dots[step - nStroke];
    const ref = () => (L.strokes[step] || []).map(([x, y]) => LT.pt(x, y));

    /* أسهمُ الدليلِ كأسهمِ الكرّاسة: على المسارِ نفسِه وباتّجاهِه */
    const arrows = (R) => {
      const total = R.reduce((a, p, i) => i ? a + Math.hypot(p[0] - R[i - 1][0], p[1] - R[i - 1][1]) : 0, 0);
      const gap = Math.max(46, total / 4);
      let acc = 0;
      for (let i = 1; i < R.length; i++) {
        acc += Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]);
        if (acc < gap) continue;
        acc = 0;
        const a = R[i - 1], b = R[i], an = Math.atan2(b[1] - a[1], b[0] - a[0]), h = 13;
        ctx.fillStyle = 'rgba(51,166,115,.95)';
        ctx.beginPath();
        ctx.moveTo(b[0], b[1]);
        ctx.lineTo(b[0] - h * Math.cos(an - 0.42), b[1] - h * Math.sin(an - 0.42));
        ctx.lineTo(b[0] - h * Math.cos(an + 0.42), b[1] - h * Math.sin(an + 0.42));
        ctx.closePath(); ctx.fill();
      }
    };

    const paint = () => {
      LT = layout(L, side, img);
      ctx.clearRect(0, 0, side, side);
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--card') || '#fff';
      ctx.fillRect(0, 0, side, side);
      ctx.strokeStyle = 'rgba(242,158,77,.45)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(12, side * .70); ctx.lineTo(side - 12, side * .70); ctx.stroke();
      ctx.setLineDash([]);

      // الشكلُ الباهتُ من الكرّاسة
      if (img.complete && img.naturalWidth) {
        ctx.globalAlpha = 0.16;
        ctx.drawImage(img, LT.glyph.x, LT.glyph.y, LT.glyph.w, LT.glyph.h);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(42,140,184,.16)';
      (L.dots || []).forEach(d => {
        const [x, y] = LT.pt(d.x, d.y), s = LT.dotSize;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
        ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
      });

      if (isDot()) {
        const d = dotAt(), [x, y] = LT.pt(d.x, d.y);
        ctx.strokeStyle = 'rgba(51,166,115,.9)'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
        ctx.beginPath(); ctx.arc(x, y, LT.dotSize * 1.5, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      } else {
        const R = ref();
        if (R.length) {
          ctx.strokeStyle = 'rgba(51,166,115,.65)'; ctx.lineWidth = 5;
          ctx.setLineDash([9, 7]); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); R.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
          ctx.stroke(); ctx.setLineDash([]);
          arrows(R);
          ctx.fillStyle = '#2ea043';
          ctx.beginPath(); ctx.arc(R[0][0], R[0][1], 14, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(ar(step + 1), R[0][0], R[0][1] + 1);
          ctx.strokeStyle = '#d9534f'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(R.at(-1)[0], R.at(-1)[1], 11, 0, 7); ctx.stroke();
        }
      }

      if (pts.length > 1) {
        ctx.strokeStyle = '#2a8cb8'; ctx.lineWidth = 7; ctx.lineJoin = ctx.lineCap = 'round';
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.stroke();
      } else if (pts.length === 1) {
        ctx.fillStyle = '#2a8cb8';
        ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], 5, 0, 7); ctx.fill();
      }
    };

    const stepBar = () => {
      clear(chips);
      for (let i = 0; i < nStep; i++) {
        const done = results[i] != null;
        // الحرفُ بنَفَسٍ واحدٍ، ولا يُقسَّمُ إلّا حيث يُرفَعُ القلمُ حقًّا
        const label = i < nStroke
          ? (nStroke === 1 ? 'الحَرْفُ كُلُّهُ' : `سَكْتَة ${ar(i + 1)}`)
          : 'نُقْطَة';
        chips.append(el('span', {
          style: 'padding:4px 10px;border-radius:999px;font-size:12px;'
            + (i === step ? 'font-weight:700;background:rgba(42,140,184,.18);color:var(--brand)'
              : done ? 'background:rgba(51,166,115,.15);color:var(--accent)'
                     : 'background:rgba(120,120,120,.12);color:var(--muted)')
        }, rtl(label)));
      }
    };

    const pos = e => {
      const r = cv.getBoundingClientRect();
      return [Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * side,
              Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1) * side];
    };
    cv.addEventListener('pointerdown', e => {
      if (verdict || dotOk != null) return;
      drawing = true; pts = [pos(e)]; cv.setPointerCapture(e.pointerId); paint();
    });
    cv.addEventListener('pointermove', e => {
      if (!drawing) return; const p = pos(e);
      if (Math.hypot(p[0] - pts.at(-1)[0], p[1] - pts.at(-1)[1]) > 3) { pts.push(p); paint(); }
    });
    cv.addEventListener('pointerup', () => {
      if (!drawing) return; drawing = false;
      isDot() ? scoreDot() : score();
    });

    const record = (sc) => {
      results[step] = sc;
      if (results.filter(x => x != null).length === nStep) {
        const all = results.filter(x => x != null);
        const complete = all.every(x => x >= 70);
        const val = complete ? Math.round(all.reduce((a, b) => a + b, 0) / all.length)
                             : Math.min(Math.min(...all), 69);
        if (val > (best[L.char] || 0)) { best[L.char] = val; S.set('trace', best); }
      }
      stepBar();
    };

    /* النقطةُ خطوةٌ تُقوَّم: أين وقعتْ، وهل هي نقطةٌ لا خطّ */
    function scoreDot() {
      const d = dotAt(), [cx, cy] = LT.pt(d.x, d.y);
      const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
      const my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const near = Math.hypot(mx - cx, my - cy) <= side * 0.075;
      const small = ext <= side * 0.16;
      dotOk = near && small;
      record(dotOk ? 100 : 40);
      show();
    }

    function score() {
      const R = ref();
      if (pts.length < 4 || !R.length) return;
      const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      const near = p => { let bi = 0, bd = 1e9; R.forEach((r, i) => { const x = d(p, r); if (x < bd) { bd = x; bi = i; } }); return bi; };
      const idx = pts.map(near);
      let fwd = 0, bwd = 0;
      for (let i = 1; i < idx.length; i++) idx[i] > idx[i - 1] ? fwd++ : idx[i] < idx[i - 1] && bwd++;
      const P = mask.P, s = P / side;
      const inside = pts.filter(([x, y]) => mask.m[Math.floor(y * s) * P + Math.floor(x * s)]).length;
      const v = {
        start: d(pts[0], R[0]) <= side * 0.20,
        dir: fwd >= bwd,
        cover: Math.min(1, new Set(idx).size / Math.max(R.length - 1, 1)),
        acc: inside / pts.length
      };
      v.score = Math.round((v.start ? 25 : 0) + (v.dir ? 25 : 0) + v.cover * 25 + v.acc * 25);
      verdict = v;
      record(v.score);
      show();
      // متى أتمَّ الطالبُ بدنَ الحرفِ صحيحًا ظهرتْ نقطتُه من نفسِها
      const pass = v.start && v.dir && v.score >= 70;
      if (pass && step + 1 < nStep && step + 1 >= nStroke) {
        setTimeout(() => { if (verdict) nextStep(); }, 900);
      }
    }

    const line = (ok, y, n) => el('div', { class: 'row', style: 'gap:8px' },
      el('span', { style: `color:${ok ? 'var(--accent)' : '#d9534f'};font-weight:700` }, ok ? '✓' : '✕'),
      el('span', {}, rtl(ok ? y : n)));

    const nextStep = () => {
      if (step < nStep - 1) step++;
      pts = []; verdict = null; dotOk = null; paint(); show(); stepBar();
    };

    function show() {
      clear(out);
      const last = step === nStep - 1;
      if (verdict == null && dotOk == null) {
        out.append(el('div', { class: 'box key' },
          rtl(isDot() ? 'ضَعِ النُّقْطَةَ فِي الدَّائِرَةِ المُتَقَطِّعَةِ.'
                      : (L.tip || 'ابدأْ من الدائرة الخضراء وانتهِ عند الحمراء.'))));
        return;
      }
      if (dotOk != null) {
        out.append(el('div', { class: 'card' },
          el('b', { style: `font-size:20px;color:${dotOk ? 'var(--accent)' : 'var(--warm)'}` },
            rtl(dotOk ? '✅ النُّقْطَةُ في مَوْضِعِها' : '↻ النُّقْطَةُ في غَيْرِ مَوْضِعِها')),
          el('div', { class: 'row', style: 'justify-content:center;margin-top:10px' },
            el('button', { class: 'btn ghost sm', onclick: () => { pts = []; dotOk = null; paint(); show(); } }, '↻ أعِدْ'),
            last ? null : el('button', { class: 'btn sm', onclick: nextStep }, 'الخُطْوَةُ التَّالِيَة'))));
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
        line(v.cover >= .75, 'أتممتَ الخطوة', 'لم تُتمَّ الخطوةَ إلى آخرها'),
        line(v.acc >= .75, 'بقيتَ على جسم الحرف', 'خرجتَ عن جسم الحرف كثيرًا'),
        el('div', { class: 'row', style: 'justify-content:center;margin-top:10px' },
          el('button', { class: 'btn ghost sm', onclick: () => { pts = []; verdict = null; paint(); show(); } }, '↻ أعِدْ'),
          last ? null : el('button', { class: 'btn sm', onclick: nextStep }, 'الخُطْوَةُ التَّالِيَة')),
        last ? el('div', { class: 'muted', style: 'margin-top:8px' },
          rtl('لَا يَتِمُّ الحَرْفُ إِلَّا بِخُطُواتِهِ كُلِّهَا.')) : null));
    }

    const start = () => { build(); stepBar(); paint(); show(); };
    if (img.complete && img.naturalWidth) start();
    else { img.onload = () => { build(); paint(); }; start(); }

    const bar = el('div', { class: 'row', style: 'justify-content:center;margin-top:12px;gap:8px;flex-wrap:wrap' },
      el('button', { class: 'btn ghost sm', onclick: () => { pts = []; verdict = null; dotOk = null; paint(); show(); } }, '↻ أعِدِ المُحاوَلَة'),
      el('button', { class: 'btn ghost sm', onclick: () => { step = 0; results.length = 0; pts = []; verdict = null; dotOk = null; stepBar(); paint(); show(); } }, '⟲ مِنَ البِدايَة'),
      el('button', { class: 'btn ghost sm', onclick: () => ov.remove() }, '✕ إغلاق'));

    const ov = el('div', {
      style: 'position:fixed;inset:0;z-index:140;background:var(--page);overflow:auto;padding:20px'
    }, el('div', { class: 'wrap center' },
      el('h3', {}, `${L.name} — ${L.char}`), chips, cv, bar, out));
    document.body.append(ov);
  }
}
