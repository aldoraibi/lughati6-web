import { el, rtl, ar, clear, credit, rightsBar, fill } from './ui.js';
import { C, S, loadContent, lesson, allRefs, lessonRef, Profiles } from './store.js';
import { block } from './blocks.js';
import { questionCard } from './question.js';
import { teachMode } from './teach.js';
import { traceScreen } from './trace.js';
import { glossaryView, memorizeView, foundationsView, aboutView } from './extras.js';
import { toggleTimer, timerVisible } from './timer.js';
import { toggleInk, inkOn, refitInk, openBoard } from './ink.js';
import { transferSheet, restoreFromURL } from './transfer.js';

const app = document.getElementById('app');
let route = { name: 'home' };

// ===== الإقلاع =====
(async function boot() {
  try { await loadContent(); } catch (e) {
    fill(app, el('div', { class: 'boot' }, 'تعذّر تحميل المحتوى: ' + e.message)); return;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  const back = await restoreFromURL();
  render();
  if (back && !back.error) welcome(back);
})();

export function go(r) { route = r; render(); window.scrollTo(0, 0); }

// لوحُ العبارةِ يطلبُ تدريبَ حرفٍ بعينِه — بحدثٍ لا باستيرادٍ متبادل
window.addEventListener('lg6:trace', e => go({ name: 'trace', char: e.detail?.char }));
window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (h) go({ name: 'lesson', id: h });
});

// ===== الرسم =====
function render() {
  if (!Profiles.active()) return fill(app, gate());
  const side = el('aside', { class: 'side' });
  const main = el('main', { class: 'main' });
  buildSide(side);
  buildMain(main);
  const scrim = el('div', { class: 'scrim', style: 'display:none', onclick: () => side.classList.remove('open') });
  fill(app, el('div', { class: 'shell' }, main, side, scrim));
  main.prepend(topbar(side, scrim));
  // طولُ المستندِ تغيّر، وطبقةُ الحبرِ مقيسةٌ عليه
  requestAnimationFrame(refitInk);
}

function topbar(side, scrim) {
  return el('header', { class: 'topbar' },
    el('button', { class: 'btn ghost sm burger', onclick: () => side.classList.toggle('open') }, '☰'),
    el('h1', {}, title()),
    el('span', { style: 'width:44px' }));
}

const title = () => ({
  home: 'لغتي الجميلة', glossary: 'معجمي اللغوي', memorize: 'نصوص الاستظهار',
  about: 'بيانات الكتاب والحقوق', foundations: 'أصل الكلام', trace: 'أتدرّب على الخط'
}[route.name] || lessonRef(route.id)?.title || 'لغتي الجميلة');

// ===== القائمة الجانبية =====
function buildSide(side) {
  const me = Profiles.active();
  side.append(el('div', { class: 'card', style: 'padding:12px;margin-bottom:10px' },
    el('div', { class: 'row', style: 'gap:9px' },
      el('span', { style: 'font-size:26px' }, me.emoji),
      el('div', { style: 'flex:1;min-width:0' },
        el('div', { style: 'font-weight:700' }, me.name),
        me.note ? el('div', { class: 'muted', style: 'font-size:12px' }, me.note) : null),
      el('button', { class: 'btn sm ghost', title: 'تبديل الحساب',
        onclick: () => { Profiles.signOut(); render(); } }, '⇥'))));

  const item = (label, r, sub) => el('button', {
    class: 'navitem' + (route.name === r.name && route.id === r.id ? ' on' : ''),
    onclick: () => go(r)
  }, label, sub ? el('small', {}, sub) : null);

  side.append(item('🏠  الرئيسة', { name: 'home' }));
  side.append(item('📖  معجمي اللغوي', { name: 'glossary' }));
  side.append(item('📕  نصوص الاستظهار', { name: 'memorize' }));
  side.append(item('✍️  أتدرّب على الخط', { name: 'trace' }));
  side.append(item('ℹ️  بيانات الكتاب والحقوق', { name: 'about' }));
  side.append(el('button', { class: 'navitem', onclick: () => { toggleTimer(); render(); } },
    (timerVisible() ? '⏱  أخفِ الساعة' : '⏱  الساعة العائمة')));

  // أدواتُ السبّورة: كانت مفقودةً في الويب، وهي أكثرُ ما يُستعمَل في الحصّة
  side.append(el('div', { class: 'navsec' }, '🖊  أدوات الحصّة'));
  side.append(el('button', { class: 'navitem', onclick: () => { toggleInk(); render(); } },
    inkOn() ? 'أغلقِ القلم' : 'القلمُ فوق الصفحة'));
  side.append(el('button', { class: 'navitem', onclick: openBoard }, 'السبّورةُ البيضاء'));

  side.append(el('div', { class: 'navsec' }, '✦  قبل أن تبدأ'));
  side.append(item('أصل الكلام — خرائط ذهنية', { name: 'foundations' }));

  let comp = '';
  allRefs().forEach(r => {
    if (r.component !== comp) { comp = r.component; side.append(el('div', { class: 'navsec' }, comp)); }
    side.append(item(r.title, { name: 'lesson', id: r.id },
      `ص ${r.bookPages.map(ar).join(' - ')}`));
  });
}

