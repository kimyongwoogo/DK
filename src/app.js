const DK = '동국제약';
const MEDIA_GROUPS = ['TV', '가상·시보', '디지털'];
const LENGTHS = ['6초 이하', '7~15초', '16~30초', '31초 이상'];
const GALLERY_H2_FROM = '2026-07-01';
const IMG_PREFIX = 'data:image/webp;base64,';
const col = (i) => (dash.colors && dash.colors[i]) || 'var(--cds-chart-muted)';
const dkColor = () => col(0);
const coColor = (c) => (c === DK ? dkColor() : 'var(--cds-chart-muted)');
const mgColor = (g) => col(1 + MEDIA_GROUPS.indexOf(g));
const lenColor = (l) => col(4 + LENGTHS.indexOf(l));
const fmtInt = d3.format(',');
const fmtPct = d3.format('.0%');
const fmtDec1 = d3.format('.1f');
const toDate = (s) => new Date(String(s).slice(0, 10) + 'T00:00:00Z');
const fmtMd = (s) => d3.utcFormat('%-m월 %-d일')(toDate(s));
const fmtFull = (s) => d3.utcFormat('%Y년 %-m월 %-d일')(toDate(s));
const fmtMonth = (s) => d3.utcFormat('%-m월')(toDate(String(s).slice(0, 7) + '-01'));
const fmtPct1 = d3.format('.1%');
const fmtPct2 = d3.format('.2%');
const fmtKo = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e8) return `${d3.format('.1f')(n / 1e8).replace(/[.]0$/, '')}억`;
  if (Math.abs(n) >= 1e6) return `${fmtInt(Math.round(n / 1e4))}만`;
  if (Math.abs(n) >= 1e4) return `${d3.format('.1f')(n / 1e4).replace(/[.]0$/, '')}만`;
  return fmtInt(n);
};
const FMT = { int: (v) => fmtInt(Number(v)), pct: (v) => fmtPct(Number(v)), pct1: (v) => fmtPct1(Number(v)), pct2: (v) => fmtPct2(Number(v)), ko: fmtKo, dec1: (v) => fmtDec1(Number(v)), md: fmtMd, fulldate: fmtFull, text: (v) => String(v) };
const okData = (id) => {
  const d = dash.data(id);
  return d.status === 'ok' ? d.data : null;
};
const failed = (id) => {
  const s = dash.data(id).status;
  return s === 'error' || s === 'connect' || s === 'declined';
};
const periodFrom = () => {
  const p = okData('period');
  return p && p[0] ? String(p[0].from) : null;
};
const el$ = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
};
const swatch = (color) => {
  const sw = el$('span', 'tv-sw');
  sw.style.background = color;
  return sw;
};
const failLine = (el) => {
  const box = el$('div', 'tv-fail');
  box.append(el$('span', 'tv-fail-dot'), el$('span', null, '불러오지 못함'));
  el.replaceChildren(box);
};
const chartStart = (el, ids) => {
  const missing = ids.find((id) => !okData(id));
  if (missing) {
    if (ids.some(failed)) { el.classList.remove('dash-skeleton'); failLine(el); } else el.replaceChildren();
    return false;
  }
  el.classList.remove('dash-skeleton');
  el.replaceChildren();
  return true;
};
const tipFor = (el) => {
  const t = el$('div', 'tv-tip');
  t.hidden = true;
  el.appendChild(t);
  return t;
};
const showTip = (el, t, event, head, lines) => {
  const kids = [el$('div', 'tv-tip-head', head)];
  lines.forEach((l) => {
    const row = el$('div', 'tv-tip-row');
    if (l.color) row.appendChild(swatch(l.color));
    row.appendChild(el$('span', null, l.text));
    kids.push(row);
  });
  t.replaceChildren(...kids);
  t.hidden = false;
  const box = el.getBoundingClientRect();
  const w = t.offsetWidth;
  const hgt = t.offsetHeight;
  let x = event.clientX - box.left + 12;
  let y = event.clientY - box.top + 12;
  if (x + w > el.clientWidth) x = event.clientX - box.left - w - 12;
  if (x < 0) x = 0;
  if (y + hgt > el.clientHeight) y = Math.max(0, event.clientY - box.top - hgt - 12);
  t.style.left = x + 'px';
  t.style.top = y + 'px';
};
const textWidth = (svg, strings, size, weight) => {
  const g = svg.append('g').attr('opacity', 0);
  let w = 0;
  strings.forEach((s) => {
    const node = g.append('text').attr('font-size', size).attr('font-weight', weight || null).text(s).node();
    w = Math.max(w, node.getComputedTextLength());
  });
  g.remove();
  return w;
};
const captionSize = () => {
  const probe = document.querySelector('.tv-card-note');
  const px = probe ? parseFloat(getComputedStyle(probe).fontSize) : 12;
  return Number.isFinite(px) ? px : 12;
};
const normText = (s) => String(s === null || s === undefined ? '' : s).toLowerCase().split(' ').join('');
const currentTerm = () => {
  const v = dash.params().brand;
  return typeof v === 'string' ? v.trim() : '';
};
const adMatches = (a, term) => {
  const t = normText(term);
  if (!t) return true;
  return [a.company, a.brand, a.category, a.copy, a.product, a.models, a.media].some((s) => normText(s).includes(t));
};
const show = (v, f) => (v === null || v === undefined || v === '' ? '—' : f(v));
const tdText = (text, cls) => el$('td', cls, text);
const barCell = (value, max, color, text, width) => {
  const td = el$('td');
  const wrap = el$('div', 'tv-barcell');
  const bar = el$('span', 'tv-bar');
  bar.style.width = (max ? (Number(value) / max) * width : 0) + 'rem';
  bar.style.background = color;
  wrap.append(bar, el$('span', null, text));
  td.appendChild(wrap);
  return td;
};
const nameCell = (company) => {
  const td = el$('td', 'tv-nowrap');
  td.append(swatch(coColor(company)), document.createTextNode(company));
  return td;
};
const extLink = (href, text) => {
  const a = el$('a', null, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
};
const TVCF_PLAY = 'https://tvcf.co.kr/play/';
const ytLink = (id, short) => (/^[A-Za-z0-9_-]{11}$/.test(String(id)) ? (Number(short) ? 'https://www.youtube.com/shorts/' : 'https://www.youtube.com/watch?v=') + id : null);
const safeLink = (href) => {
  const h = String(href);
  return h.startsWith(TVCF_PLAY) && /^[A-Za-z0-9-]+$/.test(h.slice(TVCF_PLAY.length)) ? h : null;
};

const paintSwatches = () => {
  document.querySelectorAll('.tv-sw[data-role]').forEach((sw) => { sw.style.background = sw.dataset.role === DK ? dkColor() : 'var(--cds-chart-muted)'; });
  document.querySelectorAll('.tv-sw[data-mg]').forEach((sw) => { sw.style.background = mgColor(sw.dataset.mg); });
  document.querySelectorAll('.tv-sw[data-len]').forEach((sw) => { sw.style.background = lenColor(sw.dataset.len); });
};
paintSwatches();

let fontsAdded = false;
dash.draw('fonts', () => {
  const rows = okData('fonts');
  if (!rows || fontsAdded || typeof FontFace === 'undefined' || !document.fonts) return;
  fontsAdded = true;
  const loads = [];
  rows.forEach((r) => {
    try {
      const bin = atob(String(r.woff2));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      const face = new FontFace(String(r.family), bytes.buffer, { weight: String(r.weight), style: 'normal', unicodeRange: String(r.unicode_range) });
      document.fonts.add(face);
      loads.push(face.loaded.catch(() => null));
    } catch (e) {
      loads.push(Promise.resolve(null));
    }
  });
  Promise.all(loads).then(() => ['monthly', 'media-chart', 'length-chart', 'sov-chart', 'eng-chart', 'ig-share-chart', 'ig-er-chart'].forEach((n) => dash.draw(n)));
});

dash.draw('v', (el) => {
  const rows = okData(el.dataset.source);
  if (!rows) { el.textContent = '—'; return; }
  let row;
  if (el.dataset.where) {
    const conds = el.dataset.where.split('&').map((p) => p.split('=').map((x) => decodeURIComponent(x)));
    row = rows.find((r) => conds.every(([k, v]) => String(r[k]) === v));
  } else {
    row = rows[Number(el.dataset.row || 0)];
  }
  const v = row ? row[el.dataset.field] : null;
  const f = FMT[el.dataset.fmt] || FMT.text;
  el.textContent = v === null || v === undefined || v === '' ? '—' : f(v);
});

dash.draw('company-rows', (tb) => {
  const rows = okData('by_company');
  if (!rows) { tb.replaceChildren(); return; }
  const maxOct = d3.max(rows, (r) => Number(r.oct_ads)) || 1;
  const list = rows.slice().sort((a, b) => (a.company === DK ? -1 : b.company === DK ? 1 : 0) || Number(b.oct_ads) - Number(a.oct_ads) || Number(b.ytd_ads) - Number(a.ytd_ads));
  tb.replaceChildren(...list.map((r) => {
    const tr = el$('tr', r.company === DK ? 'tv-dk' : null);
    tr.dataset.key = r.company;
    tr.append(
      nameCell(r.company),
      tdText(show(r.axis, String), 'tv-col-sec tv-small tv-muted'),
      barCell(r.oct_ads, maxOct, coColor(r.company), fmtInt(Number(r.oct_ads)), 3),
      tdText(show(r.ytd_ads, fmtInt), 'tv-r'),
      tdText(show(r.oct_brands, String), 'tv-col-sec tv-small'),
      tdText(show(r.top_brands, String), 'tv-col-sec tv-small'),
      tdText(show(r.tv_share, fmtPct), 'tv-r'),
      tdText(show(r.digital_share, fmtPct), 'tv-r tv-col-sec'),
      tdText(show(r.avg_sec, fmtDec1), 'tv-r tv-col-sec'),
      tdText(show(r.model_share, fmtPct), 'tv-r tv-col-sec'),
      tdText(show(r.top_models, String), 'tv-col-sec tv-small'),
      tdText(show(r.last_onair, fmtMd), 'tv-nowrap'),
    );
    return tr;
  }));
});

dash.draw('monthly', (el) => {
  if (!chartStart(el, ['monthly', 'period'])) return;
  const rows = okData('monthly');
  const p = okData('period')[0];
  if (!rows.length || !p.last_onair) return;
  const W = Math.max(280, el.clientWidth || 600);
  const H = 260;
  const fs = captionSize();
  const months = d3.utcMonth.range(toDate(String(p.year_from).slice(0, 7) + '-01'), d3.utcMonth.offset(toDate(String(p.last_onair).slice(0, 7) + '-01'), 1)).map((d) => d3.utcFormat('%Y-%m')(d));
  const fromMonth = String(p.from).slice(0, 7);
  const table = months.map((m) => {
    const list = rows.filter((r) => r.month === m);
    const dk = d3.sum(list.filter((r) => r.company === DK), (r) => Number(r.ads));
    const comp = d3.sum(list.filter((r) => r.company !== DK), (r) => Number(r.ads));
    return { month: m, dk, comp, total: dk + comp, list: list.slice().sort((a, b) => Number(b.ads) - Number(a.ads)) };
  });
  const maxY = d3.max(table, (d) => d.total) || 1;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', '월별 온에어 소재 수');
  const y0 = d3.scaleLinear([0, maxY], [0, 1]).nice();
  const yTicks = y0.ticks(5).filter((t) => Number.isInteger(t));
  const ml = Math.ceil(textWidth(svg, yTicks.map(fmtInt), fs)) + 10;
  const mt = fs + 10;
  const mb = fs + 14;
  const mr = 6;
  const y = d3.scaleLinear(y0.domain(), [H - mb, mt]);
  const x = d3.scaleBand(months, [ml, W - mr]).paddingInner(0.25).paddingOuter(0.1);
  const bw = Math.min(32, x.bandwidth());
  const off = (x.bandwidth() - bw) / 2;
  const shaded = months.filter((m) => m >= fromMonth);
  if (shaded.length) {
    const x0 = x(shaded[0]) - (x.step() - x.bandwidth()) / 2;
    const x1 = x(shaded[shaded.length - 1]) + x.bandwidth() + (x.step() - x.bandwidth()) / 2;
    svg.append('rect').attr('x', x0).attr('width', Math.max(0, Math.min(W - mr, x1) - x0)).attr('y', mt - fs - 6).attr('height', H - mb - mt + fs + 6)
      .attr('fill', 'var(--cds-chart-grid)').attr('opacity', 0.6).attr('rx', 2);
  }
  svg.append('g').selectAll('line').data(yTicks).join('line')
    .attr('x1', ml).attr('x2', W - mr).attr('y1', (t) => y(t)).attr('y2', (t) => y(t))
    .attr('stroke', 'var(--cds-chart-grid)').attr('stroke-width', 1);
  svg.append('g').selectAll('text').data(yTicks).join('text')
    .attr('x', ml - 8).attr('y', (t) => y(t)).attr('dy', '0.32em').attr('text-anchor', 'end')
    .attr('font-size', fs).attr('fill', 'var(--color-fg-muted)').text((t) => fmtInt(t));
  const g = svg.append('g');
  g.selectAll('rect.dk').data(table.filter((d) => d.dk > 0)).join('rect').attr('class', 'dk')
    .attr('x', (d) => x(d.month) + off).attr('width', bw)
    .attr('y', (d) => y(d.dk)).attr('height', (d) => Math.max(0, y(0) - y(d.dk)))
    .attr('fill', dkColor()).attr('rx', Math.min(2, bw / 2));
  g.selectAll('rect.cp').data(table.filter((d) => d.comp > 0)).join('rect').attr('class', 'cp')
    .attr('x', (d) => x(d.month) + off).attr('width', bw)
    .attr('y', (d) => y(d.total)).attr('height', (d) => Math.max(0, y(d.dk) - y(d.total) - (d.dk > 0 ? 1 : 0)))
    .attr('fill', 'var(--cds-chart-muted)').attr('rx', Math.min(2, bw / 2));
  const totW = textWidth(svg, [fmtInt(maxY)], fs);
  if (x.step() >= totW + 2) {
    svg.append('g').selectAll('text').data(table.filter((d) => d.total > 0)).join('text')
      .attr('x', (d) => x(d.month) + x.bandwidth() / 2).attr('y', (d) => y(d.total) - 4).attr('text-anchor', 'middle')
      .attr('font-size', fs).attr('fill', 'var(--color-fg)').text((d) => fmtInt(d.total));
  }
  svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--cds-chart-axis)');
  const labW = textWidth(svg, months.map(fmtMonth), fs) + 4;
  const every = Math.max(1, Math.ceil(labW / x.step()));
  svg.append('g').selectAll('text').data(months.filter((m, i) => i % every === 0)).join('text')
    .attr('x', (m) => x(m) + x.bandwidth() / 2).attr('y', H - mb + fs + 6).attr('text-anchor', 'middle').attr('font-size', fs)
    .attr('fill', 'var(--color-fg-muted)').text((m) => fmtMonth(m));
  const tip = tipFor(el);
  svg.append('g').selectAll('rect').data(table).join('rect')
    .attr('x', (d) => x(d.month) - (x.step() - x.bandwidth()) / 2).attr('width', x.step())
    .attr('y', mt).attr('height', H - mb - mt).attr('fill', 'transparent')
    .on('pointermove', (event, d) => {
      const lines = d.list.map((r) => ({ color: coColor(r.company), text: `${r.company} ${fmtInt(Number(r.ads))}편` }));
      if (!lines.length) lines.push({ text: '온에어 소재 없음' });
      showTip(el, tip, event, `${fmtMonth(d.month)} · 동국제약 ${fmtInt(d.dk)}편 · 경쟁사 ${fmtInt(d.comp)}편`, lines);
    })
    .on('pointerleave', () => { tip.hidden = true; });
});

