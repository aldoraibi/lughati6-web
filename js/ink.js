import { el } from './ui.js';

// ===== القلم والسبّورة =====
// القيدُ الذي بُني عليه هذا: لا أجهزةَ مع الطلاب، وإنّما شاشةُ المعلّمِ معروضةٌ
// على السبّورة. فالمعلّمُ يحتاج أن يؤشّرَ على النصِّ أمامهم، وأن يفتحَ سطحًا
// أبيضَ يكتبُ فيه ما يعرِض له. وهذان هما هذا الملفّ.
//
// الحبرُ مرتبطٌ بالصفحةِ لا بالشاشة، فإذا مرّرتَ الصفحةَ سار معها ما كتبتَه
// فوقَ الفقرةِ التي كتبتَه فوقها.

const COLORS = ['#111827', '#2a8cb8', '#d9534f', '#2e9e5b', '#e08a1e'];
const WIDTHS = [2, 4, 8, 16];

function engine(canvas, fit) {
  const ctx = canvas.getContext('2d');
  let strokes = [], cur = null;
  const st = { color: COLORS[1], width: 4, eraser: false, draw: true };

  function resize() {
    const { w, h } = fit();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, w * dpr); canvas.height = Math.max(1, h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    repaint();
  }

  function repaint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokes.forEach(s => {
      ctx.globalCompositeOperation = s.eraser ? 'destination-out' : 'source-over';
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width;
      ctx.beginPath();
      s.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] + 0.1, s.pts[0][1]);
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  const at = e => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  canvas.addEventListener('pointerdown', e => {
    if (!st.draw) return;
    canvas.setPointerCapture(e.pointerId);
    cur = { color: st.color, width: st.eraser ? st.width * 4 : st.width, eraser: st.eraser, pts: [at(e)] };
    strokes.push(cur); repaint();
  });
  canvas.addEventListener('pointermove', e => {
    if (!cur) return;
    cur.pts.push(at(e)); repaint();
  });
  const end = () => { cur = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  window.addEventListener('resize', resize);
  resize();

  return {
    st, resize, repaint,
    undo: () => { strokes.pop(); repaint(); },
    clear: () => { strokes = []; repaint(); },
    empty: () => strokes.length === 0,
    destroy: () => window.removeEventListener('resize', resize)
  };
}

/** شريطُ الأدوات المشتركُ بين القلمِ والسبّورة */
function toolbar(E, onClose, extra) {
  const bar = el('div', {
    style: `position:fixed;z-index:150;inset-inline:0;bottom:14px;display:flex;justify-content:center;
            pointer-events:none`
  });
  const inner = el('div', {
    class: 'card',
    style: `pointer-events:auto;display:flex;align-items:center;gap:10px;padding:9px 13px;flex-wrap:wrap;
            box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:94vw`
  });
  bar.append(inner);

  const paint = () => {
    inner.replaceChildren();
    COLORS.forEach(c => inner.append(el('button', {
      title: 'لون', style: `width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;
             border:${!E.st.eraser && E.st.color === c ? '3px solid var(--primary)' : '1px solid rgba(0,0,0,.2)'}`,
      onclick: () => { E.st.color = c; E.st.eraser = false; paint(); }
    })));
    inner.append(el('span', { style: 'width:1px;height:24px;background:rgba(128,128,128,.35)' }));
    WIDTHS.forEach(w => inner.append(el('button', {
      title: 'سُمك', style: `width:30px;height:30px;border-radius:50%;display:grid;place-items:center;cursor:pointer;
             background:${E.st.width === w && !E.st.eraser ? 'color-mix(in srgb,var(--primary) 20%,transparent)' : 'transparent'};
             border:0`,
      onclick: () => { E.st.width = w; E.st.eraser = false; paint(); }
    }, el('i', { style: `display:block;width:${w + 4}px;height:${w + 4}px;border-radius:50%;background:currentColor` }))));
    inner.append(el('span', { style: 'width:1px;height:24px;background:rgba(128,128,128,.35)' }));
    inner.append(el('button', { class: 'btn sm' + (E.st.eraser ? '' : ' ghost'),
      onclick: () => { E.st.eraser = !E.st.eraser; paint(); } }, '🩹 ممحاة'));
    inner.append(el('button', { class: 'btn sm ghost', onclick: () => E.undo() }, '↶ تراجُع'));
    inner.append(el('button', { class: 'btn sm ghost', onclick: () => E.clear() }, '🗑 امسح الكلّ'));
    if (extra) extra(inner, paint);
    inner.append(el('button', { class: 'btn sm', onclick: onClose }, '✕ إغلاق'));
  };
  paint();
  document.body.append(bar);
  return { bar, paint };
}

// ===== القلم فوق الصفحة =====

let inkLayer = null;
export const inkOn = () => !!inkLayer;

export function toggleInk() {
  if (inkLayer) { closeInk(); return false; }
  const canvas = el('canvas', {
    style: `position:absolute;left:0;top:0;z-index:90;touch-action:none;cursor:crosshair`
  });
  document.body.append(canvas);
  const E = engine(canvas, () => ({
    w: document.documentElement.scrollWidth,
    h: Math.max(document.documentElement.scrollHeight, window.innerHeight)
  }));

  const setMode = () => {
    canvas.style.pointerEvents = E.st.draw ? 'auto' : 'none';
    canvas.style.cursor = E.st.draw ? 'crosshair' : 'default';
  };
  setMode();

  const T = toolbar(E, closeInk, (host, paint) => {
    host.append(el('button', { class: 'btn sm' + (E.st.draw ? ' ghost' : ''),
      onclick: () => { E.st.draw = !E.st.draw; setMode(); paint(); } },
      E.st.draw ? '✋ للتمرير' : '✍️ للكتابة'));
  });

  inkLayer = { canvas, E, T };
  return true;
}

export function closeInk() {
  if (!inkLayer) return;
  inkLayer.E.destroy();
  inkLayer.canvas.remove();
  inkLayer.T.bar.remove();
  inkLayer = null;
}

/** يُستدعى بعد كلِّ إعادةِ رسمٍ للصفحة، فطولُ المستندِ يتغيّر */
export function refitInk() { inkLayer?.E.resize(); }

// ===== السبّورة البيضاء =====

let board = null;

export function openBoard() {
  if (board) return;
  const canvas = el('canvas', { style: 'position:absolute;inset:0;touch-action:none;cursor:crosshair' });
  const wrap = el('div', {
    style: `position:fixed;inset:0;z-index:140;background:#fff`
  }, canvas);
  document.body.append(wrap);
  const E = engine(canvas, () => ({ w: window.innerWidth, h: window.innerHeight }));
  E.st.color = COLORS[0];
  const T = toolbar(E, closeBoard);
  board = { wrap, E, T };
}

export function closeBoard() {
  if (!board) return;
  board.E.destroy(); board.wrap.remove(); board.T.bar.remove();
  board = null;
}
