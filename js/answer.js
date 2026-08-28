// ===== محرّك التصحيح =====
// منقولٌ بحرفه عن AnswerEngine في تطبيق iPad حتى لا يختلف الحكم بين النسختين.

export const norm = s => (s || '')
  .replace(/[ً-ْـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/[ىئ]/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و')
  .replace(/[«»"".،؛!؟?,]/g, '')
  .replace(/\s+/g, ' ').trim();

export function grade(q, a) {
  const kind = q.kind;
  if (kind === 'openTask') return null;                    // يقوّمه الطالب بنفسه
  if (kind === 'mcq' || kind === 'trueFalse')
    return a.pick != null && (q.correctIndices || []).includes(a.pick);
  if (kind === 'multiSelect') {
    const want = [...(q.correctIndices || [])].sort().join(),
          got  = [...(a.picks || [])].sort().join();
    return want === got;
  }
  if (kind === 'fillBlank' || kind === 'shortAnswer')
    return (q.acceptedAnswers || []).some(x => norm(x) === norm(a.text));
  if (kind === 'order')
    return JSON.stringify(a.order || []) === JSON.stringify(q.correctOrder || []);
  if (kind === 'match') {
    const want = (q.correctPairs || []).map(p => p.join('-')).sort().join();
    const got  = Object.entries(a.pairs || {}).map(([l, r]) => `${l}-${r}`).sort().join();
    return want === got;
  }
  return null;
}