dash.draw('category-rows', (tb) => {
  const rows = okData('category_map');
  if (!rows) { tb.replaceChildren(); return; }
  tb.replaceChildren(...rows.map((r) => {
    const tr = el$('tr', Number(r.overlap) ? 'tv-dk' : null);
    tr.dataset.key = r.category;
    tr.append(
      tdText(r.category, 'tv-nowrap'),
      tdText(show(r.dk_brands, String), 'tv-small'),
      tdText(fmtInt(Number(r.dk_oct)), 'tv-r'),
      tdText(fmtInt(Number(r.comp_oct)), 'tv-r'),
      tdText(show(r.comp_oct_brands, String), 'tv-col-sec tv-small'),
      tdText(fmtInt(Number(r.dk_ytd)), 'tv-r tv-col-sec'),
      tdText(fmtInt(Number(r.comp_ytd)), 'tv-r tv-col-sec'),
      barCell(r.dk_share === null ? 0 : r.dk_share, 1, dkColor(), show(r.dk_share, fmtPct), 4),
      tdText(show(r.comp_brands, String), 'tv-col-sec tv-small tv-muted'),
    );
    return tr;
  }));
});

const shareBars = (el, id, key, keys, colorOf, label) => {
  if (!chartStart(el, [id])) return;
  const rows = okData(id);
  if (!rows.length) return;
  const fs = captionSize();
  const cos = [...new Set(rows.map((r) => r.company))];
  const table = cos.map((c) => {
    const o = { company: c, n: 0 };
    keys.forEach((k) => {
      const r = rows.find((x) => x.company === c && x[key] === k);
      o[k] = r ? Number(r.share) : 0;
      o['n_' + k] = r ? Number(r.ads) : 0;
      o.n += o['n_' + k];
    });
    return o;
  });
  const W = Math.max(260, el.clientWidth || 400);
  const rowH = 26;
  const mt = 4;
  const mb = fs + 10;
  const H = mt + table.length * rowH + mb;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', label);
  const ml = Math.ceil(textWidth(svg, table.map((d) => d.company), fs, 700)) + 12;
  const mr = Math.ceil(textWidth(svg, ['100%'], fs) / 2) + 2;
  const x = d3.scaleLinear([0, 1], [ml, W - mr]);
  const yb = d3.scaleBand(table.map((d) => d.company), [mt, H - mb]).paddingInner(0.28);
  const bh = Math.min(18, yb.bandwidth());
  const off = (yb.bandwidth() - bh) / 2;
  svg.append('g').selectAll('text').data(table).join('text')
    .attr('x', ml - 10).attr('y', (d) => yb(d.company) + yb.bandwidth() / 2).attr('dy', '0.32em')
    .attr('text-anchor', 'end').attr('font-size', fs).attr('font-weight', (d) => (d.company === DK ? 700 : null))
    .attr('fill', 'var(--color-fg)').text((d) => d.company);
  const series = d3.stack().keys(keys)(table);
  const pctW = textWidth(svg, ['100%'], fs) + 6;
  series.forEach((s) => {
    const gg = svg.append('g');
    gg.selectAll('rect').data(s.filter((d) => d[1] > d[0])).join('rect')
      .attr('y', (d) => yb(d.data.company) + off).attr('height', bh)
      .attr('x', (d) => x(d[0]) + (d[0] > 0 ? 1 : 0)).attr('width', (d) => Math.max(0, x(d[1]) - x(d[0]) - (d[0] > 0 ? 1 : 0)))
      .attr('fill', colorOf(s.key)).attr('rx', 2);
    gg.selectAll('text').data(s.filter((d) => x(d[1]) - x(d[0]) >= pctW)).join('text')
      .attr('x', (d) => (x(d[0]) + x(d[1])) / 2).attr('y', (d) => yb(d.data.company) + yb.bandwidth() / 2).attr('dy', '0.32em')
      .attr('text-anchor', 'middle').attr('font-size', fs).attr('fill', 'var(--color-bg)').text((d) => fmtPct(d[1] - d[0]));
  });
  [0, 0.5, 1].forEach((t) => {
    svg.append('text').attr('x', x(t)).attr('y', H - mb + fs + 4).attr('text-anchor', 'middle').attr('font-size', fs)
      .attr('fill', 'var(--color-fg-muted)').text(fmtPct(t));
  });
  svg.append('line').attr('x1', ml).attr('x2', ml).attr('y1', mt).attr('y2', H - mb).attr('stroke', 'var(--cds-chart-axis)');
  const tip = tipFor(el);
  svg.append('g').selectAll('rect').data(table).join('rect')
    .attr('x', 0).attr('width', W).attr('y', (d) => yb(d.company) - (yb.step() - yb.bandwidth()) / 2).attr('height', yb.step())
    .attr('fill', 'transparent')
    .on('pointermove', (event, d) => {
      const lines = keys.filter((k) => d['n_' + k] > 0).map((k) => ({ color: colorOf(k), text: `${k} ${fmtInt(d['n_' + k])}편 (${fmtPct(d[k])})` }));
      showTip(el, tip, event, `${d.company} · ${fmtInt(d.n)}편`, lines);
    })
    .on('pointerleave', () => { tip.hidden = true; });
};
dash.draw('media-chart', (el) => shareBars(el, 'media_mix', 'media_group', MEDIA_GROUPS, mgColor, '회사별 매체 비중'));
dash.draw('length-chart', (el) => shareBars(el, 'length_mix', 'length', LENGTHS, lenColor, '회사별 소재 길이 비중'));

