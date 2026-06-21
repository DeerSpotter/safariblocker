const LIST_KEYS = ["allowedDomains", "blockedDomains", "blockedURLs"];
const STORAGE_KEY = "safariblocker-rule-editor-state";
const DELETE_REVEAL_PX = 96;

const state = {
  allowedDomains: [],
  blockedDomains: [],
  blockedURLs: []
};

const listMeta = {
  allowedDomains: {
    title: "Whitelisted Domain",
    plural: "whitelisted domains",
    singular: "whitelisted domain",
    placeholder: "example.com"
  },
  blockedDomains: {
    title: "Blocked Domain",
    plural: "blocked domains",
    singular: "blocked domain",
    placeholder: "ads.example.com"
  },
  blockedURLs: {
    title: "Blocked URL",
    plural: "blocked URLs",
    singular: "blocked URL",
    placeholder: "https://example.com/bad-page"
  }
};

const elements = {
  startScreen: document.getElementById("startScreen"),
  editorScreen: document.getElementById("editorScreen"),
  fileImport: document.getElementById("fileImport"),
  fileImportAgain: document.getElementById("fileImportAgain"),
  importStatus: document.getElementById("importStatus"),
  summaryText: document.getElementById("summaryText"),
  exportBtn: document.getElementById("exportBtn"),
  copyBtn: document.getElementById("copyBtn"),
  clearBtn: document.getElementById("clearBtn"),
  loadPastedBtn: document.getElementById("loadPastedBtn"),
  pasteImport: document.getElementById("pasteImport"),
  jsonPreview: document.getElementById("jsonPreview"),
  toast: document.getElementById("toast"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  modalHelp: document.getElementById("modalHelp"),
  singleField: document.getElementById("singleField"),
  batchField: document.getElementById("batchField"),
  singleLabel: document.getElementById("singleLabel"),
  batchLabel: document.getElementById("batchLabel"),
  modalInput: document.getElementById("modalInput"),
  modalBatch: document.getElementById("modalBatch"),
  modalCancel: document.getElementById("modalCancel"),
  modalSubmit: document.getElementById("modalSubmit")
};

const modalState = {
  key: null,
  mode: "single"
};

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[;\n]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function unique(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

function normalizeDomain(value) {
  let item = String(value || "").trim();

  if (!item) {
    return "";
  }

  const isWildcard = item.startsWith("*.");

  try {
    const candidate = item.includes("://") ? item : `https://${item}`;
    const url = new URL(candidate);
    item = url.hostname || item;
  } catch {
    item = item.split("/")[0];
  }

  item = item.replace(/^www\./i, "").toLowerCase();
  item = item.replace(/\.+$/g, "");

  if (isWildcard && !item.startsWith("*.")) {
    item = `*.${item}`;
  }

  return item;
}

function normalizeURL(value) {
  return String(value || "").trim();
}

function normalizeForKey(key, value) {
  if (key === "blockedURLs") {
    return normalizeURL(value);
  }

  return normalizeDomain(value);
}

function parseEntries(raw, key) {
  return unique(
    String(raw || "")
      .split(/[;\n]/g)
      .map(value => normalizeForKey(key, value))
      .filter(Boolean)
  );
}

function getBackupLists(data) {
  if (data && typeof data === "object" && data.lists && typeof data.lists === "object") {
    return data.lists;
  }

  return data || {};
}

function countStateEntries() {
  return LIST_KEYS.reduce((total, key) => total + state[key].length, 0);
}

function toBackupObject() {
  return {
    format: "SafariBlockerListBackup",
    version: 1,
    exportedAt: new Date().toISOString(),
    lists: {
      allowedDomains: state.allowedDomains,
      blockedDomains: state.blockedDomains,
      blockedURLs: state.blockedURLs
    }
  };
}

function loadBackupObject(data, sourceName = "backup") {
  const lists = getBackupLists(data);

  for (const key of LIST_KEYS) {
    state[key] = unique(splitList(lists?.[key]).map(value => normalizeForKey(key, value)).filter(Boolean));
  }

  saveLocal();
  render();
  showEditor();

  const total = countStateEntries();
  const message = `Loaded ${total} total item${total === 1 ? "" : "s"} from ${sourceName}.`;
  elements.importStatus.textContent = message;
  showToast(message);
}

function backupJSON() {
  return JSON.stringify(toBackupObject(), null, 2);
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toBackupObject()));
}

function loadLocal() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const lists = getBackupLists(stored);
    const hasAnyList = LIST_KEYS.some(key => splitList(lists?.[key]).length > 0);

    if (hasAnyList) {
      for (const key of LIST_KEYS) {
        state[key] = unique(splitList(lists?.[key]).map(value => normalizeForKey(key, value)).filter(Boolean));
      }
      render();
      return;
    }
  } catch {
    // Start clean if stored data is damaged.
  }

  render();
}

