import { el, rtl, ar, bold, credit, rightsBar } from './ui.js';
import { C, S } from './store.js';

// ===== المعجم =====
export function glossaryView(w) {
  const g = C.gloss; if (!g) return w.append(el('div', { class: 'card' }, 'تعذّر تحميل المعجم'));
  w.append(el('div', { class: 'card center' }, el('h2', {}, rtl(g.title || 'معجمي اللغوي')),
    g.intro ? el('div', { class: 'muted' }, rtl(g.intro)) : null));

  if (g.howTo) {
    const h = g.howTo;
    const box = el('div', { class: 'card' }, el('h3', {}, rtl(h.intro || 'كيف أبحث؟')));
    (h.rules || []).forEach((r, i) => box.append(el('div', { class: 'row', style: 'align-items:flex-start;gap:8px' },
      el('span', { class: 'chip p' }, ar(i + 1)), el('span', { style: 'flex:1' }, rtl(typeof r === 'string' ? r : r.text)))));
    if (h.tip) box.append(el('div', { class: 'box key' }, '📌 ' + rtl(h.tip)));
    w.append(box);
  }

  const search = el('input', { class: 'txt', placeholder: 'ابحثْ عن كلمة…', oninput: e => paint(e.target.value) });
  const host = el('div');
  w.append(el('div', { class: 'card' }, search), host, credit());

  const norm = s => (s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/^ال/, '');
  function paint(q = '') {
    host.replaceChildren();
    (g.letters || []).forEach(L => {
      const hits = (L.entries || []).filter(e => !q || norm(e.word).includes(norm(q)));
      if (!hits.length) return;
      const c = el('div', { class: 'card' }, el('h3', { style: 'color:var(--primary)' }, L.letter || L.title || ''));
      hits.forEach(e2 => c.append(el('div', { style: 'border-top:1px solid var(--line);padding:9px 0' },
        el('b', { style: 'font-size:19px' }, rtl(e2.word)),
        el('div', {}, rtl(e2.meaning)),
        e2.sentence ? el('div', { class: 'muted', style: 'font-size:15px' }, rtl(e2.sentence)) : null)));
      host.append(c);
    });
  }
  paint();
}