dash.draw('recent-rows', (tb) => {
  const rows = okData('ads');
  const from = periodFrom();
  if (!rows || !from) { tb.replaceChildren(); return; }
  const term = currentTerm();
  const list = rows.filter((a) => String(a.onair) >= from && adMatches(a, term))
    .sort((a, b) => String(b.onair).localeCompare(String(a.onair)) || String(a.company).localeCompare(String(b.company), 'ko'));
  tb.replaceChildren(...list.map((a) => {
    const tr = el$('tr', a.company === DK ? 'tv-dk' : null);
    tr.dataset.key = String(a.idx);
    const link = el$('td', 'tv-nowrap');
    const href = safeLink(a.link);
    if (href) link.appendChild(extLink(href, '영상 보기'));
    else link.textContent = '—';
    tr.append(
      tdText(fmtMd(a.onair), 'tv-nowrap'),
      nameCell(a.company),
      tdText(a.brand, 'tv-nowrap'),
      tdText(a.copy),
      tdText(a.media, 'tv-col-sec tv-nowrap'),
      tdText(fmtDec1(Number(a.seconds)), 'tv-r tv-col-sec'),
      tdText(show(a.models, String), 'tv-col-sec tv-small'),
      link,
    );
    return tr;
  }));
});

const brandState = { key: 'oct_ads', dir: -1, q: '' };
const BRAND_NUM = ['oct_ads', 'ytd_ads', 'tv_share'];
document.querySelectorAll('#brand-table .tv-sort').forEach((btn) => {
  btn.addEventListener('click', () => {
    const k = btn.dataset.key;
    if (brandState.key === k) brandState.dir = -brandState.dir;
    else { brandState.key = k; brandState.dir = BRAND_NUM.includes(k) || k === 'last_onair' ? -1 : 1; }
    document.querySelectorAll('#brand-table th[data-field]').forEach((th) => {
      th.setAttribute('aria-sort', th.dataset.field === k ? (brandState.dir < 0 ? 'descending' : 'ascending') : 'none');
    });
    dash.draw('brand-rows');
  });
});
document.querySelectorAll('.tv-search').forEach((inp) => {
  inp.addEventListener('input', () => {
    brandState.q = normText(inp.value);
    dash.draw('brand-rows');
  });
});
dash.draw('brand-rows', (tb) => {
  const rows = okData('brand_rows');
  if (!rows) { tb.replaceChildren(); return; }
  const { key, dir, q } = brandState;
  const term = normText(currentTerm());
  const hay = (r) => [r.brand, r.company, r.category, r.models, r.latest_copy, r.agency, r.production].map(normText).join('|');
  const maxY = d3.max(rows, (r) => Number(r.ytd_ads)) || 1;
  const list = rows
    .filter((r) => !term || hay(r).includes(term))
    .filter((r) => !q || hay(r).includes(q))
    .slice()
    .sort((a, b) => {
      const c = BRAND_NUM.includes(key) ? Number(a[key]) - Number(b[key]) : String(a[key]).localeCompare(String(b[key]), 'ko');
      return c * dir || Number(b.ytd_ads) - Number(a.ytd_ads) || String(a.brand).localeCompare(String(b.brand), 'ko');
    });
  tb.replaceChildren(...list.map((r) => {
    const tr = el$('tr', r.company === DK ? 'tv-dk' : null);
    tr.dataset.key = `${encodeURIComponent(r.company)},${encodeURIComponent(r.brand)}`;
    tr.append(
      tdText(r.brand, 'tv-nowrap'),
      nameCell(r.company),
      tdText(r.category, 'tv-col-sec tv-nowrap'),
      tdText(fmtInt(Number(r.oct_ads)), 'tv-r'),
      barCell(r.ytd_ads, maxY, coColor(r.company), fmtInt(Number(r.ytd_ads)), 3),
      tdText(fmtMd(r.last_onair), 'tv-nowrap'),
      tdText(show(r.tv_share, fmtPct), 'tv-r tv-col-sec'),
      tdText(show(r.models, String), 'tv-col-sec tv-small'),
      tdText(show(r.agency, String), 'tv-col-sec tv-small'),
      tdText(show(r.production, String), 'tv-col-sec tv-small'),
      tdText(show(r.latest_copy, String), 'tv-col-sec tv-small'),
    );
    return tr;
  }));
});

let termTimer = null;
const commitTerm = (value) => {
  clearTimeout(termTimer);
  dash.setParams({ brand: String(value || '').trim() || null });
};
document.querySelectorAll('.tv-brand-input').forEach((inp) => {
  inp.addEventListener('input', () => {
    clearTimeout(termTimer);
    termTimer = setTimeout(() => commitTerm(inp.value), 250);
  });
  inp.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') commitTerm(inp.value);
    if (event.key === 'Escape') { inp.value = ''; commitTerm(''); }
  });
  inp.addEventListener('change', () => commitTerm(inp.value));
});
document.querySelectorAll('.tv-brand-clear').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tv-brand-input').forEach((inp) => { inp.value = ''; });
    commitTerm('');
  });
});
document.querySelectorAll('.tv-chips').forEach((box) => {
  box.addEventListener('click', (event) => {
    const chip = event.target.closest('button[data-term]');
    if (!chip) return;
    document.querySelectorAll('.tv-brand-input').forEach((inp) => { inp.value = chip.dataset.term; });
    commitTerm(chip.dataset.term);
  });
});
dash.onData(() => {
  paintSwatches();
  const term = currentTerm();
  document.querySelectorAll('.tv-brand-input').forEach((inp) => {
    if (inp !== document.activeElement) inp.value = term;
  });
  document.querySelectorAll('.tv-brand-clear').forEach((btn) => { btn.hidden = !term; });
  document.querySelectorAll('.tv-sel').forEach((sec) => { sec.hidden = !term; });
});

const tabBar = document.querySelector('.tv-tabs');
const tabs = [...tabBar.querySelectorAll('.tv-tab')];
const showTab = (name, link) => {
  tabBar.closest('.tv-page').dataset.activePane = name;
  document.querySelectorAll('.tv-pane').forEach((p) => { p.hidden = p.dataset.pane !== name; });
  tabs.forEach((b) => {
    const active = b.dataset.tab === name;
    b.setAttribute('aria-selected', String(active));
    b.tabIndex = active ? 0 : -1;
  });
  if (link) dash.setLink(name);
};
tabs.forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab, true)));
tabBar.addEventListener('keydown', (event) => {
  const index = tabs.indexOf(event.target);
  const positions = { ArrowLeft: (index - 1 + tabs.length) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 };
  const next = positions[event.key];
  if (index < 0 || next === undefined) return;
  event.preventDefault();
  tabs[next].focus();
  tabs[next].click();
});
document.querySelectorAll('.tv-sel-go').forEach((b) => b.addEventListener('click', () => {
  const galleryTab = document.getElementById('tab-creatives');
  galleryTab.click();
  galleryTab.focus();
}));
const initialTab = location.hash.slice(1);
if (tabs.some((b) => b.dataset.tab === initialTab)) showTab(initialTab, false);

dash.draw('brand-options', (dl) => {
  const rows = okData('brand_options') || [];
  dl.replaceChildren(...rows.filter((r) => Number(r.ads) > 0).map((r) => {
    const o = document.createElement('option');
    o.value = r.label;
    o.label = `${r.kind} · ${fmtInt(Number(r.ads))}편`;
    return o;
  }));
});
dash.draw('brand-chips', (box) => {
  const rows = okData('brand_options');
  if (!rows) { box.replaceChildren(); return; }
  const term = normText(currentTerm());
  const chip = (label, value, n, kind) => {
    const b = el$('button', 'tv-chip' + (kind ? ' tv-chip-' + kind : ''));
    b.type = 'button';
    b.dataset.term = value;
    b.setAttribute('aria-pressed', String(term === normText(value)));
    if (kind === 'co') b.appendChild(swatch(coColor(label)));
    b.appendChild(document.createTextNode(label));
    if (n !== null) b.appendChild(el$('span', 'tv-chip-n', fmtInt(n)));
    return b;
  };
  const kinds = { 회사: 'co', 제품군: 'cat', 브랜드: 'brand' };
  const list = rows.filter((r) => Number(r.ads) > 0 && r.kind === '회사');
  box.replaceChildren(chip('전체', '', null, null), ...list.map((r) => chip(r.label, r.label, Number(r.ads), kinds[r.kind])));
});