// ===== المنطقة الرئيسة =====
function buildMain(main) {
  const w = el('div', { class: 'wrap' });
  main.append(w);
  const R = route;
  if (R.name === 'home') homeView(w);
  else if (R.name === 'glossary') glossaryView(w);
  else if (R.name === 'memorize') memorizeView(w);
  else if (R.name === 'foundations') foundationsView(w, go);
  else if (R.name === 'about') aboutView(w);
  else if (R.name === 'trace') traceScreen(w, R.char);
  else if (R.name === 'lesson') lessonView(w, R.id);
}

// ===== الرئيسة =====
function homeView(w) {
  const me = Profiles.active();
  const refs = allRefs();
  const next = me.last ? lessonRef(me.last) : refs[0];
  const done = S.get('done', {});
  const answered = Object.values(done).reduce((n, o) => n + Object.keys(o).length, 0);
  const right = Object.values(done).reduce((n, o) => n + Object.values(o).filter(Boolean).length, 0);

  w.append(el('div', { class: 'card center' },
    el('div', { style: 'font-size:40px' }, '📚'),
    el('h2', {}, 'لغتي الجميلة'),
    el('div', { class: 'muted' }, rtl('الوحدة الأولى: قدوات ومثل عليا')),
    el('div', { class: 'muted', style: 'font-size:14px' }, rtl('الصف السادس الابتدائي — الفصل الدراسي الأول'))));

  if (next) w.append(el('div', { class: 'card' },
    el('div', { class: 'muted', style: 'font-size:13px' }, me.last ? 'تابعْ من حيث توقّفت' : 'ابدأ الدرس الأول'),
    el('div', { class: 'row', style: 'justify-content:space-between;margin-top:4px' },
      el('h3', { style: 'margin:0' }, next.title),
      el('button', { class: 'btn', onclick: () => go({ name: 'lesson', id: next.id }) }, '▶  افتحْ'))));

  w.append(el('div', { class: 'card' },
    el('h3', {}, 'تقدُّمي'),
    el('div', { class: 'row', style: 'gap:26px' },
      stat(ar(refs.length), 'درسًا متاحًا'),
      stat(ar(answered), 'سؤالًا أجبتَ عنه'),
      stat(answered ? ar(Math.round(right / answered * 100)) + '٪' : '—', 'نسبة الصواب')),
    el('div', { style: 'margin-top:12px' },
      el('button', { class: 'btn sm ghost', onclick: () => transferSheet(modal, closeModal, render) },
        '📱  أُكمِلُ على جهازٍ آخر'))));

  w.append(rightsBar());
  w.append(credit());
}

const stat = (n, label) => el('div', {},
  el('div', { style: 'font-size:26px;font-weight:700;color:var(--primary)' }, n),
  el('div', { class: 'muted', style: 'font-size:13px' }, label));

function welcome(p) {
  const t = el('div', {
    style: `position:fixed;inset-inline:0;top:14px;z-index:200;display:flex;justify-content:center`
  }, el('div', { class: 'card', style: 'padding:12px 20px;box-shadow:0 8px 24px rgba(0,0,0,.2)' },
    `أهلًا ${p.name} — عادَ تقدُّمُك كاملًا 🎉`));
  document.body.append(t);
  setTimeout(() => t.remove(), 4200);
}

