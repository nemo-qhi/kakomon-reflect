const storageKey = "kakomon-review-records";
const settingsKey = "kakomon-review-settings";
const draftKey = "kakomon-review-draft";

const lossReasonOptions = [
  "知識不足",
  "設問の読み違い",
  "本文・資料の読み違い",
  "時間不足",
  "計算ミス",
  "語句・用語の混同",
  "根拠不足",
  "解法選択ミス",
  "ケアレスミス",
  "見直し不足",
  "その他",
];

const labelColors = [
  "#d96060",
  "#e78a47",
  "#f2c94c",
  "#61a874",
  "#42a7a1",
  "#4f8edb",
  "#7c6ed6",
  "#bf6db2",
  "#8d765f",
  "#667085",
];

const themePresets = [
  ["ホワイト", "#f8fafc"],
  ["アイボリー", "#fbf3df"],
  ["ライトグレー", "#edf1f5"],
  ["淡いブルー", "#e7f1fb"],
  ["淡いグリーン", "#eaf6ee"],
  ["淡いピンク", "#faeaf0"],
  ["ダーク系", "#17202a"],
];

const emptyForm = {
  id: "",
  subject: "",
  practiceDate: "",
  duration: "",
  university: "",
  faculty: "",
  examType: "",
  year: "",
  majorQuestion: "",
  minorQuestion: "",
  branch: "",
  step1: "",
  step2: "",
  step3: "",
  lossReasons: [],
  lossDetail: "",
  step5: "",
  tags: [],
  colorLabel: "#f2b84b",
  reviewed: false,
  reviewedDate: "",
  createdAt: "",
  updatedAt: "",
};

const sampleRecords = [
  {
    ...emptyForm,
    id: "sample-1",
    subject: "英語",
    practiceDate: "2026-08-12",
    duration: "42分",
    university: "明治大学",
    faculty: "文学部",
    examType: "一般選抜",
    year: "2025",
    majorQuestion: "2",
    minorQuestion: "(3)",
    step1: "長文中の筆者の主張を、接続表現と段落構成から判断する問題。",
    step2: "however の後ろだけを根拠にして、前段落との対比を十分に見なかった。",
    step3: "第3段落の譲歩を踏まえ、第4段落の結論文に戻って選択肢を比較する。",
    lossReasons: ["本文・資料の読み違い", "根拠不足"],
    lossDetail: "根拠にした一文が弱く、段落全体の流れを使えていなかった。",
    step5: "逆接語を見つけたら、前後2文だけでなく段落の役割を一言メモしてから選ぶ。",
    tags: ["長文読解", "根拠確認", "時間配分"],
    colorLabel: "#d96060",
    reviewed: false,
    createdAt: "2026-08-12T10:00:00.000Z",
    updatedAt: "2026-08-12T10:00:00.000Z",
  },
  {
    ...emptyForm,
    id: "sample-2",
    subject: "日本史",
    practiceDate: "2026-08-14",
    duration: "18分",
    university: "東京都立大学",
    faculty: "法学部",
    examType: "前期",
    year: "2024",
    majorQuestion: "1",
    minorQuestion: "(2)",
    branch: "a",
    step1: "江戸時代の文化史について、人物と作品名の対応を問う問題。",
    step2: "似た用語の記憶だけで選び、時代の前後関係を確認しなかった。",
    step3: "元禄文化と化政文化を時期、担い手、代表作で分けて整理する。",
    lossReasons: ["知識不足", "語句・用語の混同"],
    lossDetail: "作品名は覚えていたが、文化区分と人物の対応が曖昧だった。",
    step5: "文化史は人物、作品、時期を3列でまとめ、翌日に同じ表を白紙再現する。",
    tags: ["文化史", "江戸時代", "用語整理"],
    colorLabel: "#4f8edb",
    reviewed: true,
    reviewedDate: "2026-08-16",
    createdAt: "2026-08-14T10:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
  },
];

let state = {
  activeView: "input",
  records: load(storageKey, sampleRecords),
  settings: load(settingsKey, {
    theme: "#e7f1fb",
    customTheme: "#e7f1fb",
    boardColors: { 明治大学: "#d96060", 東京都立大学: "#4f8edb" },
  }),
  form: { ...emptyForm, ...load(draftKey, {}) },
  search: {
    keyword: "",
    university: "",
    faculty: "",
    examType: "",
    subject: "",
    year: "",
    tag: "",
    lossReason: "",
    reviewed: "",
  },
  selectedBoard: "",
  selectedRecord: null,
};

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem(storageKey, JSON.stringify(state.records));
  localStorage.setItem(settingsKey, JSON.stringify(state.settings));
  localStorage.setItem(draftKey, JSON.stringify(state.form));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
}

