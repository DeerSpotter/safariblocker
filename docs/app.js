const LIST_KEYS = ["allowedDomains", "blockedDomains", "blockedURLs"];
const STORAGE_KEY = "safariblocker-rule-editor-state";

const state = {
  allowedDomains: [],
  blockedDomains: [],
  blockedURLs: []
};

const labels = {
  allowedDomains: "whitelisted domain",
  blockedDomains: "blocked domain",
  blockedURLs: "blocked URL"
};

const elements = {
  fileImport: document.getElementById("fileImport"),
  exportBtn: document.getElementById("exportBtn"),
  copyBtn: document.getElementById("copyBtn"),
  clearBtn: document.getElementById("clearBtn"),
  refreshPreviewBtn: document.getElementById("refreshPreviewBtn"),
  loadPastedBtn: document.getElementById("loadPastedBtn"),
  pasteImport: document.getElementById("pasteImport"),
  jsonPreview: document.getElementById("jsonPreview"),
  toast: document.getElementById("toast")
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

  item = item.replace(/^\s+|\s+$/g, "");

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

function toBackupObject() {
  return {
    allowedDomains: state.allowedDomains.join(";"),
    blockedDomains: state.blockedDomains.join(";"),
    blockedURLs: state.blockedURLs.join(";")
  };
}

function loadBackupObject(data) {
  for (const key of LIST_KEYS) {
    state[key] = unique(splitList(data?.[key]).map(value => normalizeForKey(key, value)).filter(Boolean));
  }

  saveLocal();
  render();
}

function backupJSON() {
  return JSON.stringify(toBackupObject(), null, 2);
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadLocal() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    loadBackupObject(stored);
  } catch {
    render();
  }
}

function render() {
  for (const key of LIST_KEYS) {
    const list = document.getElementById(`${key}List`);
    const count = document.getElementById(`${key}Count`);
    list.innerHTML = "";
    count.textContent = String(state[key].length);

    if (state[key].length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = `No ${labels[key]} entries yet.`;
      list.appendChild(empty);
      continue;
    }

    state[key].forEach((item, index) => {
      const chip = document.createElement("div");
      chip.className = "chip";

      const code = document.createElement("code");
      code.textContent = item;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.setAttribute("aria-label", `Delete ${item}`);
      remove.addEventListener("click", () => {
        state[key].splice(index, 1);
        saveLocal();
        render();
        showToast(`Deleted ${item}`);
      });

      chip.append(code, remove);
      list.appendChild(chip);
    });
  }

  elements.jsonPreview.textContent = backupJSON();
}

function addEntries(key) {
  const input = document.getElementById(`${key}Input`);
  const entries = parseEntries(input.value, key);

  if (entries.length === 0) {
    showToast(`Enter at least one ${labels[key]}.`);
    return;
  }

  const before = state[key].length;
  state[key] = unique([...state[key], ...entries]);
  const added = state[key].length - before;

  input.value = "";
  saveLocal();
  render();
  showToast(added === 0 ? "No new entries added. They were already present." : `Added ${added} entr${added === 1 ? "y" : "ies"}.`);
}

function sortList(key) {
  state[key].sort((a, b) => a.localeCompare(b));
  saveLocal();
  render();
  showToast(`Sorted ${labels[key]} list.`);
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

async function copyBackup() {
  try {
    await navigator.clipboard.writeText(backupJSON());
    showToast("Copied backup JSON.");
  } catch {
    elements.jsonPreview.focus();
    showToast("Copy failed. Select the preview and copy manually.");
  }
}

async function importFile(file) {
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    loadBackupObject(data);
    showToast(`Imported ${file.name}.`);
  } catch (error) {
    showToast(`Import failed: ${error.message}`);
  }
}

function loadPastedJSON() {
  try {
    const data = JSON.parse(elements.pasteImport.value);
    loadBackupObject(data);
    elements.pasteImport.value = "";
    showToast("Loaded pasted backup JSON.");
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
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

for (const button of document.querySelectorAll("[data-add]")) {
  button.addEventListener("click", () => addEntries(button.dataset.add));
}

for (const button of document.querySelectorAll("[data-sort]")) {
  button.addEventListener("click", () => sortList(button.dataset.sort));
}

elements.exportBtn.addEventListener("click", exportBackup);
elements.copyBtn.addEventListener("click", copyBackup);
elements.clearBtn.addEventListener("click", clearAll);
elements.refreshPreviewBtn.addEventListener("click", render);
elements.loadPastedBtn.addEventListener("click", loadPastedJSON);
elements.fileImport.addEventListener("change", event => importFile(event.target.files?.[0]));

loadLocal();