// ===== شاشة الدرس =====
async function lessonView(w, id) {
  const ref = lessonRef(id);
  w.append(el('div', { class: 'boot' }, '…'));
  const L = await lesson(id);
  clear(w);
  if (!L) { w.append(el('div', { class: 'card' }, 'تعذّر تحميل الدرس')); return; }

  Profiles.update(Profiles.activeId(), { last: id });

  let si = 0;
  const tabs = el('div', { class: 'tabs' });
  const host = el('div');

  // شريطُ أدواتِ الحصّة: كان في التطبيقِ ولم يكن في الويب، وكانت التهيئةُ
  // والقياسُ مدفونينِ في القسمِ الأوّلِ وحدَه فلا يكادُ يجدُهما المعلّم.
  const tools = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;margin:10px 0 4px' },
    C.teach?.lessons?.[id] ? el('button', { class: 'btn sm warm',
      onclick: () => teachMode(id, L.title, 'warmup') }, '✦  التهيئة') : null,
    C.teach?.lessons?.[id] ? el('button', { class: 'btn sm accent',
      onclick: () => teachMode(id, L.title, 'assess') }, '✔︎  القياس الجماعي') : null,
    el('button', { class: 'btn sm ghost', onclick: () => { toggleInk(); render(); } },
      inkOn() ? '✍️  أغلقِ القلم' : '✍️  اكتبْ على الصفحة'),
    el('button', { class: 'btn sm ghost', onclick: openBoard }, '⬜  السبّورة'));

  const paint = () => {
    clear(tabs); clear(host);
    L.sections.forEach((s, n) => tabs.append(el('button', {
      class: 'tab' + (n === si ? ' on' : ''), onclick: () => { si = n; paint(); window.scrollTo(0, 0); }
    }, s.title + (s.bookPage ? `  ·  ص ${ar(s.bookPage)}` : ''))));

    if (si === 0) {
      host.append(el('div', { class: 'card' },
        el('div', { class: 'row' },
          el('span', { class: 'chip a' }, ref.component || ''),
          el('span', { class: 'chip p' }, `الكتاب: ص ${ref.bookPages.map(ar).join(' - ')}`)),
        el('h2', { style: 'margin-top:8px' }, L.title),
        L.objectives?.length ? el('div', {},
          el('b', {}, 'أهداف الدرس'),
          el('ul', {}, ...L.objectives.map(o => el('li', {}, rtl(o))))) : null,
        null));
    }

    const s = L.sections[si];
    if (s.bookPage) host.append(el('div', { class: 'chip p', style: 'margin-bottom:12px' },
      `هذا القسمُ في صفحة ${ar(s.bookPage)} من كتابك`));

    (s.blocks || []).forEach(b => host.append(el('div', { class: 'card' },
      block(b, memoBadge(id, b.id)))));
    (s.questions || []).forEach((q, i) => host.append(questionCard(q, i, id)));

    host.append(el('div', { class: 'row', style: 'justify-content:space-between;margin-top:18px' },
      el('button', { class: 'btn ghost', disabled: si === 0, onclick: () => { si--; paint(); window.scrollTo(0,0); } }, '›  السابق'),
      el('button', { class: 'btn', disabled: si === L.sections.length - 1,
        onclick: () => { si++; paint(); window.scrollTo(0,0); } }, 'التالي  ‹')));
    host.append(credit());
  };

  paint();
  w.append(tabs, tools, host);
  refitInk();
}

const memoBadge = (lid, bid) =>
  C.memo?.items?.find(m => m.lessonID === lid && m.blockID === bid)?.amount || null;