function isDark(hex) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 142;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value);
  });
  children.forEach((child) => node.append(child));
  return node;
}

function input(label, field, attrs = {}) {
  const node = el("label", { text: label });
  const control = el("input", {
    value: state.form[field] || "",
    ...attrs,
    oninput: (event) => {
      state.form[field] = event.target.value;
      save();
    },
  });
  node.append(control);
  return node;
}

function select(label, value, options, onChange) {
  const node = el("label", { text: label });
  const control = el("select", {
    onchange: (event) => onChange(event.target.value),
  });
  control.append(el("option", { value: "", text: "すべて" }));
  options.forEach((option) => {
    const child = el("option", { value: option, text: option });
    if (option === value) child.selected = true;
    control.append(child);
  });
  control.value = value;
  node.append(control);
  return node;
}

function textareaStep(number, title, field) {
  const area = el("textarea", {
    oninput: (event) => {
      state.form[field] = event.target.value;
      save();
    },
  });
  area.value = state.form[field] || "";
  return el("div", { class: "step-block" }, [
    el("div", { class: "step-number", text: `Step${number}` }),
    el("label", {}, [el("span", { text: title }), area]),
  ]);
}

function getOptions() {
  return {
    universities: unique(state.records.map((record) => record.university)),
    faculties: unique(state.records.map((record) => record.faculty)),
    examTypes: unique(state.records.map((record) => record.examType)),
    subjects: unique(state.records.map((record) => record.subject)),
    years: unique(state.records.map((record) => record.year)),
    tags: unique(state.records.flatMap((record) => record.tags)),
  };
}

function filteredRecords() {
  const keyword = state.search.keyword.trim().toLowerCase();
  return state.records.filter((record) => {
    const text = [
      record.university,
      record.faculty,
      record.examType,
      record.subject,
      record.year,
      record.majorQuestion,
      record.minorQuestion,
      record.branch,
      record.step1,
      record.step2,
      record.step3,
      record.lossDetail,
      record.step5,
      record.tags.join(" "),
    ].join(" ").toLowerCase();

    return (
      (!keyword || text.includes(keyword)) &&
      (!state.search.university || record.university === state.search.university) &&
      (!state.search.faculty || record.faculty === state.search.faculty) &&
      (!state.search.examType || record.examType === state.search.examType) &&
      (!state.search.subject || record.subject === state.search.subject) &&
      (!state.search.year || record.year === state.search.year) &&
      (!state.search.tag || record.tags.includes(state.search.tag.replace("#", ""))) &&
      (!state.search.lossReason || record.lossReasons.includes(state.search.lossReason)) &&
      (!state.search.reviewed ||
        (state.search.reviewed === "done" ? record.reviewed : !record.reviewed))
    );
  });
}

function render() {
  const root = document.querySelector("#app");
  root.innerHTML = "";
  const theme = state.settings.theme === "custom" ? state.settings.customTheme : state.settings.theme;
  const darkTheme = isDark(theme);
  root.className = "app-shell";
  root.style.setProperty("--app-bg", theme);
  root.style.setProperty("--app-text", darkTheme ? "#f7f7f4" : "#18212f");
  root.style.setProperty("--card-bg", darkTheme ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.86)");
  root.style.setProperty("--card-solid", darkTheme ? "#22303d" : "#ffffff");
  root.style.setProperty("--line", darkTheme ? "rgba(255,255,255,.18)" : "rgba(24,33,47,.13)");
  root.style.setProperty("--muted", darkTheme ? "#c7d0db" : "#667085");
  root.style.setProperty("--soft", darkTheme ? "rgba(255,255,255,.08)" : "rgba(47,111,237,.08)");

  root.append(renderHeader(), renderOverview());
  if (state.activeView === "input") root.append(renderInput());
  if (state.activeView === "search") root.append(renderSearch());
  if (state.activeView === "list") root.append(renderList());
  if (state.activeView === "boards") root.append(renderBoards());
  if (state.activeView === "settings") root.append(renderSettings());
  if (state.selectedRecord) root.append(renderModal(state.selectedRecord));
}

