const SUPABASE_URL = "https://vauvzpetrqbqfiuadvin.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdXZ6cGV0cnFicWZpdWFkdmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjU5NDEsImV4cCI6MjA2NDkwMTk0MX0.zqUgG0Q3_BF_4VRonBSfQCc5w8uEMG40noi0KxGMGn4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const introText = document.getElementById("intro_text");
const searchForm = document.getElementById("search_form");
const searchBox = document.getElementById("search_box");
const submitBtn = document.getElementById("submit_btn");
const clearBtn = document.getElementById("clear_btn");
const results = document.getElementById("results");

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await handleSearch();
});

submitBtn.addEventListener("click", async (e) => {
  if (e instanceof MouseEvent) await handleSearch();
});

clearBtn.addEventListener("click", () => {
  clearSearch();
});

/**
 *
 */
function clearSearch() {
  searchBox.value = "";
  results.innerHTML = "";
  introText.style.display = "block";
  searchBox.focus();
}

/**
 *
 * @param {*} query
 */
async function handleSuggestedSearch(query) {
  searchBox.value = query;
  await handleSearch();
}

/**
 *
 * @returns
 */
async function handleSearch(e) {
  const query = searchBox.value.trim();
  results.innerHTML = "";
  if (!query) return;

  introText.style.display = "none";

  const { data: matches, error } = await supabaseClient
    .from("word_search_view")
    .select("*")
    .or(`chopi.ilike.%${query}%,translation.ilike.%${query}%,definition.ilike.%${query}%`);

  if (error || !matches) return showError(query, error);
  const { langMatches, altMatches, hasExactMatch } = validateMatches(matches, query);
  if (!hasExactMatch && !e) return await handleNoExactMatch(query);
  const lang = document.documentElement.lang;
  const displayData = langMatches.length ? langMatches : altMatches;
  const sfx = displayData.length > 1 ? "s" : "";

  // tchinene
  const groupedEntries = {};
  displayData.forEach((entry) => {
    const key = `${entry.chopi}:${entry.part_of_speech}:${entry.translation}`; // UID

    if (!groupedEntries[key]) {
      groupedEntries[key] = { ...entry, sentence: [], trans_sentence: [] };
    }

    // if UID
    if (!groupedEntries[key].sentence.includes(entry.sentence)) {
      groupedEntries[key].sentence.push(entry.sentence);
      groupedEntries[key].trans_sentence.push(entry.trans_sentence);
    }
  });

  const finalEntries = Object.values(groupedEntries);
  console.log({ finalEntries });
  results.innerHTML = `
    <p class="text-muted">${
      lang === "pt"
        ? `Resultado${sfx} — ${finalEntries.length} encontrado${sfx}`
        : `Word${sfx} — ${finalEntries.length} found`
    }:</p>
    ${finalEntries.map(renderCard).join("")}
  `;
}

/**
 *
 * @param {*} query
 * @param {*} error
 */
function showError(query, error) {
  const isPt = document.documentElement.lang === "pt";
  const title = isPt ? "Erro de pesquisa" : "Search error";
  const subtitle = isPt ? "Resultado não encontrado." : "Result not found.";
  const msg = isPt
    ? `Lamentamos, não foi possível encontrar nenhuma correspondência para "${query}".`
    : `Sorry, no match for "${query}" could be found.`;

  // <pre class="text-light p-2">${error?.message || error}</pre>
  results.innerHTML = `
    <div class="card border-danger border-light mb-3">
      <div class="card-header">${title}</div>
      <div class="card-body text-danger ">
        <h5 class="card-title">${subtitle}</h5>
        <p>${msg}</p>
      </div>
    </div>`;
}

/**
 *
 * @param {*} array
 * @param {*} predicate
 * @returns
 */
function partition(array, predicate) {
  return array.reduce(
    ([pass, fail], item) => {
      return predicate(item) ? [[...pass, item], fail] : [pass, [...fail, item]];
    },
    [[], []]
  );
}

/**
 *
 * @param {*} matches
 * @param {*} query
 * @returns
 */
function validateMatches(matches, query) {
  const lang = document.documentElement.lang;
  query = query.toLowerCase();
  let [langMatches, altMatches] = partition(matches, (e) => e.lang_code === lang);
  langMatches = langMatches.filter((e) => {
    return e.chopi?.toLowerCase() === query || e.translation?.toLowerCase() === query;
  });
  let hasExactMatch = langMatches.length > 0;
  if (!hasExactMatch) {
    altMatches = altMatches.filter((e) => {
      return e.chopi?.toLowerCase() === query || e.translation?.toLowerCase() === query;
    });
    hasExactMatch = altMatches.length > 0;
  }
  return { langMatches, altMatches, hasExactMatch };
}

