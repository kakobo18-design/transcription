// transcription.js
let conversationLog = [];
let data_file_blob = null;

window.getCurrentDateTime = getCurrentDateTime;

const languageIds = ["en", "yue", "zh", "es", "ja", "ko"];

// Store sentences per language
const sentenceBuffers = {
  en: [],
  yue: [],
  zh: [],
  es: [],
  ja: [],
  ko: [],

};

// ---------- DOM Helpers ----------

function setText(id, text, append = false) {
  const el = document.getElementById(id);
  if (!el) return;

  if (!append) {
    el.textContent = text;
  } else {
    el.textContent = el.textContent + "\n" + text;
  }
}

function appendAnimatedLine(id, text) {
  const el = document.getElementById(id);
  if (!el || !text) return;

  const line = document.createElement("div");
  line.className = "transcript-line";
  line.textContent = text;

  el.appendChild(line);
  el.scrollTop = el.scrollHeight; // auto-scroll to the latest line
}

// ---------- Server Helpers ----------

async function saveLogToServer(logData) {
  try {
    
    const { day, time } = getCurrentDateTime();
    // Contruct payload
    payload = {log_data: logData,
                day: sessionStorage.getItem("day"),
                start_time: sessionStorage.getItem("start_time"),
                end_time: time,
    }
    
    const res = await fetch("/save-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log("[CLIENT] Log saved on server:", data);
    return data.file;
  } catch (err) {
    console.error("[CLIENT] Failed to save log on server:", err);
  }
}

async function downloadLogFile() {
  try {
    console.log("Downloading from blob URL:", data_file_blob);
    const link = document.createElement("a");
    link.href = data_file_blob;
    link.download = "session_log.json";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(data_file_blob);
  } catch (err) {
    console.error("Download button failed:", err);
    alert("Could not download the session log. Check console.");
  }
}

// ---------- Speech Event Handlers ----------

function handleRecognizing(e) {
  console.log("[CLIENT] Partial:", e.result.text, e.result.translations);

  // Interim text: keep accumulated transcript and append current partial line
  renderAccumulatedText("en", e.result.text || "");

  const partialLangs = ["yue", "zh-Hans", "ja", "ko", "es"];
  partialLangs.forEach(lang => {
    const id = lang === "zh-Hans" ? "zh" : lang;
    renderAccumulatedText(id, e.result.translations.get(lang) || "");
  });
}

function handleRecognized(e) {
  if (e.result.reason !== SpeechSDK.ResultReason.TranslatedSpeech) return;

  const en = e.result.text || "";
  const translations = {
    yue: e.result.translations.get("yue") || "",
    "zh-Hans": e.result.translations.get("zh-Hans") || "",
    es: e.result.translations.get("es") || "",
    ja: e.result.translations.get("ja") || "",
    ko: e.result.translations.get("ko") || "",
      };

  console.log("[CLIENT] Final:", en, translations);

  // --- 1) Update English sentences ---
  const newEnSentences = splitIntoSentences(en);
  sentenceBuffers.en.push(...newEnSentences);

  // --- 2) Update sentences for each translation ---
  Object.entries(translations).forEach(([lang, text]) => {
    if (!text) return;
    const id = lang === "zh-Hans" ? "zh" : lang;
    const newSentences = splitIntoSentences(text);
    sentenceBuffers[id].push(...newSentences);
  });

  // --- 3) Render the full accumulated transcript for each language ---
  languageIds.forEach(id => renderAccumulatedText(id));

  // --- 4) Logging for download ---
  conversationLog.push({
    timestamp: new Date().toISOString(),
    text: en,
    translations
  });
}

function handleCanceled(e) {
  console.error("[CLIENT] Canceled:", e);
}

// ---------- Start / Stop Buttons ----------

async function startTranscription() {
  console.log("[CLIENT] Start button clicked.");
  conversationLog = [];
  data_file_blob = null;
  const recognitionLanguageSelect = document.getElementById("recognitionLanguage");
  const selectedRecognitionLanguage = recognitionLanguageSelect?.value || "en-US";

  Object.keys(sentenceBuffers).forEach(key => {
    sentenceBuffers[key] = [];
  });

  document.getElementById("downloadBtn").style.display = "none";

  // Clear previous text (optional)
  languageIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });

  await window.SpeechService.startRecognition({
    recognitionLanguage: selectedRecognitionLanguage,
    targetLanguages: ["yue", "zh-Hans", "es", "ja", "ko" ],
    onRecognizing: handleRecognizing,
    onRecognized: handleRecognized,
    onCanceled: handleCanceled
  });

  document.getElementById("startBtn").disabled = true;
  document.getElementById("stopBtn").disabled = false;
  if (recognitionLanguageSelect) {
    recognitionLanguageSelect.disabled = true;
  }
}

async function stopTranscription() {
  console.log("[CLIENT] Stop button clicked.");
  await window.SpeechService.stopRecognition();

  if (conversationLog.length > 0) {
    data_file_blob = await saveLogToServer(conversationLog);
    if (data_file_blob) {
      document.getElementById("downloadBtn").style.display = "inline-block";
    }
  }

  document.getElementById("startBtn").disabled = false;
  document.getElementById("stopBtn").disabled = true;
  const recognitionLanguageSelect = document.getElementById("recognitionLanguage");
  if (recognitionLanguageSelect) {
    recognitionLanguageSelect.disabled = false;
  }
}

// -- Helper Functions
function splitIntoSentences(text) {
  // Split on . ? ! and keep the delimiter
  const parts = text.split(/([.?!])/);
  const sentences = [];

  for (let i = 0; i < parts.length; i += 2) {
    const chunk = (parts[i] || "").trim();
    const punctuation = parts[i + 1] || "";
    if (chunk) {
      sentences.push((chunk + punctuation).trim());
    }
  }

  return sentences;
}

function renderAccumulatedText(langId, partialText = "") {
  const el = document.getElementById(langId);
  if (!el) return;

  const buffer = sentenceBuffers[langId] || [];
  const parts = [];

  if (buffer.length) {
    parts.push(buffer.join(" "));
  }

  const trimmedPartial = partialText.trim();
  if (trimmedPartial) {
    parts.push(trimmedPartial);
  }

  el.textContent = parts.join("\n");
}

function getCurrentDateTime() {
  const now = new Date();

  // Day in DD-MMM-YYYY
  const day = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",  // Jan, Feb, ...
    year: "numeric"
  }).replace(/ /g, "-"); // "07 Jan 2026" -> "07-Jan-2026"

  // Time in HH:MM:SS (24-hour)
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return { day, time };
}

// ---------- Wire up DOM events ----------

document.getElementById("startBtn").addEventListener("click", startTranscription);
document.getElementById("stopBtn").addEventListener("click", stopTranscription);
document.getElementById("downloadBtn").addEventListener("click", downloadLogFile);

