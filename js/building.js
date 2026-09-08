import { el, rtl, ar } from './ui.js';

/** «كيفَ تُبنى اللغةُ» — شرحٌ متحرّكٌ يمشي بالطالبِ من الحرفِ إلى النصّ.
 *  يقابلُ BuildingBlocksView في تطبيقِ الآيباد: المرحلةُ فكرةٌ واحدة، والمعلّمُ
 *  يُقدّمُ ويؤخّر، والتشغيلُ التلقائيُّ خيارٌ لمن أرادَ أن يتركَها تعملُ وحدَها. */

const P = 'var(--primary)', A = 'var(--accent)', W = 'var(--warm)';

const STAGES = [
  { chip: 'الحروف', title: 'اللُّغَةُ العَرَبِيَّةُ تَتَكَوَّنُ مِنْ حُرُوفٍ',
    sub: 'ثَمَانِيَةٌ وعِشرُونَ حَرفًا، هِيَ لَبِنَاتُ كُلِّ مَا نَقرَؤُهُ ونَكتُبُهُ', beats: 4, body: letters },
  { chip: 'الحروف ← الكلمة', title: 'والحُرُوفُ تُكَوِّنُ الكَلِمَاتِ',
    sub: 'إِذَا اجتَمَعَتِ الحُرُوفُ عَلَى تَرتِيبٍ ومَعنًى صَارَتْ كَلِمَةً', beats: 4, body: lettersToWord },
  { chip: 'أنواع الكلمة', title: 'والكَلِمَةُ ثَلاثَةُ أَنوَاعٍ',
    sub: 'اسمٌ، وفِعلٌ، وحَرفٌ — لا رَابِعَ لَهَا', beats: 4, body: wordKinds },
  { chip: 'الاسم والعدد', title: 'الاسمُ مِنْ حَيثُ العَدَدُ',
    sub: 'مُفرَدٌ، ومُثَنًّى، وجَمعٌ — والجَمعُ ثَلاثَةُ أَنوَاعٍ', beats: 5, body: nounNumber },
  { chip: 'الفعل والزمن', title: 'والفِعلُ مِنْ حَيثُ الزَّمَنُ',
    sub: 'مَاضٍ، ومُضَارِعٌ، وأَمرٌ', beats: 4, body: verbTense },
  { chip: 'الكلمات ← الجملة', title: 'والكَلِمَاتُ تُكَوِّنُ الجُمَلَ',
    sub: 'إِذَا اجتَمَعَتِ الكَلِمَاتُ فَتَمَّ المَعنَى وحَسُنَ السُّكُوتُ عَلَيهَا فَهِيَ جُملَةٌ', beats: 4, body: wordsToSentence },
  { chip: 'نوعا الجملة', title: 'والجُملَةُ نَوعَانِ',
    sub: 'بِأَوَّلِ كَلِمَةٍ فِيهَا تَعرِفُ نَوعَهَا', beats: 3, body: sentenceKinds },
  { chip: 'الجمل ← النص', title: 'والجُمَلُ تُكَوِّنُ الفِقَرَ، والفِقَرُ تُكَوِّنُ النُّصُوصَ',
    sub: 'هَكَذَا يَنتَهِي البِنَاءُ إِلَى النَّصِّ الَّذِي تَقرَؤُهُ فِي كِتَابِكَ', beats: 4, body: toParagraph },
  { chip: 'الخلاصة', title: 'البِنَاءُ كُلُّهُ فِي لَوحَةٍ وَاحِدَةٍ', sub: null, beats: 6, body: summary },
];

