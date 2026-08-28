import { el, rtl, ar, bold } from './ui.js';
import { grade } from './answer.js';
import { C, S, skillTitle } from './store.js';

/** بطاقة سؤال واحد — تقابل QuestionCard في تطبيق iPad */
export function questionCard(q, i, lessonID) {
  const saveKey = `ans.${lessonID}.${q.id}`;
  let a = S.get(saveKey, {});
  let checked = S.get(`chk.${lessonID}.${q.id}`, false);
  const save = () => S.set(saveKey, a);

  const card = el('div', { class: 'q' });
  const body = el('div');

  const draw = () => {
    body.replaceChildren();

    if (q.context) body.append(el('div', { class: 'muted', style: 'font-size:15px;margin-bottom:6px' }, rtl(q.context)));

    body.append(el('div', { class: 'qhead' },
      el('div', { class: 'qnum' }, q.number ? rtl(q.number) : ar(i + 1)),
      el('p', { class: 'qtext' }, rtl(q.prompt))));

    if (q.image) body.append(el('div', { class: 'blk', style: 'margin-top:10px' },
      el('img', { src: `content/images/${q.image}.jpg`, alt: '', loading: 'lazy',
                  onerror: e => e.target.src = `content/images/${q.image}.png` })));

    body.append(input());

    // ===== شريط المساعدة =====
    const help = el('div', { class: 'row', style: 'margin-top:12px' });
    if (q.keys?.length) help.append(el('button', {
      class: 'btn sm warm', onclick: () => { a.k = Math.min((a.k || 0) + 1, q.keys.length); save(); draw(); }
    }, a.k ? `مفتاحٌ آخر (${ar(a.k)}/${ar(q.keys.length)})` : '🔑 مفاتيح السؤال'));
    if (q.method) help.append(el('button', {
      class: 'btn sm ghost', onclick: () => { a.m = !a.m; save(); draw(); }
    }, a.m ? 'إخفاء طريقة الحل' : '💡 كيف أحلّ السؤال؟'));

    const pl = priorLink(q);
    if (pl) help.append(el('button', {
      class: 'btn sm ghost', onclick: () => { a.p = !a.p; save(); draw(); }
    }, a.p ? 'إخفاء الربط بما سبق' : '↩︎ أين درستُ هذا من قبل؟'));
    body.append(help);

    if (a.k) body.append(el('div', { class: 'box key' },
      el('b', {}, 'مفاتيح تساعدك'), el('br'),
      ...q.keys.slice(0, a.k).flatMap((k, n) => [rtl(`${ar(n + 1)}. ${k}`), el('br')])));

    if (a.m && q.method) body.append(el('div', { class: 'box method' },
      el('b', {}, 'طريقة الحل — خطوات التفكير دون ذكر الإجابة'), el('br'), rtl(q.method)));

    if (a.p && pl) body.append(priorBox(pl));

    // ===== التحقّق والنتيجة =====
    if (!checked) {
      body.append(el('button', {
        class: 'btn', style: 'margin-top:12px',
        onclick: () => { checked = true; S.set(`chk.${lessonID}.${q.id}`, true); mark(); draw(); }
      }, '✓ تحقّقْ من إجابتي'));
    } else {
      const ok = grade(q, a);
      body.append(el('div', { class: 'box ' + (ok === null ? 'model' : ok ? 'model' : 'key') },
        el('b', {}, ok === null ? 'قارِنْ إجابتك بالنموذجية' : ok ? '✅ إجابةٌ صحيحة' : '↻ راجِعْ إجابتك'),
        q.explanation ? el('div', { style: 'margin-top:6px' }, rtl(q.explanation)) : null,
        q.modelAnswer ? el('div', { style: 'margin-top:8px' },
          el('b', {}, 'الإجابة النموذجية: '), rtl(q.modelAnswer)) : null,
        el('div', { style: 'margin-top:10px' },
          el('button', { class: 'btn sm ghost', onclick: () => {
            checked = false; a = { k: a.k, m: a.m, p: a.p }; save();
            S.set(`chk.${lessonID}.${q.id}`, false); draw();
          } }, '↻ أعيد المحاولة'))));
    }
  };

  function mark() {
    const ok = grade(q, a);
    if (ok === null) return;
    const done = S.get('done', {});
    done[lessonID] = done[lessonID] || {};
    done[lessonID][q.id] = ok;
    S.set('done', done);
  }

  function input() {
    const wrap = el('div', { style: 'margin-top:10px' });
    const K = q.kind;

    if (K === 'mcq' || K === 'trueFalse') {
      (q.options || []).forEach((o, n) => wrap.append(el('button', {
        class: 'opt ' + cls(n), onclick: () => { if (checked) return; a.pick = n; save(); draw(); }
      }, el('i'), rtl(o))));
    } else if (K === 'multiSelect') {
      a.picks = a.picks || [];
      (q.options || []).forEach((o, n) => wrap.append(el('button', {
        class: 'opt ' + cls(n, true), onclick: () => {
          if (checked) return;
          a.picks = a.picks.includes(n) ? a.picks.filter(x => x !== n) : [...a.picks, n];
          save(); draw();
        }
      }, el('i'), rtl(o))));
    } else if (K === 'fillBlank' || K === 'shortAnswer') {
      wrap.append(el('input', {
        class: 'txt', value: a.text || '', placeholder: 'اكتبْ إجابتك…', disabled: checked,
        oninput: e => { a.text = e.target.value; save(); }
      }));
    } else if (K === 'order') {
      a.order = a.order || (q.orderItems || []).map((_, n) => n);
      const list = el('div');
      a.order.forEach((idx, pos) => list.append(el('div', { class: 'opt' },
        el('span', { class: 'chip p' }, ar(pos + 1)),
        el('span', { style: 'flex:1' }, rtl(q.orderItems[idx])),
        checked ? null : el('button', { class: 'btn sm ghost', onclick: () => {
          if (pos === 0) return;
          [a.order[pos - 1], a.order[pos]] = [a.order[pos], a.order[pos - 1]]; save(); draw();
        } }, '↑'))));
      wrap.append(list);
    } else if (K === 'match') {
      a.pairs = a.pairs || {};
      (q.rightItems || []).forEach((r, ri) => {
        const sel = el('select', { class: 'txt', style: 'max-width:230px', disabled: checked,
          onchange: e => { a.pairs[e.target.value] = ri; save(); } },
          el('option', { value: '' }, '—'),
          ...(q.leftItems || []).map((l, li) => el('option', { value: li, selected: a.pairs[li] === ri }, l)));
        wrap.append(el('div', { class: 'row', style: 'margin-top:8px' },
          el('span', { style: 'flex:1' }, rtl(r)), sel));
      });
    } else {
      wrap.append(el('textarea', {
        class: 'txt', rows: 3, placeholder: 'اكتبْ هنا…', disabled: checked,
        oninput: e => { a.text = e.target.value; save(); }
      }, a.text || ''));
    }
    return wrap;
  }

  const cls = (n, multi) => {
    const picked = multi ? (a.picks || []).includes(n) : a.pick === n;
    if (!checked) return picked ? 'sel' : '';
    const right = (q.correctIndices || []).includes(n);
    if (right) return 'ok';
    return picked ? 'bad' : '';
  };

  draw();
  card.append(body);
  return card;
}

