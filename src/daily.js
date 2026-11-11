const dailyRuns = () => (okData('daily_checks')?.runs || []).slice()
  .sort((a, b) => b.checked_at.localeCompare(a.checked_at));
const dailyStatus = { complete: '확인 완료', partial: '일부 확인', limited: '확인 제한' };
const sourceNames = { naver: '네이버', google: '구글', publisher: '언론사 원문' };
const dailyClock = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const dailyStamp = (value) => dailyClock.format(new Date(value));
const isoDayLabel = (value) => value ? String(value).slice(0, 10).replaceAll('-', '.') : '—';
const validCount = (value) => Number.isSafeInteger(value) && value >= 0;
const publicLink = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
};
const dailyBadge = (status) => {
  const badge = el$('span', 'tv-monitor-badge', dailyStatus[status] || dailyStatus.limited);
  badge.dataset.state = status;
  return badge;
};

dash.draw('daily-overview', (el) => {
  const current = dailyRuns()[0];
  if (!current) {
    el.replaceChildren(el$('strong', null, '일일 점검'), el$('span', null, '점검 기록 준비 중'));
    return;
  }
  const entries = [['tvcf', 'TVCF', '편'], ['youtube', '유튜브', '편'], ['news', '뉴스', '건']];
  el.replaceChildren(
    el$('strong', null, '최근 점검'),
    el$('time', null, `${dailyStamp(current.checked_at)} KST`),
    ...entries.map(([key, label, unit]) => {
      const source = current[key];
      const result = source.status === 'limited' ? '확인 제한' : `${fmtInt(source.records.length)}${unit}${source.status === 'partial' ? ' 일부 확인' : ' 확인'}`;
      return el$('span', 'tv-monitor-pill', `${label} ${result}`);
    }),
    extLink('https://github.com/kimyongwoogo/DK/commits/main/data/daily_checks.json', '갱신 기록 ↗'),
  );
});

const dailyTable = (headers, rows) => {
  const wrap = el$('div', 'tv-tbl-wrap tv-monitor-table');
  const table = el$('table', 'tv-tbl');
  const header = el$('tr');
  headers.forEach((text) => {
    const th = el$('th', null, text);
    th.scope = 'col';
    header.appendChild(th);
  });
  const head = el$('thead');
  head.appendChild(header);
  const body = el$('tbody');
  body.append(...rows);
  table.append(head, body);
  wrap.appendChild(table);
  return wrap;
};
const earlierRuns = (runs, current) => runs.filter((run) => run.checked_at < current.checked_at);
const sourceCell = (url, label) => {
  const cell = el$('td', 'tv-nowrap');
  const href = publicLink(url);
  if (href) cell.appendChild(extLink(href, label));
  else cell.textContent = '—';
  return cell;
};
const tvcfDailyTable = (run, older) => {
  const baseline = new Map((okData('ads') || []).map((row) => [String(row.idx), row]));
  const priorIds = new Set([
    ...baseline.keys(),
    ...older.flatMap((previous) => previous.tvcf.records.map((row) => String(row.idx))),
  ]);
  const records = run.tvcf.records.slice().sort((a, b) => String(b.onair || '').localeCompare(String(a.onair || '')));
  const rows = records.map((row) => {
    const tr = el$('tr');
    const isNew = !priorIds.has(String(row.idx));
    const original = baseline.get(String(row.idx));
    const onair = tdText(isoDayLabel(row.onair), 'tv-nowrap');
    const dateDiffers = row.onair && original?.onair && row.onair !== original.onair;
    if (dateDiffers) onair.appendChild(el$('span', 'tv-monitor-delta', `기존 ${isoDayLabel(original.onair)}`));
    tr.append(
      tdText([row.company, row.brand].filter(Boolean).join(' · '), 'tv-nowrap'),
      tdText([row.title, row.product !== row.brand && row.product].filter(Boolean).join(' · ')),
      onair,
      tdText(isoDayLabel(row.registered), 'tv-nowrap'),
      tdText(isNew ? '새로 확인' : dateDiffers ? '온에어일 차이' : '재확인', isNew || dateDiffers ? 'tv-monitor-new' : 'tv-muted'),
      sourceCell(row.url, 'TVCF 원본'),
    );
    return tr;
  });
  return dailyTable(['회사·브랜드', '소재·제품', '온에어', '등록', '확인 결과', '출처'], rows);
};
const youtubeDailyTable = (run, older) => {
  const baseline = new Map((okData('youtube') || []).map((row) => [row.video_id, row]));
  const history = new Map();
  older.forEach((previous) => {
    previous.youtube.records.forEach((row) => {
      if (!history.has(row.video_id)) history.set(row.video_id, []);
      history.get(row.video_id).push({ ...row, at: previous.checked_at });
    });
  });
  const baselineDate = okData('period')?.[0]?.collected;
  const metric = (row, key) => {
    const value = row[key];
    const cell = tdText(validCount(value) ? fmtInt(value) : row[key + '_label'] || '—', 'tv-r');
    if (!validCount(value)) return cell;
    const old = history.get(row.video_id)?.find((candidate) => validCount(candidate[key]));
    const stored = baseline.get(row.video_id);
    const prior = old?.[key] ?? stored?.[key];
    const date = old?.at ?? baselineDate;
    if (validCount(prior) && date && date < run.checked_at) {
      const change = value - prior;
      const delta = el$('span', 'tv-monitor-delta', `${change > 0 ? '+' : ''}${fmtInt(change)}`);
      delta.dataset.change = change > 0 ? 'up' : change < 0 ? 'down' : 'same';
      delta.title = `${isoDayLabel(date)} 확인 수치 대비`;
      cell.appendChild(delta);
    }
    return cell;
  };
  const rows = run.youtube.records.map((row) => {
    const base = baseline.get(row.video_id);
    const tr = el$('tr');
    tr.append(
      tdText([row.company, row.brand || base?.brand].filter(Boolean).join(' · '), 'tv-nowrap'),
      tdText(row.title || base?.title || row.video_id),
      metric(row, 'views'), metric(row, 'likes'), metric(row, 'comments'),
      sourceCell(row.url, '유튜브 원본'),
    );
    return tr;
  });
  return dailyTable(['회사·브랜드', '공식 영상', '조회수', '좋아요', '댓글', '출처'], rows);
};

