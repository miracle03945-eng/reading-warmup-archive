/*
  sheetSync.js — Google 스프레드시트(CSV) 연동

  SHEET_CSV_URL(sheetConfig.js)이 설정되어 있으면 해당 CSV를 내려받아
  READING_DATA와 동일한 스키마의 객체 배열로 변환한다.
  설정이 없거나 요청이 실패하면 null을 반환하며, 이 경우 app.js는
  data.js에 있는 기존 로컬 데이터를 그대로 사용한다(오프라인 폴백).

  스프레드시트 열(헤더) 이름은 sheet-template.csv를 그대로 따른다.
  - keywords, activity_step1~8 처럼 여러 값이 들어가는 셀은 "|"(파이프)로 구분한다.
  - background_section1~6, activity_step1~8은 비워두면 자동으로 건너뛴다.
*/
(function () {
  "use strict";

  const SECTION_COUNT = 6;
  const STEP_COUNT = 8;

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  }

  function rowsToObjects(rows) {
    if (rows.length < 2) return [];
    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] || "").trim();
      });
      return obj;
    });
  }

  function splitList(value) {
    if (!value) return [];
    return value.split("|").map((s) => s.trim()).filter(Boolean);
  }

  // 구글 스프레드시트가 "02"처럼 0으로 시작하는 값을 숫자 2로 자동 변환해버리는 경우를 보정한다.
  function normalizePassageNo(value) {
    if (/^\d$/.test(value)) return "0" + value;
    return value;
  }

  function mapRowToPassage(row) {
    if (!row.id || !row.book || !row.title) return null;

    const sections = [];
    for (let i = 1; i <= SECTION_COUNT; i++) {
      const title = row[`background_section${i}_title`];
      const body = row[`background_section${i}_body`];
      if (title && body) sections.push({ title, body });
    }

    const steps = [];
    for (let i = 1; i <= STEP_COUNT; i++) {
      const step = row[`activity_step${i}`];
      if (step) steps.push(step);
    }

    return {
      id: row.id,
      book: row.book,
      level: row.level,
      unit: row.unit,
      passageNo: normalizePassageNo(row.passageNo),
      category: row.category,
      title: row.title,
      topic: row.topic,
      keywords: splitList(row.keywords),
      materials: ["A4 배경지식", "5분 아이스브레이킹"],
      background: {
        intro: row.background_intro || "",
        sections,
        connection: row.background_connection || "",
      },
      activity: {
        name: row.activity_name || "",
        duration: row.activity_duration || "",
        materials: row.activity_materials || "없음",
        purpose: row.activity_purpose || "",
        steps,
        bridge: row.activity_bridge || "",
        caution: row.activity_caution || "",
      },
    };
  }

  async function loadSheetReadingData() {
    if (typeof SHEET_CSV_URL !== "string" || !SHEET_CSV_URL.trim()) {
      return null;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(SHEET_CSV_URL, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`스프레드시트 응답 오류: ${res.status}`);

      const text = await res.text();
      const rows = rowsToObjects(parseCSV(text));
      const passages = rows.map(mapRowToPassage).filter(Boolean);
      return passages.length ? passages : null;
    } catch (err) {
      console.warn("[스프레드시트 연동] 불러오기에 실패하여 기본 데이터로 표시합니다.", err);
      return null;
    }
  }

  window.loadSheetReadingData = loadSheetReadingData;
})();