function showEditor() {
  elements.startScreen.hidden = true;
  elements.editorScreen.hidden = false;
}

function updateSummary() {
  const parts = LIST_KEYS.map(key => `${state[key].length} ${listMeta[key].plural}`);
  elements.summaryText.textContent = `Loaded ${parts.join(", ")}.`;
}

function render() {
  closeRevealedRows();

  for (const key of LIST_KEYS) {
    const list = document.getElementById(`${key}List`);
    const count = document.getElementById(`${key}Count`);
    list.innerHTML = "";
    count.textContent = String(state[key].length);

    if (state[key].length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = `No ${listMeta[key].singular} entries.`;
      list.appendChild(empty);
      continue;
    }

    state[key].forEach((item, index) => {
      list.appendChild(createRuleRow(key, item, index));
    });
  }

  updateSummary();
  elements.jsonPreview.textContent = backupJSON();
}

function createRuleRow(key, item, index) {
  const row = document.createElement("div");
  row.className = "rule-row";
  row.dataset.key = key;
  row.dataset.index = String(index);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "row-delete";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${item}`);
  deleteButton.addEventListener("click", () => deleteEntry(key, index, item));

  const foreground = document.createElement("div");
  foreground.className = "row-foreground";
  foreground.tabIndex = 0;

  const code = document.createElement("code");
  code.textContent = item;

  const hint = document.createElement("span");
  hint.className = "swipe-hint";
  hint.textContent = "Swipe left";

  foreground.append(code, hint);
  row.append(deleteButton, foreground);
  attachSwipe(row, foreground);

  foreground.addEventListener("keydown", event => {
    if (event.key === "Delete" || event.key === "Backspace") {
      deleteEntry(key, index, item);
    }

    if (event.key === "Escape") {
      row.classList.remove("revealed");
    }
  });

  return row;
}

function deleteEntry(key, index, item) {
  state[key].splice(index, 1);
  saveLocal();
  render();
  showToast(`Deleted ${item}`);
}

function attachSwipe(row, foreground) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let dragging = false;
  let horizontal = false;

  foreground.addEventListener("pointerdown", event => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    closeRevealedRows(row);
    startX = event.clientX;
    startY = event.clientY;
    currentX = row.classList.contains("revealed") ? -DELETE_REVEAL_PX : 0;
    dragging = true;
    horizontal = false;
    foreground.setPointerCapture?.(event.pointerId);
  });

  foreground.addEventListener("pointermove", event => {
    if (!dragging) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (!horizontal && Math.abs(deltaY) > Math.abs(deltaX) + 8) {
      return;
    }

    if (Math.abs(deltaX) > 8) {
      horizontal = true;
    }

    if (!horizontal) {
      return;
    }

    const next = Math.max(-DELETE_REVEAL_PX, Math.min(0, currentX + deltaX));
    foreground.style.transform = `translateX(${next}px)`;
  });

  foreground.addEventListener("pointerup", event => {
    if (!dragging) {
      return;
    }

    const deltaX = event.clientX - startX;
    dragging = false;
    foreground.style.transform = "";

    if (currentX + deltaX < -DELETE_REVEAL_PX / 2) {
      row.classList.add("revealed");
    } else {
      row.classList.remove("revealed");
    }
  });

  foreground.addEventListener("pointercancel", () => {
    dragging = false;
    foreground.style.transform = "";
  });

  foreground.addEventListener("click", () => {
    if (row.classList.contains("revealed")) {
      row.classList.remove("revealed");
    }
  });
}

function closeRevealedRows(exceptRow = null) {
  document.querySelectorAll(".rule-row.revealed").forEach(row => {
    if (row !== exceptRow) {
      row.classList.remove("revealed");
    }
  });
}

function addEntries(key, raw) {
  const entries = parseEntries(raw, key);

  if (entries.length === 0) {
    showToast(`Enter at least one ${listMeta[key].singular}.`);
    return false;
  }

  const before = state[key].length;
  state[key] = unique([...state[key], ...entries]);
  const added = state[key].length - before;

  saveLocal();
  render();
  showToast(added === 0 ? "No new entries added. They were already present." : `Added ${added} entr${added === 1 ? "y" : "ies"}.`);
  return added > 0;
}

function sortList(key) {
  state[key].sort((a, b) => a.localeCompare(b));
  saveLocal();
  render();
  showToast(`Sorted ${listMeta[key].plural}.`);
}

function openAddModal(key) {
  modalState.key = key;
  modalState.mode = "single";
  const meta = listMeta[key];

  elements.modalTitle.textContent = `Add ${meta.title}`;
  elements.modalHelp.textContent = "Enter one item. Submit saves it to this list, Cancel closes without saving.";
  elements.singleLabel.textContent = meta.title;
  elements.modalInput.placeholder = meta.placeholder;
  elements.modalInput.value = "";
  elements.modalBatch.value = "";
  elements.singleField.hidden = false;
  elements.batchField.hidden = true;
  elements.modal.hidden = false;
  elements.modalInput.focus();
}

function openBatchModal(key) {
  modalState.key = key;
  modalState.mode = "batch";
  const meta = listMeta[key];

  elements.modalTitle.textContent = `Batch Paste ${meta.plural}`;
  elements.modalHelp.textContent = "Paste one item per line, or separate items with semicolons. Submit appends only new entries.";
  elements.batchLabel.textContent = `Paste ${meta.plural}`;
  elements.modalBatch.placeholder = key === "blockedURLs"
    ? "https://example.com/bad-page\nhttps://example.org/another-page"
    : "example.com\n*.example.org\nsubdomain.example.net";
  elements.modalInput.value = "";
  elements.modalBatch.value = "";
  elements.singleField.hidden = true;
  elements.batchField.hidden = false;
  elements.modal.hidden = false;
  elements.modalBatch.focus();
}

function submitModal() {
  const key = modalState.key;
  if (!key) {
    closeModal();
    return;
  }

  const raw = modalState.mode === "batch" ? elements.modalBatch.value : elements.modalInput.value;
  const success = addEntries(key, raw);

  if (success || parseEntries(raw, key).length > 0) {
    closeModal();
  }
}

function closeModal() {
  elements.modal.hidden = true;
  modalState.key = null;
  modalState.mode = "single";
}

function exportBackup() {
  const blob = new Blob([backupJSON()], { type: "application/json" });
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `SafariBlockerBackup_${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Exported SafariBlocker backup JSON.");
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "readonly");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    showToast(successMessage);
  }
}

