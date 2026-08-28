import { el, rtl, ar, fill } from './ui.js';
import { Profiles } from './store.js';

// ===== نقل التقدّم بين الأجهزة =====
// لا خادم هنا، فالتقدّم لا ينتقل وحده. والحلّ أن يصير النقل رابطًا يُضغط
// ضغطة واحدة — لا رمزًا يُنسخ ويُلصق؛ فطالب السادس لا يفعل ذلك.

const b64url = {
  enc: buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => Uint8Array.from(
    atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
};

async function gzip(str) {
  const bytes = new TextEncoder().encode(str);
  if (!('CompressionStream' in window)) return { z: 0, d: b64url.enc(bytes) };
  const cs = new CompressionStream('gzip');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(cs));
  return { z: 1, d: b64url.enc(await out.arrayBuffer()) };
}

async function gunzip(payload) {
  const bytes = b64url.dec(payload.d);
  if (!payload.z || !('DecompressionStream' in window))
    return new TextDecoder().decode(bytes);
  const ds = new DecompressionStream('gzip');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
  return await out.text();
}

/** يجمع كل ما يخصّ الحساب النشط في رابطٍ واحد */
export async function makeLink() {
  const id = Profiles.activeId();
  const p = Profiles.all().find(x => x.id === id);
  const keys = {};
  Object.keys(localStorage).filter(k => k.startsWith(`p.${id}.`))
    .forEach(k => keys[k.slice(`p.${id}.`.length)] = localStorage.getItem(k));
  const packed = await gzip(JSON.stringify({ p, keys }));
  const base = location.href.split('#')[0];
  return `${base}#t=${packed.z}${packed.d}`;
}

/** يُستدعى عند فتح الصفحة: إن كان في الرابط تقدّمٌ استعاده تلقائيًّا */
export async function restoreFromURL() {
  const m = location.hash.match(/^#t=(\d)(.+)$/);
  if (!m) return null;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const json = await gunzip({ z: +m[1], d: m[2] });
    const data = JSON.parse(json);
    const old = Profiles.all().find(x => x.name === data.p.name);
    if (old) Profiles.remove(old.id);
    const np = { ...data.p, id: 'u' + Date.now().toString(36), seen: Date.now() };
    localStorage.setItem('lg6.profiles', JSON.stringify([...Profiles.all(), np]));
    Object.entries(data.keys).forEach(([k, v]) => localStorage.setItem(`p.${np.id}.${k}`, v));
    Profiles.select(np.id);
    return np;
  } catch (e) { return { error: true }; }
}

/** الشاشة التي يراها الطالب — خطوتان مصوّرتان لا أكثر */
export function transferSheet(modal, closeModal, render) {
  const body = el('div');
  const sheet = el('div', {},
    el('div', { class: 'box', style: 'background:color-mix(in srgb,var(--warm) 13%,transparent)' },
      rtl('تقدُّمُك محفوظٌ في هذا الجهازِ وحدَه. لِتُكمِلَ على جهازٍ آخر أرسلْ لنفسِك رابطًا واحدًا، وافتحْه هناك — وسيعودُ كلُّ شيءٍ من نفسِه.')),
    body);

  (async () => {
    const link = await makeLink();
    const big = link.length > 60000;

    fill(body,
      el('h3', { style: 'margin-top:16px' }, rtl('١ — أرسِلْ لنفسِك الرابط')),
      el('div', { class: 'row', style: 'gap:8px' },
        navigator.share ? el('button', {
          class: 'btn', onclick: () => navigator.share({
            title: 'تقدُّمي في لغتي الجميلة',
            text: 'افتحْ هذا الرابطَ في جهازِك الآخر ليعودَ تقدُّمُك:',
            url: link
          }).catch(() => {})
        }, '📤  شاركْ الرابط') : null,
        el('button', {
          class: 'btn ghost', onclick: async e => {
            try { await navigator.clipboard.writeText(link); }
            catch { const t = el('textarea'); t.value = link; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
            e.target.textContent = '✓ نُسخ';
            setTimeout(() => e.target.textContent = '📋  انسخْ الرابط', 1800);
          }
        }, '📋  انسخْ الرابط')),
      el('div', { class: 'muted', style: 'font-size:14px;margin-top:8px' },
        rtl('أرسلْه إلى نفسِك في الواتساب أو الملاحظات أو البريد.')),

      el('h3', { style: 'margin-top:18px' }, rtl('٢ — افتحْه في الجهازِ الآخر')),
      el('div', { class: 'muted', style: 'font-size:15px' },
        rtl('اضغطْ على الرابطِ هناك فقط. لا تُنشئْ حسابًا جديدًا ولا تكتبْ شيئًا — يعودُ اسمُك وتقدُّمُك تلقائيًّا.')),

      big ? el('div', { class: 'box key', style: 'margin-top:14px' },
        rtl('تقدُّمُك كبيرٌ والرابطُ صار طويلًا؛ فإن لم يُفتَحْ من الواتساب فأرسلْه في الملاحظاتِ أو البريد.')) : null,

      el('details', { style: 'margin-top:18px' },
        el('summary', { class: 'muted', style: 'cursor:pointer;font-size:14px' }, 'لم ينجحِ الرابط؟ الطريقةُ اليدويّة'),
        manual())
    );
  })();

  modal(rtl('أُكمِلُ على جهازٍ آخر'), sheet);

  function manual() {
    const inp = el('textarea', { class: 'txt', rows: 3, placeholder: 'ألصقِ الرابطَ كاملًا هنا…', style: 'margin-top:8px' });
    return el('div', {},
      el('div', { class: 'muted', style: 'font-size:14px;margin-top:8px' },
        rtl('ألصقِ الرابطَ الذي أرسلتَه لنفسِك هنا في الجهازِ الجديد:')),
      inp,
      el('button', {
        class: 'btn accent sm', style: 'margin-top:8px', onclick: async () => {
          const m = inp.value.match(/#t=(\d)(.+)$/);
          if (!m) return alert('الرابط غير صحيح — تأكّدْ من نسخِه كاملًا.');
          location.hash = `t=${m[1]}${m[2]}`;
          const r = await restoreFromURL();
          if (r && !r.error) { closeModal(); render(); }
          else alert('تعذّرتِ الاستعادة.');
        }
      }, 'استعِدْ تقدُّمي'));
  }
}
