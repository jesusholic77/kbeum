// 충청TC 사업단 엑셀 3개 파일을 통합해서 직원 코드 기준으로 매핑한다.
//   1) /TC명단.xlsx           → 직원 명단 (베이스)
//   2) /개인별실적.xlsx       → 실적, DB, 활동, 스컨, 희망똑똑
//   3) /시상.xlsx             → 가동/주차/스탠다드 등 시상

import * as XLSX from 'xlsx';

// vite.config.js의 kbDataPlugin이 /data/* 를 Google Drive 폴더에서 직접 서빙
const FILES = {
  roster: '/data/TC명단.xlsx',
  perf: '/data/개인별실적.xlsx',
  awards: '/data/시상.xlsx',
};

const num = (v) => {
  if (v == null || v === '' || v === '-') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const pct = (v) => {
  // 데이터가 0~1 또는 0~100 두 형태로 섞여 들어옴 → 0~1이면 *100
  const n = num(v);
  return Math.round((n <= 1 ? n * 100 : n) * 10) / 10;
};
const yn = (v) => (String(v || '').toUpperCase().trim() === 'Y' ? 'Y' : 'N');
const ach = (v) => (yn(v) === 'Y' ? '달성' : '미달성');

// 직원 객체 기본값. App.jsx의 def() 와 동일한 키 셋.
function defaults() {
  return {
    수정P: 0, 인목표: 0, 인실적: 0, 인달성율: 0, 인청약: 0,
    재물: 0, 자동차: 0, 장기: 0, 가망: 0,
    활동일: 0, 활동달성: '미달성', 출근일: 0, 출근율: 0,
    스컨수정P: 0, 스컨포인트: 0, 스컨달성: '미달성', 스컨등급: '일반',
    보장분석: 0, 희망똑똑: 'N',
    관심배정: 0, 관심활용: 0, 관심활용율: 0, 관심등록: 0, 관심등록율: 0, 관심체결: 0, 관심체결율: 0,
    우량배정: 0, 우량활용: 0, 우량활용율: 0, 우량등록: 0, 우량등록율: 0, 우량방문: 0, 우량체결: 0, 우량체결율: 0,
    캠배정: 0, 캠활용: 0, 캠등록: 0, 캠등록율: 0,
    주1: null, 주2: null, 주3: null, 주4: null,
    가동시상: false, 스컨시상: false, 스탠다드: false,
    BEST팀: false, 최우수가동: false, 최우수스컨: false, 아침맞이: false,
    개인위촉: 0, 정착우수: false, Early위촉: false, 위촉팀순위: null,
    신인TC_DB: false, 생애최초: false, DB_Queen: false, DB_Queen순위: null,
  };
}

async function fetchWorkbook(url) {
  // 캐시 무효화 ─ 매 요청마다 다른 쿼리스트링
  const bust = `${url}?t=${Date.now()}`;
  const res = await fetch(bust, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} 다운로드 실패 (${res.status})`);
  const buf = await res.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

// 원본 파일들의 마지막 수정시각/사이즈 (헤더 표시용)
export async function fetchDataMeta() {
  try {
    const res = await fetch(`/data/_meta?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 두 포맷 모두 받음. xlsx 워크북: { Sheets: { name: SheetObject } }, Sheets API: { sheets: { name: rows[][] } }
function rowsOf(source, sheetName) {
  if (source && source.sheets && Array.isArray(source.sheets[sheetName])) {
    return source.sheets[sheetName];
  }
  const sheet = source && source.Sheets ? source.Sheets[sheetName] : null;
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
}

// ─────────── 1. TC명단 → 직원 베이스 ───────────
function parseRoster(wb) {
  const rows = rowsOf(wb, '명단');
  if (rows.length < 2) throw new Error('TC명단 시트 [명단] 비어있음');
  const data = rows.slice(1);
  const employees = data
    .filter((r) => r[11] != null && r[12])
    .map((r, i) => ({
      id: i + 1,
      지점코드: r[7] || '',
      지점: r[8] || '',
      팀코드: r[9] || '',
      팀: r[10] || '',
      코드: Number(r[11]),
      이름: String(r[12]).trim(),
      차월: num(r[13]),
      직책: r[17] || '팀원',
      유치자: r[20] || null,
      ...defaults(),
    }));
  return employees;
}

// ─────────── 2. 개인별실적 ───────────
function applyPerformance(byCode, wb) {
  // [개인별] 시트 - 당월 데이터: cols 27~46
  const main = rowsOf(wb, '개인별').slice(7);
  for (const r of main) {
    const code = Number(r[4]);
    const emp = byCode.get(code);
    if (!emp) continue;
    emp.수정P = num(r[27]);
    emp.인목표 = num(r[36]);
    emp.인실적 = num(r[37]);
    emp.인달성율 = Math.round(num(r[38]));
    emp.인청약 = num(r[46]) || num(r[29]);
    emp.보장분석 = num(r[39]);
    emp.희망똑똑 = yn(r[41]);
    emp.스컨수정P = num(r[42]);
    emp.스컨포인트 = num(r[43]);
    emp.스컨등급 = r[44] || '일반';
    emp.스컨달성 = ach(r[45]);
    emp.스컨시상 = yn(r[45]) === 'Y';
  }

  // [비콘] 시트 - 출근/활동 데이터 (header row 3, data row 5+)
  const beacon = rowsOf(wb, '비콘').slice(5);
  for (const r of beacon) {
    const code = Number(r[13]);
    if (!Number.isFinite(code) || code < 1000000) continue;
    const emp = byCode.get(code);
    if (!emp) continue;
    emp.활동일 = num(r[16]);
    emp.출근일 = num(r[17]);
    emp.출근율 = Math.round(num(r[18]) * 100);
  }

  // [DB(당월)] 시트 - 관심/우량/캠 DB (header row 2, data row 5+)
  const db = rowsOf(wb, 'DB(당월)').slice(5);
  for (const r of db) {
    const code = Number(r[4]);
    if (!Number.isFinite(code)) continue;
    const emp = byCode.get(code);
    if (!emp) continue;
    // 관심고객 (8~13)
    emp.관심배정 = num(r[8]);
    emp.관심활용 = num(r[9]);
    emp.관심활용율 = pct(r[10]);
    emp.관심등록 = num(r[12]);
    emp.관심등록율 = emp.관심배정 ? Math.round((emp.관심등록 / emp.관심배정) * 1000) / 10 : 0;
    emp.관심체결 = num(r[13]);
    emp.관심체결율 = emp.관심배정 ? Math.round((emp.관심체결 / emp.관심배정) * 1000) / 10 : 0;
    // 우량 (14~23)
    emp.우량배정 = num(r[14]);
    emp.우량활용 = num(r[15]);
    emp.우량활용율 = pct(r[16]);
    emp.우량등록 = num(r[17]);
    emp.우량등록율 = pct(r[18]);
    emp.우량방문 = num(r[20]);
    emp.우량체결 = num(r[22]);
    emp.우량체결율 = pct(r[23]);
    // 캠페인 (27~30)
    emp.캠배정 = num(r[27]);
    emp.캠활용 = num(r[28]);
    emp.캠등록 = num(r[28]);
    emp.캠등록율 = pct(r[29]);
  }

  // [신인차월] 시트 - 가망/보장+ 등 (header row 4, data row 7+)
  const fresh = rowsOf(wb, '신인차월').slice(7);
  for (const r of fresh) {
    const code = Number(r[5]);
    if (!Number.isFinite(code)) continue;
    const emp = byCode.get(code);
    if (!emp) continue;
    if (num(r[22]) > 0) emp.가망 = num(r[22]);
    if (num(r[28]) > 0) emp.재물 = num(r[28]);
    if (num(r[33]) > 0) emp.활동일 = Math.max(emp.활동일, num(r[33]));
  }

  // [9.희똑] 시트는 사업단 합계 위주라 패스
  // [보장] 시트 - 직원별 보장분석 건수 누적 카운트
  const bojang = rowsOf(wb, '보장').slice(4);
  const bojangCount = new Map();
  for (const r of bojang) {
    const code = Number(r[4]);
    if (!Number.isFinite(code)) continue;
    bojangCount.set(code, (bojangCount.get(code) || 0) + 1);
  }
  for (const [code, cnt] of bojangCount) {
    const emp = byCode.get(code);
    if (emp && cnt > emp.보장분석) emp.보장분석 = cnt;
  }
}

// ─────────── 3. 시상 ───────────
function applyAwards(byCode, wb) {
  // 가동시상 (header rows 2~5, data row 7+)
  const gadong = rowsOf(wb, '가동시상').slice(7);
  for (const r of gadong) {
    const code = Number(r[4]);
    if (!Number.isFinite(code)) continue;
    const emp = byCode.get(code);
    if (!emp) continue;
    emp.가동시상 = yn(r[19]) === 'Y' || yn(r[20]) === 'Y';
  }

  // 4월 1~3주 브릿지 (사원번호 = col 0, 매출 = col 7 또는 8)
  const week1 = rowsOf(wb, '4월1주브릿지').slice(2);
  for (const r of week1) {
    const code = Number(r[0]);
    if (!Number.isFinite(code)) continue;
    const emp = byCode.get(code);
    if (emp && num(r[7]) > 0) emp.주1 = num(r[7]);
  }
  const week2 = rowsOf(wb, '4월2주브릿지').slice(2);
  for (const r of week2) {
    const code = Number(r[0]);
    if (!Number.isFinite(code)) continue;
    const emp = byCode.get(code);
    if (emp && num(r[8]) > 0) emp.주2 = num(r[8]);
  }
  const week3 = rowsOf(wb, '4월3주브릿지').slice(2);
  for (const r of week3) {
    const code = Number(r[0]);
    if (!Number.isFinite(code)) continue;
    const emp = byCode.get(code);
    if (emp && num(r[8]) > 0) emp.주3 = num(r[8]);
  }
  // 4주브릿지인보험 (취급자코드 col 2, 시상금 col 8)
  const week4 = rowsOf(wb, '4주브릿지인보험').slice(3);
  for (const r of week4) {
    const code = Number(r[2]);
    if (!Number.isFinite(code)) continue;
    const emp = byCode.get(code);
    if (emp && num(r[8]) > 0) emp.주4 = num(r[8]);
  }

  // 아침맞이지점 시상
  const morning = rowsOf(wb, '아침맞이지점').slice(7);
  for (const r of morning) {
    const code = Number(r[6]);
    if (!Number.isFinite(code)) continue;
    const emp = byCode.get(code);
    if (!emp) continue;
    emp.아침맞이 = yn(r[11]) === 'Y';
  }

  // 인스타BD - 위촉팀순위 등 (시상 sheet 인스타BD: col 3 = 코드)
  const insta = rowsOf(wb, '인스타BD').slice(2);
  insta.forEach((r, i) => {
    const code = Number(r[3]);
    if (!Number.isFinite(code)) return;
    const emp = byCode.get(code);
    if (!emp) return;
    if (r[10] && String(r[10]).includes('미슐랭')) {
      emp.최우수가동 = true;
    }
  });
}

// ─────────── 4. 파생 지표 ───────────
function applyDerived(employees) {
  for (const emp of employees) {
    // TC표준활동 = 활동일 ≥ 15 (회사 일반 기준)
    if (emp.활동일 >= 15) emp.활동달성 = '달성';

    // 스탠다드시상 = 가동 + 스컨 + 활동 + 희망똑똑 + 인달성율≥100
    emp.스탠다드 =
      emp.가동시상 &&
      emp.스컨시상 &&
      emp.활동달성 === '달성' &&
      emp.희망똑똑 === 'Y' &&
      emp.인달성율 >= 100;

    // 최우수스컨: 스컨등급이 골드 이상
    emp.최우수스컨 = ['플래티넘', '골드'].includes(emp.스컨등급);
  }
  // BEST팀: 팀별 평균 인달성율 상위 1팀 자동 산출 (사업단 단위 1개 팀)
  const teamAvg = new Map();
  for (const e of employees) {
    if (!teamAvg.has(e.팀)) teamAvg.set(e.팀, []);
    teamAvg.get(e.팀).push(e.인달성율);
  }
  let bestTeam = null,
    bestAvg = -1;
  for (const [team, arr] of teamAvg) {
    if (team === '기타팀' || arr.length < 5) continue;
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestTeam = team;
    }
  }
  if (bestTeam) {
    for (const emp of employees) if (emp.팀 === bestTeam) emp.BEST팀 = true;
  }
}

// ─────────── 메인 ───────────
export async function loadFromPublic() {
  const [wb1, wb2, wb3] = await Promise.all([
    fetchWorkbook(FILES.roster),
    fetchWorkbook(FILES.perf),
    fetchWorkbook(FILES.awards),
  ]);
  return buildEmployees(wb1, wb2, wb3);
}

// 사용자가 업로드한 파일 (3개 묶음)에서도 같은 로직으로 빌드
export async function loadFromFiles(rosterFile, perfFile, awardsFile) {
  const readOne = async (file) => {
    if (!file) return null;
    const buf = await file.arrayBuffer();
    return XLSX.read(buf, { type: 'array' });
  };
  const [wb1, wb2, wb3] = await Promise.all([
    readOne(rosterFile),
    readOne(perfFile),
    readOne(awardsFile),
  ]);
  return buildEmployees(wb1, wb2, wb3);
}

// xlsx 워크북 또는 Sheets-format 객체 둘 다 받음 (rowsOf가 둘 다 처리).
export function buildEmployees(rosterSrc, perfSrc, awardsSrc) {
  if (!rosterSrc) throw new Error('TC명단 데이터가 필요합니다.');
  const employees = parseRoster(rosterSrc);
  const byCode = new Map(employees.map((e) => [e.코드, e]));
  if (perfSrc) applyPerformance(byCode, perfSrc);
  if (awardsSrc) applyAwards(byCode, awardsSrc);
  applyDerived(employees);
  return employees;
}
