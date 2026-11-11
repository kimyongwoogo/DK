dash.calc('period', {
  title: '분석 기간',
  description: '분석 기준일, 2026년 누적의 시작일, 수집일, 데이터에 담긴 첫·마지막 온에어일',
  inputs: ['ads'],
  fn: (ads) => {
    const days = ads.map((a) => String(a.onair)).sort();
    return [{ from: '2026-10-01', year_from: '2026-01-01', collected: '2026-11-06', first_onair: days[0] || null, last_onair: days[days.length - 1] || null }];
  },
});

dash.calc('kpi', {
  title: '핵심 지표',
  description: '기준일 이후와 2026년 누적의 온에어 소재 수, 동국제약 비중, TV 비중, 평균 길이',
  inputs: ['ads', 'companies', 'period'],
  fn: (ads, companies, period) => {
    const from = period[0].from;
    const oct = ads.filter((a) => String(a.onair) >= from);
    const share = (list, f) => (list.length ? list.filter(f).length / list.length : null);
    const avg = (list) => (list.length ? list.reduce((s, a) => s + Number(a.seconds), 0) / list.length : null);
    const uniq = (list, k) => new Set(list.map((a) => a[k])).size;
    const dk = (a) => a.company === '동국제약';
    const tv = (a) => a.media_group === 'TV';
    return [{
      oct_ads: oct.length,
      ytd_ads: ads.length,
      total_companies: companies.length,
      competitors: companies.filter((c) => c.role === '경쟁사').length,
      oct_companies: uniq(oct, 'company'),
      ytd_companies: uniq(ads, 'company'),
      oct_brands: uniq(oct, 'brand'),
      ytd_brands: uniq(ads, 'brand'),
      dk_oct: oct.filter(dk).length,
      dk_ytd: ads.filter(dk).length,
      dk_oct_share: share(oct, dk),
      dk_ytd_share: share(ads, dk),
      comp_oct: oct.filter((a) => !dk(a)).length,
      comp_ytd: ads.filter((a) => !dk(a)).length,
      oct_tv_share: share(oct, tv),
      ytd_tv_share: share(ads, tv),
      oct_avg_sec: avg(oct),
      ytd_avg_sec: avg(ads),
      ytd_model_share: share(ads, (a) => !!a.models),
      no_oct_companies: companies.filter((c) => !oct.some((a) => a.company === c.company)).map((c) => c.company).join(' · ') || '없음',
    }];
  },
});

dash.calc('by_company', {
  title: '회사별 집계',
  description: '회사별 소재 수(기준일 이후·2026년 누적), 브랜드, 매체·길이 비중, 모델 기용, 최근 온에어',
  inputs: ['ads', 'companies', 'period'],
  fn: (ads, companies, period) => {
    const from = period[0].from;
    const total = ads.length;
    const counts = (list, k) => {
      const m = new Map();
      list.forEach((a) => { if (a[k]) m.set(a[k], (m.get(a[k]) || 0) + 1); });
      return [...m.entries()].sort((x, y) => y[1] - x[1] || String(x[0]).localeCompare(String(y[0]), 'ko'));
    };
    return companies.map((c) => {
      const list = ads.filter((a) => a.company === c.company);
      const oct = list.filter((a) => String(a.onair) >= from);
      const n = list.length;
      const share = (f) => (n ? list.filter(f).length / n : null);
      const models = new Map();
      list.forEach((a) => String(a.models || '').split(' · ').filter(Boolean).forEach((m) => models.set(m, (models.get(m) || 0) + 1)));
      const topModels = [...models.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'ko')).slice(0, 3).map((x) => x[0]);
      const last = list.slice().sort((x, y) => String(y.onair).localeCompare(String(x.onair)))[0];
      return {
        company: c.company,
        role: c.role,
        axis: c.axis,
        order: Number(c.order),
        oct_ads: oct.length,
        ytd_ads: n,
        ytd_share: total ? n / total : null,
        brands: new Set(list.map((a) => a.brand)).size,
        top_brands: counts(list, 'brand').slice(0, 3).map(([b, k]) => `${b} ${k}`).join(' · '),
        oct_brands: counts(oct, 'brand').map(([b, k]) => `${b} ${k}`).join(' · '),
        tv_share: share((a) => a.media_group === 'TV'),
        vs_share: share((a) => a.media_group === '가상·시보'),
        digital_share: share((a) => a.media_group === '디지털'),
        long_share: share((a) => a.length === '31초 이상'),
        avg_sec: n ? list.reduce((s, a) => s + Number(a.seconds), 0) / n : null,
        model_share: share((a) => !!a.models),
        top_models: topModels.join(' · '),
        last_onair: last ? last.onair : null,
        last_brand: last ? last.brand : null,
        months_active: new Set(list.map((a) => a.month)).size,
      };
    });
  },
});

