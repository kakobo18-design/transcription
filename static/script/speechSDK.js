// speechSDK.js
(() => {
  let recognizer = null;
  let translationConfig = null;
  let tokenRefreshHandle = null;

  async function fetchToken() {
    const res = await fetch("/api/speech-token");
    if (!res.ok) throw new Error("Failed to fetch token");
    return await res.json(); // { token, region }
  }

  async function refreshToken() {
    console.log("[SpeechService] Refreshing token...");
    try {
      const { token: newToken } = await fetchToken();
      if (translationConfig) {
        translationConfig.authorizationToken = newToken;
      }
      console.log("[SpeechService] Token renewed.");
    } catch (err) {
      console.error("[SpeechService] Token refresh failed:", err);
    }
  }

  /**
   * Initialize and start recognition.
   * @param {Object} options
   * @param {string} options.recognitionLanguage - e.g. "en-US"
   * @param {string[]} options.targetLanguages - e.g. ["yue","zh-Hans","es"]
   * @param {function} options.onRecognizing - callback(partialResult)
   * @param {function} options.onRecognized - callback(finalResult)
   * @param {function} options.onCanceled - callback(errorEvent)
   */
  async function startRecognition({
    recognitionLanguage = "en-US",
    targetLanguages = [],
    onRecognizing,
    onRecognized,
    onCanceled
  }) {
    if (recognizer) {
      console.warn("[SpeechService] Recognizer already running.");
      return;
    }

    console.log("[SpeechService] Starting recognition...");
    const { day, time } = getCurrentDateTime();
    sessionStorage.setItem("start_time", time )
    sessionStorage.setItem("day", day)

    const { token, region } = await fetchToken();

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    translationConfig = SpeechSDK.SpeechTranslationConfig.fromAuthorizationToken(
      token,
      region
    );

    targetLanguages.forEach(lang => translationConfig.addTargetLanguage(lang));
    translationConfig.speechRecognitionLanguage = recognitionLanguage;
    recognizer = new SpeechSDK.TranslationRecognizer(translationConfig, audioConfig);

    // Wire up callbacks if provided
    if (onRecognizing) {
      recognizer.recognizing = (s, e) => onRecognizing(e);
    }
    if (onRecognized) {
      recognizer.recognized = (s, e) => onRecognized(e);
    }
    if (onCanceled) {
      recognizer.canceled = (s, e) => onCanceled(e);
    }

    recognizer.startContinuousRecognitionAsync();

    // Start token refresh
    tokenRefreshHandle = setInterval(refreshToken, 9 * 60 * 1000);
  }

  async function stopRecognition() {
    if (!recognizer) return;

    return new Promise(resolve => {
      recognizer.stopContinuousRecognitionAsync(() => {
        console.log("[SpeechService] Stopped recognition.");
        recognizer.close();
        recognizer = null;
        clearInterval(tokenRefreshHandle);
        tokenRefreshHandle = null;
        translationConfig = null;
        resolve();
      });
    });
  }

  // Expose a minimal API to the global scope
  window.SpeechService = {
    startRecognition,
    stopRecognition
  };
})();