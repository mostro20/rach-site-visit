const DB_NAME = "rach-visit-v2";
const DB_VERSION = 1;
const VISIT_STORE = "visits";
const ACTIVE_VISIT_ID = "active";

const noteFields = [
  ["successes", "Successes or initiatives to acknowledge"],
  ["staffChanges", "Staff or leadership changes"],
  ["currentPriorities", "Current priorities"],
  ["workingWell", "What is working well?"],
  ["challenges", "Challenges"],
  ["supportNeeded", "Support requested from HNC"],
  ["trainingNeeds", "Training and education needs"],
  ["programUsage", "Current use of HNC programs or supports"],
  ["nonEngagementReasons", "If not engaging, what are the reasons?"],
  ["crossSectorSuggestions", "Cross-sector meeting suggestions"],
  ["communications", "Communications reach"],
  ["drttFeedback", "DRTT functionality feedback"],
  ["afterHoursPlan", "After-hours plan / advance care planning notes"],
  ["acosRollout", "MNC ACOS rollout notes"],
];

const state = {
  db: null,
  audioBlob: null,
  mediaRecorder: null,
  recordingStartedAt: null,
  recordingTimer: null,
  user: null,
};

const inputs = () => [...document.querySelectorAll("input[name], textarea[name]")];
const $ = (selector) => document.querySelector(selector);

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(VISIT_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbPut(record) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(VISIT_STORE, "readwrite");
    transaction.objectStore(VISIT_STORE).put(record);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function dbGet(id) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(VISIT_STORE, "readonly");
    const request = transaction.objectStore(VISIT_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function buildNoteFields() {
  const host = $("#notes-fields");
  const template = $("#note-field-template");

  for (const [name, label] of noteFields) {
    const field = template.content.firstElementChild.cloneNode(true);
    field.querySelector("span").textContent = label;
    const textarea = field.querySelector("textarea");
    textarea.name = name;
    host.appendChild(field);
  }
}

function getVisitData() {
  return inputs().reduce((data, input) => {
    data[input.name] = input.type === "checkbox" ? input.checked : input.value;
    return data;
  }, {});
}

function setVisitData(data = {}) {
  for (const input of inputs()) {
    if (!(input.name in data)) continue;
    if (input.type === "checkbox") {
      input.checked = Boolean(data[input.name]);
    } else {
      input.value = data[input.name] || "";
    }
  }
}

async function saveDraft(showToastMessage = false) {
  const record = {
    id: ACTIVE_VISIT_ID,
    updatedAt: new Date().toISOString(),
    visit: getVisitData(),
    audio: state.audioBlob || undefined,
  };

  await dbPut(record);
  updateProgress();
  updatePreview();
  updateNetworkStatus(`Saved ${formatShortTime(record.updatedAt)}`);
  if (showToastMessage) showToast("Draft saved on this device");
}

async function loadDraft() {
  const record = await dbGet(ACTIVE_VISIT_ID);
  if (!record) {
    document.querySelector("[name='visitDate']").valueAsDate = new Date();
    return;
  }

  setVisitData(record.visit);
  if (record.audio) {
    state.audioBlob = record.audio;
    setAudioPlayback(record.audio);
  }
  updateNetworkStatus(`Restored ${formatShortTime(record.updatedAt)}`);
}

async function clearDraft() {
  setVisitData({});
  document.querySelector("[name='visitDate']").valueAsDate = new Date();
  state.audioBlob = null;
  $("#audio-playback").removeAttribute("src");
  await saveDraft();
  showToast("Local draft cleared");
}

function updateNetworkStatus(base = "Draft available") {
  $("#network-status").textContent = `${base} · ${navigator.onLine ? "online" : "offline"}`;
}

function formatShortTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function updateProgress() {
  const setupNames = ["facilityName", "visitDate", "authorName", "primaryContact", "hubspotCompanyId"];
  const setupDone = setupNames.filter((name) => document.querySelector(`[name='${name}']`)?.value).length;
  const agendaItems = [...document.querySelectorAll("[data-progress-group='agenda']")];
  const notesItems = [...document.querySelectorAll("[data-progress-group='notes']")];
  const agendaDone = agendaItems.filter(isComplete).length;
  const notesDone = notesItems.filter(isComplete).length;

  $("#setup-count").textContent = `${setupDone}/${setupNames.length}`;
  $("#agenda-count").textContent = `${agendaDone}/${agendaItems.length}`;
  $("#notes-count").textContent = `${notesDone}/${notesItems.length}`;
  $("#voice-count").textContent = document.querySelector("[name='transcript']").value.trim() ? "1" : "0";
  $("#agenda-meter").style.width = `${Math.round((agendaDone / agendaItems.length) * 100)}%`;
  $("#publish-state").textContent = $("#publish-feedback").textContent ? "Sent" : "Draft";
}

function isComplete(input) {
  if (input.type === "checkbox") return input.checked;
  return input.value.trim().length > 0;
}

function switchPanel(name) {
  for (const panel of document.querySelectorAll("[data-panel]")) {
    panel.classList.toggle("is-active", panel.dataset.panel === name);
  }
  for (const button of document.querySelectorAll("[data-panel-target]")) {
    button.classList.toggle("is-active", button.dataset.panelTarget === name);
  }
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks = [];
  const mimeType = getSupportedMimeType();
  state.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  state.mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size) chunks.push(event.data);
  });
  state.mediaRecorder.addEventListener("stop", async () => {
    stream.getTracks().forEach((track) => track.stop());
    state.audioBlob = new Blob(chunks, { type: state.mediaRecorder.mimeType });
    setAudioPlayback(state.audioBlob);
    $("#transcribe-audio").disabled = false;
    await saveDraft(true);
  });

  state.mediaRecorder.start();
  state.recordingStartedAt = Date.now();
  state.recordingTimer = setInterval(updateRecordingClock, 500);
  $("#record-toggle").textContent = "Stop recording";
  $("#record-toggle").classList.add("is-recording");
}

