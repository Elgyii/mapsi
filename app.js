const SUPABASE_URL = "https://vauvzpetrqbqfiuadvin.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdXZ6cGV0cnFicWZpdWFkdmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjU5NDEsImV4cCI6MjA2NDkwMTk0MX0.zqUgG0Q3_BF_4VRonBSfQCc5w8uEMG40noi0KxGMGn4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const searchInput = document.getElementById("searchBox");
const searchButton = document.getElementById("searchButton");
const clearButton = document.getElementById("clearButton");
const results = document.getElementById("results");

function clearSearch() {
  searchInput.value = "";
  results.innerHTML = "";
  searchInput.focus();
}

searchInput.addEventListener("keypress", async (e) => {
  if (e.key === "Enter") await performSearch();
});

searchButton.addEventListener("click", async (e) => {
  if (e instanceof MouseEvent) await performSearch();
});

async function performSearch() {
  const query = searchInput.value.trim();
  results.innerHTML = "";
  if (!query) return;

  // const { data, error } = await supabaseClient
  //   .from("words")
  //   .select("*")
  //   .ilike("chopi", `%${query}%`);

  const { data: words, error } = await supabaseClient
    .from("words")
    .select("*, examples(*)")
    .or(`chopi.ilike.%${query}%,definition_pt.ilike.%${query}%`);

  if (error) {
    results.innerHTML = `<div class="alert alert-danger">Erro ao buscar: ${error.message}</div>`;
    return;
  }

  if (words.length === 0) {
    results.innerHTML = `<div class="alert alert-warning">Nada encontrado.</div>`;
    return;
  }

  results.innerHTML = words
    .map(
      (w) => `
    <div class="card mb-3">
      <div class="card-body">
        <h5>${w.chopi} <small class="text-muted">(${
        w.pronunciation
      })</small></h5>
        <p><strong>PT:</strong> ${w.definition_pt}<br/>
           <strong>EN:</strong> ${w.definition_en || ""}</p>
        ${
          w.examples && w.examples.length
            ? `
          <div><strong>Exemplos:</strong>
            <ul>${w.examples
              .map(
                (ex) => `
              <li><em>${ex.example_chopi}</em><br/>
              PT: ${ex.example_pt}<br/>
              EN: ${ex.example_en}</li>
            `
              )
              .join("")}</ul>
          </div>`
            : ""
        }
      </div>
    </div>
  `
    )
    .join("");
}
