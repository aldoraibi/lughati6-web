import { el, rtl, ar } from './ui.js';
import { C, S } from './store.js';

// ===== لوحُ كتابةِ العبارةِ بالقلم (نظيرُ HandwritingPadView في التطبيق) =====
// يُبدِل صندوقَ الكتابةِ بالكيبورد في أسئلةِ الرسمِ الكتابيّ. والمقياسُ نفسُه:
// نرسمُ العبارةَ نموذجًا شاحبًا، ثمّ نقارنُ حبرَ الطالبِ بحبرِ النموذجِ في
// الشبكةِ نفسِها، فنعرفُ: هل أتمَّ الحروف؟ وهل بقي داخلَها؟

const FONT_SIZE = 40;
const PAD = 20;
const fontOf = px => `${px}px "Geeza Pro", "Al Bayan", system-ui, sans-serif`;

/** يقسم العبارةَ سطورًا تتّسع للعرض المتاح */
function layout(ctx, phrase, maxWidth, size) {
  ctx.font = fontOf(size);
  const words = phrase.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxWidth && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/** يرسم النموذج. الدالّةُ نفسُها تُستعمَل للعرضِ وللقياس، فيستحيلُ اختلافُ الموضع */
function drawModel(ctx, phrase, w, h, size, color) {
  const lines = layout(ctx, phrase, w - PAD * 2, size);
  ctx.font = fontOf(size);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  const step = size * 1.55;
  const top = (h - step * lines.length) / 2 + step / 2;
  lines.forEach((l, i) => ctx.fillText(l, w / 2, top + i * step));
  return lines.length;
}

function modelHeight(phrase, w, size) {
  const c = document.createElement('canvas').getContext('2d');
  const n = layout(c, phrase, w - PAD * 2, size).length;
  return Math.round(n * size * 1.55 + PAD * 2);
}

/** شبكةٌ منطقيّة من صورة */
const bits = (data, thr) => {
  const out = new Uint8Array(data.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > thr ? 1 : 0;
  return out;
};

function dilate(src, w, h, r) {
  const tmp = new Uint8Array(src), out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (src[y * w + x]) {
    for (let d = -r; d <= r; d++) { const nx = x + d; if (nx >= 0 && nx < w) tmp[y * w + nx] = 1; }
  }
  out.set(tmp);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (tmp[y * w + x]) {
    for (let d = -r; d <= r; d++) { const ny = y + d; if (ny >= 0 && ny < h) out[ny * w + x] = 1; }
  }
  return out;
}

// ===== اتّجاه القلم =====
// كان التقويم يقيس موضع الحبر ولا يقيس حركة القلم؛ فمن رسم الألف من أسفل إلى
// أعلى وقع حبره في موضع الألف تمامًا فحُكم له بالصواب، وهو خطأ محض في الخطّ.
// والصورةُ لا تحمل ترتيبًا يُعرَف منه رسمُ كلّ حرف، لكنّ في العربيّة قواعد
// لا تتخلّف: القائم يُبدأ من أعلى وينزل، والحركة الممتدّة من اليمين إلى اليسار.
// ونستثني القصير (النقط والحركات) والمنحني المغلق (كعين الصاد) فلا حكم عليهما.

const pathLen = p => {
  let t = 0;
  for (let i = 1; i < p.length; i++) t += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return t;
};

function penFaults(strokes, fontSize) {
  const out = [];
  const min = fontSize * 0.45;
  for (const s of strokes) {
    const p = s.p;
    if (!p || p.length < 3) continue;
    const L = pathLen(p);
    if (L < min) continue;
    const dx = p[p.length - 1][0] - p[0][0], dy = p[p.length - 1][1] - p[0][1];
    const net = Math.hypot(dx, dy);
    if (net < L * 0.55) continue;                       // منحنٍ أو مغلق
    // القائم وحده يُحاسَب عليه. وكانت هنا قاعدة «الممتدّ من اليمين لليسار»
    // فأسقطناها: كرّاسة «خطي أجمل» تُثبت أنّ عارضة الحاء تُرسم من اليسار إلى
    // اليمين وأنّ ذيل العين ينتهي يمينًا، فكانت تُخطِّئ المصيب.
    if (Math.abs(dy) > Math.abs(dx) * 1.6 && dy < 0) out.push({ kind: 'up', p });
  }
  return out;
}

function wroteLeftToRight(strokes, fontSize, width) {
  const long = strokes.filter(s => s.p && pathLen(s.p) >= fontSize * 0.45);
  if (long.length < 3 || !width) return false;
  const a = long[0].p[0], b = long[long.length - 1].p[long[long.length - 1].p.length - 1];
  return (b[0] - a[0]) > width * 0.25;
}

const count = a => a.reduce((n, v) => n + v, 0);
const both = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] && b[i]) n++; return n; };