// ===== الاستظهار =====
export function memorizeView(w) {
  const m = C.memo; if (!m) return w.append(el('div', { class: 'card' }, 'تعذّر التحميل'));
  w.append(el('div', { class: 'card center' }, el('h2', {}, rtl(m.title)), el('div', { class: 'muted' }, rtl(m.intro))));
  if (m.howTo) w.append(el('div', { class: 'card' }, el('h3', {}, 'كيف أحفظ؟'),
    el('ul', {}, ...m.howTo.map(t => el('li', {}, rtl(t))))));

  m.items.forEach(it => {
    const lvl = S.get('memo.' + it.id, 1);
    w.append(el('div', { class: 'card' },
      el('div', { class: 'row', style: 'justify-content:space-between' },
        el('h3', { style: 'margin:0' }, rtl(it.title)),
        el('span', { class: 'chip w' }, `ص ${ar(it.bookPage)}`)),
      el('div', { class: 'muted', style: 'font-size:14px' }, rtl(`${it.source} — ${it.amount}`)),
      el('button', { class: 'btn sm', style: 'margin-top:10px', onclick: () => session(it) }, '▶  سمِّعْ')));
  });
  w.append(credit());

  function session(it) {
    let lvl = S.get('memo.' + it.id, 1);
    const peeked = new Set();
    const host = el('div');
    const ov = el('div', { style: 'position:fixed;inset:0;z-index:140;background:var(--page);overflow:auto;padding:20px' },
      el('div', { class: 'wrap' }, host));
    document.body.append(ov);

    const lines = () => it.lines || [];
    const paint = () => {
      host.replaceChildren(
        el('div', { class: 'row', style: 'justify-content:space-between' },
          el('h3', { style: 'margin:0' }, rtl(it.title)),
          el('button', { class: 'btn ghost sm', onclick: () => ov.remove() }, '✕')),
        el('div', { class: 'tabs' }, ...(C.memo.levels || []).map(L => el('button', {
          class: 'tab' + (L.n === lvl ? ' on' : ''),
          onclick: () => { lvl = L.n; S.set('memo.' + it.id, lvl); peeked.clear(); paint(); }
        }, L.title))),
        el('div', { class: 'box method' }, rtl((C.memo.levels.find(L => L.n === lvl) || {}).hint || '')),
        ...lines().map((ln, li) => el('div', { class: 'card', style: 'font-size:20px;line-height:2.1' },
          ...ln.split(' ').map((word, wi) => {
            const key = li + ':' + wi;
            const hide = lvl === 2 ? wi === ln.split(' ').length - 1
                       : lvl === 3 ? wi % 2 === 1 : lvl >= 4;
            if (!hide || peeked.has(key)) return el('span', {}, word + ' ');
            const label = lvl === 4 ? hint(word) : '____';
            return el('button', {
              class: 'btn ghost sm', style: 'margin:2px', onclick: () => { peeked.add(key); paint(); }
            }, label);
          }))),
        it.note ? el('div', { class: 'box key' }, rtl(it.note)) : null);
    };
    paint();
  }

  /** تلميح المستوى الرابع: «ال» ليست حرفًا أصليًّا فتُعرض كاملة */
  function hint(word) {
    let c = word.replace(/[ً-ْ]/g, ''), out = '';
    while (c && 'وفبكل'.includes(c[0]) && c.slice(1).startsWith('ال')) { out += c[0]; c = c.slice(1); }
    if (c.startsWith('ال')) { out += 'ال'; c = c.slice(2); }
    else if (!out && c.startsWith('لل')) { out += 'لل'; c = c.slice(2); }
    if (!c) return out;
    out += c[0];
    return 'اأإآدذرزوةءى'.includes(c[0]) ? out : out + 'ـ';
  }
}