const selStats = () => {
  const rows = okData('ads');
  const from = periodFrom();
  if (!rows || !from) return null;
  const term = currentTerm();
  const list = rows.filter((a) => adMatches(a, term));
  const n = list.length;
  const top = (key, k) => {
    const m = new Map();
    list.forEach((a) => String(a[key] || '').split(' · ').filter(Boolean).forEach((x) => m.set(x, (m.get(x) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).slice(0, k).map((x) => x[0]).join(' · ');
  };
  const last = list.map((a) => String(a.onair)).sort().pop();
  return {
    term,
    n,
    oct: list.filter((a) => String(a.onair) >= from).length,
    companies: top('company', 11),
    brands: top('brand', 5),
    last: last ? fmtMd(last) : null,
    tv: n ? fmtPct(list.filter((a) => a.media_group === 'TV').length / n) : null,
    avg: n ? fmtDec1(d3.mean(list, (a) => Number(a.seconds))) : null,
    models: top('models', 4),
  };
};
dash.draw('sel', (el) => {
  const s = selStats();
  const k = el.dataset.k;
  const v = s ? s[k] : null;
  el.textContent = v === null || v === undefined || v === '' ? '—' : (typeof v === 'number' ? fmtInt(v) : String(v));
});
dash.draw('sel-state', () => {
  const s = selStats();
  const has = !!(s && s.n > 0);
  document.querySelectorAll('.tv-sel-has').forEach((x) => { x.hidden = !has; });
  document.querySelectorAll('.tv-sel-none').forEach((x) => { x.hidden = has || !s; });
});
dash.draw('tab-count', (el) => {
  const rows = okData('ads');
  el.textContent = rows ? fmtInt(rows.filter((a) => adMatches(a, currentTerm())).length) : '—';
});

const galleryState = { period: '30', company: '', media: '', sort: 'new', linked: false, layout: 'company' };
const galleryCount = document.getElementById('gallery-count');
const galleryRange = document.getElementById('gallery-range');
const galleryCompanyTabs = document.getElementById('gallery-company-tabs');
const creativeDialog = document.getElementById('tv-creative-detail');
const creativeDialogBody = document.getElementById('tv-detail-body');
const GALLERY_METRICS = { views: '조회수', likes: '좋아요', comments: '댓글' };
const GALLERY_SORTS = {
  new: (a, b) => String(b.onair).localeCompare(String(a.onair)) || String(a.idx).localeCompare(String(b.idx)),
  old: (a, b) => String(a.onair).localeCompare(String(b.onair)) || String(a.idx).localeCompare(String(b.idx)),
  long: (a, b) => Number(b.seconds) - Number(a.seconds) || String(b.onair).localeCompare(String(a.onair)),
};
const GALLERY_ICONS = {
  views: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  likes: 'M12 20s-8-4.7-8-10a4.2 4.2 0 0 1 8-1.8A4.2 4.2 0 0 1 20 10c0 5.3-8 10-8 10Z',
  comments: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.3-4A8.5 8.5 0 1 1 21 11.5Z',
  zoom: 'M9 4H4v5m11-5h5v5m0 6v5h-5m-6 0H4v-5',
  external: 'M13 5h6v6m0-6-9 9M10 5H5v14h14v-5',
};
const galleryIcon = (name) => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const path = document.createElementNS(ns, 'path');
  svg.setAttribute('class', 'tv-gallery-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('d', GALLERY_ICONS[name]);
  svg.appendChild(path);
  return svg;
};
const recentStart = (end, days) => {
  const date = toDate(end);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
};
const adTitle = (ad) => ad.copy || ad.product || ad.brand || '제목 없는 소재';
const adLength = (ad) => ad.seconds ? `${fmtDec1(Number(ad.seconds))}초` : '';

['period', 'layout'].forEach((key) => {
  const buttons = [...document.querySelectorAll(`[data-gallery-${key}]`)];
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    galleryState[key] = btn.getAttribute(`data-gallery-${key}`);
    buttons.forEach((button) => { button.setAttribute('aria-pressed', String(button === btn)); });
    dash.draw('gallery');
  }));
});
['media', 'sort'].forEach((key) => {
  const select = document.querySelector(`.tv-gallery-${key}`);
  select.addEventListener('change', () => { galleryState[key] = select.value; dash.draw('gallery'); });
});
document.querySelector('.tv-gallery-matched').addEventListener('change', (event) => {
  galleryState.linked = event.target.checked;
  dash.draw('gallery');
});
galleryCompanyTabs.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-gallery-company]');
  if (!button) return;
  galleryState.company = button.dataset.galleryCompany;
  dash.draw('gallery');
});
galleryCompanyTabs.addEventListener('keydown', (event) => {
  const buttons = [...galleryCompanyTabs.children];
  const index = buttons.indexOf(event.target);
  const next = { ArrowLeft: (index + buttons.length - 1) % buttons.length, ArrowRight: (index + 1) % buttons.length, Home: 0, End: buttons.length - 1 }[event.key];
  if (index < 0 || next === undefined) return;
  event.preventDefault();
  buttons[next].focus();
  buttons[next].click();
});
const renderCompanyTabs = (rows, companies) => {
  const counts = d3.rollup(rows, (list) => list.length, (ad) => ad.company);
  const names = ['', ...new Set([...companies.map((row) => row.company), ...counts.keys()])];
  const existing = [...galleryCompanyTabs.children];
  if (names.length !== existing.length || names.some((name, index) => existing[index]?.dataset.galleryCompany !== name)) {
    galleryCompanyTabs.replaceChildren(...names.map((company) => {
      const button = el$('button', 'tv-company-tab');
      button.type = 'button';
      button.dataset.galleryCompany = company;
      button.setAttribute('aria-controls', 'gallery-grid');
      button.append(el$('span', null, company || '전체 회사'), el$('span', 'tv-company-tab-n'));
      return button;
    }));
  }
  [...galleryCompanyTabs.children].forEach((button) => {
    const company = button.dataset.galleryCompany;
    button.setAttribute('aria-pressed', String(galleryState.company === company));
    button.children[1].textContent = `${fmtInt(company ? counts.get(company) || 0 : rows.length)}편`;
  });
};

const adImage = (ad, src, lazy) => {
  if (!src) return el$('span', 'tv-thumb-empty', '대표 이미지 없음');
  const img = el$('img');
  img.alt = `${ad.brand || ad.company} 광고 대표 이미지`;
  if (lazy) img.loading = 'lazy';
  img.decoding = 'async';
  img.src = src;
  return img;
};
const adLinks = (ad, reaction) => {
  const tvcf = safeLink(ad.link);
  const youtube = reaction?.video_id ? ytLink(reaction.video_id, reaction.short) : null;
  const links = el$('div', 'tv-ad-links');
  [[tvcf, 'TVCF 원본'], [youtube, '유튜브 원본']].forEach(([href, label]) => {
    if (!href) return;
    const link = extLink(href, label);
    link.appendChild(galleryIcon('external'));
    links.appendChild(link);
  });
  return links;
};
const adReaction = (reaction, maxima, exact = false) => {
  const box = el$('div', 'tv-ad-reaction');
  const linked = Boolean(reaction?.video_id);
  const status = el$('p', 'tv-ad-status', linked ? '유튜브 반응' : '유튜브 미연결');
  const metrics = el$('dl', 'tv-ad-metrics');
  Object.entries(GALLERY_METRICS).forEach(([key, label]) => {
    const value = linked ? reaction[key] : null;
    const missing = value === null || value === undefined;
    const unavailable = linked && key === 'comments' && reaction.comments_off ? '꺼짐' : linked && key === 'likes' ? '숨김' : '—';
    const cell = el$('div', 'tv-ad-metric' + (missing ? ' is-missing' : ''));
    cell.dataset.metric = key;
    const name = el$('dt', 'tv-metric-label');
    name.append(galleryIcon(key), document.createTextNode(label));
    const number = el$('dd', 'tv-metric-value', missing ? unavailable : exact ? fmtInt(value) : fmtKo(value));
    if (!missing) number.title = fmtInt(value);
    cell.append(name, number);
    if (!exact) {
      const bar = el$('span', 'tv-metric-bar');
      bar.setAttribute('aria-hidden', 'true');
      if (!missing && maxima[key]) {
        const fill = el$('span');
        fill.style.width = (100 * value / maxima[key]) + '%';
        bar.appendChild(fill);
      }
      cell.appendChild(bar);
    }
    metrics.appendChild(cell);
  });
  box.append(status, metrics);
  return box;
};

const commentSettings = document.getElementById('tv-comment-settings');
const commentKeyInput = document.getElementById('tv-comment-key');
const commentDisconnect = document.getElementById('tv-comment-disconnect');
const commentConnectionStatus = document.getElementById('tv-comment-connection-status');
const commentFile = document.getElementById('tv-comment-file');
const commentClearFile = document.getElementById('tv-comment-clear-file');
const commentImportStatus = document.getElementById('tv-comment-import-status');
const commentPanels = new WeakMap();
let commentSession = null;
let importedComments = new Map();
let commentImportVersion = 0;

dash.draw('comment-snapshot-summary', (el) => {
  const snapshots = okData('youtube_comment_snapshot') || [];
  el.hidden = !snapshots.length;
  if (!snapshots.length) return;
  const count = d3.sum(snapshots, (video) => video.comments.length);
  el.textContent = `유튜브 공개 화면 ${fmtMd(snapshots[0].captured_on)} 확인 · 원문 수록 ${fmtInt(snapshots.length)}편 ${fmtInt(count)}건`;
});
const commentItem = (row) => {
  const item = el$('li');
  const date = typeof row.published_at === 'string' && /^\d{4}-\d{2}-\d{2}/.test(row.published_at)
    ? row.published_at.slice(0, 10).replaceAll('-', '.') : '';
  if (row.reply || row.author || date) {
    const meta = el$('p', 'tv-comment-meta');
    if (row.reply) meta.appendChild(el$('span', null, '답글'));
    if (row.author) meta.appendChild(el$('b', null, row.author));
    if (date) meta.appendChild(el$('span', null, date));
    item.appendChild(meta);
  }
  item.appendChild(el$('p', 'tv-comment-text', row.text));
  return item;
};
const renderCommentPanel = (panel) => {
  const view = commentPanels.get(panel);
  const { videoId, reaction, snapshot, count, scroll, list, message, action } = view;
  const imported = importedComments.get(videoId);
  const state = commentSession?.videos.get(videoId);
  const captured = !imported && !state?.loaded && !state?.disabled && snapshot;
  const rows = imported || (captured ? captured.comments : state?.rows);
  const length = rows?.length || 0;
  count.textContent = captured
    ? `원문 ${fmtInt(length)}/${fmtInt(captured.public_count)}건`
    : length ? `${imported ? '파일 · ' : ''}${fmtInt(length)}건 표시` : '';
  scroll.hidden = !length;
  if (view.renderedRows !== rows) {
    const top = scroll.scrollTop;
    list.replaceChildren(...(rows || []).map(commentItem));
    scroll.scrollTop = top;
    view.renderedRows = rows;
  }

  let note = '';
  let button = '';
  if (!videoId) note = '연결된 유튜브 영상 없음';
  else if (!imported) {
    if (state?.disabled) note = '유튜브에서 댓글이 꺼져 있습니다.';
    else if (commentSession?.error) { note = commentSession.error; button = '연결 설정 열기'; }
    else if (state?.error) { note = state.error; button = '다시 시도'; }
    else if (state?.loading) note = '공개 댓글을 불러오는 중…';
    else if (!commentSession) {
      if (captured) note = `${fmtMd(captured.captured_on)} 확인${length < captured.public_count ? ' · 일부 수록' : ''}`;
      else if (reaction.comments_off) note = '수집일 기준 댓글 꺼짐';
      else if (reaction.comments === 0) note = '수집일 기준 댓글 0건';
      else { note = '원문 연결 대기'; button = '댓글 원문 연결'; }
    } else if (!state?.loaded) button = '공개 댓글 불러오기';
    else if (state.next) button = '이전 댓글 더 보기';
    else if (!length) note = '표시할 공개 댓글 0건';
  }

  message.hidden = !note;
  message.textContent = note;
  action.hidden = !button;
  action.textContent = button;
};
const commentPanelNodes = () => document.querySelectorAll('[data-comment-video]');
const updateCommentPanels = (videoId) => {
  const nodes = videoId ? document.querySelectorAll(`[data-comment-video="${videoId}"]`) : commentPanelNodes();
  nodes.forEach(renderCommentPanel);
};
const commentObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries, observer) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;
    observer.unobserve(target);
    if (target.isConnected) loadCommentPage(target.dataset.commentVideo);
  });
}, { rootMargin: '60px 0px' }) : null;
const observeCommentPanels = () => {
  if (!commentObserver) return;
  commentObserver.disconnect();
  if (!commentSession || commentSession.error) return;
  commentPanelNodes().forEach((panel) => {
    const id = panel.dataset.commentVideo;
    if (!importedComments.has(id) && !commentSession.videos.has(id)) commentObserver.observe(panel);
  });
};

