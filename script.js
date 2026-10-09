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
  for (const meaning of entry.meanings || []) {
    for (const definition of meaning.definitions || []) {
      if (definition.example) return definition.example;
    }
  }
  return "No example sentence was provided for this entry.";
}

function firstAvailableDefinition(entry) {
  for (const meaning of entry.meanings || []) {
    const definition = meaning.definitions?.find(item => item.definition);
    if (definition) return { partOfSpeech: meaning.partOfSpeech || "Meaning", definition: definition.definition };
  }
  return { partOfSpeech: "Meaning", definition: "No definition was provided for this entry." };
}

function findAudio(entry) {
  for (const phonetic of entry.phonetics || []) {
    if (phonetic.audio) return phonetic.audio;
  }
  return "";
}

function renderEntry(entry) {
  const meaning = firstAvailableDefinition(entry);
  const phonetic = entry.phonetics?.find(item => item.text)?.text || entry.phonetic || "Pronunciation not available";
  currentAudioUrl = findAudio(entry);

  wordEl.textContent = entry.word || "Unknown word";
  phoneticEl.textContent = phonetic;
  partOfSpeechEl.textContent = meaning.partOfSpeech;
  definitionEl.textContent = meaning.definition;
  exampleEl.textContent = firstAvailableExample(entry);
  sourceEl.textContent = "Free Dictionary API · dictionaryapi.dev";
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
    const response = await fetch(`${API_URL}${encodeURIComponent(query)}`);
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("The dictionary service returned an unreadable response. Please try again.");
    }

    if (!response.ok) {
      const apiMessage = data?.message || "No dictionary entry was found for that word.";
      throw new Error(apiMessage);
    }

    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry) throw new Error("No dictionary entry was found for that word.");

    renderEntry(entry);
    setStatus(`Showing the available result for “${entry.word || query}”.`, "success");
  } catch (error) {
    resultSection.hidden = true;
    showError(error.message || "Something went wrong while searching. Please try again.");
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
