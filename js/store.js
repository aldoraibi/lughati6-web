// ===== الحالة والحفظ =====
// كل شيء في متصفّح الطالب. GitHub Pages استضافة ساكنة لا تحفظ شيئًا،
// فالتقدّم محلّيّ، وينتقل بين الأجهزة برمزٍ يصدّره الطالب بنفسه.

export const C = {};                       // المحتوى المحمَّل

export async function loadContent() {
  const j = async n => (await fetch(`content/${n}.json`, { cache: 'no-cache' })).json();
  const [cur, skills, gloss, memo, about, prior, found, letters, teach] =
    await Promise.all(['curriculum','skills','glossary','memorization','about',
                       'prior-links','foundations','letters','teaching'].map(n => j(n).catch(() => null)));
  Object.assign(C, { cur, skills, gloss, memo, about, prior, found, letters, teach, lessons: {} });
  return C;
}

export async function lesson(id) {
  if (C.lessons[id]) return C.lessons[id];
  const ref = lessonRef(id);
  if (!ref) return null;
  const d = await (await fetch(`content/lessons/${ref.file}.json`)).json();
  C.lessons[id] = d;
  return d;
}

export const allRefs = () =>
  (C.cur?.units || []).flatMap(u => u.components.flatMap(c =>
    c.lessons.map(l => ({ ...l, component: c.title, icon: c.icon }))));

export const lessonRef = id => allRefs().find(r => r.id === id);
export const skillTitle = id => C.skills?.skills?.find(s => s.id === id)?.title || id;

// ===== الحسابات =====
const K = { list: 'lg6.profiles', active: 'lg6.active' };
const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const Profiles = {
  all: () => jget(K.list, []),
  activeId: () => localStorage.getItem(K.active) || '',
  active() { return this.all().find(p => p.id === this.activeId()) || null; },
  add(name, note, emoji) {
    const p = { id: 'u' + Date.now().toString(36), name, note, emoji, made: Date.now(), seen: Date.now(), last: null, sec: 0 };
    jset(K.list, [...this.all(), p]);
    this.select(p.id);
    return p;
  },
  update(id, patch) {
    jset(K.list, this.all().map(p => p.id === id ? { ...p, ...patch } : p));
  },
  select(id) { localStorage.setItem(K.active, id); this.update(id, { seen: Date.now() }); },
  signOut() { localStorage.removeItem(K.active); },
  remove(id) {
    jset(K.list, this.all().filter(p => p.id !== id));
    Object.keys(localStorage).filter(k => k.startsWith(`p.${id}.`)).forEach(k => localStorage.removeItem(k));
    if (this.activeId() === id) this.signOut();
  },
  // رمز التقدّم: كل ما يخصّ هذا الحساب في نصّ واحد
  export(id) {
    const p = this.all().find(x => x.id === id);
    const data = { p, keys: {} };
    Object.keys(localStorage).filter(k => k.startsWith(`p.${id}.`))
      .forEach(k => data.keys[k.slice(`p.${id}.`.length)] = localStorage.getItem(k));
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  },
  import(code) {
    const data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    const p = { ...data.p, id: 'u' + Date.now().toString(36), seen: Date.now() };
    jset(K.list, [...this.all().filter(x => x.name !== p.name), p]);
    Object.entries(data.keys).forEach(([k, v]) => localStorage.setItem(`p.${p.id}.${k}`, v));
    this.select(p.id);
    return p;
  }
};

// مفتاحٌ مخصوصٌ بالحساب النشط — فلا يختلط تقدّم طالبٍ بآخر
const pk = k => `p.${Profiles.activeId()}.${k}`;
export const S = {
  get: (k, d) => jget(pk(k), d),
  set: (k, v) => jset(pk(k), v),
};