const commentConnectionErrors = {
  keyInvalid: 'YouTube Data API 키를 확인하세요.',
  API_KEY_INVALID: 'YouTube Data API 키를 확인하세요.',
  API_KEY_HTTP_REFERRER_BLOCKED: '현재 페이지에서 사용할 수 있는 API 키가 필요합니다.',
  API_KEY_IP_ADDRESS_BLOCKED: '현재 환경에서 사용할 수 있는 API 키가 필요합니다.',
  API_KEY_SERVICE_BLOCKED: '키의 YouTube Data API 사용 설정을 확인하세요.',
  accessNotConfigured: 'Google Cloud에서 YouTube Data API v3를 활성화하세요.',
  SERVICE_DISABLED: 'Google Cloud에서 YouTube Data API v3를 활성화하세요.',
  quotaExceeded: '유튜브 댓글 조회 한도에 도달했습니다.',
  dailyLimitExceeded: '유튜브 댓글 조회 한도에 도달했습니다.',
};
async function loadCommentPage(videoId) {
  const session = commentSession;
  if (!session || session.error || importedComments.has(videoId) || !ytLink(videoId)) return;
  const state = session.videos.get(videoId) || { rows: [], next: '', loaded: false };
  if (state.loading || state.disabled || (state.loaded && !state.next)) return;
  state.loading = true;
  state.error = '';
  session.videos.set(videoId, state);
  updateCommentPanels(videoId);
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
    url.search = new URLSearchParams({
      part: 'snippet', videoId, order: 'time', textFormat: 'plainText', maxResults: '20',
      fields: 'nextPageToken,items(snippet(topLevelComment(id,snippet(authorDisplayName,textDisplay,publishedAt))))',
    });
    if (state.next) url.searchParams.set('pageToken', state.next);
    const signal = AbortSignal.any && AbortSignal.timeout
      ? AbortSignal.any([session.controller.signal, AbortSignal.timeout(15000)]) : session.controller.signal;
    const response = await fetch(url, {
      headers: { 'X-Goog-Api-Key': session.key }, credentials: 'omit', cache: 'no-store', redirect: 'error', signal,
    });
    const payload = await response.json();
    if (session !== commentSession || session.error) return;
    if (!response.ok) {
      const reasons = [...(payload.error?.errors || []), ...(payload.error?.details || [])].map((entry) => entry.reason);
      if (reasons.includes('commentsDisabled')) {
        state.disabled = true;
        commentConnectionStatus.textContent = '공개 댓글 조회 연결됨';
        return;
      }
      const connectionError = reasons.map((reason) => commentConnectionErrors[reason]).find((value) => typeof value === 'string');
      if (connectionError) {
        session.error = connectionError;
        commentConnectionStatus.textContent = connectionError;
        observeCommentPanels();
      } else {
        state.error = response.status === 404 ? '유튜브에서 이 영상을 찾을 수 없습니다.' : '공개 댓글을 가져오지 못했습니다.';
      }
      return;
    }
    if (!Array.isArray(payload.items)) throw new Error('Invalid comment list');
    const merged = new Map(state.rows.map((row) => [row.id, row]));
    payload.items.forEach((item) => {
      const comment = item.snippet?.topLevelComment;
      const snippet = comment?.snippet;
      if (!comment?.id || typeof snippet?.textDisplay !== 'string' || !snippet.textDisplay.trim()) return;
      merged.set(comment.id, { id: comment.id, text: snippet.textDisplay, author: snippet.authorDisplayName, published_at: snippet.publishedAt });
    });
    state.rows = [...merged.values()];
    state.next = typeof payload.nextPageToken === 'string' ? payload.nextPageToken : '';
    state.loaded = true;
    commentConnectionStatus.textContent = '공개 댓글 조회 연결됨';
  } catch {
    state.error = '공개 댓글을 가져오지 못했습니다. 인터넷 연결과 API 키 설정을 확인하세요.';
  } finally {
    state.loading = false;
    if (session === commentSession) updateCommentPanels(session.error ? null : videoId);
  }
}
const openCommentSettings = () => {
  if (creativeDialog.open) creativeDialog.close();
  commentSettings.open = true;
  commentKeyInput.focus();
};
const adComments = (ad, reaction) => {
  const panel = el$('section', 'tv-ad-comments');
  const title = el$('span', 'tv-comment-title');
  title.append(galleryIcon('comments'), document.createTextNode('공개 댓글'));
  const count = el$('span', 'tv-comment-count');
  const heading = el$('div', 'tv-comment-head');
  heading.append(title, count);
  const scroll = el$('div', 'tv-comment-scroll');
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', `${adTitle(ad)} 공개 댓글`);
  const list = el$('ol', 'tv-comment-list');
  scroll.appendChild(list);
  const message = el$('p', 'tv-comment-message');
  const action = el$('button', 'tv-comment-action');
  action.type = 'button';
  const videoId = ytLink(reaction?.video_id) ? String(reaction.video_id) : '';
  const snapshot = videoId ? (okData('youtube_comment_snapshot') || []).find((row) => row.video_id === videoId) : null;
  if (videoId) panel.dataset.commentVideo = videoId;
  action.addEventListener('click', () => {
    if (commentSession && !commentSession.error) loadCommentPage(videoId);
    else openCommentSettings();
  });
  commentPanels.set(panel, { videoId, reaction, snapshot, count, scroll, list, message, action });
  panel.append(heading, scroll, message, action);
  renderCommentPanel(panel);
  return panel;
};

document.getElementById('tv-comment-connect').addEventListener('submit', (event) => {
  event.preventDefault();
  const key = commentKeyInput.value.trim();
  if (!key) return;
  commentSession?.controller.abort();
  commentSession = { key, controller: new AbortController(), videos: new Map() };
  commentKeyInput.value = '';
  commentDisconnect.hidden = false;
  commentConnectionStatus.textContent = '영상 카드가 보이면 공개 댓글을 불러옵니다.';
  updateCommentPanels();
  observeCommentPanels();
});
commentDisconnect.addEventListener('click', () => {
  commentSession?.controller.abort();
  commentSession = null;
  commentKeyInput.value = '';
  commentDisconnect.hidden = true;
  commentConnectionStatus.textContent = '유튜브 댓글 연결 해제됨';
  updateCommentPanels();
  observeCommentPanels();
});
commentFile.addEventListener('change', async () => {
  const file = commentFile.files?.[0];
  if (!file) return;
  const version = ++commentImportVersion;
  try {
    if (file.size > 16 * 1024 * 1024) throw new Error('File exceeds limit');
    const decoded = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
    if (version !== commentImportVersion) return;
    const rows = Array.isArray(decoded) ? decoded : decoded?.comments;
    if (!Array.isArray(rows)) throw new Error('Expected an array');
    const ids = new Set((okData('ad_reactions') || []).map((row) => row.video_id).filter(Boolean));
    const valid = rows
      .filter((row) => ids.has(row?.video_id) && typeof row.text === 'string' && row.text.trim())
      .map((row) => ({
        video_id: row.video_id,
        text: row.text,
        author: typeof row.author === 'string' ? row.author : '',
        published_at: typeof row.published_at === 'string' ? row.published_at : '',
      }));
    if (!valid.length) {
      commentImportStatus.textContent = '대시보드 영상 ID와 일치하는 댓글이 없습니다.';
      return;
    }
    importedComments = d3.group(valid, (row) => row.video_id);
    const skipped = rows.length - valid.length;
    commentImportStatus.textContent = `${fmtInt(importedComments.size)}편 · 댓글 ${fmtInt(valid.length)}건 연결${skipped ? ` · 일치하지 않거나 비어 있는 ${fmtInt(skipped)}건 제외` : ''}`;
    commentClearFile.hidden = false;
    updateCommentPanels();
    observeCommentPanels();
  } catch {
    if (version === commentImportVersion) commentImportStatus.textContent = '16MB 이하의 댓글 JSON 배열을 선택하세요.';
  } finally {
    if (version === commentImportVersion) commentFile.value = '';
  }
});
commentClearFile.addEventListener('click', () => {
  commentImportVersion += 1;
  importedComments = new Map();
  commentFile.value = '';
  commentClearFile.hidden = true;
  commentImportStatus.textContent = '가져온 댓글 지움';
  updateCommentPanels();
  observeCommentPanels();
});

const showCreativeDetail = (ad, src, reaction) => {
  const media = el$('div', 'tv-detail-media');
  media.appendChild(adImage(ad, src, false));
  const info = el$('div', 'tv-detail-info');
  const title = el$('h3', null, adTitle(ad));
  title.id = 'tv-detail-title';
  const meta = el$('dl', 'tv-detail-meta');
  [
    ['온에어', fmtFull(ad.onair)], ['제품', ad.product], ['제품군', ad.category],
    ['매체', ad.media], ['길이', adLength(ad)], ['형식', Number(ad.vertical) ? '세로형' : '가로형'],
    ['모델', ad.models], ['반응률', show(reaction?.eng, fmtPct2)],
  ].forEach(([label, value]) => {
    if (value && value !== '—') meta.append(el$('dt', null, label), el$('dd', null, value));
  });
  info.append(el$('p', 'tv-ad-co', `${ad.company} · ${ad.brand}`), title, adReaction(reaction, null, true), adComments(ad, reaction), meta, adLinks(ad, reaction));
  creativeDialogBody.replaceChildren(media, info);
  creativeDialog.showModal();
  observeCommentPanels();
};
creativeDialog.addEventListener('click', (event) => {
  if (event.target === creativeDialog) creativeDialog.close();
});