function renderHeader() {
  const tabs = [
    ["input", "入力"],
    ["search", "検索"],
    ["list", "一覧"],
    ["boards", "大学ボード"],
    ["settings", "設定"],
  ].map(([key, label]) =>
    el("button", {
      class: state.activeView === key ? "active" : "",
      type: "button",
      text: label,
      onclick: () => {
        state.activeView = key;
        render();
      },
    }),
  );
  return el("header", { class: "topbar" }, [
    el("div", {}, [
      el("p", { class: "eyebrow", text: "Kakomon Reflection Board" }),
      el("h1", { text: "過去問振り返り管理" }),
    ]),
    el("nav", { class: "view-tabs", "aria-label": "主要画面" }, tabs),
  ]);
}

function renderOverview() {
  const options = getOptions();
  const items = [
    [state.records.length, "記録"],
    [options.universities.length, "大学ボード"],
    [state.records.filter((record) => !record.reviewed).length, "未再演習"],
    [options.tags.length, "タグ"],
  ];
  return el(
    "section",
    { class: "overview" },
    items.map(([count, label]) =>
      el("div", {}, [el("span", { class: "metric", text: count }), el("span", { text: label })]),
    ),
  );
}

function renderInput() {
  const form = el("form", {
    class: "editor",
    onsubmit: (event) => {
      event.preventDefault();
      saveRecord();
    },
  });

  form.append(
    el("section", { class: "panel" }, [
      sectionTitle("Basic", "基本情報"),
      el("div", { class: "form-grid" }, [
        input("教科", "subject", { required: true }),
        input("実施日", "practiceDate", { type: "date", required: true }),
        input("所要時間", "duration", { required: true, placeholder: "例：60分" }),
        input("大学", "university", { required: true }),
        input("学部", "faculty", { required: true }),
        input("入試方式", "examType", { required: true }),
        input("年度", "year", { required: true }),
        input("大問番号", "majorQuestion", { required: true }),
        input("小問番号", "minorQuestion", { required: true }),
        input("枝番", "branch", { placeholder: "例：a / ①" }),
      ]),
    ]),
  );

  form.append(
    el("section", { class: "panel step-stack" }, [
      textareaStep("1", "問題の要約", "step1"),
      textareaStep("2", "自分の誤答プロセス", "step2"),
      textareaStep("3", "模範解答・解答の要約", "step3"),
      renderReasons(),
      textareaStep("5", "次回の対策", "step5"),
    ]),
  );

  form.append(renderFiling());
  return form;
}

function renderReasons() {
  const checks = lossReasonOptions.map((reason) => {
    const checkbox = el("input", {
      type: "checkbox",
      onchange: () => {
        const has = state.form.lossReasons.includes(reason);
        state.form.lossReasons = has
          ? state.form.lossReasons.filter((item) => item !== reason)
          : [...state.form.lossReasons, reason];
        save();
        render();
      },
    });
    checkbox.checked = state.form.lossReasons.includes(reason);
    return el("label", { class: "check-pill" }, [checkbox, el("span", { text: reason })]);
  });
  const detail = el("textarea", {
    placeholder: "具体的に何が原因だったか",
    oninput: (event) => {
      state.form.lossDetail = event.target.value;
      save();
    },
  });
  detail.value = state.form.lossDetail || "";
  return el("div", { class: "step-block" }, [
    el("div", { class: "step-number", text: "Step4" }),
    el("div", {}, [el("h3", { text: "失点原因" }), el("div", { class: "checks" }, checks), detail]),
  ]);
}

