// 구글 드라이브 동기화 폴더의 엑셀 3개 파일을 public/ 으로 복사
// 사용: npm run sync-data
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = process.env.KB_DATA_DIR || 'G:\\내 드라이브\\코딩폴더';
const DEST_DIR = path.join(__dirname, '..', 'public');
const FILES = ['TC명단.xlsx', '개인별실적.xlsx', '시상.xlsx'];

if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`[sync-data] 원본 폴더 없음: ${SOURCE_DIR}`);
  console.error(`KB_DATA_DIR 환경변수로 경로를 지정하세요.`);
  process.exit(1);
}

let ok = 0;
for (const f of FILES) {
  const src = path.join(SOURCE_DIR, f);
  const dst = path.join(DEST_DIR, f);
  if (!fs.existsSync(src)) {
    console.warn(`[sync-data] 파일 없음 (건너뜀): ${src}`);
    continue;
  }
  fs.copyFileSync(src, dst);
  const size = (fs.statSync(dst).size / 1024).toFixed(1);
  console.log(`[sync-data] ${f}  (${size} KB)`);
  ok++;
}
console.log(`[sync-data] 완료: ${ok}/${FILES.length}개 동기화`);