const adCard = (ad, src, reaction, maxima, grouped, isNew) => {
  const card = el$('article', 'tv-ad' + (ad.company === DK ? ' tv-ad-dk' : ''));
  card.dataset.creative = String(ad.idx);
  const thumb = el$('button', 'tv-thumb');
  thumb.type = 'button';
  thumb.setAttribute('aria-haspopup', 'dialog');
  thumb.setAttribute('aria-label', `${adTitle(ad)} 소재 상세${isNew ? ' · 신규 온에어' : ''}`);
  thumb.appendChild(adImage(ad, src, true));
  if (isNew) thumb.appendChild(el$('span', 'tv-thumb-new', 'NEW'));
  const zoom = el$('span', 'tv-thumb-zoom');
  zoom.appendChild(galleryIcon('zoom'));
  thumb.appendChild(zoom);
  if (adLength(ad)) thumb.appendChild(el$('span', 'tv-thumb-duration', adLength(ad)));
  thumb.addEventListener('click', () => showCreativeDetail(ad, src, reaction));

  const body = el$('div', 'tv-ad-body');
  const title = el$(grouped ? 'h4' : 'h3', 'tv-ad-head', adTitle(ad));
  title.title = adTitle(ad);
  const who = el$('p', 'tv-ad-co', grouped && ad.brand ? ad.brand : [ad.company, ad.brand].filter(Boolean).join(' · '));
  const tags = el$('div', 'tv-tags');
  tags.appendChild(el$('span', 'tv-tag tv-tag-date', `${fmtMd(ad.onair)} 온에어`));
  [ad.media, ad.category, Number(ad.vertical) ? '세로형' : ''].filter(Boolean).forEach((tag) => { tags.appendChild(el$('span', 'tv-tag', tag)); });
  body.append(who, title, tags, adReaction(reaction, maxima), adComments(ad, reaction), adLinks(ad, reaction));
  card.append(thumb, body);
  return card;
};

const drawGallery = (el) => {
  const rows = okData('ads');
  const period = okData('period')?.[0];
  if (!rows || !period) {
    galleryCount.textContent = '';
    galleryRange.textContent = '';
    if (failed('ads') || failed('period')) { el.classList.remove('dash-skeleton'); failLine(el); } else el.replaceChildren();
    return;
  }
  el.classList.remove('dash-skeleton');
  const reacts = new Map((okData('ad_reactions') || []).map((r) => [String(r.idx), r]));
  const term = currentTerm();
  const until = period.collected;
  const periods = { from: period.from, h2: GALLERY_H2_FROM, all: period.year_from };
  const since = periods[galleryState.period] || recentStart(until, Number(galleryState.period));
  const newSince = recentStart(until, 7);
  const sort = galleryState.sort;
  const sortValue = (a) => reacts.get(String(a.idx))?.[sort] ?? -1;
  const companies = (okData('companies') || []).slice().sort((a, b) => Number(a.order) - Number(b.order));
  const eligible = rows
    .filter((a) => adMatches(a, term))
    .filter((a) => a.onair >= since && a.onair <= until)
    .filter((a) => !galleryState.media || a.media_group === galleryState.media)
    .filter((a) => !galleryState.linked || reacts.get(String(a.idx))?.video_id);
  renderCompanyTabs(eligible, companies);
  const list = eligible
    .filter((a) => !galleryState.company || a.company === galleryState.company)
    .sort(GALLERY_SORTS[sort] || ((a, b) => sortValue(b) - sortValue(a) || GALLERY_SORTS.new(a, b)));
  const groups = d3.group(list, (a) => a.company);
  const linked = list.filter((a) => reacts.get(String(a.idx))?.video_id).length;
  const summary = `${galleryState.company || `${fmtInt(groups.size)}개 회사`} · 소재 ${fmtInt(list.length)}편 · 유튜브 연결 ${fmtInt(linked)}편`;
  if (galleryCount.textContent !== summary) galleryCount.textContent = summary;
  galleryRange.textContent = `온에어 ${fmtMd(since)}–${fmtMd(until)}${!list.length && period.last_onair ? ` · 전체 데이터 최신 온에어 ${fmtMd(period.last_onair)}` : ''}`;
  if (!list.length) {
    el.replaceChildren(el$('p', 'tv-empty', '조건에 맞는 소재가 없습니다.'));
    return;
  }
  const srcOf = new Map((okData('creatives') || [])
    .filter((c) => typeof c.src === 'string' && c.src.startsWith(IMG_PREFIX) && /^[A-Za-z0-9+/=]+$/.test(c.src.slice(IMG_PREFIX.length)))
    .map((c) => [String(c.idx), c.src]));
  const maxima = Object.fromEntries(Object.keys(GALLERY_METRICS).map((key) => [key, d3.max(list, (a) => reacts.get(String(a.idx))?.[key]) || 0]));
  const grouped = galleryState.layout === 'company';
  const renderCard = (ad) => adCard(ad, srcOf.get(String(ad.idx)), reacts.get(String(ad.idx)), maxima, grouped, ad.onair >= newSince);
  if (!grouped) {
    el.replaceChildren(...list.map(renderCard));
    return;
  }
  const companyOrder = new Map(companies.map((r) => [r.company, Number(r.order)]));
  const ordered = [...groups].map(([company, ads]) => ({ company, ads, latest: d3.max(ads, (a) => a.onair) }))
    .sort((a, b) => Number(b.company === DK) - Number(a.company === DK)
      || b.latest.localeCompare(a.latest) || (companyOrder.get(a.company) ?? Infinity) - (companyOrder.get(b.company) ?? Infinity)
      || a.company.localeCompare(b.company, 'ko'));
  el.replaceChildren(...ordered.map(({ company, ads }) => {
    const group = el$('section', 'tv-gallery-group' + (company === DK ? ' tv-gallery-group-dk' : ''));
    group.style.setProperty('--tv-group-size', ads.length);
    const heading = el$('header', 'tv-gallery-group-head');
    const dot = el$('span', 'tv-company-dot');
    dot.setAttribute('aria-hidden', 'true');
    heading.append(dot, el$('h3', null, company), el$('span', 'tv-gallery-group-n', `${fmtInt(ads.length)}편`));
    const grid = el$('div', 'tv-gallery-grid');
    grid.append(...ads.map(renderCard));
    group.append(heading, grid);
    return group;
  }));
};
dash.draw('gallery', (el) => {
  drawGallery(el);
  observeCommentPanels();
});

dash.draw('yt-company-rows', (tb) => {
  const rows = okData('yt_company');
  if (!rows) { tb.replaceChildren(); return; }
  const maxV = d3.max(rows, (r) => Number(r.views_ytd)) || 1;
  const list = rows.slice().sort((a, b) => (a.company === DK ? -1 : b.company === DK ? 1 : 0) || Number(b.views_ytd) - Number(a.views_ytd));
  tb.replaceChildren(...list.map((r) => {
    const tr = el$('tr', r.company === DK ? 'tv-dk' : null);
    tr.dataset.key = r.company;
    tr.append(
      nameCell(r.company),
      tdText(show(r.channels, String), 'tv-col-sec tv-small tv-muted'),
      tdText(fmtInt(Number(r.videos_oct)), 'tv-r'),
      tdText(fmtKo(r.views_oct), 'tv-r'),
      tdText(show(r.sov_oct, fmtPct1), 'tv-r'),
      tdText(fmtInt(Number(r.videos_ytd)), 'tv-r tv-col-sec'),
      barCell(r.views_ytd, maxV, coColor(r.company), fmtKo(r.views_ytd), 3),
      tdText(show(r.sov_ytd, fmtPct1), 'tv-r'),
      tdText(fmtInt(Number(r.likes_ytd)), 'tv-r tv-col-sec'),
      tdText(fmtInt(Number(r.comments_ytd)), 'tv-r tv-col-sec'),
      tdText(show(r.eng_ytd, fmtPct2), 'tv-r'),
      tdText(show(r.avg_views_ytd, fmtKo), 'tv-r tv-col-sec'),
      tdText(r.top_title ? `${r.top_title} (${fmtKo(r.top_views)})` : '—', 'tv-col-sec tv-small'),
    );
    return tr;
  }));
});