// ===== أصل الكلام =====
export function foundationsView(w, go) {
  const f = C.found; if (!f) return w.append(el('div', { class: 'card' }, 'تعذّر التحميل'));
  w.append(el('div', { class: 'card center' }, el('h2', {}, rtl(f.title)),
    el('div', { class: 'muted' }, rtl(f.subtitle))));
  w.append(el('div', { class: 'card' }, el('div', {}, rtl(f.intro)),
    el('div', { class: 'box key', style: 'margin-top:12px;white-space:pre-line' }, rtl(f.originNote))));

  const COL = { blue: '#2a8cb8', green: '#33a673', orange: '#e08a2c', purple: '#8052b8',
                red: '#cc4547', teal: '#1f8f99' };
  f.maps.forEach(m => {
    const c = el('div', { class: 'card' },
      el('h3', { style: 'color:var(--primary)' }, rtl(m.title)),
      el('div', { class: 'muted', style: 'font-size:15px' }, rtl(m.hint)),
      el('div', { class: 'center', style: 'margin:14px 0' },
        el('div', { style: 'display:inline-block;background:var(--primary);color:#fff;padding:12px 22px;border-radius:16px' },
          el('div', { style: 'font-size:21px;font-weight:700' }, rtl(m.root.text)),
          m.root.note ? el('div', { style: 'font-size:13px;opacity:.9' }, rtl(m.root.note)) : null)));
    const grid = el('div', { class: 'grid g2' });
    m.branches.forEach(b => {
      const col = COL[b.color] || 'var(--primary)';
      const bx = el('div', { style: `border:1px solid ${col}44;border-radius:14px;padding:12px;background:${col}11` },
        el('div', { style: `background:${col};color:#fff;border-radius:11px;padding:8px 12px;font-weight:700` }, rtl(b.title)),
        b.note ? el('div', { class: 'muted', style: 'font-size:14px;margin-top:6px' }, rtl(b.note)) : null);
      b.children.forEach(ch => bx.append(el('div', { style: 'margin-top:8px' },
        el('b', {}, '• ' + rtl(ch.title)),
        ch.note ? el('div', { class: 'muted', style: 'font-size:14px' }, rtl(ch.note)) : null,
        ch.examples ? el('div', { style: `color:${col};font-size:15px` }, rtl(ch.examples.join('  •  '))) : null)));
      grid.append(bx);
    });
    c.append(grid); w.append(c);
  });

  if (f.compare) {
    const t = el('table', { class: 't' });
    f.compare.rows.forEach(r => t.append(el('tr', {}, ...r.map(x => el('td', {}, rtl(x))))));
    w.append(el('div', { class: 'card' }, el('h3', {}, rtl(f.compare.title)),
      el('div', { style: 'overflow-x:auto' }, t)));
  }

  const quiz = el('div', { class: 'card' }, el('h3', {}, rtl('أَخْتَبِرُ نَفْسِي')));
  f.quiz.forEach((q, i) => {
    const box = el('div', { style: 'border-top:1px solid var(--line);padding-top:10px;margin-top:10px' },
      el('div', { class: 'row' }, el('span', { class: 'chip w' }, ar(i + 1)), el('b', {}, rtl(q.prompt))));
    let done = false;
    const opts = q.options.map((o, n) => el('button', {
      class: 'opt', onclick: () => {
        if (done) return; done = true;
        opts.forEach((b, m) => b.className = 'opt ' + (m === q.answer ? 'ok' : m === n ? 'bad' : ''));
        box.append(el('div', { class: 'box model' }, '✔︎ ' + rtl(q.reveal)));
      }
    }, el('i'), rtl(o)));
    opts.forEach(o => box.append(o));
    quiz.append(box);
  });
  w.append(quiz);
  w.append(el('div', { class: 'card' }, el('button', { class: 'btn', onclick: () => go({ name: 'lesson', id: 'l-muraja3a' }) },
    '▶  انتقلْ إلى: مراجعة المكتسبات السابقة')));
  w.append(el('div', { class: 'box method' }, rtl(f.appNote)), credit());
}

// ===== بيانات الكتاب =====
export function aboutView(w) {
  const a = C.about; if (!a) return w.append(el('div', { class: 'card' }, 'تعذّر التحميل'));
  w.append(el('div', { class: 'card center' }, el('div', { style: 'font-size:36px' }, '📚'),
    el('h2', {}, rtl(a.appName)), el('div', { class: 'muted' }, rtl(a.tagline))));
  w.append(el('div', { class: 'card' }, el('h3', {}, rtl(a.purpose.title)),
    el('div', { style: 'white-space:pre-line' }, rtl(a.purpose.body))));

  const t = el('table', { class: 't' });
  a.source.rows.forEach(r => t.append(el('tr', {}, ...r.map(x => el('td', {}, rtl(x))))));
  w.append(el('div', { class: 'card' }, el('h3', {}, rtl(a.source.title)), el('div', { style: 'overflow-x:auto' }, t)));

  w.append(el('div', { class: 'card' }, el('h3', { style: 'color:var(--warm)' }, rtl(a.rights.title)),
    ...a.rights.points.map(p => el('div', { style: 'margin:8px 0', html: '• ' + bold(p) })),
    el('div', { class: 'box method' }, rtl(a.rights.ministryNote))));

  w.append(el('div', { class: 'card' }, el('h3', {}, rtl(a.added.title)),
    el('div', { class: 'muted' }, rtl(a.added.intro)),
    ...a.added.items.map(i => el('div', { style: 'margin:6px 0', html: '✦ ' + bold(i) }))));

  w.append(el('div', { class: 'card' }, el('h3', {}, rtl(a.usage.title)),
    el('ol', {}, ...a.usage.items.map(i => el('li', {}, rtl(i))))));
  w.append(el('div', { class: 'center muted', style: 'font-size:14px' }, rtl(a.preparedBy)));
  w.append(credit());
}