function stopRecording() {
  if (!state.mediaRecorder || state.mediaRecorder.state === "inactive") return;
  state.mediaRecorder.stop();
  clearInterval(state.recordingTimer);
  updateRecordingClock(0);
  $("#record-toggle").textContent = "Start recording";
  $("#record-toggle").classList.remove("is-recording");
}

function updateRecordingClock() {
  const elapsed = Math.floor((Date.now() - state.recordingStartedAt) / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  $("#recording-clock").textContent = `${minutes}:${seconds}`;
}

function getSupportedMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function setAudioPlayback(blob) {
  $("#audio-playback").src = URL.createObjectURL(blob);
}

async function transcribeAudio() {
  if (!state.audioBlob) return;

  $("#transcribe-audio").disabled = true;
  $("#transcribe-audio").textContent = "Transcribing";

  try {
    const formData = new FormData();
    const extension = state.audioBlob.type.includes("mp4") ? "m4a" : "webm";
    formData.append("audio", state.audioBlob, `visit-recording.${extension}`);

    const response = await fetch("/api/transcribe", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Transcription failed");

    $("#transcript").value = result.text || "";
    await saveDraft(true);
    showToast("Transcript added");
  } catch (error) {
    showToast(error.message);
  } finally {
    $("#transcribe-audio").disabled = false;
    $("#transcribe-audio").textContent = "Transcribe";
    updateProgress();
  }
}

function appendTranscriptToNotes() {
  const transcript = $("#transcript").value.trim();
  const agendaNotes = document.querySelector("[name='agendaNotes']");
  if (!transcript) return showToast("No transcript to copy");
  agendaNotes.value = [agendaNotes.value.trim(), transcript].filter(Boolean).join("\n\n");
  saveDraft(true);
}

function buildHubSpotHtml() {
  const visit = getVisitData();
  const sections = [
    ["Agenda notes", visit.agendaNotes],
    ...noteFields.map(([name, label]) => [label, visit[name]]),
    ["Transcript", visit.transcript],
  ];

  const body = sections
    .filter(([, value]) => value?.trim())
    .map(([label, value]) => `<h4>${escapeHtml(label)}</h4><p>${escapeHtml(value).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return [
    `<h3>${escapeHtml(visit.facilityName || "RACH site visit")}</h3>`,
    `<p><strong>Date:</strong> ${escapeHtml(visit.visitDate || "")}</p>`,
    `<p><strong>Author:</strong> ${escapeHtml(visit.authorName || "")}</p>`,
    `<p><strong>Primary contact:</strong> ${escapeHtml(visit.primaryContact || "")}</p>`,
    body,
  ].join("");
}

function updatePreview() {
  $("#publish-preview").innerHTML = buildHubSpotHtml();
}

async function publishNote() {
  const visit = getVisitData();
  if (!visit.hubspotCompanyId) return showToast("Add the HubSpot company record ID");

  $("#publish-note").disabled = true;
  $("#publish-note").textContent = "Publishing";

  try {
    const response = await fetch("/api/publish-hubspot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: visit.hubspotCompanyId,
        facilityName: visit.facilityName,
        visitDate: visit.visitDate,
        authorName: visit.authorName,
        html: buildHubSpotHtml(),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Publish failed");

    $("#publish-feedback").textContent = `Published HubSpot note ${result.noteId}`;
    updateProgress();
    showToast("HubSpot note published");
  } catch (error) {
    showToast(error.message);
  } finally {
    $("#publish-note").disabled = false;
    $("#publish-note").textContent = "Publish note";
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), visit: getVisitData() }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rach-visit-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function checkAuth() {
  try {
    const response = await fetch("/.auth/me");
    if (!response.ok) throw new Error("No auth endpoint");
    const payload = await response.json();
    const principal = payload.clientPrincipal;
    state.user = principal;
    $("#auth-status").textContent = principal?.userDetails ? principal.userDetails : "Signed out";
  } catch {
    $("#auth-status").textContent = "Local mode";
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  const toast = $("#toast-template").content.firstElementChild.cloneNode(true);
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

async function init() {
  buildNoteFields();
  state.db = await openDb();
  await loadDraft();
  await checkAuth();
  updateProgress();
  updatePreview();
  updateNetworkStatus();

  for (const input of inputs()) {
    input.addEventListener("input", () => saveDraft());
    input.addEventListener("change", () => saveDraft());
  }

  document.querySelectorAll("[data-panel-target]").forEach((button) => {
    button.addEventListener("click", () => switchPanel(button.dataset.panelTarget));
  });

  $("#new-visit").addEventListener("click", clearDraft);
  $("#clear-draft").addEventListener("click", clearDraft);
  $("#export-json").addEventListener("click", exportJson);
  $("#preview-note").addEventListener("click", updatePreview);
  $("#publish-note").addEventListener("click", publishNote);
  $("#copy-transcript").addEventListener("click", appendTranscriptToNotes);
  $("#record-toggle").addEventListener("click", () => {
    if (state.mediaRecorder?.state === "recording") stopRecording();
    else startRecording().catch((error) => showToast(error.message));
  });
  $("#transcribe-audio").addEventListener("click", transcribeAudio);

  window.addEventListener("online", () => updateNetworkStatus());
  window.addEventListener("offline", () => updateNetworkStatus());

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  }
}

init().catch((error) => showToast(error.message));