export function buildingScreen(w) {
  let stage = 0, beat = 0, playing = false, timer = null;
  const cur = () => STAGES[stage];
  /** عندَ العرضِ اليدويِّ تُكشَفُ عناصرُ المرحلةِ كلُّها؛ فالمعلّمُ يشرحُ وهو ينظرُ إليها */
  const shown = () => playing ? beat : cur().beats - 1;

  const chips = el('div', { class: 'bb-chips' });
  const title = el('h2', { class: 'bb-title' });
  const sub = el('div', { class: 'bb-sub muted' });
  const body = el('div', { class: 'bb-body' });
  const counter = el('span', { class: 'muted', style: 'font-variant-numeric:tabular-nums' });
  const prev = el('button', { class: 'btn ghost', onclick: () => go(stage - 1) }, '‹  السابق');
  const next = el('button', { class: 'btn', onclick: () => go(stage + 1) }, 'التالي  ›');
  const play = el('button', { class: 'btn warm', onclick: () => togglePlay() });

  w.append(el('div', { class: 'card bb' },
    chips,
    title, sub,
    body,
    el('div', { class: 'row bb-ctl' }, prev, play, el('span', { style: 'flex:1' }), counter, el('span', { style: 'flex:1' }), next)));

  function go(i) {
    if (i < 0 || i >= STAGES.length) return;
    stage = i; beat = 0; draw(true);
  }
  function togglePlay() {
    playing = !playing;
    clearInterval(timer);
    if (playing) { beat = 0; timer = setInterval(tick, 1500); }
    draw(true);
  }
  /** النبضةُ تكشفُ عنصرًا جديدًا؛ فإذا تمَّتِ المرحلةُ انتقلَ العرضُ */
  function tick() {
    if (beat < cur().beats - 1) { beat++; reveal(); }
    else if (stage < STAGES.length - 1) go(stage + 1);
    else { playing = false; clearInterval(timer); draw(false); }
  }
  function reveal() {
    const s = shown();
    body.querySelectorAll('[data-at]').forEach(n => n.classList.toggle('on', +n.dataset.at <= s));
    body.querySelectorAll('[data-join]').forEach(n => n.classList.toggle('joined', +n.dataset.join <= s));
  }
  function draw(rebuild) {
    const c = cur();
    chips.replaceChildren(...STAGES.map((s, i) => el('button', {
      class: 'bb-chip' + (i === stage ? ' on' : ''), onclick: () => go(i) }, s.chip)));
    chips.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    title.textContent = rtl(c.title);
    sub.textContent = c.sub ? rtl(c.sub) : ''; sub.style.display = c.sub ? '' : 'none';
    counter.textContent = `${ar(stage + 1)} من ${ar(STAGES.length)}`;
    prev.disabled = stage === 0; next.disabled = stage === STAGES.length - 1;
    play.textContent = playing ? '❚❚  إيقاف' : '▶  تشغيل تلقائي';
    if (rebuild) {
      body.replaceChildren(c.body());
      body.classList.remove('in'); void body.offsetWidth; body.classList.add('in');
      // كلُّ عنصرٍ مخفيٌّ أوّلًا ثمّ يُكشَفُ في الإطارِ التالي فتظهرُ حركتُه
      // مهلةٌ زمنيّةٌ لا إطارُ رسمٍ: إطارُ الرسمِ لا يُطلَقُ في تبويبٍ مخفيٍّ فيبقى كلُّ شيءٍ مخفيًّا
      setTimeout(reveal, 40);
    } else reveal();
  }
  draw(true);
  // إيقافُ المؤقّتِ إذا غادرَ المستخدمُ الشاشة
  const mo = new MutationObserver(() => { if (!document.contains(w)) { clearInterval(timer); mo.disconnect(); } });
  mo.observe(document.body, { childList: true, subtree: true });
}

// ===== لَبِنَاتُ الرسم =====

