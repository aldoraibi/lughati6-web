import { el, ar, fill } from './ui.js';

/** ساعةٌ عائمةٌ فوق الصفحة: تُسحب، وتُضبط شفافيّتُها ومدّتُها، ولها نغمةُ نهاية */
let box = null;

export function toggleTimer() { box ? hide() : show(); }
export const timerVisible = () => !!box;
function hide() { box?.remove(); box = null; }

function show() {
  const S = k => { try { return JSON.parse(localStorage.getItem('lg6.timer.' + k)); } catch { return null; } };
  const W = (k, v) => localStorage.setItem('lg6.timer.' + k, JSON.stringify(v));

  let duration = S('dur') || 300, left = duration, running = false, tick = null;
  let opacity = S('op') ?? 0.95, chime = S('chime') ?? true, compact = false;
  let pos = S('pos') || { x: 24, y: 84 };

  const time = el('div', { style: 'font-size:52px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums' });
  const bar = el('div', { style: 'height:4px;border-radius:99px;background:rgba(128,128,128,.25);overflow:hidden;margin-top:8px' },
    el('i', { style: 'display:block;height:100%;width:0;background:var(--primary);transition:width .3s' }));
  const panel = el('div');

  const fmt = s => `${ar(Math.floor(s / 60))}:${ar(String(s % 60).padStart(2, '0'))}`;
  const paintTime = () => {
    time.textContent = fmt(left);
    time.style.color = left === 0 ? '#d9534f' : left <= 30 ? 'var(--warm)' : 'var(--primary)';
    bar.firstChild.style.width = `${duration ? ((duration - left) / duration) * 100 : 0}%`;
    bar.firstChild.style.background = time.style.color;
  };

  const start = () => {
    if (left <= 0) { left = duration; }
    running = true; paintPanel();
    clearInterval(tick);
    tick = setInterval(() => {
      left = Math.max(0, left - 1); paintTime();
      if (left === 0) { clearInterval(tick); running = false; paintPanel(); if (chime) playChime(); }
    }, 1000);
  };
  const pause = () => { running = false; clearInterval(tick); paintPanel(); };

  const rnd = (label, fn, big) => el('button', {
    class: 'btn' + (big ? '' : ' ghost'),
    style: `width:${big ? 48 : 38}px;height:${big ? 48 : 38}px;border-radius:50%;justify-content:center;padding:0;font-size:${big ? 19 : 15}px`,
    onclick: fn
  }, label);

  let showSet = false;
  function paintPanel() {
    fill(panel, 
      el('div', { class: 'row', style: 'justify-content:center;gap:9px;margin-top:12px' },
        rnd(running ? '❚❚' : '▶', () => running ? pause() : start(), true),
        rnd('↺', () => { pause(); left = duration; paintTime(); }),
        rnd('＋', () => { left += 60; if (left > duration) duration = left; paintTime(); }),
        rnd('⚙', () => { showSet = !showSet; paintPanel(); })),
      showSet ? settings() : null);
  }

  function settings() {
    const s = el('div', { style: 'margin-top:12px;display:grid;gap:10px;width:250px' });
    const presets = el('div', { class: 'row', style: 'gap:6px;justify-content:center' });
    [60, 120, 300, 600, 900].forEach(p => presets.append(el('button', {
      class: 'btn sm' + (duration === p ? '' : ' ghost'),
      onclick: () => { duration = p; left = p; W('dur', p); pause(); paintTime(); paintPanel(); }
    }, p % 60 === 0 ? `${ar(p / 60)} د` : `${ar(p)} ث`)));
    s.append(presets);

    const op = el('input', { type: 'range', min: 25, max: 100, value: Math.round(opacity * 100), dir: 'ltr',
      oninput: e => { opacity = e.target.value / 100; box.style.opacity = opacity; W('op', opacity); } });
    s.append(el('div', { class: 'row', style: 'gap:8px' }, '◐', op));

    const ch = el('input', { type: 'checkbox', checked: chime,
      onchange: e => { chime = e.target.checked; W('chime', chime); } });
    s.append(el('label', { class: 'row', style: 'gap:8px;font-size:14px' }, ch, 'نغمةُ نهاية الوقت'));

    s.append(el('button', { class: 'btn ghost sm', onclick: () => {
      pos = { x: 24, y: 84 }; W('pos', pos); place();
    } }, 'أعِدْها إلى مكانها'));
    return s;
  }

  box = el('div', {
    style: `position:fixed;z-index:130;padding:14px;border-radius:20px;opacity:${opacity};
            background:color-mix(in srgb,var(--card) 92%,transparent);backdrop-filter:blur(14px);
            border:1px solid color-mix(in srgb,var(--primary) 30%,transparent);
            box-shadow:0 10px 30px rgba(0,0,0,.22);touch-action:none;user-select:none;text-align:center`
  },
    el('div', { class: 'row', style: 'justify-content:space-between;gap:12px' },
      el('button', { class: 'btn ghost sm', style: 'padding:4px 8px', onclick: () => {
        compact = !compact; panel.style.display = compact ? 'none' : ''; bar.style.display = compact ? 'none' : '';
        time.style.fontSize = compact ? '34px' : '52px';
      } }, '▾'),
      time,
      el('button', { class: 'btn ghost sm', style: 'padding:4px 8px', onclick: hide }, '✕')),
    bar, panel);

  const place = () => { box.style.left = pos.x + 'px'; box.style.top = pos.y + 'px'; };
  place(); paintTime(); paintPanel();

  // السحب
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  box.addEventListener('pointerdown', e => {
    if (e.target.closest('button,input,label')) return;
    dragging = true; sx = e.clientX; sy = e.clientY; ox = pos.x; oy = pos.y;
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', e => {
    if (!dragging) return;
    pos = { x: Math.max(0, ox + e.clientX - sx), y: Math.max(0, oy + e.clientY - sy) };
    place();
  });
  box.addEventListener('pointerup', () => { if (dragging) { dragging = false; W('pos', pos); } });

  document.body.append(box);
}

/** نغمةٌ مولَّدةٌ في المتصفّح — بلا ملفِّ صوت */
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1108.73, 1318.51].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      const t0 = ctx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
      o.connect(g).connect(ctx.destination);
      o.start(t0); o.stop(t0 + 0.45);
    });
  } catch {}
}
