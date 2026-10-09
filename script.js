const API_URL = "https://freedictionaryapi.com/api/v1/entries/en/";
const API_HOME = "https://freedictionaryapi.com/";

const form = document.getElementById("dictionaryForm");
const wordInput = document.getElementById("wordInput");
const searchButton = document.getElementById("searchButton");
const statusMessage = document.getElementById("statusMessage");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const resultSection = document.getElementById("dictionaryResult");
const wordEl = document.getElementById("word");
const phoneticEl = document.getElementById("phonetic");
const allEntriesEl = document.getElementById("allEntries");
const sourceEl = document.getElementById("source");
const audioButton = document.getElementById("audioButton");
let currentAudioUrl = "";

function setStatus(message, state = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${state}`.trim();
}
function showError(message) { errorText.textContent = message; errorMessage.hidden = false; }
function clearError() { errorMessage.hidden = true; errorText.textContent = ""; }

function allSenses(entry) {
  return (entry.senses || []).concat((entry.senses || []).flatMap(s => s.subsenses || []));
}
function addTextElement(parent, tagName, text, className = "") {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  parent.appendChild(element);
  return element;
}
function renderEntry(data, query) {
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const usableEntries = entries.filter(e => allSenses(e).some(s => typeof s.definition === "string" && s.definition.trim()));
  if (!data.word || !usableEntries.length) throw new Error("The API responded, but no definitions were found for this word.");

  const firstPronunciationEntry = usableEntries.find(e => (e.pronunciations || []).some(p => p.text || p.audio)) || usableEntries[0];
  const pronunciation = (firstPronunciationEntry.pronunciations || []).find(p => p.text)?.text || "Pronunciation not available";
  currentAudioUrl = (firstPronunciationEntry.pronunciations || []).find(p => p.audio)?.audio || "";
  wordEl.textContent = data.word || query;
  phoneticEl.textContent = pronunciation;

  allEntriesEl.replaceChildren();
  usableEntries.forEach((entry, entryIndex) => {
    const group = document.createElement("section");
    group.className = "dictionary-entry";
    addTextElement(group, "h4", entry.partOfSpeech || "meaning", "entry-part-of-speech");
    const senses = allSenses(entry).filter(s => typeof s.definition === "string" && s.definition.trim());
    const list = document.createElement("ol");
    list.className = "definition-list";
    senses.forEach(sense => {
      const item = document.createElement("li");
      addTextElement(item, "p", sense.definition, "definition-text");
      if (Array.isArray(sense.examples)) {
        sense.examples.forEach(example => {
          const text = typeof example === "string" ? example : example?.text;
          if (text) addTextElement(item, "p", `“${text}”`, "definition-example");
        });
      }
      list.appendChild(item);
    });
    group.appendChild(list);
    if (entryIndex > 0) group.classList.add("entry-separated");
    allEntriesEl.appendChild(group);
  });

  sourceEl.textContent = "Wiktionary (CC BY-SA 4.0)";
  sourceEl.href = data.source?.url || `https://en.wiktionary.org/wiki/${encodeURIComponent(data.word || query)}`;
  audioButton.hidden = !currentAudioUrl;
  resultSection.hidden = false;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const query = wordInput.value.trim().toLowerCase();
  clearError();
  if (!query) { showError("Please enter a word before searching."); setStatus("A word is needed to start your search.", "error"); wordInput.focus(); return; }
  if (!/^[a-z]+(?:[-'][a-z]+)*$/i.test(query)) { showError("Please enter a single English word using letters. Hyphens and apostrophes are okay."); setStatus("Please check the word you entered.", "error"); return; }
  searchButton.disabled = true;
  searchButton.textContent = "Searching…";
  setStatus(`Looking up “${query}”…`, "loading");
  try {
    const response = await fetch(`${API_URL}${encodeURIComponent(query)}`, {
      method: "GET", headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(20000)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 404) throw new Error("No dictionary entry was found. Check the spelling and try again.");
      throw new Error(`Dictionary service error (HTTP ${response.status}). Please try again later.`);
    }
    if (!data || typeof data !== "object" || !Array.isArray(data.entries)) {
      throw new Error("The dictionary service returned data in an unexpected format.");
    }
    renderEntry(data, query);
    setStatus(`Showing the available result for “${data.word || query}”.`, "success");
  } catch (error) {
    resultSection.hidden = true;
    let message = error.message || "Something went wrong while searching. Please try again.";
    if (error.name === "TimeoutError" || error.name === "AbortError") message = "The dictionary request timed out. Check your internet connection and try again.";
    else if (error instanceof TypeError) message = "Could not connect to FreeDictionaryAPI. Check your internet connection or browser network settings.";
    showError(message);
    setStatus("The search could not be completed.", "error");
  } finally {
    searchButton.disabled = false;
    searchButton.innerHTML = 'Search <span aria-hidden="true">↗</span>';
  }
});

audioButton.addEventListener("click", () => {
  if (!currentAudioUrl) return;
  new Audio(currentAudioUrl).play().catch(() => setStatus("Audio could not be played.", "error"));
});