/* GitHub Pages의 JSON 데이터로 대시보드의 계산과 렌더링을 실행합니다. */
(function () {
  const files = [
    'ads', 'companies', 'creatives', 'fonts', 'youtube', 'instagram',
    'ig_accounts', 'youtube_comment_snapshot', 'daily_checks',
  ];
  const DATA = {};
  const calcs = {};
  const draws = {};
  const listeners = [];
  const cache = {};
  let params = {};
  let ready = false;
  const get = (id) => {
    if (Object.prototype.hasOwnProperty.call(DATA, id)) return DATA[id];
    if (Object.prototype.hasOwnProperty.call(cache, id)) return cache[id];
    const c = calcs[id];
    if (!c) throw new Error('알 수 없는 데이터: ' + id);
    cache[id] = c.fn(...c.inputs.map(get));
    return cache[id];
  };
  const runDraw = (name) => {
    const fn = draws[name];
    if (!fn) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
      try { fn(el); } catch (e) { console.error(name, e); }
    });
  };
  const runAll = () => {
    listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    Object.keys(draws).forEach(runDraw);
  };
  window.dash = {
    calc: (id, o) => { calcs[id] = o; },
    data: (id) => {
      try { return { status: 'ok', data: get(id) }; } catch (e) { console.error(e); return { status: 'error', data: null }; }
    },
    draw: (name, fn) => {
      if (fn) { draws[name] = fn; if (ready) runDraw(name); } else if (ready) runDraw(name);
    },
    onData: (fn) => { listeners.push(fn); if (ready) fn(); },
    params: () => params,
    setParams: (p) => {
      Object.keys(p).forEach((k) => { if (p[k] === null || p[k] === undefined) delete params[k]; else params[k] = p[k]; });
      runAll();
    },
    setLink: (name) => { try { history.replaceState(null, '', '#' + name); } catch (e) { /* 파일에서는 무시 */ } },
    colors: ['#2563eb', '#0d9488', '#f59e0b', '#a855f7', '#0ea5e9', '#22c55e', '#f97316', '#db2777'],
  };
  window.__dashStart = async () => {
    try {
      const data = await Promise.all(files.map(async (name) => {
        const options = name === 'daily_checks' ? { cache: 'no-cache' } : undefined;
        const response = await fetch(new URL('data/' + name + '.json', document.baseURI), options);
        if (!response.ok) throw new Error(name + ': HTTP ' + response.status);
        return [name, await response.json()];
      }));
      Object.assign(DATA, Object.fromEntries(data));
      ready = true;
      runAll();
    } catch (error) {
      console.error('대시보드 데이터를 불러오지 못했습니다.', error);
      const notice = document.getElementById('dashboard-load-error');
      notice.textContent = location.protocol === 'file:'
        ? 'GitHub Pages 주소 또는 로컬 웹 서버에서 대시보드를 열어 주세요.'
        : '대시보드 데이터를 불러오지 못했습니다. 새로고침해 주세요.';
      notice.hidden = false;
    }
  };
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.tv-tab')) setTimeout(runAll, 0); });
  let t = null;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(runAll, 200); });
})();