// ===== الربط بما سبق =====
function priorLink(q) {
  const P = C.prior; if (!P) return null;
  const id = P.byQuestion?.[q.id] || (q.skills || []).map(s => P.bySkill?.[s]).find(Boolean);
  return id ? P.links.find(l => l.id === id) : null;
}

function priorBox(l) {
  const books = C.prior.books || {};
  const box = el('div', { class: 'box prior' },
    el('b', { style: 'color:var(--accent)' }, rtl(l.title)),
    el('div', { class: 'muted', style: 'font-size:13px;margin-top:8px' }, 'أين درستُها من قبل؟'));
  l.sources.forEach(s => box.append(el('div', { class: 'row', style: 'gap:8px;margin-top:4px' },
    el('span', { class: 'chip p' }, rtl(books[s.book]?.short || s.book)),
    el('span', { style: 'flex:1;font-size:15.5px' }, rtl(s.lesson)),
    el('span', { class: 'chip w' }, `ص ${ar(s.page)}`))));
  box.append(el('div', { style: 'margin-top:10px', html: bold(l.story) }));
  box.append(el('div', { class: 'box key', style: 'margin-top:10px' }, '📌 ' + rtl(l.recall)));

  const ch = l.challenge;
  const qbox = el('div', { style: 'margin-top:12px' },
    el('b', { style: 'color:var(--accent)' }, '⚡︎ تحدٍّ سريع'),
    el('div', { style: 'margin:6px 0' }, rtl(ch.prompt)));
  let picked = null;
  const opts = ch.options.map((o, n) => el('button', {
    class: 'opt', onclick: () => {
      if (picked !== null) return;
      picked = n;
      opts.forEach((b, m) => b.className = 'opt ' + (m === ch.answer ? 'ok' : m === n ? 'bad' : ''));
      qbox.append(el('div', { class: 'box model' }, '✔︎ ' + rtl(ch.reveal)));
    }
  }, el('i'), rtl(o)));
  opts.forEach(o => qbox.append(o));
  box.append(qbox);
  return box;
}