dash.calc('category_map', {
  title: '제품군별 경쟁 구도',
  description: '제품군마다 동국제약과 경쟁사 10곳의 소재 수(기준일 이후·2026년 누적)와 브랜드',
  inputs: ['ads', 'period'],
  fn: (ads, period) => {
    const from = period[0].from;
    const cats = [...new Set(ads.map((a) => a.category))];
    const brandText = (list, withCo) => {
      const m = new Map();
      list.forEach((a) => {
        const k = withCo ? `${a.brand}(${a.company})` : a.brand;
        m.set(k, (m.get(k) || 0) + 1);
      });
      return [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'ko')).map(([k, n]) => `${k} ${n}`).join(' · ');
    };
    const lastOf = (list) => (list.length ? list.map((a) => String(a.onair)).sort().pop() : null);
    return cats.map((cat) => {
      const list = ads.filter((a) => a.category === cat);
      const dk = list.filter((a) => a.company === '동국제약');
      const cp = list.filter((a) => a.company !== '동국제약');
      const dkOct = dk.filter((a) => String(a.onair) >= from);
      const cpOct = cp.filter((a) => String(a.onair) >= from);
      return {
        category: cat,
        overlap: dk.length ? 1 : 0,
        dk_brands: brandText(dk, false),
        dk_ytd: dk.length,
        dk_oct: dkOct.length,
        comp_ytd: cp.length,
        comp_oct: cpOct.length,
        comp_companies: new Set(cp.map((a) => a.company)).size,
        comp_brands: brandText(cp, true),
        comp_oct_brands: brandText(cpOct, true),
        dk_share: list.length ? dk.length / list.length : null,
        dk_last: lastOf(dk),
        comp_last: lastOf(cp),
      };
    }).sort((x, y) => y.overlap - x.overlap || (y.dk_ytd + y.comp_ytd) - (x.dk_ytd + x.comp_ytd) || x.category.localeCompare(y.category, 'ko'));
  },
});

dash.calc('monthly', {
  title: '월별 온에어 소재 수',
  description: '온에어 월·회사별 소재 수',
  inputs: ['ads'],
  fn: (ads) => {
    const m = new Map();
    ads.forEach((a) => {
      const k = `${a.month}|${a.company}`;
      if (!m.has(k)) m.set(k, { month: a.month, company: a.company, role: a.role, ads: 0 });
      m.get(k).ads += 1;
    });
    return [...m.values()].sort((x, y) => x.month.localeCompare(y.month) || y.ads - x.ads);
  },
});

dash.calc('media_mix', {
  title: '회사별 매체 비중',
  description: '2026년 누적 소재를 TV(공중파·케이블), 가상·시보광고, 디지털로 나눈 비중',
  inputs: ['ads', 'companies'],
  fn: (ads, companies) => {
    const groups = ['TV', '가상·시보', '디지털'];
    const out = [];
    companies.forEach((c) => {
      const list = ads.filter((a) => a.company === c.company);
      groups.forEach((g) => {
        const n = list.filter((a) => a.media_group === g).length;
        out.push({ company: c.company, media_group: g, ads: n, share: list.length ? n / list.length : 0 });
      });
    });
    return out;
  },
});

dash.calc('length_mix', {
  title: '회사별 소재 길이 비중',
  description: '2026년 누적 소재를 길이 구간으로 나눈 비중',
  inputs: ['ads', 'companies'],
  fn: (ads, companies) => {
    const buckets = ['6초 이하', '7~15초', '16~30초', '31초 이상'];
    const out = [];
    companies.forEach((c) => {
      const list = ads.filter((a) => a.company === c.company);
      buckets.forEach((b) => {
        const n = list.filter((a) => a.length === b).length;
        out.push({ company: c.company, length: b, ads: n, share: list.length ? n / list.length : 0 });
      });
    });
    return out;
  },
});