function renderFiling() {
  const tagInput = el("input", { placeholder: "入力してEnter" });
  tagInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput.value);
      tagInput.value = "";
    }
  });
  const colorButtons = labelColors.map((color) =>
    el("button", {
      type: "button",
      class: state.form.colorLabel === color ? "swatch selected" : "swatch",
      style: `background-color:${color}`,
      onclick: () => {
        state.form.colorLabel = color;
        save();
        render();
      },
    }),
  );
  const colorPicker = el("input", {
    type: "color",
    value: state.form.colorLabel,
    oninput: (event) => {
      state.form.colorLabel = event.target.value;
      save();
    },
  });
  const reviewed = el("input", {
    type: "checkbox",
    onchange: (event) => {
      state.form.reviewed = event.target.checked;
      save();
    },
  });
  reviewed.checked = state.form.reviewed;
  return el("section", { class: "panel" }, [
    sectionTitle("Filing", "タグ・カラー・再演習"),
    el("div", { class: "tag-editor" }, [
      el("label", { text: "タグ" }, [tagInput]),
      el("button", { type: "button", class: "subtle-button", text: "追加", onclick: () => addTag(tagInput.value) }),
    ]),
    renderTagList(state.form.tags, (tag) => {
      state.form.tags = state.form.tags.filter((item) => item !== tag);
      save();
      render();
    }, true),
    el("div", { class: "color-row" }, [...colorButtons, colorPicker]),
    el("label", { class: "review-toggle" }, [reviewed, el("span", { text: "再演習済みとして保存" })]),
    el("div", { class: "actions" }, [
      el("button", {
        type: "button",
        class: "ghost",
        text: "クリア",
        onclick: () => {
          state.form = { ...emptyForm };
          save();
          render();
        },
      }),
      el("button", { type: "submit", text: state.form.id ? "更新する" : "保存する" }),
    ]),
  ]);
}

function addTag(value) {
  const tag = value.replace("#", "").trim();
  if (!tag || state.form.tags.includes(tag)) return;
  state.form.tags.push(tag);
  save();
  render();
}

function saveRecord() {
  const now = new Date().toISOString();
  const payload = {
    ...state.form,
    updatedAt: now,
    createdAt: state.form.createdAt || now,
    id: state.form.id || makeId(),
    reviewedDate: state.form.reviewed ? state.form.reviewedDate || today() : "",
  };
  const exists = state.records.some((record) => record.id === payload.id);
  state.records = exists
    ? state.records.map((record) => (record.id === payload.id ? payload : record))
    : [payload, ...state.records];
  state.settings.boardColors[payload.university] =
    state.settings.boardColors[payload.university] || payload.colorLabel;
  state.form = { ...emptyForm };
  state.activeView = "list";
  save();
  render();
}

function renderSearch() {
  const options = getOptions();
  const panel = el("section", { class: "panel" }, [
    sectionTitle("Search", "複数条件で絞り込み"),
    el("div", { class: "filter-grid" }, [
      searchInput("キーワード", "keyword"),
      select("大学", state.search.university, options.universities, (value) => updateSearch("university", value)),
      select("学部", state.search.faculty, options.faculties, (value) => updateSearch("faculty", value)),
      select("入試方式", state.search.examType, options.examTypes, (value) => updateSearch("examType", value)),
      select("教科", state.search.subject, options.subjects, (value) => updateSearch("subject", value)),
      select("年度", state.search.year, options.years, (value) => updateSearch("year", value)),
      select("タグ", state.search.tag, options.tags, (value) => updateSearch("tag", value)),
      select("失点原因", state.search.lossReason, lossReasonOptions, (value) => updateSearch("lossReason", value)),
      reviewedSelect(),
    ]),
    el("div", { class: "actions left" }, [
      el("button", { type: "button", class: "ghost", text: "条件をリセット", onclick: resetSearch }),
    ]),
    renderGrid(filteredRecords()),
  ]);
  return panel;
}

function searchInput(label, field) {
  const node = el("label", { text: label });
  const control = el("input", {
    value: state.search[field],
    oninput: (event) => {
      state.search[field] = event.target.value;
      render();
    },
  });
  node.append(control);
  return node;
}

function reviewedSelect() {
  const node = el("label", { text: "再演習" });
  const control = el("select", {
    onchange: (event) => updateSearch("reviewed", event.target.value),
  });
  [["", "すべて"], ["done", "再演習済み"], ["todo", "未再演習"]].forEach(([value, text]) => {
    const option = el("option", { value, text });
    if (state.search.reviewed === value) option.selected = true;
    control.append(option);
  });
  node.append(control);
  return node;
}

function updateSearch(field, value) {
  state.search[field] = value;
  render();
}

function resetSearch() {
  state.search = {
    keyword: "",
    university: "",
    faculty: "",
    examType: "",
    subject: "",
    year: "",
    tag: "",
    lossReason: "",
    reviewed: "",
  };
  render();
}

function renderList() {
  return el("section", { class: "panel" }, [
    el("div", { class: "section-title row-title" }, [
      el("div", {}, [el("p", { text: "Pins" }), el("h2", { text: "振り返りカード一覧" })]),
      el("button", {
        type: "button",
        text: "新規入力",
        onclick: () => {
          state.activeView = "input";
          render();
        },
      }),
    ]),
    renderGrid(state.records),
  ]);
}

