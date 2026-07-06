/*
  app.js — 렌더링 · 필터 · 검색 · 모달 · 아코디언 · 인쇄 로직
  데이터는 data.js의 BOOKS / READING_DATA / CATEGORY_COLORS를 사용한다.
*/
(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // 상태
  // ---------------------------------------------------------------------
  const state = {
    book: "",
    level: "",
    unit: "",
    passageNo: "",
    category: "",
    search: "",
  };

  let lastFocusedCard = null;
  let searchDebounceTimer = null;

  // ---------------------------------------------------------------------
  // DOM 참조
  // ---------------------------------------------------------------------
  const el = {
    bookSelect: document.getElementById("filter-book"),
    levelSelect: document.getElementById("filter-level"),
    unitSelect: document.getElementById("filter-unit"),
    unitLabel: document.getElementById("filter-unit-label"),
    passageSelect: document.getElementById("filter-passage"),
    categorySelect: document.getElementById("filter-category"),
    searchInput: document.getElementById("search-input"),
    resetBtn: document.getElementById("reset-btn"),
    resultCount: document.getElementById("result-count"),
    cardGrid: document.getElementById("card-grid"),
    emptyMessage: document.getElementById("empty-message"),
    modalOverlay: document.getElementById("modal-overlay"),
    modal: document.getElementById("modal"),
    modalCloseBtn: document.getElementById("modal-close-btn"),
    modalBody: document.getElementById("modal-body"),
  };

  // ---------------------------------------------------------------------
  // 유틸: 옵션 생성
  // ---------------------------------------------------------------------
  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function getFilteredBooks() {
    // 레벨 선택에 따라 교재 목록을 좁힌다.
    return BOOKS.filter((b) => !state.level || b.level === state.level);
  }

  function getBookMeta(bookName) {
    return BOOKS.find((b) => b.name === bookName);
  }

  function getScopedReadingData({ ignoreUnit, ignorePassage, ignoreCategory } = {}) {
    return READING_DATA.filter((item) => {
      if (state.book && item.book !== state.book) return false;
      if (state.level && item.level !== state.level) return false;
      if (!ignoreUnit && state.unit && item.unit !== state.unit) return false;
      if (!ignorePassage && state.passageNo && item.passageNo !== state.passageNo) return false;
      if (!ignoreCategory && state.category && item.category !== state.category) return false;
      return true;
    });
  }

  function fillSelect(selectEl, values, placeholder) {
    const current = selectEl.value;
    selectEl.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = placeholder;
    selectEl.appendChild(optAll);
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
    // 이전 선택값이 여전히 유효하면 유지
    if (values.includes(current)) {
      selectEl.value = current;
    } else {
      selectEl.value = "";
    }
  }

  function buildFilterOptions() {
    // 교재 옵션 — BOOKS에서, 레벨에 따라 좁혀짐
    const books = getFilteredBooks().map((b) => b.name);
    fillSelect(el.bookSelect, books, "전체 교재");
    if (!books.includes(state.book)) state.book = "";

    // 레벨 옵션 — BOOKS에서 중복 제거
    const levels = uniq(BOOKS.map((b) => b.level));
    fillSelect(el.levelSelect, levels, "전체 레벨");
    el.levelSelect.value = state.level;

    // 단원/회차 라벨 — 선택한 교재의 unitType 반영
    const bookMeta = getBookMeta(state.book);
    el.unitLabel.textContent = bookMeta ? bookMeta.unitType : "단원 / 회차";

    // 단원/회차 옵션 — READING_DATA에서, 교재·레벨로 좁혀짐
    const unitScoped = getScopedReadingData({ ignoreUnit: true, ignorePassage: true, ignoreCategory: true });
    const units = uniq(unitScoped.map((d) => d.unit));
    fillSelect(el.unitSelect, units, "전체 단원/회차");
    el.unitSelect.value = state.unit;

    // 지문 번호 옵션 — READING_DATA에서, 나머지 필터로 좁혀짐
    const passageScoped = getScopedReadingData({ ignorePassage: true, ignoreCategory: true });
    const passages = uniq(passageScoped.map((d) => d.passageNo));
    fillSelect(el.passageSelect, passages, "전체 지문 번호");
    el.passageSelect.value = state.passageNo;

    // 주제영역 옵션 — READING_DATA 전체에서 중복 제거 (범용 필터로 유지)
    const categories = uniq(READING_DATA.map((d) => d.category));
    fillSelect(el.categorySelect, categories, "전체 주제영역");
    el.categorySelect.value = state.category;
  }

  // ---------------------------------------------------------------------
  // 검색 매칭
  // ---------------------------------------------------------------------
  function matchesSearch(item, query) {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (item.title.toLowerCase().includes(q)) return true;
    if (item.topic.toLowerCase().includes(q)) return true;
    if (item.book.toLowerCase().includes(q)) return true;
    if (item.keywords.some((k) => k.toLowerCase().includes(q))) return true;
    return false;
  }

  function getFilteredData() {
    return READING_DATA.filter((item) => {
      if (state.book && item.book !== state.book) return false;
      if (state.level && item.level !== state.level) return false;
      if (state.unit && item.unit !== state.unit) return false;
      if (state.passageNo && item.passageNo !== state.passageNo) return false;
      if (state.category && item.category !== state.category) return false;
      if (!matchesSearch(item, state.search)) return false;
      return true;
    });
  }

  // ---------------------------------------------------------------------
  // 카드 렌더링
  // ---------------------------------------------------------------------
  function categoryColor(category) {
    return CATEGORY_COLORS[category] || CATEGORY_COLOR_FALLBACK;
  }

  function createCard(item) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.setAttribute("data-id", item.id);
    card.setAttribute("aria-label", `${item.book} ${item.unit} - ${item.passageNo} · ${item.title} 자세히 보기`);

    const tag = document.createElement("span");
    tag.className = "card__tag";
    tag.style.backgroundColor = categoryColor(item.category);
    tag.textContent = item.category;

    const bookLine = document.createElement("div");
    bookLine.className = "card__book";
    bookLine.textContent = item.book;

    const unitLine = document.createElement("div");
    unitLine.className = "card__unit";
    unitLine.textContent = `${item.unit} - ${item.passageNo}`;

    const title = document.createElement("h3");
    title.className = "card__title";
    title.textContent = item.title;

    const topic = document.createElement("p");
    topic.className = "card__topic";
    topic.textContent = `지문 주제: ${item.topic}`;

    const keywordWrap = document.createElement("div");
    keywordWrap.className = "card__keywords";
    item.keywords.slice(0, 5).forEach((k) => {
      const kw = document.createElement("span");
      kw.className = "keyword-chip";
      kw.textContent = k;
      keywordWrap.appendChild(kw);
    });

    const cta = document.createElement("span");
    cta.className = "card__cta";
    cta.textContent = "자세히 보기";

    card.appendChild(tag);
    card.appendChild(bookLine);
    card.appendChild(unitLine);
    card.appendChild(title);
    card.appendChild(topic);
    card.appendChild(keywordWrap);
    card.appendChild(cta);

    card.addEventListener("click", () => openModal(item, card));

    return card;
  }

  function renderCards() {
    const filtered = getFilteredData();

    el.cardGrid.innerHTML = "";
    if (filtered.length === 0) {
      el.emptyMessage.hidden = false;
    } else {
      el.emptyMessage.hidden = true;
      filtered.forEach((item) => el.cardGrid.appendChild(createCard(item)));
    }

    el.resultCount.textContent = `검색 결과 ${filtered.length}건`;
  }

  function render() {
    buildFilterOptions();
    renderCards();
  }

  // ---------------------------------------------------------------------
  // 모달
  // ---------------------------------------------------------------------
  function buildModalContent(item) {
    const wrap = document.createElement("div");

    // 상단 교재 정보
    const infoBox = document.createElement("div");
    infoBox.className = "modal-info";
    const infoRows = [
      ["교재명", item.book],
      ["레벨", item.level],
      [getBookMeta(item.book) ? getBookMeta(item.book).unitType : "단원/회차", item.unit],
      ["지문 번호", item.passageNo],
      ["주제영역", item.category],
      ["지문 제목", item.title],
      ["지문 주제", item.topic],
      ["Reading Time", item.readingTime],
      ["Words", `${item.words} words`],
    ];
    infoRows.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "modal-info__row";
      const dt = document.createElement("span");
      dt.className = "modal-info__label";
      dt.textContent = label;
      const dd = document.createElement("span");
      dd.className = "modal-info__value";
      dd.textContent = value;
      row.appendChild(dt);
      row.appendChild(dd);
      infoBox.appendChild(row);
    });
    const kwRow = document.createElement("div");
    kwRow.className = "modal-info__keywords";
    item.keywords.forEach((k) => {
      const kw = document.createElement("span");
      kw.className = "keyword-chip";
      kw.textContent = k;
      kwRow.appendChild(kw);
    });
    infoBox.appendChild(kwRow);
    wrap.appendChild(infoBox);

    // A4 배경지식 자료 (인쇄 영역)
    const printArea = document.createElement("section");
    printArea.className = "print-area a4-sheet";
    printArea.setAttribute("aria-label", "A4 배경지식 자료");

    const printToolbar = document.createElement("div");
    printToolbar.className = "print-toolbar";
    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "btn btn--primary";
    printBtn.textContent = "인쇄하기";
    printBtn.setAttribute("aria-label", "A4 배경지식 자료 인쇄하기");
    const pdfBtn = document.createElement("button");
    pdfBtn.type = "button";
    pdfBtn.className = "btn btn--secondary";
    pdfBtn.textContent = "PDF 저장";
    pdfBtn.setAttribute("aria-label", "A4 배경지식 자료 PDF로 저장하기");
    const pdfHint = document.createElement("span");
    pdfHint.className = "print-hint";
    pdfHint.textContent = "브라우저 인쇄 창에서 PDF로 저장할 수 있습니다.";

    [printBtn, pdfBtn].forEach((btn) => btn.addEventListener("click", () => window.print()));

    printToolbar.appendChild(printBtn);
    printToolbar.appendChild(pdfBtn);
    printToolbar.appendChild(pdfHint);
    printArea.appendChild(printToolbar);

    const sheetHeader = document.createElement("div");
    sheetHeader.className = "a4-sheet__header";
    sheetHeader.innerHTML = `
      <h3>지문 배경지식 자료</h3>
      <p>${item.unit} - ${item.passageNo} (${item.category})</p>
      <p>지문 주제: ${item.topic}</p>
    `;
    printArea.appendChild(sheetHeader);

    const introBlock = document.createElement("div");
    introBlock.className = "a4-sheet__block";
    introBlock.innerHTML = `<h4>한 줄 소개</h4><p>${item.background.intro}</p>`;
    printArea.appendChild(introBlock);

    const sectionsBlock = document.createElement("div");
    sectionsBlock.className = "a4-sheet__block";
    const sectionsTitle = document.createElement("h4");
    sectionsTitle.textContent = "기초 배경지식";
    sectionsBlock.appendChild(sectionsTitle);
    item.background.sections.forEach((sec) => {
      const secEl = document.createElement("div");
      secEl.className = "a4-sheet__section";
      const secTitle = document.createElement("h5");
      secTitle.textContent = sec.title;
      const secBody = document.createElement("p");
      secBody.textContent = sec.body;
      secEl.appendChild(secTitle);
      secEl.appendChild(secBody);
      sectionsBlock.appendChild(secEl);
    });
    printArea.appendChild(sectionsBlock);

    const connectionBlock = document.createElement("div");
    connectionBlock.className = "a4-sheet__block";
    connectionBlock.innerHTML = `<h4>이 지문과의 연결 (호기심 갖기)</h4><p>${item.background.connection}</p>`;
    printArea.appendChild(connectionBlock);

    wrap.appendChild(printArea);

    // 아코디언 — 5분 아이스브레이킹 활동
    const accordionWrap = document.createElement("div");
    accordionWrap.className = "accordion";

    const accordionBtn = document.createElement("button");
    accordionBtn.type = "button";
    accordionBtn.className = "accordion__btn";
    accordionBtn.id = "accordion-btn";
    accordionBtn.textContent = "5분 아이스브레이킹 활동 보기";
    accordionBtn.setAttribute("aria-expanded", "false");
    accordionBtn.setAttribute("aria-controls", "accordion-panel");

    const accordionPanel = document.createElement("div");
    accordionPanel.className = "accordion__panel";
    accordionPanel.id = "accordion-panel";
    accordionPanel.setAttribute("role", "region");
    accordionPanel.setAttribute("aria-labelledby", "accordion-btn");
    accordionPanel.style.maxHeight = "0px";

    const activity = item.activity;
    const panelInner = document.createElement("div");
    panelInner.className = "accordion__inner";
    panelInner.innerHTML = `
      <div class="activity-row"><span class="activity-label">활동명</span><span>${activity.name}</span></div>
      <div class="activity-row"><span class="activity-label">소요 시간</span><span>${activity.duration}</span></div>
      <div class="activity-row"><span class="activity-label">준비물</span><span>${activity.materials}</span></div>
      <div class="activity-block"><h5>활동 목적</h5><p>${activity.purpose}</p></div>
      <div class="activity-block">
        <h5>진행 방법</h5>
        <ol class="activity-steps">${activity.steps.map((s) => `<li>${s.replace(/^\d+\.\s*/, "")}</li>`).join("")}</ol>
      </div>
      <div class="activity-block"><h5>본문 연결 멘트</h5><p>${activity.bridge}</p></div>
      <div class="activity-block activity-block--caution"><h5>주의사항</h5><p>${activity.caution}</p></div>
    `;
    accordionPanel.appendChild(panelInner);

    accordionBtn.addEventListener("click", () => {
      const expanded = accordionBtn.getAttribute("aria-expanded") === "true";
      accordionBtn.setAttribute("aria-expanded", String(!expanded));
      if (expanded) {
        accordionPanel.style.maxHeight = "0px";
      } else {
        accordionPanel.style.maxHeight = accordionPanel.scrollHeight + "px";
      }
    });

    accordionWrap.appendChild(accordionBtn);
    accordionWrap.appendChild(accordionPanel);
    wrap.appendChild(accordionWrap);

    return wrap;
  }

  function getFocusableEls(container) {
    return Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((elm) => !elm.disabled && elm.offsetParent !== null);
  }

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    const focusable = getFocusableEls(el.modal);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      closeModal();
    } else {
      trapFocus(e);
    }
  }

  function openModal(item, triggerCard) {
    lastFocusedCard = triggerCard;
    document.getElementById("modal-title").textContent = `${item.title} 상세보기`;
    el.modalBody.innerHTML = "";
    el.modalBody.appendChild(buildModalContent(item));

    el.modalOverlay.hidden = false;
    document.body.classList.add("no-scroll");
    document.addEventListener("keydown", onKeydown);

    const focusable = getFocusableEls(el.modal);
    if (focusable.length > 0) focusable[0].focus();
    else el.modalCloseBtn.focus();
  }

  function closeModal() {
    el.modalOverlay.hidden = true;
    document.body.classList.remove("no-scroll");
    document.removeEventListener("keydown", onKeydown);
    el.modalBody.innerHTML = "";
    if (lastFocusedCard) {
      lastFocusedCard.focus();
      lastFocusedCard = null;
    }
  }

  el.modalCloseBtn.addEventListener("click", closeModal);
  el.modalOverlay.addEventListener("click", (e) => {
    if (e.target === el.modalOverlay) closeModal();
  });

  // ---------------------------------------------------------------------
  // 필터 이벤트 바인딩
  // ---------------------------------------------------------------------
  el.bookSelect.addEventListener("change", () => {
    state.book = el.bookSelect.value;
    const meta = getBookMeta(state.book);
    if (meta) state.level = meta.level;
    state.unit = "";
    state.passageNo = "";
    render();
  });

  el.levelSelect.addEventListener("change", () => {
    state.level = el.levelSelect.value;
    state.book = "";
    state.unit = "";
    state.passageNo = "";
    render();
  });

  el.unitSelect.addEventListener("change", () => {
    state.unit = el.unitSelect.value;
    state.passageNo = "";
    render();
  });

  el.passageSelect.addEventListener("change", () => {
    state.passageNo = el.passageSelect.value;
    render();
  });

  el.categorySelect.addEventListener("change", () => {
    state.category = el.categorySelect.value;
    render();
  });

  el.searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      state.search = el.searchInput.value;
      renderCards();
    }, 250);
  });

  el.resetBtn.addEventListener("click", () => {
    state.book = "";
    state.level = "";
    state.unit = "";
    state.passageNo = "";
    state.category = "";
    state.search = "";
    el.searchInput.value = "";
    render();
  });

  // ---------------------------------------------------------------------
  // 초기 렌더 (로컬 데이터로 즉시 표시)
  // ---------------------------------------------------------------------
  render();

  // ---------------------------------------------------------------------
  // Google 스프레드시트 연동 — 불러오는 데 시간이 걸리거나 실패해도
  // 화면은 이미 로컬 데이터로 표시되어 있으므로 사용자는 대기하지 않는다.
  // ---------------------------------------------------------------------
  if (typeof loadSheetReadingData === "function") {
    loadSheetReadingData().then((sheetData) => {
      if (sheetData && sheetData.length) {
        READING_DATA.length = 0;
        READING_DATA.push(...sheetData);
        render();
      }
    });
  }
})();
