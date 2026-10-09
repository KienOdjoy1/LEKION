const API_URL = "https://freedictionaryapi.com/api/v1/entries/en/";

const form = document.getElementById("dictionaryForm");
const wordInput = document.getElementById("wordInput");
const searchButton = document.getElementById("searchButton");
const statusMessage = document.getElementById("statusMessage");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const resultSection = document.getElementById("dictionaryResult");
const wordEl = document.getElementById("word");
const phoneticEl = document.getElementById("phonetic");
const partOfSpeechEl = document.getElementById("partOfSpeech");
const definitionEl = document.getElementById("definition");
const exampleEl = document.getElementById("example");
const sourceEl = document.getElementById("source");
const audioButton = document.getElementById("audioButton");

let currentAudioUrl = "";

function setStatus(message, state = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${state}`.trim();
}

function showError(message) {
  errorText.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.hidden = true;
  errorText.textContent = "";
}


function firstAvailableExample(entry) {
  for (const sense of entry.senses || []) {
    if (sense.examples?.length) {
      const example = sense.examples[0];
      return typeof example === "string"
        ? example
        : example.text || "No example sentence was provided.";
    }
  }

  return "No example sentence was provided for this entry.";
}

function firstAvailableDefinition(entry) {
  for (const sense of entry.senses || []) {
    if (sense.definition) {
      return {
        partOfSpeech: entry.partOfSpeech || "Meaning",
        definition: sense.definition
      };
    }
  }

  return {
    partOfSpeech: entry.partOfSpeech || "Meaning",
    definition: "No definition was provided for this entry."
  };
}

function findAudio(entry) {
  for (const phonetic of entry.phonetics || []) {
    if (phonetic.audio) return phonetic.audio;
  }
  return "";
}


function renderEntry(entry) {
  const meaning = firstAvailableDefinition(entry);

  const phonetic =
    entry.pronunciation ||
    entry.phonetic ||
    "Pronunciation not available";

  currentAudioUrl = entry.audio || "";

  wordEl.textContent = entry.word || "Unknown word";
  phoneticEl.textContent = phonetic;
  partOfSpeechEl.textContent = meaning.partOfSpeech;
  definitionEl.textContent = meaning.definition;
  exampleEl.textContent = firstAvailableExample(entry);

  sourceEl.textContent = "FreeDictionaryAPI · Wiktionary";

  audioButton.hidden = !currentAudioUrl;
  resultSection.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = wordInput.value.trim().toLowerCase();

  clearError();
  if (!query) {
    showError("Please enter a word before searching.");
    setStatus("A word is needed to start your search.", "error");
    wordInput.focus();
    return;
  }

  if (!/^[a-z]+(?:[-'][a-z]+)*$/i.test(query)) {
    showError("Please enter a single English word using letters. Hyphens and apostrophes are okay.");
    setStatus("Please check the word you entered.", "error");
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "Searching…";
  setStatus(`Looking up “${query}”…`, "loading");

  try {
    // Use a timeout and avoid reusing a potentially stale cached response.
    const response = await fetch(`${API_URL}${encodeURIComponent(query)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        `The dictionary service returned an unreadable response (HTTP ${response.status}).`
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(data?.message || "No dictionary entry was found. Check the spelling and try again.");
      }
      throw new Error(
        data?.message || `The dictionary service returned HTTP ${response.status}. Please try again later.`
      );
    }

    const entries = Array.isArray(data.entries)
    ? data.entries
    : [];

    const entry = entries.find(item => item.senses?.some(
    sense => typeof sense.definition === "string" && sense.definition
    ));

if (!entry) {
  throw new Error(
    "No usable definition was returned for this word."
  );
}

    renderEntry(entry);
    setStatus(`Showing the available result for “${entry.word || query}”.`, "success");
  } catch (error) {
    resultSection.hidden = true;
    let message = error.message || "Something went wrong while searching. Please try again.";

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      message = "The dictionary request took too long. Check your connection and try again.";
    } else if (error instanceof TypeError) {
      message = "Could not connect to the dictionary API. Check your internet connection or whether your website host blocks external API requests.";
    }

    showError(message);
    setStatus("The search could not be completed.", "error");
  } finally {
    searchButton.disabled = false;
    searchButton.innerHTML = 'Search <span aria-hidden="true">↗</span>';
  }
});

audioButton.addEventListener("click", () => {
  if (!currentAudioUrl) return;
  const audio = new Audio(currentAudioUrl);
  audio.play().catch(() => setStatus("Audio could not be played. Try another pronunciation source.", "error"));
});
