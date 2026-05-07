// CommonJS 환경에서 로더 동작 확인 (Node에서 직접 xlsx 읽음)
const XLSX = require('xlsx');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const wb1 = XLSX.readFile(path.join(PUB, 'TC명단.xlsx'));
const wb2 = XLSX.readFile(path.join(PUB, '개인별실적.xlsx'));
const wb3 = XLSX.readFile(path.join(PUB, '시상.xlsx'));

const rowsOf = (wb, name) => {
  const s = wb.Sheets[name];
  if (!s) return [];
  return XLSX.utils.sheet_to_json(s, { header: 1, defval: null });
};
const num = (v) => {
  if (v == null || v === '' || v === '-') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const yn = (v) => (String(v || '').toUpperCase().trim() === 'Y' ? 'Y' : 'N');

// 명단
const roster = rowsOf(wb1, '명단').slice(1).filter((r) => r[11] != null && r[12]);
console.log(`[명단] ${roster.length} 명`);
console.log('  샘플:', {
  지점: roster[0][8],
  팀: roster[0][10],
  코드: roster[0][11],
  이름: roster[0][12],
  차월: roster[0][13],
  직책: roster[0][17],
});

// 개인별 (당월 cols 27~46)
const main = rowsOf(wb2, '개인별').slice(7);
console.log(`[개인별] ${main.length} rows`);
const sample = main.find((r) => r[4] === 3140486); // 박영신
if (sample) {
  console.log('  박영신(3140486):', {
    수정P: num(sample[27]),
    인목표: num(sample[36]),
    인실적: num(sample[37]),
    인달성율: num(sample[38]),
    보장분석: num(sample[39]),
    희망똑똑: yn(sample[41]),
    스컨등급: sample[44],
    스컨달성: yn(sample[45]),
    인청약: num(sample[46]),
  });
}

// 비콘
const beacon = rowsOf(wb2, '비콘').slice(5);
const beaconSample = beacon.find((r) => r[13] === 3140486);
if (beaconSample) {
  console.log(`[비콘] 박영신 출근일: ${num(beaconSample[17])} / 출근율: ${Math.round(num(beaconSample[18]) * 100)}%`);
}

// DB(당월)
const db = rowsOf(wb2, 'DB(당월)').slice(5);
const dbSample = db.find((r) => r[4] === 3140486);
if (dbSample) {
  console.log(`[DB(당월)] 박영신 관심:${num(dbSample[8])} 우량:${num(dbSample[14])} 캠:${num(dbSample[27])}`);
}

// 가동시상
const ga = rowsOf(wb3, '가동시상').slice(7);
const gaCnt = ga.filter((r) => yn(r[19]) === 'Y' || yn(r[20]) === 'Y').length;
console.log(`[가동시상] 달성 ${gaCnt}/${ga.length}명`);

// 1주브릿지
const w1 = rowsOf(wb3, '4월1주브릿지').slice(2);
const w1Cnt = w1.filter((r) => num(r[7]) > 0).length;
console.log(`[1주 브릿지] 매출발생 ${w1Cnt}/${w1.length}명`);

console.log('\n--- 로더 검증 OK ---');
