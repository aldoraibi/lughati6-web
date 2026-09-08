// ===== أدوات بناء الواجهة =====
export const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => c != null && n.append(c.nodeType ? c : document.createTextNode(c)));
  return n;
};

export const AR = '٠١٢٣٤٥٦٧٨٩';
export const ar = n => String(n).replace(/\d/g, d => AR[+d]);

/** علامة RLM: تمنع انقلاب السطر إذا بدأ برقم أو قوس */
export const rtl = s => '‏' + (s ?? '');

/** علاماتُ ألوانِ الكتاب — اللونُ جزءٌ من السؤال لا زينة:
 *  ⟪أحمر⟫ ⟨أزرق⟩ ⟦أخضر⟧ ⟬تظليل أصفر⟭ — تقابل bookText في تطبيق iPad */
const MARKS = [['⟪', '⟫', 'bk-r'], ['⟨', '⟩', 'bk-b'], ['⟦', '⟧', 'bk-g'], ['⟬', '⟭', 'bk-y']];
export const bt = s => {
  let rest = s ?? '';
  const out = el('span', { class: 'bk' }, '‏');
  for (;;) {
    let best = null;
    for (const [o, c, cls] of MARKS) {
      const i = rest.indexOf(o);
      if (i >= 0 && (best === null || i < best.i)) best = { i, c, cls };
    }
    const j = best ? rest.indexOf(best.c, best.i + 1) : -1;
    if (!best || j < 0) { out.append(rest); return out; }
    out.append(rest.slice(0, best.i), el('b', { class: best.cls }, rest.slice(best.i + 1, j)));
    rest = rest.slice(j + 1);
  }
};
/** النصُّ بلا علاماتِ اللون — لِما يُقارَنُ أو يُنطَق */
export const strip = s => (s ?? '').replace(/[⟪⟫⟨⟩⟦⟧⟬⟭]/g, '');

/** يحوّل **نص** إلى عريض */
export const bold = s => rtl(s ?? '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

/** بديلٌ آمنٌ لـ replaceChildren: يتجاهل null بدل أن يكتبها نصًّا */
export const fill = (node, ...kids) => {
  node.replaceChildren(...kids.flat().filter(k => k != null));
  return node;
};

export const clear = n => { while (n.firstChild) n.removeChild(n.firstChild); return n; };

export function credit() {
  return el('div', { class: 'credit' }, 'تم تطوير هذه النسخة الإلكترونية بواسطة: أ. يحيى بن محمد الدريبي');
}

export function rightsBar() {
  return el('div', { class: 'box', style: 'background:transparent;border:1px solid var(--line);font-size:13px;color:var(--dim)' },
    rtl('محتوى الدروس والنصوص والصور مِلكٌ لوزارة التعليم في المملكة العربية السعودية، وحقوق الطبع والنشر محفوظة لها. هذا العمل تعليميٌّ لمساعدة الطالب، ولا يُباع.'));
}