function copyBackup() {
  copyText(backupJSON(), "Copied backup JSON.");
}

function copyList(key) {
  if (state[key].length === 0) {
    showToast(`No ${listMeta[key].plural} to copy.`);
    return;
  }

  copyText(state[key].join("\n"), `Copied ${listMeta[key].plural}.`);
}

function readFileText(file) {
  if (file.text) {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsText(file);
  });
}

async function importFile(file) {
  if (!file) {
    return;
  }

  try {
    const text = await readFileText(file);
    const data = JSON.parse(text);
    loadBackupObject(data, file.name || "selected file");
  } catch (error) {
    const message = `Import failed: ${error.message}`;
    elements.importStatus.textContent = message;
    showToast(message);
  } finally {
    elements.fileImport.value = "";
    elements.fileImportAgain.value = "";
  }
}

function loadPastedJSON() {
  try {
    const data = JSON.parse(elements.pasteImport.value);
    loadBackupObject(data, "pasted JSON");
    elements.pasteImport.value = "";
  } catch (error) {
    showToast(`Paste import failed: ${error.message}`);
  }
}

function clearAll() {
  const hasEntries = LIST_KEYS.some(key => state[key].length > 0);

  if (!hasEntries) {
    showToast("All lists are already empty.");
    return;
  }

  const confirmed = window.confirm("Clear all whitelist, blocked domain, and blocked URL entries from this editor?");

  if (!confirmed) {
    return;
  }

  for (const key of LIST_KEYS) {
    state[key] = [];
  }

  saveLocal();
  render();
  showToast("Cleared all lists in the editor.");
}

let toastTimer = null;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

for (const button of document.querySelectorAll("[data-open-add]")) {
  button.addEventListener("click", () => openAddModal(button.dataset.openAdd));
}

for (const button of document.querySelectorAll("[data-open-batch]")) {
  button.addEventListener("click", () => openBatchModal(button.dataset.openBatch));
}

for (const button of document.querySelectorAll("[data-copy-list]")) {
  button.addEventListener("click", () => copyList(button.dataset.copyList));
}

for (const button of document.querySelectorAll("[data-sort]")) {
  button.addEventListener("click", () => sortList(button.dataset.sort));
}

elements.exportBtn.addEventListener("click", exportBackup);
elements.copyBtn.addEventListener("click", copyBackup);
elements.clearBtn.addEventListener("click", clearAll);
elements.loadPastedBtn.addEventListener("click", loadPastedJSON);
elements.fileImport.addEventListener("change", event => importFile(event.target.files?.[0]));
elements.fileImportAgain.addEventListener("change", event => importFile(event.target.files?.[0]));
elements.modalCancel.addEventListener("click", closeModal);
elements.modalSubmit.addEventListener("click", submitModal);
elements.modal.addEventListener("click", event => {
  if (event.target === elements.modal) {
    closeModal();
  }
});
elements.modalInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    submitModal();
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !elements.modal.hidden) {
    closeModal();
  }
});
document.addEventListener("click", event => {
  if (!event.target.closest(".rule-row")) {
    closeRevealedRows();
  }
});

loadLocal();