/** صندوقُ مصطلحٍ — الشكلُ الأساسيُّ في كلِّ المراحل */
function box(text, { ex = null, tint = P, big = false, filled = true } = {}) {
  return el('div', { class: 'bb-box' + (big ? ' big' : '') + (filled ? ' filled' : ''), style: `--t:${tint}` },
    el('div', { class: 'bb-box-t' }, rtl(text)),
    ex ? el('div', { class: 'bb-box-x' }, rtl(ex)) : null);
}
const arrow = (tint = P) => el('div', { class: 'bb-arrow', style: `color:${tint}` }, '↓');
const branch = (tint = P) => el('div', { class: 'bb-branch', style: `--t:${tint}` });
/** يظهرُ العنصرُ إذا بلغَه الكشف — من الأسفلِ إلى موضعِه لأنّ العينَ تتبعُ البناءَ صاعدًا */
const at = (n, ...kids) => el('div', { class: 'bb-rv', 'data-at': n }, ...kids);
const txt = (s, cls = 'bb-note') => el('div', { class: cls }, rtl(s));
const cols = (...kids) => el('div', { class: 'bb-cols' }, ...kids);

// ===== المراحل =====

function letters() {
  const L = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','هـ','و','ي'];
  return el('div', {},
    el('div', { class: 'bb-letters' }, ...L.map((l, i) =>
      el('div', { class: 'bb-rv bb-letter', 'data-at': Math.floor(i / 8), style: `transition-delay:${(i % 8) * 30}ms` }, l))),
    at(3, txt('الحَرفُ وَحدَهُ لا يَدُلُّ عَلَى مَعنًى؛ حَتَّى يَنضَمَّ إِلَى أَخَوَاتِهِ.')));
}

function lettersToWord() {
  /** الحروفُ متباعدةٌ ثمَّ تتقاربُ حتّى تلتصقَ، فتظهرُ الكلمةُ تحتَها */
  const assemble = (ls, word, n, tint) => el('div', { class: 'bb-assemble', 'data-join': n + 1, style: `--t:${tint}` },
    el('div', { class: 'bb-glyphs' }, ...ls.map(l => el('span', { class: 'bb-glyph' }, l))),
    el('div', { class: 'bb-rv', 'data-at': n + 1 }, arrow(tint), box(word, { tint, big: true })));
  return el('div', { class: 'bb-stack' },
    assemble(['كَ', 'تَ', 'بَ'], 'كَتَبَ', 0, A),
    at(2, assemble(['قَ', 'لَ', 'مٌ'], 'قَلَمٌ', 2, P)));
}

function wordKinds() {
  const kind = (name, def, ex, mark, tint) => el('div', { class: 'bb-col', style: `--t:${tint}` },
    box(name, { tint }), txt(def, 'bb-def'), txt(ex, 'bb-ex'), txt(mark, 'bb-mark'));
  return el('div', { class: 'bb-stack' },
    box('الكَلِمَةُ', { big: true }),
    at(1, arrow(), branch()),
    cols(
      at(1, kind('الاسمُ', 'مَا دَلَّ عَلَى مَعنًى فِي نَفسِهِ\nدُونَ اقتِرَانٍ بِزَمَنٍ', 'قَلَمٌ • مَدرَسَةٌ • مُحَمَّدٌ',
        'عَلامَاتُهُ: التَّنوِينُ • (ال) التَّعرِيفِ • الجَرُّ', P)),
      at(2, kind('الفِعلُ', 'مَا دَلَّ عَلَى حَدَثٍ\nمُقتَرِنٍ بِزَمَنٍ', 'كَتَبَ • يَكتُبُ • اكتُبْ',
        'عَلامَاتُهُ: السِّينُ • سَوفَ • تَاءُ التَّأنِيثِ السَّاكِنَةُ', A)),
      at(3, kind('الحَرفُ', 'لَيسَ لَهُ مَعنًى فِي نَفسِهِ\nبَل يَدُلُّ عَلَى مَعنًى فِي غَيرِهِ', 'مِنْ • إِلَى • وَ • يَا',
        'لا يَقبَلُ عَلامَاتِ الاسمِ ولا الفِعلِ', W))));
}