dash.calc('brand_rows', {
  title: '브랜드별 캠페인',
  description: '회사·브랜드별 소재 수, 온에어 기간, 모델, 공개된 대행사·제작사, 최근 카피',
  inputs: ['ads', 'period'],
  fn: (ads, period) => {
    const from = period[0].from;
    const m = new Map();
    ads.forEach((a) => {
      const k = `${a.company}|${a.brand}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(a);
    });
    const uniq = (list, key) => {
      const seen = new Map();
      list.forEach((a) => String(a[key] || '').split(' · ').filter(Boolean).forEach((x) => seen.set(x, (seen.get(x) || 0) + 1)));
      return [...seen.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'ko')).slice(0, 4).map((x) => x[0]).join(' · ');
    };
    return [...m.values()].map((list) => {
      const sorted = list.slice().sort((x, y) => String(y.onair).localeCompare(String(x.onair)));
      return {
        company: list[0].company,
        brand: list[0].brand,
        category: list[0].category,
        overlap: Number(list[0].overlap),
        ytd_ads: list.length,
        oct_ads: list.filter((a) => String(a.onair) >= from).length,
        first_onair: sorted[sorted.length - 1].onair,
        last_onair: sorted[0].onair,
        tv_share: list.filter((a) => a.media_group === 'TV').length / list.length,
        models: uniq(list, 'models'),
        agency: uniq(list, 'agency'),
        production: uniq(list, 'production'),
        latest_copy: sorted[0].copy,
      };
    }).sort((x, y) => y.oct_ads - x.oct_ads || y.ytd_ads - x.ytd_ads || x.brand.localeCompare(y.brand, 'ko'));
  },
});

dash.calc('brand_options', {
  title: '회사·브랜드 선택지',
  description: '입력창 자동완성과 선택 칩에 쓰는 회사·제품군·브랜드 목록과 2026년 누적 소재 수',
  inputs: ['ads', 'companies'],
  fn: (ads, companies) => {
    const count = (f) => ads.filter(f).length;
    const out = companies.map((c) => ({ label: c.company, kind: '회사', ads: count((a) => a.company === c.company) }));
    [...new Set(ads.map((a) => a.category))].forEach((cat) => out.push({ label: cat, kind: '제품군', ads: count((a) => a.category === cat) }));
    [...new Set(ads.map((a) => a.brand))].forEach((b) => {
      if (!out.some((o) => o.label === b)) out.push({ label: b, kind: '브랜드', ads: count((a) => a.brand === b) });
    });
    return out;
  },
});

dash.calc('yt_company', {
  title: '회사별 유튜브 반응',
  description: '공식 유튜브 채널 영상의 회사별 조회수·좋아요·댓글 합계, 조회수 기준 SOV, 인게이지먼트율((좋아요+댓글)/조회수). 게시일 기준으로 기준일 이후와 2026년 누적을 나눕니다.',
  inputs: ['youtube', 'companies', 'period'],
  fn: (youtube, companies, period) => {
    const from = period[0].from;
    const sum = (list, k) => list.reduce((s, v) => s + (Number(v[k]) || 0), 0);
    const all = youtube;
    const oct = youtube.filter((v) => String(v.published) >= from);
    const totalYtd = sum(all, 'views');
    const totalOct = sum(oct, 'views');
    return companies.map((c) => {
      const list = all.filter((v) => v.company === c.company);
      const lo = list.filter((v) => String(v.published) >= from);
      const views = sum(list, 'views');
      const viewsOct = sum(lo, 'views');
      const react = sum(list, 'likes') + sum(list, 'comments');
      const reactOct = sum(lo, 'likes') + sum(lo, 'comments');
      const top = list.slice().sort((a, b) => Number(b.views) - Number(a.views))[0];
      return {
        company: c.company,
        role: c.role,
        channels: [...new Set(list.map((v) => v.channel))].join(' · '),
        videos_ytd: list.length,
        videos_oct: lo.length,
        ad_videos_ytd: list.filter((v) => Number(v.is_ad)).length,
        views_ytd: views,
        views_oct: viewsOct,
        likes_ytd: sum(list, 'likes'),
        comments_ytd: sum(list, 'comments'),
        likes_oct: sum(lo, 'likes'),
        comments_oct: sum(lo, 'comments'),
        sov_ytd: totalYtd ? views / totalYtd : null,
        sov_oct: totalOct ? viewsOct / totalOct : null,
        eng_ytd: views ? react / views : null,
        eng_oct: viewsOct ? reactOct / viewsOct : null,
        avg_views_ytd: list.length ? views / list.length : null,
        shorts_share: list.length ? list.filter((v) => Number(v.short)).length / list.length : null,
        top_title: top ? top.title : null,
        top_views: top ? Number(top.views) : null,
      };
    });
  },
});

dash.calc('yt_kpi', {
  title: '유튜브 핵심 지표',
  description: '공식 유튜브 채널 영상 전체의 조회수·반응 합계와 동국제약 SOV·인게이지먼트율',
  inputs: ['youtube', 'period'],
  fn: (youtube, period) => {
    const from = period[0].from;
    const sum = (list, k) => list.reduce((s, v) => s + (Number(v[k]) || 0), 0);
    const oct = youtube.filter((v) => String(v.published) >= from);
    const dk = (v) => v.company === '동국제약';
    const eng = (list) => { const vw = sum(list, 'views'); return vw ? (sum(list, 'likes') + sum(list, 'comments')) / vw : null; };
    const vOct = sum(oct, 'views');
    const vYtd = sum(youtube, 'views');
    return [{
      channels: new Set(youtube.map((v) => v.channel)).size,
      videos_ytd: youtube.length,
      videos_oct: oct.length,
      views_ytd: vYtd,
      views_oct: vOct,
      likes_oct: sum(oct, 'likes'),
      comments_oct: sum(oct, 'comments'),
      likes_ytd: sum(youtube, 'likes'),
      comments_ytd: sum(youtube, 'comments'),
      dk_views_oct: sum(oct.filter(dk), 'views'),
      dk_views_ytd: sum(youtube.filter(dk), 'views'),
      dk_sov_oct: vOct ? sum(oct.filter(dk), 'views') / vOct : null,
      dk_sov_ytd: vYtd ? sum(youtube.filter(dk), 'views') / vYtd : null,
      eng_oct: eng(oct),
      eng_ytd: eng(youtube),
      dk_eng_oct: eng(oct.filter(dk)),
      dk_eng_ytd: eng(youtube.filter(dk)),
      dk_videos_oct: oct.filter(dk).length,
      matched_ads: youtube.filter((v) => v.tvcf_idx).length,
    }];
  },
});

dash.calc('yt_category', {
  title: '제품군별 유튜브 SOV',
  description: '브랜드를 알 수 있는 공식 영상만 제품군으로 묶어, 동국제약과 경쟁사의 조회수·SOV·인게이지먼트율을 비교',
  inputs: ['youtube', 'period'],
  fn: (youtube, period) => {
    const from = period[0].from;
    const sum = (list, k) => list.reduce((s, v) => s + (Number(v[k]) || 0), 0);
    const tagged = youtube.filter((v) => v.category);
    const cats = [...new Set(tagged.map((v) => v.category))];
    const brandText = (list) => {
      const m = new Map();
      list.forEach((v) => m.set(`${v.brand}(${v.company})`, (m.get(`${v.brand}(${v.company})`) || 0) + Number(v.views || 0)));
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k).join(' · ');
    };
    return cats.map((cat) => {
      const list = tagged.filter((v) => v.category === cat);
      const dk = list.filter((v) => v.company === '동국제약');
      const cp = list.filter((v) => v.company !== '동국제약');
      const lo = list.filter((v) => String(v.published) >= from);
      const vAll = sum(list, 'views');
      const vOct = sum(lo, 'views');
      const dkOct = sum(lo.filter((v) => v.company === '동국제약'), 'views');
      const engOf = (l) => { const vw = sum(l, 'views'); return vw ? (sum(l, 'likes') + sum(l, 'comments')) / vw : null; };
      return {
        category: cat,
        overlap: dk.length ? 1 : 0,
        dk_views: sum(dk, 'views'),
        comp_views: sum(cp, 'views'),
        dk_sov: vAll ? sum(dk, 'views') / vAll : null,
        dk_sov_oct: vOct ? dkOct / vOct : null,
        views_oct: vOct,
        dk_eng: engOf(dk),
        comp_eng: engOf(cp),
        dk_brands: [...new Set(dk.map((v) => v.brand))].join(' · '),
        comp_top: brandText(cp),
      };
    }).sort((a, b) => b.overlap - a.overlap || (b.dk_views + b.comp_views) - (a.dk_views + a.comp_views));
  },
});

dash.calc('ad_reactions', {
  title: 'TVCF 소재별 유튜브 반응',
  description: 'TVCF 소재마다 연결된 공식 유튜브 영상의 조회수·좋아요·댓글·인게이지먼트율. 연결된 영상이 없으면 빈 값입니다.',
  inputs: ['ads', 'youtube'],
  fn: (ads, youtube) => {
    const byIdx = new Map(youtube.filter((v) => v.tvcf_idx).map((v) => [String(v.tvcf_idx), v]));
    const metric = (value) => {
      if (value === null || value === undefined || String(value).trim() === '') return null;
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    return ads.map((a) => {
      const v = byIdx.get(String(a.idx));
      const views = metric(v?.views);
      const likes = metric(v?.likes);
      const commentsOff = Number(v?.comments_off) === 1;
      const comments = commentsOff ? null : metric(v?.comments);
      return {
        idx: String(a.idx),
        video_id: v ? v.video_id : null,
        views,
        likes,
        comments,
        comments_off: commentsOff,
        eng: views ? ((likes ?? 0) + (comments ?? 0)) / views : null,
        short: v ? Number(v.short) : null,
      };
    });
  },
});

dash.calc('yt_video_eng', {
  title: '영상별 인게이지먼트율',
  description: '공식 유튜브 영상마다 (좋아요+댓글)/조회수',
  inputs: ['youtube'],
  fn: (youtube) => youtube.map((v) => ({
    video_id: v.video_id,
    eng: Number(v.views) ? ((Number(v.likes) || 0) + (Number(v.comments) || 0)) / Number(v.views) : null,
  })),
});

dash.calc('ig_view', {
  title: '인스타그램 계정별 반응',
  description: '공식 인스타그램 계정마다 팔로워, 수집한 최근 게시물 중 기준일 이후 게시물의 좋아요·댓글, 2026년 게시물 기준 참여율((좋아요+댓글)÷게시물 수÷팔로워)과 활동 상태. 로그인 없이 보이는 최근 12개 게시물만 셉니다.',
  inputs: ['ig_accounts', 'instagram', 'period'],
  fn: (accounts, posts, period) => {
    const { from, year_from: yf } = period[0];
    const sum = (list, k) => list.reduce((s, p) => s + (Number(p[k]) || 0), 0);
    return accounts.map((a) => {
      const list = posts.filter((p) => p.account === a.account);
      const lo = list.filter((p) => String(p.published) >= from);
      const ly = list.filter((p) => String(p.published) >= yf);
      const fol = Number(a.followers) || 0;
      const latest = String(a.latest_post);
      const complete = String(a.window_from) < from;
      let status = '활동 중';
      if (latest < yf) status = '2026년 게시 없음';
      else if (latest < from) status = '기준일 이후 게시 없음';
      else if (!complete) status = '기준일 이후 일부만 보임';
      return {
        account: a.account,
        company: a.company,
        account_label: a.account_label,
        name: a.name,
        followers: fol,
        total_posts: a.total_posts,
        latest_post: a.latest_post,
        window_from: a.window_from,
        oct_complete: complete ? 1 : 0,
        status,
        active: latest >= from ? 1 : 0,
        posts_oct: lo.length,
        likes_oct: sum(lo, 'likes'),
        comments_oct: sum(lo, 'comments'),
        inter_oct: sum(lo, 'interactions'),
        posts_2026: ly.length,
        inter_2026: sum(ly, 'interactions'),
        avg_2026: ly.length ? sum(ly, 'interactions') / ly.length : null,
        er_2026: ly.length && fol ? sum(ly, 'interactions') / ly.length / fol : null,
        likes_hidden: list.filter((p) => Number(p.likes_hidden)).length,
      };
    });
  },
});

dash.calc('ig_company', {
  title: '회사별 인스타그램 반응',
  description: '회사별 공식 인스타그램 계정의 팔로워 합계와 점유율, 기준일 이후 게시물의 좋아요+댓글 합계와 점유율, 2026년 게시물 기준 참여율, 반응 중 이벤트 게시물 비중. 명인제약은 공식 계정이 없습니다.',
  inputs: ['ig_view', 'instagram', 'companies', 'period'],
  fn: (view, posts, companies, period) => {
    const { from } = period[0];
    const sum = (list, k) => list.reduce((s, p) => s + (Number(p[k]) || 0), 0);
    const folAll = sum(view, 'followers');
    const interAll = sum(view, 'inter_oct');
    return companies.map((c) => {
      const accs = view.filter((a) => a.company === c.company).sort((x, y) => Number(y.followers) - Number(x.followers));
      const lo = posts.filter((p) => p.company === c.company && String(p.published) >= from);
      const inter = sum(lo, 'interactions');
      const ev = sum(lo.filter((p) => Number(p.is_event)), 'interactions');
      const erDen = accs.reduce((s, a) => s + Number(a.posts_2026) * Number(a.followers), 0);
      const top = lo.slice().sort((a, b) => Number(b.interactions) - Number(a.interactions))[0];
      return {
        company: c.company,
        role: c.role,
        accounts: accs.map((a) => '@' + a.account).join(' · '),
        n_accounts: accs.length,
        active_accounts: accs.filter((a) => Number(a.active)).length,
        followers: sum(accs, 'followers'),
        follower_share: folAll ? sum(accs, 'followers') / folAll : null,
        posts_oct: lo.length,
        likes_oct: sum(lo, 'likes'),
        comments_oct: sum(lo, 'comments'),
        inter_oct: inter,
        inter_share: interAll ? inter / interAll : null,
        partial: accs.some((a) => Number(a.active) && !Number(a.oct_complete)) ? 1 : 0,
        er_2026: erDen ? sum(accs, 'inter_2026') / erDen : null,
        event_share: inter ? ev / inter : null,
        top_caption: top ? top.caption : null,
        top_inter: top ? Number(top.interactions) : null,
      };
    });
  },
});

dash.calc('ig_kpi', {
  title: '인스타그램 핵심 지표',
  description: '공식 인스타그램 계정 전체의 팔로워·반응 합계와 동국제약 점유율·참여율, 이벤트 게시물 비중, 활동이 멈춘 계정 수',
  inputs: ['ig_view', 'ig_company', 'ig_accounts', 'instagram', 'period'],
  fn: (view, comp, accounts, posts, period) => {
    const { from } = period[0];
    const sum = (list, k) => list.reduce((s, p) => s + (Number(p[k]) || 0), 0);
    const dk = comp.find((c) => c.company === '동국제약') || {};
    const lo = posts.filter((p) => String(p.published) >= from);
    const inter = sum(lo, 'interactions');
    const erDen = view.reduce((s, a) => s + Number(a.posts_2026) * Number(a.followers), 0);
    const dates = accounts.map((a) => String(a.collected)).sort();
    return [{
      accounts: view.length,
      active: view.filter((a) => Number(a.active)).length,
      dormant: view.filter((a) => !Number(a.active)).length,
      followers: sum(view, 'followers'),
      posts_oct: lo.length,
      likes_oct: sum(lo, 'likes'),
      comments_oct: sum(lo, 'comments'),
      inter_oct: inter,
      event_share: inter ? sum(lo.filter((p) => Number(p.is_event)), 'interactions') / inter : null,
      er_2026: erDen ? sum(view, 'inter_2026') / erDen : null,
      dk_followers: dk.followers,
      dk_follower_share: dk.follower_share,
      dk_inter_oct: dk.inter_oct,
      dk_inter_share: dk.inter_share,
      dk_er_2026: dk.er_2026,
      dk_posts_oct: dk.posts_oct,
      partial_accounts: view.filter((a) => Number(a.active) && !Number(a.oct_complete)).map((a) => '@' + a.account).join(' · ') || '없음',
      hidden_like_accounts: view.filter((a) => Number(a.likes_hidden) > 0 && Number(a.active)).map((a) => '@' + a.account).join(' · ') || '없음',
      collected: dates[dates.length - 1] || null,
    }];
  },
});