const pairBars = (el, id, keyA, keyB, fmt, label, refKey) => {
  if (!chartStart(el, refKey ? [id, 'yt_kpi'] : [id])) return;
  const rows = okData(id).slice().sort((a, b) => Number(b[keyB] || 0) - Number(a[keyB] || 0));
  if (!rows.length) return;
  const fs = captionSize();
  const W = Math.max(260, el.clientWidth || 400);
  const rowH = keyA ? 34 : 24;
  const mt = 4;
  const mb = fs + 10;
  const H = mt + rows.length * rowH + mb;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', label);
  const vals = rows.flatMap((r) => [keyA ? Number(r[keyA] || 0) : 0, Number(r[keyB] || 0)]);
  const maxX = d3.max(vals) || 1;
  const ml = Math.ceil(textWidth(svg, rows.map((d) => d.company), fs, 700)) + 12;
  const mr = Math.ceil(textWidth(svg, vals.map(fmt), fs)) + 8;
  const x = d3.scaleLinear([0, maxX], [ml, W - mr]).nice();
  const yb = d3.scaleBand(rows.map((d) => d.company), [mt, H - mb]).paddingInner(0.25);
  const ticks = x.ticks(4);
  svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', (t) => x(t)).attr('x2', (t) => x(t)).attr('y1', mt).attr('y2', H - mb).attr('stroke', 'var(--cds-chart-grid)');
  svg.append('g').selectAll('text').data(ticks).join('text').attr('x', (t) => x(t)).attr('y', H - mb + fs + 4).attr('text-anchor', 'middle').attr('font-size', fs).attr('fill', 'var(--color-fg-muted)').text((t) => fmt(t));
  svg.append('g').selectAll('text').data(rows).join('text')
    .attr('x', ml - 10).attr('y', (d) => yb(d.company) + yb.bandwidth() / 2).attr('dy', '0.32em').attr('text-anchor', 'end')
    .attr('font-size', fs).attr('font-weight', (d) => (d.company === DK ? 700 : null)).attr('fill', 'var(--color-fg)').text((d) => d.company);
  const bh = keyA ? Math.min(12, yb.bandwidth() / 2 - 1) : Math.min(16, yb.bandwidth());
  const g = svg.append('g');
  rows.forEach((d) => {
    const y0 = yb(d.company) + (yb.bandwidth() - (keyA ? bh * 2 + 2 : bh)) / 2;
    const parts = keyA ? [[keyA, 1, y0], [keyB, 0.4, y0 + bh + 2]] : [[keyB, 1, y0]];
    parts.forEach(([k, op, yy]) => {
      const v = Number(d[k] || 0);
      g.append('rect').attr('x', ml).attr('y', yy).attr('height', bh).attr('width', Math.max(0, x(v) - ml)).attr('rx', 2)
        .attr('fill', coColor(d.company)).attr('opacity', op);
      g.append('text').attr('x', x(v) + 4).attr('y', yy + bh / 2).attr('dy', '0.32em').attr('font-size', fs).attr('fill', 'var(--color-fg-muted)').text(d[k] === null || d[k] === undefined ? '—' : fmt(v));
    });
  });
  if (refKey) {
    const ref = Number(okData('yt_kpi')[0][refKey]);
    if (Number.isFinite(ref) && ref > 0) {
      svg.append('line').attr('x1', x(ref)).attr('x2', x(ref)).attr('y1', mt).attr('y2', H - mb).attr('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 3');
    }
  }
  svg.append('line').attr('x1', ml).attr('x2', ml).attr('y1', mt).attr('y2', H - mb).attr('stroke', 'var(--cds-chart-axis)');
  const tip = tipFor(el);
  svg.append('g').selectAll('rect').data(rows).join('rect')
    .attr('x', 0).attr('width', W).attr('y', (d) => yb(d.company) - (yb.step() - yb.bandwidth()) / 2).attr('height', yb.step()).attr('fill', 'transparent')
    .on('pointermove', (event, d) => {
      const lines = keyA
        ? [{ color: coColor(d.company), text: `기준일 이후 ${show(d[keyA], fmt)} · 조회 ${fmtKo(d.views_oct)}` }, { text: `2026년 누적 ${show(d[keyB], fmt)} · 조회 ${fmtKo(d.views_ytd)}` }]
        : [{ color: coColor(d.company), text: `${show(d[keyB], fmt)} · 좋아요 ${fmtInt(Number(d.likes_ytd))} · 댓글 ${fmtInt(Number(d.comments_ytd))}` }];
      showTip(el, tip, event, `${d.company} · 영상 ${fmtInt(Number(d.videos_ytd))}편`, lines);
    })
    .on('pointerleave', () => { tip.hidden = true; });
};
dash.draw('sov-chart', (el) => pairBars(el, 'yt_company', 'sov_oct', 'sov_ytd', fmtPct1, '회사별 유튜브 조회수 SOV', null));
dash.draw('eng-chart', (el) => pairBars(el, 'yt_company', null, 'eng_ytd', fmtPct2, '회사별 인게이지먼트율', 'eng_ytd'));

dash.draw('yt-category-rows', (tb) => {
  const rows = okData('yt_category');
  if (!rows) { tb.replaceChildren(); return; }
  tb.replaceChildren(...rows.map((r) => {
    const tr = el$('tr', Number(r.overlap) ? 'tv-dk' : null);
    tr.dataset.key = r.category;
    tr.append(
      tdText(r.category, 'tv-nowrap'),
      tdText(show(r.dk_brands, String), 'tv-small'),
      tdText(fmtKo(r.dk_views), 'tv-r'),
      tdText(fmtKo(r.comp_views), 'tv-r'),
      barCell(r.dk_sov === null ? 0 : r.dk_sov, 1, dkColor(), show(r.dk_sov, fmtPct1), 4),
      tdText(show(r.dk_sov_oct, fmtPct1), 'tv-r tv-col-sec'),
      tdText(show(r.dk_eng, fmtPct2), 'tv-r tv-col-sec'),
      tdText(show(r.comp_eng, fmtPct2), 'tv-r tv-col-sec'),
      tdText(show(r.comp_top, String), 'tv-col-sec tv-small tv-muted'),
    );
    return tr;
  }));
});

const ytState = { period: 'from', key: 'views', dir: -1, q: '' };
const YT_NUM = ['views', 'likes', 'comments', 'eng'];
document.querySelectorAll('.tv-yt-period').forEach((sel) => {
  sel.addEventListener('change', () => { ytState.period = sel.value; dash.draw('yt-video-rows'); });
});
document.querySelectorAll('.tv-yt-search').forEach((inp) => {
  inp.addEventListener('input', () => { ytState.q = normText(inp.value); dash.draw('yt-video-rows'); });
});
document.querySelectorAll('#yt-video-table .tv-sort').forEach((btn) => {
  btn.addEventListener('click', () => {
    const k = btn.dataset.key;
    if (ytState.key === k) ytState.dir = -ytState.dir;
    else { ytState.key = k; ytState.dir = YT_NUM.includes(k) || k === 'published' ? -1 : 1; }
    document.querySelectorAll('#yt-video-table th[data-field]').forEach((th) => {
      th.setAttribute('aria-sort', th.dataset.field === k ? (ytState.dir < 0 ? 'descending' : 'ascending') : 'none');
    });
    dash.draw('yt-video-rows');
  });
});
dash.draw('yt-period-select', (sel) => {
  const from = periodFrom();
  sel.replaceChildren(new Option(from ? `${fmtMd(from)} 이후 게시` : '분석 기간', 'from'), new Option('2026년 전체', 'all'));
  sel.value = ytState.period;
});
dash.draw('yt-video-rows', (tb) => {
  const rows = okData('youtube');
  const engs = okData('yt_video_eng');
  const from = periodFrom();
  if (!rows || !engs || !from) { tb.replaceChildren(); return; }
  const engOf = new Map(engs.map((e) => [e.video_id, e.eng]));
  const term = normText(currentTerm());
  const { key, dir, q } = ytState;
  const hay = (v) => [v.title, v.company, v.brand, v.category, v.channel].map(normText).join('|');
  const val = (v, k) => (k === 'eng' ? Number(engOf.get(v.video_id) || 0) : Number(v[k] || 0));
  const maxV = d3.max(rows, (v) => Number(v.views)) || 1;
  const list = rows
    .filter((v) => ytState.period !== 'from' || String(v.published) >= from)
    .filter((v) => !term || hay(v).includes(term))
    .filter((v) => !q || hay(v).includes(q))
    .slice()
    .sort((a, b) => {
      const c = YT_NUM.includes(key) ? val(a, key) - val(b, key) : String(a[key]).localeCompare(String(b[key]), 'ko');
      return c * dir || Number(b.views) - Number(a.views);
    })
    .slice(0, 300);
  tb.replaceChildren(...list.map((v) => {
    const tr = el$('tr', v.company === DK ? 'tv-dk' : null);
    tr.dataset.key = v.video_id;
    const link = el$('td', 'tv-nowrap');
    const href = ytLink(v.video_id, v.short);
    if (href) link.appendChild(extLink(href, '보기')); else link.textContent = '—';
    tr.append(
      tdText(fmtMd(v.published), 'tv-nowrap'),
      nameCell(v.company),
      tdText(show(v.brand, String), 'tv-nowrap tv-col-sec'),
      tdText(v.title, 'tv-small'),
      barCell(v.views, maxV, coColor(v.company), fmtKo(v.views), 3),
      tdText(show(v.likes, fmtInt), 'tv-r'),
      tdText(show(v.comments, fmtInt), 'tv-r'),
      tdText(show(engOf.get(v.video_id), fmtPct2), 'tv-r'),
      tdText(Number(v.short) ? '쇼츠' : '일반', 'tv-col-sec tv-nowrap'),
      link,
    );
    return tr;
  }));
});

const igPostLink = (id, kind) => (/^[A-Za-z0-9_-]{6,20}$/.test(String(id)) ? `https://www.instagram.com/${kind === '릴스' ? 'reel' : 'p'}/${id}/` : null);
const igAccLink = (u) => (/^[A-Za-z0-9._]{1,30}$/.test(String(u)) ? `https://www.instagram.com/${u}/` : null);
const IG_PARTIAL = '기준일 이후 일부만 보임';

dash.draw('ig-company-rows', (tb) => {
  const rows = okData('ig_company');
  if (!rows) { tb.replaceChildren(); return; }
  const maxF = d3.max(rows, (r) => Number(r.followers)) || 1;
  const list = rows.slice().sort((a, b) => (a.company === DK ? -1 : b.company === DK ? 1 : 0) || Number(b.inter_oct) - Number(a.inter_oct) || Number(b.followers) - Number(a.followers));
  tb.replaceChildren(...list.map((r) => {
    const tr = el$('tr', r.company === DK ? 'tv-dk' : null);
    tr.dataset.key = r.company;
    const none = !Number(r.n_accounts);
    tr.append(
      nameCell(r.company),
      tdText(none ? '공식 계정 없음' : r.accounts, 'tv-col-sec tv-small tv-muted'),
      barCell(r.followers, maxF, coColor(r.company), none ? '—' : fmtKo(r.followers), 3),
      tdText(none ? '—' : show(r.follower_share, fmtPct1), 'tv-r'),
      tdText(none ? '—' : fmtInt(Number(r.posts_oct)), 'tv-r'),
      tdText(none ? '—' : fmtInt(Number(r.likes_oct)), 'tv-r tv-col-sec'),
      tdText(none ? '—' : fmtInt(Number(r.comments_oct)), 'tv-r tv-col-sec'),
      tdText(none ? '—' : show(r.inter_share, fmtPct1) + (Number(r.partial) ? ' 이상' : ''), 'tv-r'),
      tdText(show(r.er_2026, fmtPct2), 'tv-r'),
      tdText(show(r.event_share, fmtPct), 'tv-r tv-col-sec'),
      tdText(r.top_caption ? `${Array.from(String(r.top_caption)).slice(0, 40).join('')}… (${fmtInt(Number(r.top_inter))})` : '—', 'tv-col-sec tv-small'),
    );
    return tr;
  }));
});

