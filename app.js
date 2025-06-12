const SUPABASE_URL = "https://vauvzpetrqbqfiuadvin.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdXZ6cGV0cnFicWZpdWFkdmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjU5NDEsImV4cCI6MjA2NDkwMTk0MX0.zqUgG0Q3_BF_4VRonBSfQCc5w8uEMG40noi0KxGMGn4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const langSelect = document.getElementById("lang_select");
const introText = document.getElementById("intro_text");
const searchForm = document.getElementById("search_form");
const searchBox = document.getElementById("search_box");
const submitBtn = document.getElementById("submit_btn");
const clearBtn = document.getElementById("clear_btn");
const results = document.getElementById("results");

const savedLang = localStorage.getItem("selectedLang");
langSelect.addEventListener("change", () => {
  const lang = langSelect.value;
  localStorage.setItem("selectedLang", lang);
  document.querySelectorAll("[data-lang]").forEach((el) => {
    el.style.display = el.getAttribute("data-lang") === lang ? "block" : "none";
  });
  searchBox.placeholder =
    lang === "en"
      ? "Search for word in Chope, Portuguese, or English..."
      : "Buscar palavra em Chope, Portugues, ou Ingles...";
  document.title = lang === "en" ? "Mapsi — Cicopi Dictionary" : "Mapsi — Dicionário de Cicopi";
  document.documentElement.lang = lang;
});

if (savedLang) {
  langSelect.value = savedLang;
  langSelect.dispatchEvent(new Event("change"));
}

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

function clearSearch() {
  searchBox.value = "";
  results.innerHTML = "";
  introText.style.display = "block";
  searchBox.focus();
}

async function handleNoExactMatch(inputWord) {
  const { data, error } = await supabase.rpc("suggest_similar_words", { input_word: inputWord });

  const isPt = document.documentElement.lang === "pt";
  const title = isPt ? "Palavra não encontrada." : "Word not found.";
  const h = isPt
    ? `<p>Não foi encontrada nenhuma correspondência exata para "<strong>${inputWord}</strong>".</p>`
    : `<p>No exact match found for "<strong>${inputWord}</strong>".</p>`;
  let card = `
  <div class="card bg-warning mb-3">
    <div class="card-header">${title}</div>
    <div class="card-body">
      <h5 class="card-title">${h}</h5>`;

  if (error || !data || data.length === 0) {
    const b = isPt
      ? "<p>Nenhuma sugestão semelhante encontrada.<br/>Você quis dizer:</p>"
      : "<p>No similar suggestions found.<br/>Did you mean:</p>";
    card += `<p>${b}</p></div></div>`;
    results.innerHTML = card;
    return;
  }

  card += "<ul>";
  data.forEach(({ word }) => (card += `<li><a class="suggestion-link" href="#">${word}</a></li>`));
  card += "</ul>";
  results.innerHTML = card;
  results.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestion-link")) {
      e.preventDefault();
      searchBox.value = e.target.textContent;
      handleSearch();
    }
  });
}

async function handleSearch() {
  query = searchBox.value.trim();
  results.innerHTML = "";
  if (!query) return;

  introText.style.display = "none";
  const { data: matches, error } = await supabaseClient
    .from("word_search_view")
    .select("*")
    .or(`chopi.ilike.%${query}%,translation.ilike.%${query}%`);

  if (matches.length === 0) {
    await handleNoExactMatch(query);
    return;
  }

  const isPt = document.documentElement.lang === "pt";
  if (error) {
    const h1 = isPt ? "Erro de pesquisa" : "Search error";
    const h2 = isPt ? "Resultado não encontrado." : "Result not found.";
    const t = isPt
      ? `Lamentamos, não foi possível encontrar nenhuma correspondência para "${query}". Ocorreu um erro inesperado.`
      : `Sorry, no match for "${query}" could be found. An unexpected error has occurred.`;
    results.innerHTML = `
      <div class="card bg-danger mb-3">
        <div class="card-header">${h1}</div>
        <div class="card-body">
          <h5 class="card-title">${h2}</h5>
          <p>${t}</p>
        </div>
      </div>`;
    return;
  }

  const word_matches = matches.filter((entry) => entry.lang_code === document.documentElement.lang);
  if (word_matches.length === 0) {
    const h1 = isPt ? "Nenhum resultado encontrado." : "No results found.";
    results.innerHTML = `<div class="alert alert-warning">${h1}</div>`;
    return;
  }

  const sufx = word_matches.length > 1 ? "s" : "";
  console.log({ sufx, word_matches });
  const res = isPt
    ? `Resultado${sufx} — ${word_matches.length} encontrado${sufx}:`
    : `Word${sufx} — ${word_matches.length} found.`;
  const lang = isPt ? "🇵🇹" : "🇬🇧";
  results.innerHTML = `
      <p class="text-muted">${res}</p>
      ${word_matches
        .map((entry, i) => {
          return `<div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="d-flex align-items-baseline">
                  <h1 class="h1 mb-1 text-primary">${entry.chopi}</h1>
                  <p class="ms-2 mb-0 text-muted" style="font-size: 1.2rem"><em>${entry.part_of_speech}</em></p>
                </div>
                <small class="text-muted">${lang}</small> ${entry.translation}<br />
                <small class="text-muted">${isPt ? "Pronúncia" : "Pronunciation"}: <span class="text-success">${
            entry.pronunciation
          }</span></small>
              </div>
              <div class="btn-group">
                <button class="btn btn-sm btn-primary" title="Listen" onclick="playAudio(${entry.audio || ""})">
                  <i class="bi bi-volume-up-fill"></i>
                </button>
                <button
                  class="btn btn-sm btn-secondary"
                  data-bs-toggle="modal"
                  data-bs-target="#modal-${entry.word_id}"
                  title="${isPt ? "Inflexões" : "Inflections"}">
                  <i class="bi bi-shuffle"></i>
                </button>
                <button class="btn btn-sm btn-info" title="Gravar palavra">
                  <i class="bi bi-bookmark"></i>
                </button>
              </div>
            </div>
            <hr />

            <p><strong>${entry.definition ? (isPt ? "Definições:" : "Definitions:") : ""}</strong></p>
              <div class="mt-3">
                <strong>${isPt ? "Exemplo" : "Example"}${sufx}:</strong>
                <ul>
                  <li><em>${entry.sentence}</em><br/>
                  <small class="text-muted">${lang}</small> ${entry.trans_sentence}<br />
                </ul>
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
            </div>
          </div>
        </div>`;
        })
        .join("")}
    `;
}
