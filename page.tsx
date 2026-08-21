"use client";

import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type ReviewRecord = {
  id: string;
  subject: string;
  practiceDate: string;
  duration: string;
  university: string;
  faculty: string;
  examType: string;
  year: string;
  majorQuestion: string;
  minorQuestion: string;
  branch: string;
  step1: string;
  step2: string;
  step3: string;
  lossReasons: string[];
  lossDetail: string;
  step5: string;
  tags: string[];
  colorLabel: string;
  reviewed: boolean;
  reviewedDate: string;
  createdAt: string;
  updatedAt: string;
};

type Settings = {
  theme: string;
  customTheme: string;
  boardColors: Record<string, string>;
};

type SearchState = {
  keyword: string;
  university: string;
  faculty: string;
  examType: string;
  subject: string;
  year: string;
  tag: string;
  lossReason: string;
  reviewed: string;
};

type SharePayload = {
  version: 1;
  records: ReviewRecord[];
  settings: Settings;
  exportedAt: string;
};

type CompactPayload = {
  v: 2;
  r: unknown[][];
  s: {
    t: string;
    c: string;
    b: Record<string, string>;
  };
  e: string;
};

const emptyForm: ReviewRecord = {
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

const initialRecords: ReviewRecord[] = [];
const seededRecordIds = new Set(["sample-1", "sample-2"]);
const seededUniversityNames = new Set(["明治大学", "東京都立大学"]);

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
  { name: "ホワイト", value: "#f8fafc" },
  { name: "アイボリー", value: "#fbf3df" },
  { name: "ライトグレー", value: "#edf1f5" },
  { name: "淡いブルー", value: "#e7f1fb" },
  { name: "淡いグリーン", value: "#eaf6ee" },
  { name: "淡いピンク", value: "#faeaf0" },
  { name: "ダーク系", value: "#17202a" },
];

const storageKey = "kakomon-review-records";
const settingsKey = "kakomon-review-settings";
const draftKey = "kakomon-review-draft";

const recordFieldOrder = [
  "id",
  "subject",
  "practiceDate",
  "duration",
  "university",
  "faculty",
  "examType",
  "year",
  "majorQuestion",
  "minorQuestion",
  "branch",
  "step1",
  "step2",
  "step3",
  "lossReasons",
  "lossDetail",
  "step5",
  "tags",
  "colorLabel",
  "reviewed",
  "reviewedDate",
  "createdAt",
  "updatedAt",
] as const;

const blankSearch: SearchState = {
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ja"),
  );
}