dash.draw('daily-source', (el) => {
  const select = el.querySelector('select');
  const result = el.querySelector('.tv-monitor-result');
  const runs = dailyRuns();
  const current = runs.find((run) => run.checked_at === select.value) || runs[0];
  if (!current) {
    select.disabled = true;
    result.replaceChildren(el$('p', 'tv-monitor-note', '기록된 점검이 없습니다.'));
    return;
  }
  select.disabled = false;
  if (select.options.length !== runs.length || select.options[0]?.value !== runs[0].checked_at) {
    select.replaceChildren(...runs.map((run) => new Option(dailyStamp(run.checked_at) + ' KST', run.checked_at)));
  }
  select.value = current.checked_at;
  select.onchange = () => dash.draw('daily-source');
  const key = el.dataset.channel;
  const source = current[key];
  const header = el$('div', 'tv-monitor-scope');
  header.append(dailyBadge(source.status), el$('p', 'tv-monitor-note', source.scope));
  const old = earlierRuns(runs, current);
  const items = [header];
  if (source.records.length) {
    if (key === 'youtube') {
      items.push(el$('p', 'tv-monitor-note', '증감은 같은 영상의 이전에 확인된 정확한 수치와 비교합니다. 공개 화면의 축약 표기는 그대로 표시합니다.'));
    }
    items.push(key === 'tvcf' ? tvcfDailyTable(current, old) : youtubeDailyTable(current, old));
  } else {
    items.push(el$('p', 'tv-monitor-note', source.status === 'limited' ? '이번 점검에서 확인한 행이 없습니다. 점검 기록에서 이전 결과를 볼 수 있습니다.' : '이번 점검 범위에서 새로 수록한 행이 없습니다.'));
  }
  result.replaceChildren(...items);
});