function renderBoards() {
  const options = getOptions();
  const records = state.selectedBoard
    ? filteredRecords().filter((record) => record.university === state.selectedBoard)
    : filteredRecords();
  const chips = [
    el("button", {
      class: !state.selectedBoard ? "board-chip active" : "board-chip",
      type: "button",
      text: "すべて",
      onclick: () => {
        state.selectedBoard = "";
        render();
      },
    }),
    ...options.universities.map((university) =>
      el("button", {
        class: state.selectedBoard === university ? "board-chip active" : "board-chip",
        style: `border-color:${state.settings.boardColors[university] || "#98a2b3"}`,
        type: "button",
        onclick: () => {
          state.selectedBoard = university;
          render();
        },
      }, [
        el("span", { style: `background-color:${state.settings.boardColors[university] || "#98a2b3"}` }),
        document.createTextNode(university),
      ]),
    ),
  ];
  const children = [sectionTitle("Boards", "大学ごとのファイリング"), el("div", { class: "board-strip" }, chips)];
  if (state.selectedBoard) children.push(renderBoardTools(options));
  children.push(renderGrid(records));
  return el("section", { class: "panel" }, children);
}

function renderBoardTools(options) {
  const color = el("input", {
    type: "color",
    value: state.settings.boardColors[state.selectedBoard] || "#4f8edb",
    oninput: (event) => {
      state.settings.boardColors[state.selectedBoard] = event.target.value;
      save();
      render();
    },
  });
  return el("div", { class: "board-tools" }, [
    el("label", { text: "ボードカラー" }, [color]),
    select("学部", state.search.faculty, options.faculties, (value) => updateSearch("faculty", value)),
    select("教科", state.search.subject, options.subjects, (value) => updateSearch("subject", value)),
    select("年度", state.search.year, options.years, (value) => updateSearch("year", value)),
    select("入試方式", state.search.examType, options.examTypes, (value) => updateSearch("examType", value)),
  ]);
}

function renderSettings() {
  const options = getOptions();
  const themes = themePresets.map(([name, value]) =>
    el("button", {
      class: state.settings.theme === value ? "theme-card selected" : "theme-card",
      type: "button",
      onclick: () => {
        state.settings.theme = value;
        save();
        render();
      },
    }, [el("span", { style: `background-color:${value}` }), document.createTextNode(name)]),
  );
  const custom = el("input", {
    type: "color",
    value: state.settings.customTheme,
    oninput: (event) => {
      state.settings.theme = "custom";
      state.settings.customTheme = event.target.value;
      save();
      render();
    },
  });
  const boardColors = options.universities.map((university) => {
    const color = el("input", {
      type: "color",
      value: state.settings.boardColors[university] || "#4f8edb",
      oninput: (event) => {
        state.settings.boardColors[university] = event.target.value;
        save();
        render();
      },
    });
    return el("label", {}, [document.createTextNode(university), color]);
  });
  return el("section", { class: "panel settings-panel" }, [
    sectionTitle("Settings", "背景テーマと表示色"),
    el("div", { class: "theme-grid" }, [
      ...themes,
      el("label", { class: "theme-card custom-theme" }, [custom, document.createTextNode("自由選択")]),
    ]),
    el("div", { class: "board-color-list" }, boardColors),
  ]);
}

function renderGrid(records) {
  if (!records.length) return el("div", { class: "empty-state", text: "条件に合う記録はまだありません。" });
  return el("div", { class: "masonry" }, records.map(renderCard));
}

function renderCard(record) {
  const template = document.querySelector("#record-card-template");
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector(".color-bar").style.backgroundColor = record.colorLabel;
  card.querySelector(".board-dot").style.backgroundColor =
    state.settings.boardColors[record.university] || "#98a2b3";
  card.querySelector(".university").textContent = record.university;
  card.querySelector(".faculty").textContent = record.faculty;
  card.querySelector(".card-meta").textContent = `${record.year}年度 / ${record.examType} / ${record.subject}`;
  card.querySelector(".question-code").textContent =
    `大問${record.majorQuestion} 小問${record.minorQuestion}${record.branch ? ` ${record.branch}` : ""}`;
  const status = card.querySelector(".status");
  status.textContent = record.reviewed ? `再演習済み ${record.reviewedDate}` : "未再演習";
  if (record.reviewed) status.classList.add("done");
  card.querySelector(".card-open").addEventListener("click", () => {
    state.selectedRecord = record;
    render();
  });
  const reasons = card.querySelector(".reason-list");
  record.lossReasons.slice(0, 3).forEach((reason) => reasons.append(el("span", { text: reason })));
  const tags = card.querySelector(".tag-list");
  record.tags.forEach((tag) =>
    tags.append(el("button", { type: "button", text: `#${tag}`, onclick: () => searchByTag(tag) })),
  );
  const toggle = card.querySelector(".toggle-review");
  toggle.textContent = record.reviewed ? "未再演習に戻す" : "再演習済みにする";
  toggle.addEventListener("click", () => toggleReviewed(record.id));
  return card;
}

