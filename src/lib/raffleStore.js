// 추첨 기록을 localStorage에 저장·조회. 게임 한 회당 한 건의 record가 쌓인다.

const STORAGE_KEY = 'kb-tc-raffle-history-v1';

// record shape: { id, date, candidates: [{code,이름,팀,지점}], winners: [{code,이름,팀,지점}], prize, winnerCount }

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecord(record) {
  try {
    const history = loadHistory();
    const withId = {
      ...record,
      id: record.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: record.date || new Date().toISOString(),
    };
    history.unshift(withId); // 최신이 위
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return withId;
  } catch {
    return null;
  }
}

export function deleteRecord(id) {
  try {
    const history = loadHistory().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // 무시
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}

// 날짜·후보·당첨자 모두 CSV 한 줄씩으로 변환 (다운로드용)
export function exportCsv() {
  const rows = [['일시', '후보 수', '당첨 인원', '당첨자', '선물']];
  for (const r of loadHistory()) {
    rows.push([
      new Date(r.date).toLocaleString('ko-KR'),
      String(r.candidates?.length ?? 0),
      String(r.winners?.length ?? 0),
      (r.winners || []).map((w) => `${w.이름}(${w.팀})`).join(' / '),
      r.prize || '',
    ]);
  }
  const escape = (s) => `"${String(s).replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(escape).join(',')).join('\n');
}

// 무작위로 N명 뽑기 (Fisher-Yates 셔플 후 앞 N개)
export function pickWinners(candidates, n) {
  const arr = candidates.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}
