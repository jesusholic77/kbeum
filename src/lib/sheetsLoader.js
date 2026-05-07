// Google Sheets API v4로 데이터를 가져와 직원 객체로 변환. 파서는 excelLoader 재사용.

import { buildEmployees } from './excelLoader.js';
import { loadOverrides, mergeSchema } from './sheetsSchema.js';

const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

function getApiKey() {
  const key = import.meta.env.VITE_GOOGLE_API_KEY;
  if (!key) {
    throw new Error('VITE_GOOGLE_API_KEY 미설정. .env.local 파일에 키를 넣어주세요.');
  }
  return key;
}

// 한 스프레드시트의 실제 탭 이름 목록 가져오기
export async function fetchTabList(spreadsheetId, apiKey = getApiKey()) {
  const url = `${API_BASE}/${spreadsheetId}?fields=sheets.properties.title&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`탭 목록 조회 실패 (${res.status}). ${shortBody(body)}`);
  }
  const data = await res.json();
  return (data.sheets || []).map((s) => s.properties.title);
}

// 한 탭의 데이터 가져오기 (행 = 배열의 배열, 빈 셀은 undefined로 옴)
async function fetchTabValues(spreadsheetId, tabName, apiKey) {
  const range = encodeURIComponent(tabName);
  const url =
    `${API_BASE}/${spreadsheetId}/values/${range}` +
    `?valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`'${tabName}' 데이터 조회 실패 (${res.status}). ${shortBody(body)}`);
  }
  const data = await res.json();
  return data.values || [];
}

// 한 파일의 모든 탭을 fetch해서 { sheets: { canonicalName: rows[][] } } 형식으로 반환
async function fetchOneFile(schemaFile, apiKey) {
  const entries = Object.entries(schemaFile.tabs); // [canonical, actual][]
  const rowsArr = await Promise.all(
    entries.map(([, actual]) => fetchTabValues(schemaFile.id, actual, apiKey))
  );
  const sheets = {};
  entries.forEach(([canonical], i) => {
    sheets[canonical] = rowsArr[i];
  });
  return { sheets };
}

// 시작 시 호출: 모든 파일의 실제 탭 목록 fetch + canonical 탭이 존재하는지 검사
export async function inspectAllSchemas() {
  const apiKey = getApiKey();
  const overrides = loadOverrides();
  const schema = mergeSchema(overrides);
  const fileKeys = Object.keys(schema);

  const tabLists = await Promise.all(fileKeys.map((fk) => fetchTabList(schema[fk].id, apiKey)));

  const tabsByFile = {};
  const issues = [];
  fileKeys.forEach((fk, i) => {
    const actualTabs = tabLists[i];
    tabsByFile[fk] = actualTabs;
    for (const [canonical, expected] of Object.entries(schema[fk].tabs)) {
      if (!actualTabs.includes(expected)) {
        issues.push({ fileKey: fk, label: schema[fk].label, canonical, expected, actualTabs });
      }
    }
  });

  return { schema, issues, tabsByFile };
}

// 메인 로더: schema 인자가 없으면 localStorage 기반으로 자동 합성
export async function loadFromSheets(schemaArg = null) {
  const apiKey = getApiKey();
  const schema = schemaArg || mergeSchema(loadOverrides());

  const [rosterData, perfData, awardsData] = await Promise.all([
    fetchOneFile(schema.roster, apiKey),
    fetchOneFile(schema.performance, apiKey),
    fetchOneFile(schema.awards, apiKey),
  ]);

  return buildEmployees(rosterData, perfData, awardsData);
}

// 헤더 표시용 메타. Sheets API만으로는 modifiedTime을 직접 못 받아서 로드 시각만 반환.
export async function fetchSheetsMeta() {
  return {
    source: 'Google Sheets API',
    loadedAt: new Date().toISOString(),
  };
}

function shortBody(body) {
  if (!body) return '';
  try {
    const j = JSON.parse(body);
    return j?.error?.message || body.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}
