/* UI dictionary and language state. */
(function () {
  'use strict';
  var KEY = 'doping-site-lang';
  var listeners = [];

  var dict = {
    ko: {
      siteName: '도핑 약물 교육', skip: '본문으로 건너뛰기',
      navHome: '홈', navSubstances: '약물', navCases: '사건', navNews: '뉴스', navMain: '주 메뉴',
      searchLabel: '검색', searchPlaceholder: '약물·사건 검색', searchBtn: '검색',
      langBtn: 'English', langBtnLabel: 'Switch language to English',
      homeTitle: '운동선수 도핑 약물 교육',
      homeIntro: '세계반도핑기구(WADA) 금지목록의 분류별 대표 약물, 건강 위험, 역사적 도핑 사건을 한국어와 영어로 살펴보는 교육용 사이트입니다.',
      latestNews: '최신 뉴스', moreNews: '뉴스 더 보기', categoriesHeading: '금지목록 분류 바로가기',
      casesHeading: '주요 도핑 사건', casesLead: '국제 스포츠 중재재판소(CAS) 등 기관의 결정이 있는 사건을 정리했습니다.', viewCases: '사건 전체 보기',
      categoriesTitle: '금지목록 분류', categoriesLead: 'WADA 금지목록은 S0–S9, M1–M3, P1의 14개 분류로 구성됩니다.',
      category: '분류', substances: '약물', substancesInCategory: '이 분류의 약물', noSubstances: '등록된 약물이 없습니다.',
      status_always: '상시 금지', status_in_competition: '경기기간 중', status_particular_sports: '특정 종목',
      statusLabel: '금지 상태', officialSource: 'WADA 공식 출처',
      effects: '작용', sideEffects: '건강 위험·부작용', detection: '검사', sources: '출처', aliases: '다른 이름',
      relatedCases: '관련 사건', relatedSubstances: '관련 약물', none: '없음',
      imageCredit: '이미지', imageLicense: '라이선스', imageSource: '원본 보기',
      imageNote: '교육용 구조 이미지이며 실제 제품 사진이 아닙니다.',
      casesTitle: '도핑 사건', year: '연도', sport: '종목', summary: '개요', outcome: '결과', decision: '결정 기관·근거',
      decisionBody: '기관', decisionRef: '근거',
      newsTitle: '뉴스', newsUpdated: '마지막 갱신', newsNotice: '아래 내용은 외부 언론 기사이며, 이 사이트가 사실 여부를 검증하지 않았습니다. 제목과 링크만 표시합니다.',
      filterAll: '전체', filterKo: '한국어', filterEn: 'English', filterLabel: '언어 필터', noNews: '표시할 뉴스가 없습니다.', openArticle: '기사 열기 (새 탭)',
      searchTitle: '검색 결과', searchFor: '검색어', searchEmptyQuery: '검색어를 입력하세요.', noResults: '검색 결과가 없습니다.',
      resultsCount: '건',
      notFoundTitle: '페이지를 찾을 수 없습니다', notFoundText: '요청한 주소에 해당하는 내용이 없습니다.', backHome: '홈으로',
      dataMissing: '데이터를 불러오지 못했습니다.', back: '목록으로',
      footerSources: '이 사이트의 분류는 WADA 금지목록을 기준으로 합니다.', footerList: '금지목록 버전', footerWada: 'WADA 금지목록 (공식)',
      footerMedical: '의학적 조언이 아닙니다.', footerEdu: '이 사이트는 교육 목적으로만 제공되며, 도핑 또는 약물 사용을 권하거나 돕지 않습니다. 건강 문제는 의료 전문가와 상담하세요.',
      docTitleSuffix: '도핑 약물 교육'
    },
    en: {
      siteName: 'Anti-Doping Education', skip: 'Skip to content',
      navHome: 'Home', navSubstances: 'Substances', navCases: 'Cases', navNews: 'News', navMain: 'Main navigation',
      searchLabel: 'Search', searchPlaceholder: 'Search substances, cases', searchBtn: 'Search',
      langBtn: '한국어', langBtnLabel: '한국어로 전환',
      homeTitle: 'Doping Substances Education for Athletes',
      homeIntro: 'An educational bilingual site covering representative substances in each category of the WADA Prohibited List, their health risks, and historic doping cases.',
      latestNews: 'Latest news', moreNews: 'More news', categoriesHeading: 'Prohibited List categories',
      casesHeading: 'Major doping cases', casesLead: 'Cases with a decision by bodies such as the Court of Arbitration for Sport (CAS).', viewCases: 'View all cases',
      categoriesTitle: 'Prohibited List categories', categoriesLead: 'The WADA Prohibited List has 14 categories: S0-S9, M1-M3 and P1.',
      category: 'Category', substances: 'Substances', substancesInCategory: 'Substances in this category', noSubstances: 'No substances listed.',
      status_always: 'Prohibited at all times', status_in_competition: 'In-competition', status_particular_sports: 'Particular sports',
      statusLabel: 'Status', officialSource: 'Official WADA source',
      effects: 'Effects', sideEffects: 'Health risks and side effects', detection: 'Testing', sources: 'Sources', aliases: 'Also known as',
      relatedCases: 'Related cases', relatedSubstances: 'Related substances', none: 'None',
      imageCredit: 'Image', imageLicense: 'License', imageSource: 'View original',
      imageNote: 'Educational structure image, not a photo of a real product.',
      casesTitle: 'Doping cases', year: 'Year', sport: 'Sport', summary: 'Summary', outcome: 'Outcome', decision: 'Deciding body and reference',
      decisionBody: 'Body', decisionRef: 'Reference',
      newsTitle: 'News', newsUpdated: 'Last updated', newsNotice: 'These are external news articles. This site has not verified their accuracy. Only titles and links are shown.',
      filterAll: 'All', filterKo: '한국어', filterEn: 'English', filterLabel: 'Language filter', noNews: 'No news to show.', openArticle: 'Open article (new tab)',
      searchTitle: 'Search results', searchFor: 'Query', searchEmptyQuery: 'Enter a search term.', noResults: 'No results found.',
      resultsCount: 'found',
      notFoundTitle: 'Page not found', notFoundText: 'Nothing matches the requested address.', backHome: 'Back to home',
      dataMissing: 'Could not load data.', back: 'Back to list',
      footerSources: 'Categories on this site follow the WADA Prohibited List.', footerList: 'List version', footerWada: 'WADA Prohibited List (official)',
      footerMedical: 'Not medical advice.', footerEdu: 'This site is for educational purposes only and does not encourage or assist doping or drug use. Consult a medical professional for health concerns.',
      docTitleSuffix: 'Anti-Doping Education'
    }
  };

  function detect() {
    var saved = null;
    try { saved = window.localStorage.getItem(KEY); } catch (e) { saved = null; }
    if (saved === 'ko' || saved === 'en') return saved;
    var nav = String(navigator.language || 'ko').toLowerCase();
    return nav.indexOf('en') === 0 ? 'en' : 'ko';
  }

  var I18N = {
    lang: detect(),
    t: function (key) {
      var d = dict[I18N.lang] || dict.ko;
      if (d[key] !== undefined) return d[key];
      return dict.ko[key] !== undefined ? dict.ko[key] : key;
    },
    /* current-language field of {ko,en}; falls back to the other language */
    pick: function (obj) {
      if (obj === null || obj === undefined) return '';
      if (typeof obj === 'string') return obj;
      var other = I18N.lang === 'ko' ? 'en' : 'ko';
      return obj[I18N.lang] || obj[other] || '';
    },
    pickList: function (obj) {
      if (!obj) return [];
      var v = obj[I18N.lang];
      return Array.isArray(v) ? v : [];
    },
    apply: function () { document.documentElement.setAttribute('lang', I18N.lang); },
    setLang: function (l) {
      if (l !== 'ko' && l !== 'en') return;
      I18N.lang = l;
      try { window.localStorage.setItem(KEY, l); } catch (e) { /* ignore */ }
      I18N.apply();
      listeners.forEach(function (fn) { fn(l); });
    },
    toggle: function () { I18N.setLang(I18N.lang === 'ko' ? 'en' : 'ko'); },
    onChange: function (fn) { listeners.push(fn); }
  };

  I18N.apply();
  window.I18N = I18N;
})();
