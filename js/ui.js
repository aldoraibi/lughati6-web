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

/** يحوّل **نص** إلى عريض */
export const bold = s => rtl(s ?? '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

export const clear = n => { while (n.firstChild) n.removeChild(n.firstChild); return n; };

export function credit() {
  return el('div', { class: 'credit' }, 'تم تطوير هذه النسخة الإلكترونية بواسطة: أ. يحيى بن محمد الدريبي');
}

export function rightsBar() {
  return el('div', { class: 'box', style: 'background:transparent;border:1px solid var(--line);font-size:13px;color:var(--dim)' },
    rtl('محتوى الدروس والنصوص والصور مِلكٌ لوزارة التعليم في المملكة العربية السعودية، وحقوق الطبع والنشر محفوظة لها. هذا العمل تعليميٌّ لمساعدة الطالب، ولا يُباع.'));
}
