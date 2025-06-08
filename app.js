const SUPABASE_URL = "https://vauvzpetrqbqfiuadvin.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdXZ6cGV0cnFicWZpdWFkdmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjU5NDEsImV4cCI6MjA2NDkwMTk0MX0.zqUgG0Q3_BF_4VRonBSfQCc5w8uEMG40noi0KxGMGn4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const searchForm = document.getElementById("searchForm");
const searchBox = document.getElementById("searchBox");
const submitBtn = document.getElementById("submitBtn");
const clearBtn = document.getElementById("clearBtn");
const results = document.getElementById("results");

function clearSearch() {
  searchBox.value = "";
  results.innerHTML = "";
  searchBox.focus();
}

searchForm.addEventListener("keypress", async (e) => {
  if (e.key === "Enter") await performSearch();
});
searchBox.addEventListener("keypress", async (e) => {
  if (e.key === "Enter") await performSearch();
});
submitBtn.addEventListener("click", async (e) => {
  if (e instanceof MouseEvent) await performSearch();
});
clearBtn.addEventListener("click", (e) => {
  if (e instanceof MouseEvent) clearSearch();
});

async function performSearch() {
  const query = searchBox.value.trim();
  results.innerHTML = "";
  if (!query) return;

  const { data: words, error } = await supabaseClient
    .from("words")
    .select("*, examples(*)")
    .or(`chopi.ilike.%${query}%,definition_pt.ilike.%${query}%,definition_en.ilike.%${query}%`);

  if (error) {
    results.innerHTML = `<div class="alert alert-danger">Erro ao buscar: ${error.message}</div>`;
    return;
  }

  if (words.length === 0) {
    results.innerHTML = `<div class="alert alert-warning">Nenhum resultado encontrado.</div>`;
    return;
  }

  results.innerHTML = `
      <p class="text-muted">${words.length} resultado${words.length > 1 ? "s" : ""} encontrado${
    words.length > 1 ? "s" : ""
  }:</p>
      ${words
        .map(
          (w) => `
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h4 class="mb-1">${w.chopi}</h4>
                <small class="text-muted">Pronúncia: ${w.pronunciation}</small>
              </div>
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" title="Ouvir" onclick="playAudio('${
                  w.audio_url || ""
                }')">
                  <i class="bi bi-volume-up"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#modal-${
                  w.id
                }" title="Inflexões">
                  <i class="bi bi-grid-3x3-gap"></i>
                </button>
              </div>
            </div>
  
            <hr>
  
            <p class="mb-1"><strong>Tipo:</strong> ${w.part_of_speech}</p>
            <ol>
              <li><strong>PT:</strong> ${w.definition_pt}</li>
              ${w.definition_en ? `<li><strong>EN:</strong> ${w.definition_en}</li>` : ""}
            </ol>
  
            ${
              w.examples?.length
                ? `
                <div class="mt-3">
                  <strong>Exemplos:</strong>
                  <ul>
                    ${w.examples
                      .map(
                        (ex) => `
                        <li><em>${ex.example_chopi}</em><br/>
                        PT: ${ex.example_pt}<br/>
                        EN: ${ex.example_en}</li>`
                      )
                      .join("")}
                  </ul>
                </div>`
                : ""
            }
  
            <!-- Modal de Inflexões -->
            <div class="modal fade" id="modal-${w.id}" tabindex="-1">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Inflexões de "${w.chopi}"</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                  </div>
                  <div class="modal-body">
                    <p><em>Por atualizar. Aqui entrarão as formas derivadas, tempos verbais, etc.</em></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>`
        )
        .join("")}
    `;
}
