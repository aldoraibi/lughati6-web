import { el, rtl, ar } from './ui.js';

/** كتلة محتوى قرائي — تقابل ContentBlockView في تطبيق iPad */
export function block(b, memoBadge) {
  const wrap = el('div');
  if (memoBadge) wrap.append(el('span', { class: 'chip w' }, `مطلوبٌ حفظُه — ${memoBadge}`));

  switch (b.kind) {
    case 'heading':
      wrap.append(el('p', { class: 'blk heading' }, rtl(b.text))); break;
    case 'note':
      wrap.append(el('div', { class: 'blk note' }, ...lines(b.text))); break;
    case 'rule':
      wrap.append(el('div', { class: 'blk rule' }, ...lines(b.text))); break;
    case 'example':
      wrap.append(el('div', { class: 'blk note' }, ...lines(b.text))); break;
    case 'list':
      wrap.append(el('ul', { class: 'blk' }, ...(b.items || []).map(i => el('li', {}, rtl(i))))); break;
    case 'poem':
      (b.verses || []).forEach(v => wrap.append(
        el('div', { class: 'verse' }, ...v.map(h => el('span', {}, rtl(h))))));
      break;
    case 'table': {
      const t = el('table', { class: 't' });
      (b.rows || []).forEach(r => t.append(el('tr', {}, ...r.map(c => el('td', {}, rtl(c))))));
      wrap.append(el('div', { class: 'blk', style: 'overflow-x:auto' }, t));
      break;
    }
    case 'image':
      if (b.image) wrap.append(el('div', { class: 'blk' },
        el('img', { src: `content/images/${b.image}.jpg`, alt: b.caption || '', loading: 'lazy',
                    onerror: e => e.target.src = `content/images/${b.image}.png` })));
      break;
    case 'media':
      wrap.append(listenCard(b));
      break;
    default:
      wrap.append(el('p', { class: 'blk' }, ...lines(b.text)));
  }
  if (b.caption && b.kind !== 'media')
    wrap.append(el('div', { class: 'muted', style: 'font-size:13.5px;margin-top:-6px' }, rtl(b.caption)));
  return wrap;
}

const lines = t => (t || '').split('\n').flatMap((l, i) => i ? [el('br'), rtl(l)] : [rtl(l)]);

/** مشغّل الاستماع: صوتٌ فقط، وشاشة إصغاء تُخفي الصفحة */
function listenCard(b) {
  const audio = new Audio(`content/media/${b.media}.m4a`);
  audio.preload = 'metadata';
  let count = 0;

  const badge = el('span', { class: 'chip a', style: 'display:none' });
  const start = el('button', { class: 'btn', onclick: () => focusMode() },
    '▶︎  ابدأِ الاستماع');

  const card = el('div', { class: 'card' },
    el('div', { class: 'row', style: 'justify-content:space-between' },
      el('h3', {}, rtl('أَسْتَمِعُ إِلَى النَّصِّ')), badge),
    start,
    el('div', { class: 'muted', style: 'font-size:13.5px;margin-top:8px' },
      rtl('ستُخفى الصفحة أثناء الاستماع حتى لا يشغلك شيءٌ عن الإصغاء.')),
    b.caption ? el('div', { class: 'muted', style: 'font-size:13px;margin-top:6px' }, rtl(b.caption)) : null
  );

  function focusMode() {
    const clock = el('div', { style: 'font-size:16px;opacity:.75;font-variant-numeric:tabular-nums' }, '٠:٠٠');
    const bar = el('div', { style: 'height:6px;background:rgba(255,255,255,.18);border-radius:99px;overflow:hidden;width:min(460px,80vw)' },
      el('i', { style: 'display:block;height:100%;width:0;background:var(--warm)' }));
    const wave = el('div', { style: 'display:flex;gap:7px;height:64px;align-items:center' },
      ...Array.from({ length: 11 }, () => el('i', {
        style: 'width:7px;border-radius:99px;background:var(--warm);height:12px;transition:height .38s' })));
    const play = el('button', { class: 'btn', style: 'width:76px;height:76px;border-radius:50%;justify-content:center;font-size:26px' }, '❚❚');
    const done = el('button', { class: 'btn ghost', style: 'color:#fff;border-color:rgba(255,255,255,.3)' }, 'إيقافُ الاستماعِ والعودة');

    const ov = el('div', {
      style: `position:fixed;inset:0;z-index:200;background:#0f1c26;color:#fff;display:flex;
              flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:24px`
    },
      el('div', { style: 'font-size:26px;font-weight:700' }, rtl('أُصْغِي…')),
      wave, bar, clock,
      el('div', { class: 'row', style: 'gap:16px' },
        btn('⟲ ١٠', () => audio.currentTime = Math.max(0, audio.currentTime - 10)),
        play,
        btn('١٠ ⟳', () => audio.currentTime += 10),
        btn('↺', () => { audio.currentTime = 0; audio.play(); })),
      el('div', { class: 'row', style: 'gap:8px' },
        ...[0.75, 1, 1.25].map(r => btn(r === 1 ? 'سرعة عادية' : `سرعة ${ar(r)}`,
          e => { audio.playbackRate = r; }, 'sm'))),
      done);

    document.body.append(ov);
    audio.currentTime = 0; audio.play();
    const t = setInterval(tick, 300);
    let phase = 0;

    function tick() {
      const d = audio.duration || 1;
      bar.firstChild.style.width = `${(audio.currentTime / d) * 100}%`;
      clock.textContent = `${fmt(audio.currentTime)} / ${fmt(d)}`;
      const base = [18, 34, 52, 30, 62, 44, 66, 26, 50, 36, 20];
      [...wave.children].forEach((c, i) =>
        c.style.height = (audio.paused ? 12 : base[(i + phase) % base.length]) + 'px');
      phase++;
      play.textContent = audio.paused ? '▶' : '❚❚';
    }
    play.onclick = () => audio.paused ? audio.play() : audio.pause();
    audio.onended = () => { count++; badge.textContent = `استمعتُ ${ar(count)} مرة`; badge.style.display = ''; };
    done.onclick = () => { audio.pause(); clearInterval(t); ov.remove(); };
  }

  const btn = (label, fn, cls = '') =>
    el('button', { class: 'btn ghost ' + cls, style: 'color:#fff;border-color:rgba(255,255,255,.28)', onclick: fn }, label);
  const fmt = s => `${ar(Math.floor(s / 60))}:${ar(String(Math.floor(s % 60)).padStart(2, '0'))}`;

  return card;
}