const igBars = (el, keyA, keyB, fmt, label, refKey, tipLines) => {
  if (!chartStart(el, ['ig_company', 'ig_kpi'])) return;
  const rows = okData('ig_company').filter((r) => Number(r.n_accounts) && (keyA ? true : r[keyB] !== null && r[keyB] !== undefined))
    .sort((a, b) => Number(b[keyA || keyB] || 0) - Number(a[keyA || keyB] || 0));
  if (!rows.length) return;
  const fs = captionSize();
  const W = Math.max(260, el.clientWidth || 400);
  const rowH = keyA ? 34 : 24;
  const mt = 4;
  const mb = fs + 10;
  const H = mt + rows.length * rowH + mb;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', label);
  const vals = rows.flatMap((r) => [keyA ? Number(r[keyA] || 0) : 0, Number(r[keyB] || 0)]);
  const maxX = d3.max(vals) || 1;
  const ml = Math.ceil(textWidth(svg, rows.map((d) => d.company), fs, 700)) + 12;
  const mr = Math.ceil(textWidth(svg, vals.map((v) => fmt(v) + ' 이상'), fs)) + 8;
  const x = d3.scaleLinear([0, maxX], [ml, W - mr]).nice();
  const yb = d3.scaleBand(rows.map((d) => d.company), [mt, H - mb]).paddingInner(0.25);
  const ticks = x.ticks(4);
  svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', (t) => x(t)).attr('x2', (t) => x(t)).attr('y1', mt).attr('y2', H - mb).attr('stroke', 'var(--cds-chart-grid)');
  svg.append('g').selectAll('text').data(ticks).join('text').attr('x', (t) => x(t)).attr('y', H - mb + fs + 4).attr('text-anchor', 'middle').attr('font-size', fs).attr('fill', 'var(--color-fg-muted)').text((t) => fmt(t));
  svg.append('g').selectAll('text').data(rows).join('text')
    .attr('x', ml - 10).attr('y', (d) => yb(d.company) + yb.bandwidth() / 2).attr('dy', '0.32em').attr('text-anchor', 'end')
    .attr('font-size', fs).attr('font-weight', (d) => (d.company === DK ? 700 : null)).attr('fill', 'var(--color-fg)').text((d) => d.company);
  const bh = keyA ? Math.min(12, yb.bandwidth() / 2 - 1) : Math.min(16, yb.bandwidth());
  const g = svg.append('g');
  rows.forEach((d) => {
    const y0 = yb(d.company) + (yb.bandwidth() - (keyA ? bh * 2 + 2 : bh)) / 2;
    const parts = keyA ? [[keyA, 1, y0], [keyB, 0.4, y0 + bh + 2]] : [[keyB, 1, y0]];
    parts.forEach(([k, op, yy]) => {
      const v = Number(d[k] || 0);
      g.append('rect').attr('x', ml).attr('y', yy).attr('height', bh).attr('width', Math.max(0, x(v) - ml)).attr('rx', 2)
        .attr('fill', coColor(d.company)).attr('opacity', op);
      const more = k === 'inter_share' && Number(d.partial) ? ' 이상' : '';
      g.append('text').attr('x', x(v) + 4).attr('y', yy + bh / 2).attr('dy', '0.32em').attr('font-size', fs).attr('fill', 'var(--color-fg-muted)').text(d[k] === null || d[k] === undefined ? '—' : fmt(v) + more);
    });
  });
  if (refKey) {
    const ref = Number(okData('ig_kpi')[0][refKey]);
    if (Number.isFinite(ref) && ref > 0 && ref <= x.domain()[1]) {
      svg.append('line').attr('x1', x(ref)).attr('x2', x(ref)).attr('y1', mt).attr('y2', H - mb).attr('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 3');
    }
  }
  svg.append('line').attr('x1', ml).attr('x2', ml).attr('y1', mt).attr('y2', H - mb).attr('stroke', 'var(--cds-chart-axis)');
  const tip = tipFor(el);
  svg.append('g').selectAll('rect').data(rows).join('rect')
    .attr('x', 0).attr('width', W).attr('y', (d) => yb(d.company) - (yb.step() - yb.bandwidth()) / 2).attr('height', yb.step()).attr('fill', 'transparent')
    .on('pointermove', (event, d) => showTip(el, tip, event, `${d.company} · 계정 ${fmtInt(Number(d.n_accounts))}곳`, tipLines(d)))
    .on('pointerleave', () => { tip.hidden = true; });
};
dash.draw('ig-share-chart', (el) => igBars(el, 'inter_share', 'follower_share', fmtPct1, '회사별 인스타그램 반응 점유율과 팔로워 점유율', null, (d) => [
  { color: coColor(d.company), text: `기준일 이후 반응 ${show(d.inter_share, fmtPct1)}${Number(d.partial) ? ' 이상' : ''} · 좋아요+댓글 ${fmtInt(Number(d.inter_oct))}` },
  { text: `팔로워 ${show(d.follower_share, fmtPct1)} · ${fmtInt(Number(d.followers))}명` },
]));
dash.draw('ig-er-chart', (el) => igBars(el, null, 'er_2026', fmtPct2, '회사별 인스타그램 참여율', 'er_2026', (d) => [
  { color: coColor(d.company), text: `참여율 ${show(d.er_2026, fmtPct2)} · 팔로워 ${fmtInt(Number(d.followers))}명` },
]));

dash.draw('ig-account-rows', (tb) => {
  const rows = okData('ig_view');
  if (!rows) { tb.replaceChildren(); return; }
  const maxF = d3.max(rows, (r) => Number(r.followers)) || 1;
  const list = rows.slice().sort((a, b) => (a.company === DK ? -1 : b.company === DK ? 1 : 0) || Number(b.active) - Number(a.active) || Number(b.followers) - Number(a.followers));
  tb.replaceChildren(...list.map((r) => {
    const tr = el$('tr', r.company === DK ? 'tv-dk' : null);
    tr.dataset.key = r.account;
    const acc = el$('td', 'tv-nowrap');
    const href = igAccLink(r.account);
    if (href) acc.appendChild(extLink(href, '@' + r.account)); else acc.textContent = '@' + r.account;
    tr.append(
      acc,
      nameCell(r.company),
      tdText(r.account_label, 'tv-col-sec tv-nowrap'),
      barCell(r.followers, maxF, coColor(r.company), fmtInt(Number(r.followers)), 3),
      tdText(show(r.total_posts, fmtInt), 'tv-r tv-col-sec'),
      tdText(show(r.latest_post, fmtFull), 'tv-nowrap'),
      tdText(fmtInt(Number(r.posts_oct)), 'tv-r'),
      tdText(fmtInt(Number(r.inter_oct)) + (r.status === IG_PARTIAL ? ' 이상' : ''), 'tv-r'),
      tdText(show(r.avg_2026, (v) => fmtInt(Math.round(Number(v)))), 'tv-r tv-col-sec'),
      tdText(show(r.er_2026, fmtPct2), 'tv-r'),
      tdText(r.status + (Number(r.likes_hidden) && Number(r.active) ? ' · 좋아요 숨김' : ''), 'tv-small tv-nowrap' + (Number(r.active) ? '' : ' tv-muted')),
    );
    return tr;
  }));
});

const igState = { period: 'from', key: 'published', dir: -1, q: '' };
const IG_NUM = ['likes', 'comments', 'interactions'];
document.querySelectorAll('.tv-ig-period').forEach((sel) => {
  sel.addEventListener('change', () => { igState.period = sel.value; dash.draw('ig-post-rows'); });
});
document.querySelectorAll('.tv-ig-search').forEach((inp) => {
  inp.addEventListener('input', () => { igState.q = normText(inp.value); dash.draw('ig-post-rows'); });
});
document.querySelectorAll('#ig-post-table .tv-sort').forEach((btn) => {
  btn.addEventListener('click', () => {
    const k = btn.dataset.key;
    if (igState.key === k) igState.dir = -igState.dir;
    else { igState.key = k; igState.dir = IG_NUM.includes(k) || k === 'published' ? -1 : 1; }
    document.querySelectorAll('#ig-post-table th[data-field]').forEach((th) => {
      th.setAttribute('aria-sort', th.dataset.field === k ? (igState.dir < 0 ? 'descending' : 'ascending') : 'none');
    });
    dash.draw('ig-post-rows');
  });
});
dash.draw('ig-period-select', (sel) => {
  const from = periodFrom();
  sel.replaceChildren(new Option(from ? `${fmtMd(from)} 이후 게시` : '분석 기간', 'from'), new Option('수집한 게시물 전체', 'all'));
  sel.value = igState.period;
});
dash.draw('ig-post-rows', (tb) => {
  const rows = okData('instagram');
  const from = periodFrom();
  if (!rows || !from) { tb.replaceChildren(); return; }
  const term = normText(currentTerm());
  const { key, dir, q } = igState;
  const hay = (p) => [p.caption, p.company, p.brand, p.category, p.account, p.account_label].map(normText).join('|');
  const val = (p, k) => Number(p[k] || 0);
  const maxI = d3.max(rows, (p) => Number(p.interactions)) || 1;
  const list = rows
    .filter((p) => igState.period !== 'from' || String(p.published) >= from)
    .filter((p) => !term || hay(p).includes(term))
    .filter((p) => !q || hay(p).includes(q))
    .slice()
    .sort((a, b) => {
      const c = IG_NUM.includes(key) ? val(a, key) - val(b, key) : String(a[key]).localeCompare(String(b[key]), 'ko');
      return c * dir || Number(b.interactions) - Number(a.interactions);
    });
  tb.replaceChildren(...list.map((p) => {
    const tr = el$('tr', p.company === DK ? 'tv-dk' : null);
    tr.dataset.key = p.post_id;
    const link = el$('td', 'tv-nowrap');
    const href = igPostLink(p.post_id, p.kind);
    if (href) link.appendChild(extLink(href, '보기')); else link.textContent = '—';
    tr.append(
      tdText(fmtMd(p.published), 'tv-nowrap'),
      nameCell(p.company),
      tdText('@' + p.account, 'tv-col-sec tv-small tv-nowrap'),
      tdText(p.caption ? String(p.caption) : '—', 'tv-small'),
      tdText(Number(p.likes_hidden) ? '숨김' : show(p.likes, fmtInt), 'tv-r'),
      tdText(show(p.comments, fmtInt), 'tv-r'),
      barCell(p.interactions, maxI, coColor(p.company), fmtInt(Number(p.interactions)), 3),
      tdText(Number(p.is_event) ? '이벤트' : '', 'tv-col-sec tv-small'),
      tdText(p.kind, 'tv-col-sec tv-nowrap'),
      link,
    );
    return tr;
  }));
});
