const STORAGE_KEY = "rach-visit-capture-demo-v1";

const trackedElements = [...document.querySelectorAll("[data-track='progress']")];
const inputs = [...document.querySelectorAll("input, textarea")];
const progressFill = document.getElementById("progress-fill");
const completionCopy = document.getElementById("completion-copy");
const syncStatus = document.getElementById("sync-status");
const saveButton = document.getElementById("save-draft");
const clearButton = document.getElementById("clear-draft");
const exportButton = document.getElementById("download-json");

function getFormData() {
  const data = {};

  for (const element of inputs) {
    if (!element.name) continue;
    data[element.name] = element.type === "checkbox" ? element.checked : element.value;
  }

  return data;
}

function setFormData(data) {
  for (const element of inputs) {
    if (!element.name || !(element.name in data)) continue;
    if (element.type === "checkbox") {
      element.checked = Boolean(data[element.name]);
    } else {
      element.value = data[element.name];
    }
  }
}

function saveDraft(showFeedback = false) {
  const payload = {
    savedAt: new Date().toISOString(),
    visit: getFormData(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  syncStatus.textContent = getStatusLabel(
    `Saved locally ${new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`
  );

  if (showFeedback) showToast("Draft saved on this device");
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    if (saved.visit) setFormData(saved.visit);
    if (saved.savedAt) {
      syncStatus.textContent = getStatusLabel(
        `Restored draft from ${new Date(saved.savedAt).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}`
      );
    }
  } catch (error) {
    console.error("Unable to restore saved draft", error);
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
  for (const element of inputs) {
    if (element.type === "checkbox") {
      element.checked = false;
    } else {
      element.value = "";
    }
  }
  updateProgress();
  syncStatus.textContent = getStatusLabel("Offline-ready draft");
  showToast("Draft cleared");
}

function getStatusLabel(baseLabel) {
  return navigator.onLine ? `${baseLabel} · online` : `${baseLabel} · offline`;
}

function updateProgress() {
  const completed = trackedElements.filter((element) => {
    if (element.type === "checkbox") return element.checked;
    return element.value.trim().length > 0;
  }).length;

  const total = trackedElements.length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  progressFill.style.width = `${percentage}%`;
  completionCopy.textContent = `${percentage}% complete`;
}

function downloadJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    visit: getFormData(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rach-visit-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("JSON export ready");
}

function showToast(message) {
  const template = document.getElementById("toast-template");
  const toast = template.content.firstElementChild.cloneNode(true);
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2200);
}

for (const element of inputs) {
  element.addEventListener("input", () => {
    updateProgress();
    saveDraft();
  });

  if (element.type === "checkbox") {
    element.addEventListener("change", () => {
      updateProgress();
      saveDraft();
    });
  }
}

saveButton.addEventListener("click", () => saveDraft(true));
clearButton.addEventListener("click", clearDraft);
exportButton.addEventListener("click", downloadJson);

loadDraft();
updateProgress();
syncStatus.textContent = getStatusLabel(syncStatus.textContent);

window.addEventListener("online", () => {
  syncStatus.textContent = getStatusLabel("Draft available");
});

window.addEventListener("offline", () => {
  syncStatus.textContent = getStatusLabel("Draft available");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (error) {
      console.error("Service worker registration failed", error);
    }
  });
}
