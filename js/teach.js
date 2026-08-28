import { el, rtl, ar, clear } from './ui.js';
import { C, S, skillTitle } from './store.js';

/** وضع العرض على السبّورة — لا أجهزة مع الطلاب */
export function teachMode(lessonID, lessonTitle, mode) {
  const plan = C.teach?.lessons?.[lessonID];
  if (!plan) return;

  let stage = 'intro', step = 0, shown = false, t0 = Date.now(), timer = null;
  let size = S.get('classSize', 25);
  const counts = (plan.group.items || []).map(() => 0);

  const clock = el('span', { class: 'chip p', style: 'font-variant-numeric:tabular-nums' }, '٠:٠٠');
  const host = el('div', { style: 'flex:1;display:flex;flex-direction:column;justify-content:center;gap:20px;text-align:center' });

  const ov = el('div', {
    style: `position:fixed;inset:0;z-index:150;background:var(--page);display:flex;flex-direction:column;
            padding:22px;overflow:auto`
  },
    el('div', { class: 'row', style: 'justify-content:space-between' },
      el('button', { class: 'btn ghost sm', onclick: close }, '✕  إنهاء'),
      el('b', {}, (mode === 'warmup' ? 'التهيئة — ' : 'القياس — ') + lessonTitle),
      clock),
    host);

  document.body.append(ov);
  timer = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    clock.textContent = `${ar(Math.floor(s / 60))}:${ar(String(s % 60).padStart(2, '0'))}`;
    clock.style.background = s > 300 ? 'rgba(217,83,79,.16)' : '';
    clock.style.color = s > 300 ? '#d9534f' : '';
  }, 1000);

  function close() { clearInterval(timer); ov.remove(); }
  const big = (txt, cls = '') => el('div', { class: cls, style: 'font-size:clamp(24px,3.4vw,42px);font-weight:600;line-height:1.7' }, rtl(txt));
  const btn = (t, fn, c = '') => el('button', { class: 'btn ' + c, style: 'font-size:20px;padding:13px 30px', onclick: fn }, t);

  // النداءُ بعد تعريفِ big وbtn: كانا ثابتينِ يُستعملانِ قبلَ تهيئتِهما،
  // فكانت التهيئةُ والقياسُ تنكسرانِ في الويبِ انكسارًا صامتًا.
  paint();

  function paint() {
    clear(host);
    if (stage === 'intro') return intro();
    if (stage === 'items') return items();
    if (stage === 'exit') return exitTicket();
    return report();
  }

  function intro() {
    if (mode === 'warmup') {
      const w = plan.warmup;
      host.append(
        el('h2', { style: 'font-size:clamp(26px,4vw,40px)' }, rtl(w.title)),
        el('div', { class: 'chip a', style: 'margin:auto' }, '↩︎ ' + rtl(w.linkTo)),
        el('div', { class: 'card', style: 'font-size:clamp(18px,2.3vw,26px)' }, rtl(w.rule)),
        btn('ابدأْ', () => { stage = 'items'; step = 0; shown = false; paint(); }));
    } else {
      const sizeLbl = el('b', { style: 'font-size:24px' }, ar(size));
      host.append(
        el('h2', { style: 'font-size:clamp(26px,4vw,40px)' }, rtl('القِيَاسُ الجَمَاعِيُّ')),
        el('div', { class: 'card', style: 'font-size:clamp(18px,2.2vw,24px)' }, rtl(plan.group.instructions)),
        el('div', { class: 'row', style: 'justify-content:center;gap:14px' },
          'عدد طلاب الصف',
          el('button', { class: 'btn ghost', onclick: () => { size = Math.max(5, size - 1); S.set('classSize', size); sizeLbl.textContent = ar(size); } }, '−'),
          sizeLbl,
          el('button', { class: 'btn ghost', onclick: () => { size = Math.min(60, size + 1); S.set('classSize', size); sizeLbl.textContent = ar(size); } }, '+')),
        btn('ابدأْ', () => { stage = 'items'; step = 0; shown = false; paint(); }));
    }
  }

  function items() {
    const list = mode === 'warmup' ? plan.warmup.items : plan.group.items;
    const it = list[Math.min(step, list.length - 1)];
    host.append(el('div', { class: 'muted' }, `${ar(step + 1)} / ${ar(list.length)}`));

    if (mode === 'warmup') {
      host.append(el('div', { class: 'card' }, big(it.q)));
      if (shown) host.append(el('div', { class: 'card', style: 'background:color-mix(in srgb,var(--accent) 13%,transparent)' },
        big(typeof it.a === 'number' ? `الإجابة: ارفعْ ${ar(it.a)}` : it.a)));
    } else {
      host.append(el('div', { class: 'card' }, big(it.q)));
      it.options.forEach((o, n) => host.append(el('div', {
        class: 'opt', style: `font-size:clamp(17px,2vw,24px);${shown && n === it.answer
          ? 'background:color-mix(in srgb,var(--accent) 16%,transparent);border-color:var(--accent)' : ''}`
      }, el('span', { class: 'chip p', style: 'font-size:18px' }, ar(n + 1)), rtl(o))));
      if (shown) host.append(tally());
    }

    host.append(el('div', { class: 'row', style: 'justify-content:center;gap:12px;margin-top:10px' },
      step > 0 ? btn('›  السابق', () => { step--; shown = false; paint(); }, 'ghost') : null,
      !shown ? btn('أظهرِ الإجابة', () => { shown = true; paint(); })
        : step < list.length - 1 ? btn('التالي  ‹', () => { step++; shown = false; paint(); })
        : btn('إنهاء', () => { stage = mode === 'warmup' ? 'report' : 'exit'; paint(); }, 'accent')));
  }

  function tally() {
    const lbl = el('b', { style: 'font-size:30px;font-variant-numeric:tabular-nums' },
      `${ar(counts[step])} / ${ar(size)}`);
    const set = d => { counts[step] = Math.min(Math.max(counts[step] + d, 0), size); lbl.textContent = `${ar(counts[step])} / ${ar(size)}`; };
    return el('div', { class: 'card', style: 'background:color-mix(in srgb,var(--warm) 13%,transparent)' },
      el('div', { style: 'font-size:20px;font-weight:600' }, rtl('كم طالبًا رفع الإجابة الصحيحة؟')),
      el('div', { class: 'row', style: 'justify-content:center;gap:18px;margin-top:8px' },
        el('button', { class: 'btn ghost', style: 'font-size:26px', onclick: () => set(-1) }, '−'),
        lbl,
        el('button', { class: 'btn accent', style: 'font-size:26px', onclick: () => set(1) }, '+')));
  }

  function exitTicket() {
    const x = plan.exit;
    host.append(
      el('h2', {}, rtl('تَذْكِرَةُ الخُرُوجِ — فرديّ')),
      el('div', { class: 'muted' }, rtl(`كلُّ طالبٍ يكتبُ في ورقةٍ صغيرةٍ ويُسلّمُها — ${ar(x.minutes)} دقيقتان.`)),
      ...x.tasks.map((t, i) => el('div', { class: 'card row', style: 'text-align:start' },
        el('span', { class: 'chip w', style: 'font-size:18px' }, ar(i + 1)),
        el('span', { style: 'flex:1;font-size:clamp(17px,2vw,23px)' }, rtl(t)))),
      el('div', { class: 'box method' }, rtl(x.criterion)),
      btn('عرضُ نتيجة الصف', () => { stage = 'report'; paint(); }, 'accent'));
  }

  function report() {
    if (mode === 'warmup') {
      host.append(el('div', { style: 'font-size:50px' }, '✅'),
        el('div', { class: 'card' }, big(plan.warmup.closing)),
        btn('إلى الدرس', close));
      return;
    }
    const total = plan.group.items.length * size;
    const got = counts.reduce((a, b) => a + b, 0);
    const pct = total ? Math.round(got / total * 100) : 0;
    const v = pct >= 85 ? ['إتقانٌ — يُمضى إلى الدرس التالي', 'var(--accent)']
            : pct >= 60 ? ['مقبولٌ — تُراجع المهارة الضعيفة', 'var(--warm)']
            : ['ضعفٌ — يُعاد الشرح قبل المضيّ', '#d9534f'];
    host.append(
      el('h2', {}, rtl('نتيجةُ الصف')),
      el('div', { style: `font-size:70px;font-weight:800;color:${v[1]}` }, ar(pct) + '٪'),
      el('div', { style: `font-size:22px;font-weight:600;color:${v[1]}` }, rtl(v[0])),
      el('div', { class: 'card', style: 'text-align:start' },
        ...plan.group.items.map((it, i) => {
          const p = size ? Math.round(counts[i] / size * 100) : 0;
          return el('div', { class: 'row', style: 'justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0' },
            el('span', {}, rtl(skillTitle(it.skill))),
            el('b', { style: `color:${p >= 70 ? 'var(--accent)' : p >= 50 ? 'var(--warm)' : '#d9534f'}` }, ar(p) + '٪'));
        })),
      btn('حفظٌ وإنهاء', () => {
        const r = S.get('classResults', {}); r[lessonID] = pct; S.set('classResults', r); close();
      }, 'accent'));
  }
}