// ===== بوّابة الحساب =====
function gate() {
  const w = el('div', { class: 'wrap' });
  w.append(el('div', { class: 'card center' },
    el('div', { style: 'font-size:40px' }, '📚'),
    el('h2', {}, rtl('مَنْ يُذَاكِرُ الآنَ؟')),
    el('div', { class: 'muted' }, rtl('لكلِّ طالبٍ حسابُه على هذا الجهاز، وتقدُّمُه محفوظٌ وحدَه.'))));

  const list = el('div', { class: 'grid g2' });
  Profiles.all().forEach(p => list.append(el('button', {
    class: 'card center', style: 'cursor:pointer;border:0',
    onclick: () => { Profiles.select(p.id); render(); }
  },
    el('div', { style: 'font-size:42px' }, p.emoji),
    el('div', { style: 'font-weight:700;font-size:19px' }, p.name),
    p.note ? el('div', { class: 'muted', style: 'font-size:13px' }, p.note) : null,
    el('div', { class: 'muted', style: 'font-size:12px;margin-top:4px' },
      p.last ? `آخر درس: ${lessonRef(p.last)?.title || '—'}` : 'لم يبدأْ بعد'),
    el('div', { style: 'margin-top:8px' },
      el('span', { class: 'btn sm ghost', onclick: e => {
        e.stopPropagation();
        if (confirm(`حذفُ حساب ${p.name} وكلِّ تقدُّمه نهائيًّا؟`)) { Profiles.remove(p.id); render(); }
      } }, '🗑')))));
  if (Profiles.all().length) w.append(list);
  else w.append(el('div', { class: 'card center muted' }, rtl('لا يوجد حسابٌ بعدُ — أنشئْ أوّلَ حساب.')));

  w.append(el('div', { class: 'center', style: 'margin-top:14px' },
    el('button', { class: 'btn', onclick: newProfile }, '＋  حسابٌ جديد'),
    el('button', { class: 'btn ghost', style: 'margin-inline-start:8px', onclick: restore }, '⇄  استعادةٌ برمز')));

  w.append(el('div', { class: 'box', style: 'background:color-mix(in srgb,var(--accent) 9%,transparent);margin-top:16px;font-size:14px' },
    rtl('🔒 الحسابُ محفوظٌ في هذا الجهازِ وحدَه — لا بريدَ ولا كلمةَ مرور. وإن غيّرتَ جهازَك فافتحْ «أُكمِلُ على جهازٍ آخر» من الرئيسةِ في جهازِك القديم.')));
  w.append(rightsBar());
  w.append(credit());
  return w;
}

function newProfile() {
  const name = el('input', { class: 'txt', placeholder: 'اسم الطالب' });
  const note = el('input', { class: 'txt', placeholder: 'وصفٌ اختياريّ: السادس /٣', style: 'margin-top:8px' });
  let emoji = '🦉';
  const picks = ['🦉','📚','🌟','🦁','🐝','🚀','🌙','🦋','⚽️','🎯','🐬','🌸'];
  const grid = el('div', { class: 'grid g3', style: 'margin-top:10px' });
  const paint = () => { clear(grid); picks.forEach(e2 => grid.append(el('button', {
    class: 'btn ghost', style: `font-size:24px${emoji === e2 ? ';border-color:var(--primary)' : ''}`,
    onclick: () => { emoji = e2; paint(); } }, e2))); };
  paint();
  modal('حسابٌ جديد', el('div', {}, name, note, grid,
    el('div', { style: 'margin-top:14px' },
      el('button', { class: 'btn', onclick: () => {
        if (!name.value.trim()) return;
        Profiles.add(name.value.trim(), note.value.trim(), emoji);
        closeModal(); render();
      } }, 'حفظ'))));
}

function restore() {
  const inp = el('textarea', { class: 'txt', rows: 4, placeholder: 'ألصقِ رمزَ التقدّم…' });
  modal('استعادةُ تقدُّمٍ برمز', el('div', {}, inp,
    el('div', { style: 'margin-top:12px' },
      el('button', { class: 'btn accent', onclick: () => {
        try { Profiles.import(inp.value); closeModal(); render(); } catch { alert('الرمز غير صحيح'); }
      } }, 'استعِدْ'))));
}

// ===== نافذة =====
let modalEl = null;
export function modal(title, content) {
  closeModal();
  modalEl = el('div', {
    style: `position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.4);display:flex;
            align-items:center;justify-content:center;padding:18px`,
    onclick: e => { if (e.target === modalEl) closeModal(); }
  }, el('div', { class: 'card', style: 'max-width:560px;width:100%;max-height:86dvh;overflow:auto' },
    el('div', { class: 'row', style: 'justify-content:space-between' },
      el('h3', { style: 'margin:0' }, title),
      el('button', { class: 'btn sm ghost', onclick: closeModal }, '✕')),
    content));
  document.body.append(modalEl);
}
export function closeModal() { modalEl?.remove(); modalEl = null; }