const newsFilters = ['company', 'brand', 'product'].map((key) => document.getElementById(`tv-news-${key}`));
const newsProviderButtons = [...document.querySelectorAll('[data-news-provider]')];
let newsProvider = 'all';
newsFilters.forEach((select) => select.addEventListener('change', () => dash.draw('monitor-news')));
newsProviderButtons.forEach((button) => button.addEventListener('click', () => {
  newsProvider = button.dataset.newsProvider;
  newsProviderButtons.forEach((node) => node.setAttribute('aria-pressed', String(node === button)));
  dash.draw('monitor-news');
}));
const sortedLabels = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
const populateNewsSelect = (select, caption, values) => {
  const previous = select.value;
  const items = ['', ...values];
  if (select.options.length !== items.length || items.some((value, i) => select.options[i]?.value !== value)) {
    select.replaceChildren(new Option(caption, ''), ...values.map((value) => new Option(value, value)));
  }
  select.value = values.includes(previous) ? previous : '';
  return select.value;
};
const newsIdentity = (row) => [row.company, row.brand, row.product, row.outlet, row.published_on, row.title]
  .map((value) => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')).join('|');
const mergeNews = (runs) => {
  const unique = new Map();
  runs.forEach((run) => run.news.records.forEach((row) => {
    const key = newsIdentity(row);
    if (unique.has(key)) row.providers.forEach((provider) => unique.get(key).providers.add(provider));
    else unique.set(key, { ...row, providers: new Set(row.providers) });
  }));
  return [...unique.values()].sort((a, b) => b.published_on.localeCompare(a.published_on) || a.title.localeCompare(b.title, 'ko'));
};
const newsSearchLinks = (query) => {
  const naver = new URL('https://search.naver.com/search.naver');
  naver.search = new URLSearchParams({ where: 'news', query, sort: '1' });
  const google = new URL('https://news.google.com/search');
  google.search = new URLSearchParams({ q: query, hl: 'ko', gl: 'KR', ceid: 'KR:ko' });
  return [extLink(naver.href, '네이버 뉴스 검색 ↗'), extLink(google.href, '구글 뉴스 검색 ↗')];
};
const newsArticle = (row) => {
  const card = el$('article', 'tv-card tv-news-article');
  const meta = el$('div', 'tv-news-meta');
  const scope = [row.company, row.brand, row.product !== row.brand && row.product].filter(Boolean).join(' · ');
  meta.append(el$('span', 'tv-news-brand', scope), el$('span', null, `${row.outlet} · ${isoDayLabel(row.published_on)}`));
  const title = el$('h3', 'tv-news-title');
  const href = publicLink(row.url);
  if (href) title.appendChild(extLink(href, row.title));
  else title.textContent = row.title;
  const providers = el$('div', 'tv-news-providers');
  ['naver', 'google', 'publisher'].forEach((name) => {
    if (!row.providers.has(name)) return;
    const chip = el$('span', 'tv-news-provider', sourceNames[name]);
    chip.dataset.provider = name;
    providers.appendChild(chip);
  });
  card.append(meta, title, providers);
  return card;
};

dash.draw('monitor-news', (el) => {
  const runs = dailyRuns();
  const articles = mergeNews(runs);
  const known = (okData('companies') || []).map((row) => row.company);
  const catalog = [...(okData('ads') || []), ...runs.flatMap((run) => run.tvcf.records), ...articles];
  const [companySelect, brandSelect, productSelect] = newsFilters;
  const company = populateNewsSelect(companySelect, '전체 회사', [...new Set([...known, ...sortedLabels(catalog.map((row) => row.company))])]);
  const companyRows = catalog.filter((row) => !company || row.company === company);
  const brand = populateNewsSelect(brandSelect, '전체 브랜드', sortedLabels(companyRows.map((row) => row.brand)));
  const brandRows = companyRows.filter((row) => !brand || row.brand === brand);
  const product = populateNewsSelect(productSelect, '전체 제품', sortedLabels(brandRows.map((row) => row.product)));
  const matched = brandRows.filter((row) => !product || row.product === product);
  const singleCompany = new Set(matched.map((row) => row.company)).size === 1 ? matched[0]?.company : '';
  const singleBrand = new Set(matched.map((row) => row.brand)).size === 1 ? matched[0]?.brand : '';
  const query = [...new Set([company || singleCompany, brand || singleBrand, product].filter(Boolean))].join(' ') || DK;
  document.getElementById('tv-news-search-links').replaceChildren(...newsSearchLinks(query));
  const visible = articles.filter((row) => (!company || row.company === company)
    && (!brand || row.brand === brand) && (!product || row.product === product)
    && (newsProvider === 'all' || row.providers.has(newsProvider)));
  const run = runs[0];
  const coverage = document.getElementById('tv-news-coverage');
  coverage.replaceChildren();
  if (run) coverage.append(dailyBadge(run.news.status), document.createTextNode(` ${dailyStamp(run.checked_at)} KST · ${run.news.scope}`));
  document.getElementById('tv-news-count').textContent = `수록 기사 ${fmtInt(visible.length)}건 · 포털 검색어 ${query}`;
  el.replaceChildren(...(visible.length ? visible.map(newsArticle) : [el$('p', 'tv-card tv-news-empty', '이 조건으로 수록된 기사가 없습니다. 위에서 네이버와 구글 검색 결과를 확인할 수 있습니다.')]));
});