function nounNumber() {
  const leaf = (name, def, ex, tint) => el('div', { class: 'bb-col', style: `--t:${tint}` },
    box(name, { tint }), txt(def, 'bb-def'), txt(ex, 'bb-ex'));
  const small = (name, ex) => el('div', { class: 'bb-small', style: `--t:${A}` },
    el('div', { class: 'bb-small-t' }, rtl(name)), el('div', { class: 'bb-small-x' }, rtl(ex)));
  return el('div', { class: 'bb-stack' },
    box('الاسمُ', { ex: 'مِنْ حَيثُ العَدَدُ', big: true }),
    at(1, arrow(), branch()),
    cols(
      at(1, leaf('مُفرَدٌ', 'مَا دَلَّ عَلَى وَاحِدٍ', 'طَالِبٌ', P)),
      at(2, leaf('مُثَنًّى', 'مَا دَلَّ عَلَى اثنَينِ', 'طَالِبَانِ • طَالِبَينِ', P)),
      at(3, leaf('جَمعٌ', 'مَا دَلَّ عَلَى أَكثَرَ مِنِ اثنَينِ', 'طُلَّابٌ', A))),
    at(4, arrow(A), cols(
      small('جَمعُ مُذَكَّرٍ سَالِمٌ', 'المُعَلِّمُونَ\nالمُعَلِّمِينَ'),
      small('جَمعُ مُؤَنَّثٍ سَالِمٌ', 'المُعَلِّمَاتُ'),
      small('جَمعُ تَكسِيرٍ', 'أَقلامٌ • رِجَالٌ'))));
}

function verbTense() {
  const tense = (name, def, ex, mark) => el('div', { class: 'bb-col', style: `--t:${A}` },
    box(name, { tint: A }), txt(def, 'bb-def'), txt(ex, 'bb-ex bb-ex-big'), txt(mark, 'bb-mark'));
  return el('div', { class: 'bb-stack' },
    box('الفِعلُ', { ex: 'مِنْ حَيثُ الزَّمَنُ', tint: A, big: true }),
    at(1, arrow(A), branch(A)),
    cols(
      at(1, tense('المَاضِي', 'زَمَنٌ مَضَى وانقَطَعَ', 'كَتَبَ', 'عَلامَتُهُ: تَاءُ التَّأنِيثِ السَّاكِنَةُ وتَاءُ الفَاعِلِ\n(كَتَبَتْ • كَتَبْتُ)')),
      at(2, tense('المُضَارِعُ', 'زَمَنٌ حَاضِرٌ أَو مُستَقبَلٌ', 'يَكتُبُ', 'عَلامَتُهُ: قَبُولُ السِّينِ أَو سَوفَ\nويَبدَأُ بِـ (أ ن ي ت)')),
      at(3, tense('الأَمرُ', 'طَلَبٌ فِي زَمَنٍ مُستَقبَلٍ', 'اكتُبْ', 'عَلامَتُهُ: اتِّصَالُهُ بِيَاءِ المُخَاطَبَةِ\n(اكتُبِي)'))));
}

function wordsToSentence() {
  return el('div', { class: 'bb-stack' },
    el('div', { class: 'bb-words', 'data-join': 1 },
      ...['يَقرَأُ', 'الطَّالِبُ', 'الدَّرسَ'].map((w, i) =>
        el('span', { class: 'bb-rv bb-word', 'data-at': 0, style: `transition-delay:${i * 60}ms` }, rtl(w)))),
    at(2, arrow(), el('div', { class: 'bb-sentence' }, rtl('يَقرَأُ الطَّالِبُ الدَّرسَ.'))),
    at(3, txt('تَمَّ المَعنَى، وحَسُنَ السُّكُوتُ عَلَيهَا — فَهِيَ جُملَةٌ مُفِيدَةٌ.')));
}