function isDark(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 142;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function compactPayload(payload: SharePayload): CompactPayload {
  return {
    v: 2,
    r: payload.records.map((record) =>
      recordFieldOrder.map((field) => record[field]),
    ),
    s: {
      t: payload.settings.theme,
      c: payload.settings.customTheme,
      b: payload.settings.boardColors,
    },
    e: payload.exportedAt,
  };
}

function expandCompactPayload(payload: CompactPayload): SharePayload {
  return {
    version: 1,
    records: payload.r.map((values) => {
      const record: ReviewRecord = { ...emptyForm };
      recordFieldOrder.forEach((field, index) => {
        (record as Record<string, unknown>)[field] = values[index] ?? emptyForm[field];
      });
      record.lossReasons = Array.isArray(record.lossReasons) ? record.lossReasons : [];
      record.tags = Array.isArray(record.tags) ? record.tags : [];
      record.reviewed = Boolean(record.reviewed);
      return record;
    }),
    settings: {
      theme: payload.s.t || "#e7f1fb",
      customTheme: payload.s.c || "#e7f1fb",
      boardColors: payload.s.b || {},
    },
    exportedAt: payload.e || new Date().toISOString(),
  };
}

async function gzipText(text: string) {
  if (!("CompressionStream" in globalThis)) return null;
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return bytesToBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
}

async function ungzipText(value: string) {
  if (!("DecompressionStream" in globalThis)) {
    throw new Error("decompression unavailable");
  }
  const stream = new Blob([base64UrlToBytes(value)])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

async function encodeShareCode(payload: SharePayload) {
  const compactJson = JSON.stringify(compactPayload(payload));
  const compressed = await gzipText(compactJson);
  if (compressed) return `KR2.${compressed}`;
  return `KR1.${bytesToBase64Url(new TextEncoder().encode(compactJson))}`;
}

function decodeLegacyShareCode(code: string): SharePayload {
  const binary = atob(code.trim());
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function decodeShareCode(code: string): Promise<SharePayload> {
  const normalized = code.trim();
  const payload =
    normalized.startsWith("KR2.")
      ? expandCompactPayload(JSON.parse(await ungzipText(normalized.slice(4))))
      : normalized.startsWith("KR1.")
        ? expandCompactPayload(
            JSON.parse(new TextDecoder().decode(base64UrlToBytes(normalized.slice(4)))),
          )
        : decodeLegacyShareCode(normalized);

  if (
    payload?.version !== 1 ||
    !Array.isArray(payload.records) ||
    typeof payload.settings?.boardColors !== "object"
  ) {
    throw new Error("invalid share code");
  }

  return payload;
}

function removeSeededBoardColors(settings: Settings) {
  return {
    ...settings,
    boardColors: Object.fromEntries(
      Object.entries(settings.boardColors).filter(
        ([university]) => !seededUniversityNames.has(university),
      ),
    ),
  };
}

export default function Home() {
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [form, setForm] = useState<ReviewRecord>(emptyForm);
  const [settings, setSettings] = useState<Settings>({
    theme: "#e7f1fb",
    customTheme: "#e7f1fb",
    boardColors: {},
  });
  const [activeView, setActiveView] = useState("input");
  const [search, setSearch] = useState<SearchState>(blankSearch);
  const [selectedRecord, setSelectedRecord] = useState<ReviewRecord | null>(
    null,
  );
  const [selectedBoard, setSelectedBoard] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const savedRecords = window.localStorage.getItem(storageKey);
    const savedSettings = window.localStorage.getItem(settingsKey);
    const savedDraft = window.localStorage.getItem(draftKey);

    const loadedRecords: ReviewRecord[] = savedRecords
      ? JSON.parse(savedRecords)
      : initialRecords;
    setRecords(loadedRecords.filter((record) => !seededRecordIds.has(record.id)));
    if (savedSettings) setSettings(removeSeededBoardColors(JSON.parse(savedSettings)));
    if (savedDraft) setForm({ ...emptyForm, ...JSON.parse(savedDraft) });
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) window.localStorage.setItem(storageKey, JSON.stringify(records));
  }, [isHydrated, records]);

  useEffect(() => {
    if (isHydrated)
      window.localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [isHydrated, settings]);

  useEffect(() => {
    if (isHydrated) window.localStorage.setItem(draftKey, JSON.stringify(form));
  }, [isHydrated, form]);

  const allTags = useMemo(
    () => unique(records.flatMap((record) => record.tags)),
    [records],
  );

  const options = useMemo(
    () => ({
      universities: unique(records.map((record) => record.university)),
      faculties: unique(records.map((record) => record.faculty)),
      examTypes: unique(records.map((record) => record.examType)),
      subjects: unique(records.map((record) => record.subject)),
      years: unique(records.map((record) => record.year)),
    }),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const keyword = search.keyword.trim().toLowerCase();
    return records.filter((record) => {
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
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || text.includes(keyword)) &&
        (!search.university || record.university === search.university) &&
        (!search.faculty || record.faculty === search.faculty) &&
        (!search.examType || record.examType === search.examType) &&
        (!search.subject || record.subject === search.subject) &&
        (!search.year || record.year === search.year) &&
        (!search.tag || record.tags.includes(search.tag.replace("#", ""))) &&
        (!search.lossReason || record.lossReasons.includes(search.lossReason)) &&
        (!search.reviewed ||
          (search.reviewed === "done" ? record.reviewed : !record.reviewed))
      );
    });
  }, [records, search]);

  const boardRecords = selectedBoard
    ? filteredRecords.filter((record) => record.university === selectedBoard)
    : filteredRecords;

  const currentTheme = settings.theme === "custom" ? settings.customTheme : settings.theme;
  const darkTheme = isDark(currentTheme);
  const appStyle = {
    "--app-bg": currentTheme,
    "--app-text": darkTheme ? "#f7f7f4" : "#18212f",
    "--card-bg": darkTheme ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.86)",
    "--card-solid": darkTheme ? "#22303d" : "#ffffff",
    "--line": darkTheme ? "rgba(255,255,255,.18)" : "rgba(24,33,47,.13)",
    "--muted": darkTheme ? "#c7d0db" : "#667085",
    "--accent": darkTheme ? "#ffd166" : "#2f6fed",
    "--soft": darkTheme ? "rgba(255,255,255,.08)" : "rgba(47,111,237,.08)",
  } as CSSProperties;

  function updateForm(field: keyof ReviewRecord, value: string | boolean | string[]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleReason(reason: string) {
    setForm((current) => ({
      ...current,
      lossReasons: current.lossReasons.includes(reason)
        ? current.lossReasons.filter((item) => item !== reason)
        : [...current.lossReasons, reason],
    }));
  }

  function addTag(value = tagInput) {
    const tag = value.replace("#", "").trim();
    if (!tag) return;
    setForm((current) =>
      current.tags.includes(tag) ? current : { ...current, tags: [...current.tags, tag] },
    );
    setTagInput("");
  }

  function handleTagKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
  }

  function removeTag(tag: string) {
    setForm((current) => ({
      ...current,
      tags: current.tags.filter((item) => item !== tag),
    }));
  }

  function saveRecord(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    const payload = {
      ...form,
      updatedAt: now,
      createdAt: form.createdAt || now,
      id: form.id || makeId(),
      reviewedDate: form.reviewed ? form.reviewedDate || today() : "",
    };

    setRecords((current) => {
      const exists = current.some((record) => record.id === payload.id);
      return exists
        ? current.map((record) => (record.id === payload.id ? payload : record))
        : [payload, ...current];
    });

    setSettings((current) => ({
      ...current,
      boardColors: {
        ...current.boardColors,
        [payload.university]: current.boardColors[payload.university] || payload.colorLabel,
      },
    }));

    window.localStorage.removeItem(draftKey);
    setForm(emptyForm);
    setTagInput("");
    setActiveView("list");
  }

  function editRecord(record: ReviewRecord) {
    setForm(record);
    setSelectedRecord(null);
    setActiveView("input");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteRecord(recordId: string) {
    if (!window.confirm("この記録を削除しますか？")) return;
    setRecords((current) => current.filter((record) => record.id !== recordId));
    setSelectedRecord(null);
  }

  function toggleReviewed(recordId: string) {
    setRecords((current) =>
      current.map((record) =>
        record.id === recordId
          ? {
              ...record,
              reviewed: !record.reviewed,
              reviewedDate: !record.reviewed ? today() : "",
              updatedAt: new Date().toISOString(),
            }
          : record,
      ),
    );
  }

  function searchByTag(tag: string) {
    setSearch({ ...blankSearch, tag });
    setActiveView("search");
    setSelectedRecord(null);
  }

  async function createShareCode() {
    setShareCode(
      await encodeShareCode({
        version: 1,
        records,
        settings,
        exportedAt: new Date().toISOString(),
      }),
    );
  }

  async function importShareCode(mode: "append" | "replace") {
    try {
      const payload = await decodeShareCode(importCode);
      const importedRecords = payload.records.filter(
        (record) => !seededRecordIds.has(record.id),
      );

      if (mode === "replace") {
        if (!window.confirm("今ある記録をすべて共有コードの内容に置き換えますか？")) {
          return;
        }
        setRecords(importedRecords);
      } else {
        setRecords((current) => {
          const knownIds = new Set(current.map((record) => record.id));
          return [
            ...importedRecords.filter((record) => !knownIds.has(record.id)),
            ...current,
          ];
        });
      }

      setSettings((current) =>
        removeSeededBoardColors({
          ...current,
          ...payload.settings,
          boardColors: {
            ...current.boardColors,
            ...payload.settings.boardColors,
          },
        }),
      );
      setImportCode("");
      window.alert("共有コードを読み込みました。");
    } catch {
      window.alert("共有コードを読み込めませんでした。コードをもう一度確認してください。");
    }
  }

  const tagSuggestions = allTags
    .filter((tag) => tagInput && tag.includes(tagInput) && !form.tags.includes(tag))
    .slice(0, 6);

  return (
    <main className="app-shell" style={appStyle}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Kakomon Reflection Board</p>
          <h1>過去問振り返り管理</h1>
        </div>
        <nav className="view-tabs" aria-label="主要画面">
          {[
            ["input", "入力"],
            ["search", "検索"],
            ["list", "一覧"],
            ["boards", "大学ボード"],
            ["settings", "設定"],
          ].map(([key, label]) => (
            <button
              className={activeView === key ? "active" : ""}
              key={key}
              onClick={() => setActiveView(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <section className="overview">
        <div>
          <span className="metric">{records.length}</span>
          <span>記録</span>
        </div>
        <div>
          <span className="metric">{options.universities.length}</span>
          <span>大学ボード</span>
        </div>
        <div>
          <span className="metric">{records.filter((record) => !record.reviewed).length}</span>
          <span>未再演習</span>
        </div>
        <div>
          <span className="metric">{allTags.length}</span>
          <span>タグ</span>
        </div>
      </section>

      {activeView === "input" && (
        <form className="editor" onSubmit={saveRecord}>
          <section className="panel">
            <div className="section-title">
              <p>Basic</p>
              <h2>基本情報</h2>
            </div>
            <div className="form-grid">
              <Input label="教科" value={form.subject} required onChange={(value) => updateForm("subject", value)} />
              <Input label="実施日" type="date" value={form.practiceDate} required onChange={(value) => updateForm("practiceDate", value)} />
              <Input label="所要時間" value={form.duration} required placeholder="例：60分" onChange={(value) => updateForm("duration", value)} />
              <Input label="大学" value={form.university} required onChange={(value) => updateForm("university", value)} />
              <Input label="学部" value={form.faculty} required onChange={(value) => updateForm("faculty", value)} />
              <Input label="入試方式" value={form.examType} required onChange={(value) => updateForm("examType", value)} />
              <Input label="年度" value={form.year} required onChange={(value) => updateForm("year", value)} />
              <Input label="大問番号" value={form.majorQuestion} required onChange={(value) => updateForm("majorQuestion", value)} />
              <Input label="小問番号" value={form.minorQuestion} required onChange={(value) => updateForm("minorQuestion", value)} />
              <Input label="枝番" value={form.branch} placeholder="例：a / ①" onChange={(value) => updateForm("branch", value)} />
            </div>
          </section>

          <section className="panel step-stack">
            <StepTextarea number="1" title="問題の要約" value={form.step1} onChange={(value) => updateForm("step1", value)} />
            <StepTextarea number="2" title="自分の誤答プロセス" value={form.step2} onChange={(value) => updateForm("step2", value)} />
            <StepTextarea number="3" title="模範解答・解答の要約" value={form.step3} onChange={(value) => updateForm("step3", value)} />

            <div className="step-block">
              <div className="step-number">Step4</div>
              <div>
                <h3>失点原因</h3>
                <div className="checks">
                  {lossReasonOptions.map((reason) => (
                    <label key={reason} className="check-pill">
                      <input
                        type="checkbox"
                        checked={form.lossReasons.includes(reason)}
                        onChange={() => toggleReason(reason)}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
                <textarea
                  value={form.lossDetail}
                  onChange={(event) => updateForm("lossDetail", event.target.value)}
                  placeholder="具体的に何が原因だったか"
                />
              </div>
            </div>

            <StepTextarea number="5" title="次回の対策" value={form.step5} onChange={(value) => updateForm("step5", value)} />
          </section>

          <section className="panel">
            <div className="section-title">
              <p>Filing</p>
              <h2>タグ・カラー・再演習</h2>
            </div>
            <div className="tag-editor">
              <label>
                タグ
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagKey}
                  placeholder="入力してEnter"
                />
              </label>
              <button type="button" className="subtle-button" onClick={() => addTag()}>
                追加
              </button>
              {tagSuggestions.length > 0 && (
                <div className="suggestions">
                  {tagSuggestions.map((tag) => (
                    <button key={tag} type="button" onClick={() => addTag(tag)}>
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="tag-list">
              {form.tags.map((tag) => (
                <button key={tag} type="button" onClick={() => removeTag(tag)}>
                  #{tag} ×
                </button>
              ))}
            </div>
            <div className="color-row">
              {labelColors.map((color) => (
                <button
                  aria-label={`カラー ${color}`}
                  className={form.colorLabel === color ? "swatch selected" : "swatch"}
                  key={color}
                  onClick={() => updateForm("colorLabel", color)}
                  style={{ backgroundColor: color }}
                  type="button"
                />
              ))}
              <input
                aria-label="自由カラー"
                type="color"
                value={form.colorLabel}
                onChange={(event) => updateForm("colorLabel", event.target.value)}
              />
            </div>
            <label className="review-toggle">
              <input
                type="checkbox"
                checked={form.reviewed}
                onChange={(event) => updateForm("reviewed", event.target.checked)}
              />
              再演習済みとして保存
            </label>
            <div className="actions">
              <button type="button" className="ghost" onClick={() => setForm(emptyForm)}>
                クリア
              </button>
              <button type="submit">{form.id ? "更新する" : "保存する"}</button>
            </div>
          </section>
        </form>
      )}

      {activeView === "search" && (
        <section className="panel">
          <div className="section-title">
            <p>Search</p>
            <h2>複数条件で絞り込み</h2>
          </div>
          <div className="filter-grid">
            <Input label="キーワード" value={search.keyword} onChange={(value) => setSearch({ ...search, keyword: value })} />
            <Select label="大学" value={search.university} options={options.universities} onChange={(value) => setSearch({ ...search, university: value })} />
            <Select label="学部" value={search.faculty} options={options.faculties} onChange={(value) => setSearch({ ...search, faculty: value })} />
            <Select label="入試方式" value={search.examType} options={options.examTypes} onChange={(value) => setSearch({ ...search, examType: value })} />
            <Select label="教科" value={search.subject} options={options.subjects} onChange={(value) => setSearch({ ...search, subject: value })} />
            <Select label="年度" value={search.year} options={options.years} onChange={(value) => setSearch({ ...search, year: value })} />
            <Select label="タグ" value={search.tag} options={allTags} onChange={(value) => setSearch({ ...search, tag: value })} />
            <Select label="失点原因" value={search.lossReason} options={lossReasonOptions} onChange={(value) => setSearch({ ...search, lossReason: value })} />
            <label>
              再演習
              <select value={search.reviewed} onChange={(event) => setSearch({ ...search, reviewed: event.target.value })}>
                <option value="">すべて</option>
                <option value="done">再演習済み</option>
                <option value="todo">未再演習</option>
              </select>
            </label>
          </div>
          <div className="actions left">
            <button type="button" className="ghost" onClick={() => setSearch(blankSearch)}>
              条件をリセット
            </button>
          </div>
          <RecordGrid
            records={filteredRecords}
            boardColors={settings.boardColors}
            onOpen={setSelectedRecord}
            onTag={searchByTag}
            onToggleReviewed={toggleReviewed}
          />
        </section>
      )}

      {activeView === "list" && (
        <section className="panel">
          <div className="section-title row-title">
            <div>
              <p>Pins</p>
              <h2>振り返りカード一覧</h2>
            </div>
            <button type="button" onClick={() => setActiveView("input")}>
              新規入力
            </button>
          </div>
          <RecordGrid
            records={records}
            boardColors={settings.boardColors}
            onOpen={setSelectedRecord}
            onTag={searchByTag}
            onToggleReviewed={toggleReviewed}
          />
        </section>
      )}

      {activeView === "boards" && (
        <section className="panel">
          <div className="section-title">
            <p>Boards</p>
            <h2>大学ごとのファイリング</h2>
          </div>
          <div className="board-strip">
            <button
              className={!selectedBoard ? "board-chip active" : "board-chip"}
              type="button"
              onClick={() => setSelectedBoard("")}
            >
              すべて
            </button>
            {options.universities.map((university) => (
              <button
                className={selectedBoard === university ? "board-chip active" : "board-chip"}
                key={university}
                style={{ borderColor: settings.boardColors[university] || "#98a2b3" }}
                type="button"
                onClick={() => setSelectedBoard(university)}
              >
                <span style={{ backgroundColor: settings.boardColors[university] || "#98a2b3" }} />
                {university}
              </button>
            ))}
          </div>
          {selectedBoard && (
            <div className="board-tools">
              <label>
                ボードカラー
                <input
                  type="color"
                  value={settings.boardColors[selectedBoard] || "#4f8edb"}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      boardColors: {
                        ...current.boardColors,
                        [selectedBoard]: event.target.value,
                      },
                    }))
                  }
                />
              </label>
              <Select label="学部" value={search.faculty} options={options.faculties} onChange={(value) => setSearch({ ...search, faculty: value })} />
              <Select label="教科" value={search.subject} options={options.subjects} onChange={(value) => setSearch({ ...search, subject: value })} />
              <Select label="年度" value={search.year} options={options.years} onChange={(value) => setSearch({ ...search, year: value })} />
              <Select label="入試方式" value={search.examType} options={options.examTypes} onChange={(value) => setSearch({ ...search, examType: value })} />
            </div>
          )}
          <RecordGrid
            records={boardRecords}
            boardColors={settings.boardColors}
            onOpen={setSelectedRecord}
            onTag={searchByTag}
            onToggleReviewed={toggleReviewed}
          />
        </section>
      )}

      {activeView === "settings" && (
        <section className="panel settings-panel">
          <div className="section-title">
            <p>Settings</p>
            <h2>背景テーマと表示色</h2>
          </div>
          <div className="theme-grid">
            {themePresets.map((theme) => (
              <button
                className={settings.theme === theme.value ? "theme-card selected" : "theme-card"}
                key={theme.value}
                type="button"
                onClick={() => setSettings({ ...settings, theme: theme.value })}
              >
                <span style={{ backgroundColor: theme.value }} />
                {theme.name}
              </button>
            ))}
            <label className="theme-card custom-theme">
              <input
                type="color"
                value={settings.customTheme}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    theme: "custom",
                    customTheme: event.target.value,
                  })
                }
              />
              自由選択
            </label>
          </div>
          <div className="board-color-list">
            {options.universities.map((university) => (
              <label key={university}>
                {university}
                <input
                  type="color"
                  value={settings.boardColors[university] || "#4f8edb"}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      boardColors: {
                        ...current.boardColors,
                        [university]: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="share-panel">
            <div className="section-title">
              <p>Share</p>
              <h2>共有コード</h2>
            </div>
            <div className="share-grid">
              <label>
                書き出しコード
                <textarea
                  readOnly
                  value={shareCode}
                  placeholder="共有コードを作成するとここに表示されます"
                />
              </label>
              <label>
                読み込みコード
                <textarea
                  value={importCode}
                  onChange={(event) => setImportCode(event.target.value)}
                  placeholder="別の端末で作成した共有コードを貼り付け"
                />
              </label>
            </div>
            <div className="actions">
              <button type="button" className="ghost" onClick={createShareCode}>
                共有コードを作成
              </button>
              <button type="button" className="ghost" onClick={() => importShareCode("append")}>
                読み込んで追加
              </button>
              <button type="button" onClick={() => importShareCode("replace")}>
                全て置き換え
              </button>
            </div>
          </div>
        </section>
      )}

      {selectedRecord && (
        <RecordModal
          record={selectedRecord}
          boardColor={settings.boardColors[selectedRecord.university]}
          onClose={() => setSelectedRecord(null)}
          onEdit={editRecord}
          onDelete={deleteRecord}
          onToggleReviewed={toggleReviewed}
          onTag={searchByTag}
        />
      )}
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">すべて</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StepTextarea({
  number,
  title,
  value,
  onChange,
}: {
  number: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="step-block">
      <div className="step-number">Step{number}</div>
      <label>
        <span>{title}</span>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    </div>
  );
}

function RecordGrid({
  records,
  boardColors,
  onOpen,
  onTag,
  onToggleReviewed,
}: {
  records: ReviewRecord[];
  boardColors: Record<string, string>;
  onOpen: (record: ReviewRecord) => void;
  onTag: (tag: string) => void;
  onToggleReviewed: (id: string) => void;
}) {
  if (records.length === 0) {
    return <div className="empty-state">条件に合う記録はまだありません。</div>;
  }

  return (
    <div className="masonry">
      {records.map((record) => (
        <article className="record-card" key={record.id}>
          <button className="card-open" type="button" onClick={() => onOpen(record)}>
            <span className="color-bar" style={{ backgroundColor: record.colorLabel }} />
            <span
              className="board-dot"
              style={{ backgroundColor: boardColors[record.university] || "#98a2b3" }}
            />
            <strong>{record.university}</strong>
            <span>{record.faculty}</span>
            <span className="card-meta">
              {record.year}年度 / {record.examType} / {record.subject}
            </span>
            <span className="question-code">
              大問{record.majorQuestion} 小問{record.minorQuestion}
              {record.branch && ` ${record.branch}`}
            </span>
            <span className={record.reviewed ? "status done" : "status"}>
              {record.reviewed ? `再演習済み ${record.reviewedDate}` : "未再演習"}
            </span>
          </button>
          <div className="reason-list">
            {record.lossReasons.slice(0, 3).map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
          <div className="tag-list compact">
            {record.tags.map((tag) => (
              <button key={tag} type="button" onClick={() => onTag(tag)}>
                #{tag}
              </button>
            ))}
          </div>
          <button className="toggle-review" type="button" onClick={() => onToggleReviewed(record.id)}>
            {record.reviewed ? "未再演習に戻す" : "再演習済みにする"}
          </button>
        </article>
      ))}
    </div>
  );
}

function RecordModal({
  record,
  boardColor,
  onClose,
  onEdit,
  onDelete,
  onToggleReviewed,
  onTag,
}: {
  record: ReviewRecord;
  boardColor: string;
  onClose: () => void;
  onEdit: (record: ReviewRecord) => void;
  onDelete: (id: string) => void;
  onToggleReviewed: (id: string) => void;
  onTag: (tag: string) => void;
}) {
  const steps = [
    ["Step1：問題の要約", record.step1],
    ["Step2：自分の誤答プロセス", record.step2],
    ["Step3：模範解答・解答の要約", record.step3],
    ["Step4：失点原因の自由記述", record.lossDetail],
    ["Step5：次回の対策", record.step5],
  ];

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" type="button" onClick={onClose} aria-label="詳細を閉じる">
          ×
        </button>
        <div className="modal-head">
          <span className="color-bar wide" style={{ backgroundColor: record.colorLabel }} />
          <span className="board-dot large" style={{ backgroundColor: boardColor || "#98a2b3" }} />
          <p>{record.subject} / {record.year}年度 / {record.examType}</p>
          <h2>{record.university} {record.faculty}</h2>
          <span>大問{record.majorQuestion} 小問{record.minorQuestion}{record.branch && ` ${record.branch}`}</span>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={() => onToggleReviewed(record.id)}>
            {record.reviewed ? "未再演習に戻す" : "再演習済みにする"}
          </button>
          <button type="button" className="ghost" onClick={() => onEdit(record)}>
            編集
          </button>
          <button type="button" className="danger" onClick={() => onDelete(record.id)}>
            削除
          </button>
        </div>
        <div className="detail-grid">
          <span>実施日：{record.practiceDate}</span>
          <span>所要時間：{record.duration}</span>
          <span>{record.reviewed ? `再演習日：${record.reviewedDate}` : "未再演習"}</span>
        </div>
        <div className="reason-list">
          {record.lossReasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
        <div className="tag-list">
          {record.tags.map((tag) => (
            <button key={tag} type="button" onClick={() => onTag(tag)}>
              #{tag}
            </button>
          ))}
        </div>
        <div className="step-detail-list">
          {steps.map(([title, body]) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{body || "未入力"}</p>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