function renderTagList(tags, onClick, removable = false) {
  return el(
    "div",
    { class: "tag-list" },
    tags.map((tag) =>
      el("button", {
        type: "button",
        text: removable ? `#${tag} ×` : `#${tag}`,
        onclick: () => onClick(tag),
      }),
    ),
  );
}

function toggleReviewed(id) {
  state.records = state.records.map((record) =>
    record.id === id
      ? {
          ...record,
          reviewed: !record.reviewed,
          reviewedDate: !record.reviewed ? today() : "",
          updatedAt: new Date().toISOString(),
        }
      : record,
  );
  save();
  render();
}

function searchByTag(tag) {
  resetSearch();
  state.search.tag = tag;
  state.activeView = "search";
  state.selectedRecord = null;
  render();
}

function renderModal(record) {
  const steps = [
    ["Step1：問題の要約", record.step1],
    ["Step2：自分の誤答プロセス", record.step2],
    ["Step3：模範解答・解答の要約", record.step3],
    ["Step4：失点原因の自由記述", record.lossDetail],
    ["Step5：次回の対策", record.step5],
  ];
  return el("div", {
    class: "modal-backdrop",
    onclick: () => {
      state.selectedRecord = null;
      render();
    },
  }, [
    el("section", {
      class: "modal",
      onclick: (event) => event.stopPropagation(),
    }, [
      el("button", {
        class: "close-button",
        type: "button",
        text: "×",
        onclick: () => {
          state.selectedRecord = null;
          render();
        },
      }),
      el("div", { class: "modal-head" }, [
        el("span", { class: "color-bar wide", style: `background-color:${record.colorLabel}` }),
        el("span", {
          class: "board-dot large",
          style: `background-color:${state.settings.boardColors[record.university] || "#98a2b3"}`,
        }),
        el("p", { text: `${record.subject} / ${record.year}年度 / ${record.examType}` }),
        el("h2", { text: `${record.university} ${record.faculty}` }),
        el("span", {
          text: `大問${record.majorQuestion} 小問${record.minorQuestion}${record.branch ? ` ${record.branch}` : ""}`,
        }),
      ]),
      el("div", { class: "modal-actions" }, [
        el("button", { type: "button", text: record.reviewed ? "未再演習に戻す" : "再演習済みにする", onclick: () => toggleReviewed(record.id) }),
        el("button", { type: "button", class: "ghost", text: "編集", onclick: () => editRecord(record) }),
        el("button", { type: "button", class: "danger", text: "削除", onclick: () => deleteRecord(record.id) }),
      ]),
      el("div", { class: "detail-grid" }, [
        el("span", { text: `実施日：${record.practiceDate}` }),
        el("span", { text: `所要時間：${record.duration}` }),
        el("span", { text: record.reviewed ? `再演習日：${record.reviewedDate}` : "未再演習" }),
      ]),
      el("div", { class: "reason-list" }, record.lossReasons.map((reason) => el("span", { text: reason }))),
      renderTagList(record.tags, searchByTag),
      el("div", { class: "step-detail-list" }, steps.map(([title, body]) =>
        el("section", {}, [el("h3", { text: title }), el("p", { text: body || "未入力" })]),
      )),
    ]),
  ]);
}

function editRecord(record) {
  state.form = { ...record };
  state.selectedRecord = null;
  state.activeView = "input";
  save();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteRecord(id) {
  if (!confirm("この記録を削除しますか？")) return;
  state.records = state.records.filter((record) => record.id !== id);
  state.selectedRecord = null;
  save();
  render();
}

function sectionTitle(label, title) {
  return el("div", { class: "section-title" }, [el("p", { text: label }), el("h2", { text: title })]);
}

render();