export function handwritingPad(phrase, key) {
  const wrap = el('div', { style: 'margin-top:10px' });
  wrap.append(el('div', { class: 'muted', style: 'font-size:14px;margin-bottom:6px' },
    rtl('اُرسمِ العبارةَ بالقلمِ (أو بالإصبع) فوقَ النموذجِ الشاحب، ثمّ اطلبْ تقويمَ خطِّك.')));

  const holder = el('div', {
    style: `position:relative;background:#fff;border:1px solid color-mix(in srgb,var(--primary) 35%,transparent);
            border-radius:14px;overflow:hidden;touch-action:none`
  });
  // كلتا اللوحتينِ مطلقتانِ في الحاوية: أيُّ إزاحةٍ بينهما تعني قياسًا كاذبًا،
  // فيُخطَّأُ الطالبُ وهو مصيب. فنُثبِّتُهما في المكانِ نفسِه لا نتركُ للتخطيطِ خيارًا.
  const ghost = el('canvas', { style: 'position:absolute;left:0;top:0;display:block' });
  const ink = el('canvas', { style: 'position:absolute;left:0;top:0;display:block;cursor:crosshair' });
  holder.append(ghost, ink);
  wrap.append(holder);

  const out = el('div');
  let strokes = S.get(key, []) || [];
  let cur = null, pen = 6, showGhost = true, faultPaths = [];
  let W = 0, H = 0, dpr = 1;

  function size() {
    W = holder.clientWidth || 600;
    H = modelHeight(phrase, W, FONT_SIZE);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    holder.style.height = H + 'px';
    [ghost, ink].forEach(c => {
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      c.style.width = W + 'px'; c.style.height = H + 'px';
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    paintGhost(); paintInk();
  }

  function paintGhost() {
    const c = ghost.getContext('2d');
    c.clearRect(0, 0, W, H);
    if (showGhost) drawModel(c, phrase, W, H, FONT_SIZE, 'rgba(20,30,45,.17)');
  }

  function paintInk() {
    const c = ink.getContext('2d');
    c.clearRect(0, 0, W, H);
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'var(--primary)';
    c.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#2a8cb8';
    strokes.forEach(s => {
      c.lineWidth = s.w;
      c.beginPath();
      s.p.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
      if (s.p.length === 1) c.lineTo(s.p[0][0] + 0.1, s.p[0][1]);
      c.stroke();
    });

    // الحركاتُ المعكوسةُ بالأحمر مع نقطةٍ عند مبدئها: الرقمُ وحدَه لا يُعلِّم،
    // والطالبُ يحتاج أن يرى من أين بدأ وإلى أين ذهب.
    c.strokeStyle = '#d9534f'; c.fillStyle = '#d9534f'; c.lineWidth = 3;
    faultPaths.forEach(f => {
      c.beginPath();
      f.p.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]));
      c.stroke();
      c.beginPath(); c.arc(f.p[0][0], f.p[0][1], 5, 0, 7); c.fill();
    });
  }

  const at = e => {
    const r = ink.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  ink.addEventListener('pointerdown', e => {
    ink.setPointerCapture(e.pointerId);
    // متى عاد يكتب سقط الحكمُ السابقُ ومعه الحركاتُ الحمراء
    if (faultPaths.length) { faultPaths = []; out.replaceChildren(); }
    cur = { w: pen, p: [at(e)] }; strokes.push(cur); paintInk();
  });
  ink.addEventListener('pointermove', e => { if (cur) { cur.p.push(at(e)); paintInk(); } });
  const stop = () => { if (cur) { cur = null; S.set(key, strokes); } };
  ink.addEventListener('pointerup', stop);
  ink.addEventListener('pointercancel', stop);

  // ===== التقويم =====
  function judge() {
    const s = Math.min(1, 600 / Math.max(W, 1));       // شبكةٌ مخفّضةٌ تكفي وتُسرِع
    const gw = Math.max(1, Math.round(W * s)), gh = Math.max(1, Math.round(H * s));

    const mk = () => {
      const c = document.createElement('canvas');
      c.width = gw; c.height = gh;
      const x = c.getContext('2d');
      x.scale(s, s);
      return [c, x];
    };

    const [mc, mx] = mk();
    drawModel(mx, phrase, W, H, FONT_SIZE, '#000');
    const model = bits(mx.getImageData(0, 0, gw, gh).data, 60);

    const [sc, sx] = mk();
    sx.lineCap = 'round'; sx.lineJoin = 'round'; sx.strokeStyle = '#000';
    strokes.forEach(st => {
      sx.lineWidth = st.w;
      sx.beginPath();
      st.p.forEach((p, i) => i ? sx.lineTo(p[0], p[1]) : sx.moveTo(p[0], p[1]));
      if (st.p.length === 1) sx.lineTo(st.p[0][0] + 0.1, st.p[0][1]);
      sx.stroke();
    });
    const stud = bits(sx.getImageData(0, 0, gw, gh).data, 60);

    const mi = count(model), si = count(stud);
    if (!mi) return null;
    if (si < 40) return { empty: true };

    const tol = Math.max(3, Math.round(FONT_SIZE * s * 0.22));
    const coverage = both(model, dilate(stud, gw, gh, tol)) / mi;
    const accuracy = both(stud, dilate(model, gw, gh, tol)) / si;
    const faults = penFaults(strokes, FONT_SIZE);
    const l2r = wroteLeftToRight(strokes, FONT_SIZE, W);
    const notes = [];
    const up = faults.length;
    if (up) notes.push(`رسمتَ ${ar(up)} من الحروفِ القائمةِ من أسفلَ إلى أعلى. الألفُ واللامُ وعمودُ الطاءِ والكافِ تُبدأُ من أعلى وينزلُ بها القلمُ إلى السطر.`);
    if (l2r) notes.push('سارتِ العبارةُ عندك من اليسارِ إلى اليمين. ابدأْ من أقصى اليمين.');
    if (faults.length) notes.push('الحركاتُ الحمراءُ على اللوحِ هي التي عكستَ اتّجاهَها.');

    if (coverage < 0.75) notes.push('بقيتْ حروفٌ من النموذجِ لم تمرَّ عليها: أتمِمِ العبارةَ كلَّها.');
    if (accuracy < 0.70) notes.push('خرجَ قلمُك عن موضعِ الحرفِ كثيرًا: اجعلِ الحرفَ على النموذجِ لا بجانبِه.');
    if (si > mi * 2.2) notes.push('حروفُك أعرضُ من النموذج: اخترْ قلمًا أدقَّ.');
    if (coverage >= 0.75 && accuracy >= 0.70 && !faults.length && !l2r)
      notes.push('رسمُ الحروفِ ومواضعُها واتّجاهُ قلمِك سليم. يبقى الجمالُ واستواءُ السطرِ يُقوِّمُهما معلّمُك.');

    return { coverage, accuracy, notes, faults, wrongDir: faults.length > 0 || l2r };
  }

  function report() {
    const r = judge();
    out.replaceChildren();
    if (!r) return;
    if (r.empty) { out.append(el('div', { class: 'box key' }, 'لم أجدْ كتابةً بالقلمِ بعدُ.')); return; }
    // خطأُ الاتّجاه لا يُجبَرُ بالتغطية: من رسم الألفَ صاعدًا فقد أخطأ الحرفَ
    // كلَّه وإن وقع حبرُه في موضعِه. فيُحسَمُ الحكمُ ولا يُرفَعُ فوق الخمسين.
    const base = Math.round((r.coverage * 0.55 + r.accuracy * 0.45) * 100);
    const p = r.wrongDir ? Math.min(base, 50) : base;
    faultPaths = r.faults || [];
    paintInk();
    const verdict = r.wrongDir ? '⚠︎ اتّجاهُ القلمِ خطأ'
      : p >= 82 ? '✅ خطٌّ متقن' : p >= 62 ? '👍 قريبٌ — أعِدْ ما خرجَ عن الحرف' : '↻ أعِدِ الكتابةَ متتبِّعًا النموذج';
    out.append(el('div', { class: 'box ' + (!r.wrongDir && p >= 62 ? 'model' : 'key') },
      el('b', {}, `${verdict}  —  ${ar(p)}٪`),
      el('div', { style: 'margin-top:6px;font-size:15px' },
        `إتمامُ الحروف: ${ar(Math.round(r.coverage * 100))}٪  ·  البقاءُ داخلَ الحرف: ${ar(Math.round(r.accuracy * 100))}٪`),
      ...r.notes.map(n => el('div', { style: 'margin-top:6px' }, '— ' + rtl(n))),
      el('div', { class: 'muted', style: 'margin-top:8px;font-size:13px' },
        rtl('هذا القياسُ لرسمِ الحرفِ وموضعِه فحسب؛ أمّا جمالُ الخطِّ فيقوِّمُه معلّمُك.'))));
  }

  const tools = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;margin-top:9px' },
    el('button', { class: 'btn sm', onclick: report }, '✓ قوِّمْ خطّي'),
    el('button', { class: 'btn sm ghost', onclick: () => { strokes.pop(); S.set(key, strokes); paintInk(); } }, '↶ تراجُع'),
    el('button', { class: 'btn sm ghost', onclick: () => { strokes = []; S.set(key, strokes); paintInk(); out.replaceChildren(); } }, '🗑 امسحِ الكلَّ'),
    el('button', { class: 'btn sm ghost', onclick: e => {
      showGhost = !showGhost; paintGhost();
      e.target.textContent = showGhost ? '👁 أخفِ النموذج' : '👁 أظهِرِ النموذج';
    } }, '👁 أخفِ النموذج'),
    ...[3, 6, 10].map(w => el('button', {
      class: 'btn sm ghost', style: 'padding:4px 10px', onclick: () => { pen = w; }
    }, '● ' + ar(w))));

  // ===== تدريبُ حروفِ العبارة =====
  // في الحرفِ المفردِ عندنا مسارُ القلمِ نقطةً نقطة، فنعرفُ مبدأَه واتّجاهَه على
  // التحقيق. فمن أخطأ الاتّجاهَ في العبارةِ رددناه إلى حروفِها ثمّ يعود.
  const drill = el('div', { class: 'box', style: 'margin-top:10px' });
  const chars = [...new Set(phrase.split(''))];
  const drillLetters = (C.letters?.letters || []).filter(L => chars.includes(L.char));
  if (drillLetters.length) {
    drill.append(el('b', {}, '✍️ تدرَّبْ على مبدإِ حروفِ العبارةِ واتّجاهِها:'));
    const row = el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap;margin-top:8px' });
    drillLetters.forEach(L => row.append(el('button', {
      class: 'btn ghost sm', style: 'font-size:22px;padding:4px 12px', title: L.name,
      onclick: () => window.dispatchEvent(new CustomEvent('lg6:trace', { detail: { char: L.char } }))
    }, L.char)));
    drill.append(row);
    wrap.append(tools, out, drill);
  } else {
    wrap.append(tools, out);
  }
  requestAnimationFrame(size);
  window.addEventListener('resize', () => requestAnimationFrame(size));
  return wrap;
}
