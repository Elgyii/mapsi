function setTheme(theme) {
  const html = document.documentElement;
  if (theme === "auto") {
    const scheme = "(prefers-color-scheme: dark)";
    theme = window.matchMedia(scheme).matches ? "dark" : "light";
  }
  html.dataset.bsTheme = theme;
  localStorage.setItem("theme", theme);
}

function setLang(lang) {
  localStorage.setItem("land", lang);
  document.querySelectorAll("[data-lang]").forEach((el) => {
    const isLang = el.getAttribute("data-lang") === lang;
    isLang ? el.classList.add("show") : el.classList.remove("show");
    el.style.display = isLang ? "block" : "none";
  });

  document.getElementById("search_box").placeholder =
    lang === "en"
      ? "Search for word in Chope, Portuguese, or English..."
      : "Buscar palavra em Chope, Portugues, ou Ingles...";
  document.title = lang === "en" ? "Mapsi — Cicopi Dictionary" : "Mapsi — Dicionário de Cicopi";
  document.documentElement.lang = lang;
}

document.addEventListener("DOMContentLoaded", () => {
  const theme = localStorage.getItem("theme") || "auto";
  const lang = localStorage.getItem("lang") || "pt";
  setTheme(theme);
  setLang(lang);
});