function sentenceKinds() {
  /** أوّلُ كلمةٍ ملوّنةٌ مظلّلةٌ؛ لأنَّ القاعدةَ كلَّها معلّقةٌ بها */
  const card = (name, rule, first, rest, parts, tint) => el('div', { class: 'bb-col', style: `--t:${tint}` },
    box(name, { ex: rule, tint }),
    el('div', { class: 'bb-first' }, el('mark', {}, rtl(first)), ' ', el('span', {}, rtl(rest))),
    txt(parts, 'bb-def'));
  return el('div', { class: 'bb-stack' },
    box('الجُملَةُ', { big: true }),
    at(1, arrow(), branch()),
    cols(
      at(1, card('الجُملَةُ الاسمِيَّةُ', 'تَبدَأُ بِاسمٍ', 'الطَّالِبَةُ', 'مُجتَهِدَةٌ.',
        'رُكنَاهَا: المُبتَدَأُ والخَبَرُ، وهُمَا مَرفُوعَانِ دَائِمًا', P)),
      at(2, card('الجُملَةُ الفِعلِيَّةُ', 'تَبدَأُ بِفِعلٍ', 'شَكَرَ', 'المُؤمِنُ اللهَ.',
        'رُكنَاهَا: الفِعلُ والفَاعِلُ، وقَدْ يَأتِي مَفعُولٌ بِهِ', A))));
}

function toParagraph() {
  const S = ['مُحَمَّدٌ رَسُولُ اللهِ ﷺ أَعظَمُ القُدُوَاتِ.', 'كَانَ أَحسَنَ النَّاسِ خُلُقًا.', 'ومَا أَحرَانَا أَنْ نَقتَدِيَ بِهِ.'];
  return el('div', { class: 'bb-stack' },
    el('div', { class: 'bb-para', 'data-join': 1 },
      el('span', { class: 'bb-tag', style: `background:${P}` }, 'فِقرَةٌ'),
      ...S.map((s, i) => el('div', { class: 'bb-rv bb-sent', 'data-at': 0, style: `transition-delay:${i * 60}ms` }, rtl(s)))),
    at(2, arrow(), el('div', { class: 'bb-text' },
      el('span', { class: 'bb-tag', style: `background:${A}` }, 'نَصٌّ'),
      el('i'), el('i'), el('i'))),
    at(3, txt('وهَذَا هُوَ النَّصُّ الَّذِي تَقرَؤُهُ فِي كِتَابِكَ: حُرُوفٌ صَارَتْ كَلِمَاتٍ، وكَلِمَاتٌ صَارَتْ جُمَلًا، وجُمَلٌ صَارَتْ فِقَرًا.')));
}

function summary() {
  const col = (head, items, notes, tint) => el('div', { class: 'bb-col', style: `--t:${tint}` },
    box(head, { tint }),
    ...items.map((it, i) => el('div', { class: 'bb-small' },
      el('div', { class: 'bb-small-t' }, rtl(it)),
      notes[i] ? el('div', { class: 'bb-small-x muted', style: 'font-size:12px' }, rtl(notes[i])) : null)));
  return el('div', { class: 'bb-stack tight' },
    at(0, box('حُرُوفٌ', { ex: 'ا • ب • ت', tint: W })),
    at(1, arrow(), box('كَلِمَاتٌ', { ex: 'كَتَبَ • قَلَمٌ • مِنْ' })),
    at(2, arrow(), cols(
      col('اسمٌ', ['مُفرَدٌ', 'مُثَنًّى', 'جَمعٌ'], ['', '', 'سَالِمٌ مُذَكَّرٌ • سَالِمٌ مُؤَنَّثٌ • تَكسِيرٌ'], P),
      col('فِعلٌ', ['مَاضٍ', 'مُضَارِعٌ', 'أَمرٌ'], ['', '', ''], A),
      col('حَرفٌ', ['لا مَعنَى لَهُ فِي نَفسِهِ'], [''], W))),
    at(3, arrow(), el('div', { class: 'bb-cols' },
      box('جُملَةٌ اسمِيَّةٌ', { ex: 'تَبدَأُ بِاسمٍ', filled: false }),
      box('جُملَةٌ فِعلِيَّةٌ', { ex: 'تَبدَأُ بِفِعلٍ', tint: A, filled: false }))),
    at(4, arrow(), box('فِقَرٌ')),
    at(5, arrow(), box('نُصُوصٌ', { tint: A, big: true })));
}