/**
 *
 * @param {*} inputWord
 * @returns
 */
async function handleNoExactMatch(inputWord) {
  const { data, error } = await supabaseClient.rpc("suggest_similar_words", { input_word: inputWord });

  const isPt = document.documentElement.lang === "pt";
  const title = isPt ? "Palavra não encontrada." : "Word not found.";
  const h = isPt
    ? `<p>Não foi encontrada nenhuma correspondência exata para "<strong>${inputWord}</strong>".</p>`
    : `<p>No exact match found for "<strong>${inputWord}</strong>".</p>`;

  let card = `
  <div class="card border-warning mb-3">
  <div class="card-header">${title}</div>
  <div class="card-body text-warning">
    <h5 class="card-title">${h}</h5>`;

  if (error || !data || data.length === 0) {
    card += isPt
      ? "<p>Nenhuma sugestão semelhante encontrada.</p>"
      : "<p>No similar suggestions found.</p></div></div>";
    results.innerHTML = card;
    return;
  }
  card += isPt ? "<p>Você quis dizer:</p>" : "<p>Did you mean:</p><ul>";
  data.forEach(({ word }) => (card += `<li><a class="suggestion-link" href="#">${word}</a></li>`));
  card += "</ul>";
  results.innerHTML = card;
  results.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestion-link")) {
      e.preventDefault();
      searchBox.value = e.target.textContent;
      handleSearch(e);
    }
  });
}

/**
 *
 * @param {*} entry
 * @returns
 */
function renderCard(entry) {
  const isPt = document.documentElement.lang === "pt";
  const lang =
    entry.lang_code === "pt"
      ? '<span class="flag-icon flag-icon-pt" style="font-size: 0.6rem"></span>'
      : '<span class="flag-icon flag-icon-gb" style="font-size: 0.6rem"></span>';
  const sufx = entry.sentence ? "s" : "";
  console.log({ entry });
  let sentence = "";
  if ((entry.sentence.length === 1 && entry.sentence[0]) || entry.sentence.length > 1) {
    sentence = `<div class="mt-3">
        <strong>${isPt ? "Exemplo" : "Example"}${sufx}:</strong>
        <ul class="mb-0">
          ${entry.sentence
            .map((sentence, i) =>
              sentence ? `<li><em>${sentence}</em> — <small>${entry.trans_sentence[i]}</small></li>` : ""
            )
            .join("")}
        </ul>
      </div>`;
  }

  return `
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="d-flex align-items-baseline">
              <h1 class="h1 mb-1 text-primary">${entry.chopi}</h1>
              <p class="ms-2 mb-0 text-muted" style="font-size: 1.2rem"><em>${entry.part_of_speech}</em></p>
            </div>
            <small class="text-muted">${lang}</small> ${entry.translation}<br />
            <small class="text-muted">${isPt ? "Pronúncia" : "Pronunciation"}:
              <span class="text-success">${entry.pronunciation || ""}</span>
            </small>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary" title="Listen" onclick="playAudio(${entry.audio || ""})">
              <i class="bi bi-volume-up-fill"></i>
            </button>
            <button class="btn btn-sm btn-secondary" data-bs-toggle="modal" data-bs-target="#modal-${entry.word_id}">
              <i class="bi bi-shuffle"></i>
            </button>
            <button class="btn btn-sm btn-info" title="Gravar palavra">
              <i class="bi bi-bookmark"></i>
            </button>
          </div>
        </div>
        <hr />
        ${entry.definition ? `<strong>${isPt ? "Definições:" : "Definitions:"}</strong>${entry.definition}` : ""}     
        ${sentence}
      </div>
    </div>
    <div class="modal fade" id="modal-${entry.word_id}" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${isPt ? "Inflexões de" : "Inflections of"} ${entry.chopi}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p><em>${
              isPt
                ? "Por atualizar. Formas derivadas, tempos verbais, etc. serão aqui incluídos."
                : "To be updated. Derived forms, verb tenses, etc. will be included here."
            }</em></p>
          </div>
        </div>
      </div>
    </div>`;
}
