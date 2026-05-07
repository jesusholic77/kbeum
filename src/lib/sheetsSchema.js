// Google Sheets 스프레드시트 ID + 탭 매핑 정의. 사용자 오버라이드는 localStorage에 저장.

// canonical 키(파서가 사용) → actual 탭 이름(시트의 실제 탭). 기본값은 둘 다 동일.
export const DEFAULT_SCHEMA = {
  roster: {
    id: '1_xYVXPY3fGGcifNuJF7fNdjUpd5BtkXPKW91YV_yq-I',
    label: 'TC명단',
    tabs: {
      '명단': '명단',
    },
  },
  performance: {
    id: '1GPDOaJ1593Bim4UqXYXIjDlWJXzvYIJqgqS9q074_M4',
    label: '개인별실적',
    tabs: {
      '개인별': '개인별',
      '비콘': '비콘',
      'DB(당월)': 'DB(당월)',
      '신인차월': '신인차월',
      '보장': '보장',
    },
  },
  awards: {
    id: '1E57nu0KZnhWwH9n7kr9cfvsuvSwmcVpt9K-heP161H4',
    label: '시상',
    tabs: {
      '가동시상': '가동시상',
      '4월1주브릿지': '4월1주브릿지',
      '4월2주브릿지': '4월2주브릿지',
      '4월3주브릿지': '4월3주브릿지',
      '4주브릿지인보험': '4주브릿지인보험',
      '아침맞이지점': '아침맞이지점',
      '인스타BD': '인스타BD',
    },
  },
};

const STORAGE_KEY = 'kb-tc-sheets-schema-v1';

export function loadOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveOverrides(overrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // 저장 실패해도 데이터 로드 자체는 진행
  }
}

export function clearOverrides() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}

// DEFAULT_SCHEMA + 사용자 오버라이드 합성
export function mergeSchema(overrides) {
  const merged = JSON.parse(JSON.stringify(DEFAULT_SCHEMA));
  for (const fileKey of Object.keys(merged)) {
    const fileOverride = (overrides && overrides[fileKey]) || {};
    for (const canonical of Object.keys(merged[fileKey].tabs)) {
      if (fileOverride[canonical]) {
        merged[fileKey].tabs[canonical] = fileOverride[canonical];
      }
    }
  }
  return merged;
}
