import { shows } from "./data.js";

const TYPE_LABELS = {
  pelicula: "Pelicula",
  serie: "Serie",
  especial: "Especial"
};

const COMMENTS_STORAGE_KEY = "streaming-en-linea-comments";
const collator = new Intl.Collator("es", { sensitivity: "base" });
const catalog = [...shows].sort((left, right) => right.anio - left.anio || collator.compare(left.titulo, right.titulo));

const state = {
  search: "",
  type: "pelicula",
  genre: "all",
  year: "all",
  sort: "latest"
};

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatType(type) {
  return TYPE_LABELS[type] || type;
}

function excerpt(text, maxLength = 150) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function buildSynopsis(show) {
  const castLead = show.reparto.slice(0, 3).join(", ");
  return `${show.descripcion} Bajo la direccion de ${show.direccion}, el reparto encabezado por ${castLead} ayuda a que la historia se sienta conectada con el gran mosaico de Marvel sin perder identidad propia.`;
}

function buildReview(show) {
  const genreText = show.genero.join(" y ").toLowerCase();

  if (show.tipo === "serie") {
    return `${show.titulo} aprovecha el formato serial para desarrollar mejor sus conflictos y personajes. Su mezcla de ${genreText} le da espacio para crecer episodio a episodio y dejar una impresion mas atmosferica que explosiva.`;
  }

  if (show.tipo === "especial") {
    return `${show.titulo} funciona como una pausa pequena pero muy carismatica dentro del catalogo. En poco tiempo entrega humor, calidez y el encanto grupal suficiente para sentirse como un extra que si vale la pena ver.`;
  }

  return `${show.titulo} combina ${genreText} con una puesta en escena orientada al entretenimiento, pero tambien deja espacio para el legado del personaje y sus dilemas. Es una entrada recomendable si buscas una experiencia Marvel con identidad clara y buen ritmo.`;
}

function getGenreOptions() {
  return [...new Set(catalog.flatMap((show) => show.genero))].sort((left, right) => collator.compare(left, right));
}

function getYearOptions() {
  return [...new Set(catalog.map((show) => show.anio))].sort((left, right) => right - left);
}

function getFilteredShows() {
  const searchTerm = normalizeText(state.search);

  return catalog.filter((show) => {
    const searchable = normalizeText(
      [
        show.titulo,
        show.descripcion,
        show.fecha,
        show.direccion,
        show.guion,
        show.tipo,
        ...show.genero,
        ...show.reparto
      ].join(" ")
    );

    const matchesSearch = !searchTerm || searchable.includes(searchTerm);
    const matchesType = state.type === "all" || show.tipo === state.type;
    const matchesGenre = state.genre === "all" || show.genero.includes(state.genre);
    const matchesYear = state.year === "all" || String(show.anio) === state.year;

    return matchesSearch && matchesType && matchesGenre && matchesYear;
  });
}

function sortShows(list) {
  const sorted = [...list];

  if (state.sort === "oldest") {
    sorted.sort((left, right) => left.anio - right.anio || collator.compare(left.titulo, right.titulo));
    return sorted;
  }

  if (state.sort === "title") {
    sorted.sort((left, right) => collator.compare(left.titulo, right.titulo));
    return sorted;
  }

  sorted.sort((left, right) => right.anio - left.anio || collator.compare(left.titulo, right.titulo));
  return sorted;
}

function renderStats() {
  const statsContainer = document.getElementById("catalogStats");
  if (!statsContainer) {
    return;
  }

  const movieCount = catalog.filter((show) => show.tipo === "pelicula").length;
  const extraCount = catalog.length - movieCount;
  const latestYear = Math.max(...catalog.map((show) => show.anio));

  statsContainer.innerHTML = `
    <article class="stat-card">
      <strong>${catalog.length}</strong>
      <span>Titulos disponibles en el catalogo</span>
    </article>
    <article class="stat-card">
      <strong>${movieCount}</strong>
      <span>Peliculas listas para explorar</span>
    </article>
    <article class="stat-card">
      <strong>${extraCount}</strong>
      <span>Series y especiales para completar el recorrido</span>
    </article>
    <article class="stat-card">
      <strong>${latestYear}</strong>
      <span>Ano mas reciente disponible</span>
    </article>
  `;
}

function renderResultsSummary(list) {
  const summary = document.getElementById("resultsSummary");
  if (!summary) {
    return;
  }

  const pieces = [
    `${list.length} resultado${list.length === 1 ? "" : "s"}`,
    state.type === "all" ? "todo el catalogo" : formatType(state.type),
    state.sort === "latest" ? "ordenado por fecha descendente" : state.sort === "oldest" ? "ordenado por fecha ascendente" : "ordenado alfabeticamente"
  ];

  summary.textContent = pieces.join(" | ");
}

function renderShows(list) {
  const container = document.getElementById("moviesContainer");
  if (!container) {
    return;
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <h3>No encontramos coincidencias</h3>
          <p class="empty-copy">Prueba con otro titulo, cambia el genero o vuelve a mostrar todo el catalogo para seguir explorando.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = list
    .map((show) => {
      const genres = show.genero.map((item) => `<span class="badge-outline">${escapeHtml(item)}</span>`).join("");

      return `
        <div class="col-12 col-md-6 col-xl-4 movie-column">
          <a class="movie-card" href="show.html?id=${show.id}" aria-label="Ver detalle de ${escapeHtml(show.titulo)}">
            <div class="poster-shell">
              <img src="${escapeHtml(show.imagen)}" alt="Poster de ${escapeHtml(show.titulo)}">
              <div class="poster-badges">
                <span class="badge-soft">${show.fecha}</span>
                <span class="badge-outline">${formatType(show.tipo)}</span>
              </div>
            </div>

            <div class="movie-body">
              <div class="genre-badges">${genres}</div>
              <h3 class="movie-title">${escapeHtml(show.titulo)}</h3>
              <p class="movie-description">${escapeHtml(excerpt(show.descripcion))}</p>

              <div class="movie-meta">
                <div class="meta-item">
                  <strong>Direccion</strong>
                  <span>${escapeHtml(show.direccion)}</span>
                </div>
                <div class="meta-item">
                  <strong>Duracion</strong>
                  <span>${escapeHtml(show.duracion)}</span>
                </div>
              </div>

              <span class="card-cta">Ver detalle -></span>
            </div>
          </a>
        </div>
      `;
    })
    .join("");
}

function populateHomeFilters() {
  const typeFilter = document.getElementById("typeFilter");
  const genreFilter = document.getElementById("genreFilter");
  const yearFilter = document.getElementById("yearFilter");

  if (!typeFilter || !genreFilter || !yearFilter) {
    return;
  }

  const typeOptions = Object.entries(TYPE_LABELS)
    .map(([value, label]) => `<option value="${value}" ${value === state.type ? "selected" : ""}>${label}</option>`)
    .join("");

  const genreOptions = getGenreOptions()
    .map((genre) => `<option value="${genre}">${genre}</option>`)
    .join("");

  const yearOptions = getYearOptions()
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");

  typeFilter.innerHTML = `<option value="all">Todo</option>${typeOptions}`;
  genreFilter.innerHTML = `<option value="all">Todos</option>${genreOptions}`;
  yearFilter.innerHTML = `<option value="all">Todos</option>${yearOptions}`;

  typeFilter.value = state.type;
  genreFilter.value = state.genre;
  yearFilter.value = state.year;
}

function renderHome() {
  const filtered = sortShows(getFilteredShows());
  renderResultsSummary(filtered);
  renderShows(filtered);
}

function bindHomeEvents() {
  const searchInput = document.getElementById("searchInput");
  const typeFilter = document.getElementById("typeFilter");
  const genreFilter = document.getElementById("genreFilter");
  const yearFilter = document.getElementById("yearFilter");
  const sortFilter = document.getElementById("sortFilter");

  searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderHome();
  });

  typeFilter?.addEventListener("change", (event) => {
    state.type = event.target.value;
    renderHome();
  });

  genreFilter?.addEventListener("change", (event) => {
    state.genre = event.target.value;
    renderHome();
  });

  yearFilter?.addEventListener("change", (event) => {
    state.year = event.target.value;
    renderHome();
  });

  sortFilter?.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderHome();
  });
}

function initHomePage() {
  if (!document.getElementById("moviesContainer")) {
    return;
  }

  populateHomeFilters();
  renderStats();
  bindHomeEvents();
  renderHome();
}

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function getCommentsStore() {
  try {
    return JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveCommentsStore(store) {
  localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(store));
}

function getCommentsForShow(id) {
  const store = getCommentsStore();
  const comments = store[id] || [];

  return comments.map((comment) => {
    if (typeof comment === "string") {
      return { text: comment, createdAt: null };
    }

    return comment;
  });
}

function formatCommentDate(value) {
  if (!value) {
    return "Comentario guardado";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function renderComments(id) {
  const commentsList = document.getElementById("commentsList");
  const commentsCounter = document.getElementById("commentsCounter");

  if (!commentsList || !commentsCounter) {
    return;
  }

  const comments = getCommentsForShow(id);
  commentsCounter.textContent = `${comments.length} comentario${comments.length === 1 ? "" : "s"}`;

  if (!comments.length) {
    commentsList.innerHTML = `
      <div class="empty-state">
        <h3>Aun no hay comentarios</h3>
        <p class="empty-copy">Puedes dejar la primera opinion o resena corta sobre este titulo.</p>
      </div>
    `;
    return;
  }

  commentsList.innerHTML = comments
    .map(
      (comment) => `
        <article class="comment-item">
          <p class="comment-text">${escapeHtml(comment.text)}</p>
          <span class="comment-date">${formatCommentDate(comment.createdAt)}</span>
        </article>
      `
    )
    .join("");
}

function addComment(id, text) {
  const store = getCommentsStore();
  const comments = getCommentsForShow(id);

  comments.push({
    text,
    createdAt: new Date().toISOString()
  });

  store[id] = comments;
  saveCommentsStore(store);
  renderComments(id);
}

function bindCommentForm(id) {
  const form = document.getElementById("commentForm");
  const input = document.getElementById("commentInput");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }

    addComment(id, text);
    input.value = "";
    input.focus();
  });
}

function renderNotFound() {
  const container = document.getElementById("detailContainer");
  if (!container) {
    return;
  }

  container.innerHTML = `
    <section class="not-found-card">
      <p class="eyebrow mb-2">Detalle no disponible</p>
      <h1 class="detail-title">No encontramos ese titulo</h1>
      <p class="section-copy">Puede que el enlace este incompleto o que el titulo ya no exista en el catalogo actual.</p>
      <a class="back-link mt-3" href="index.html"><- Volver al catalogo</a>
    </section>
  `;
}

function renderDetail() {
  const container = document.getElementById("detailContainer");
  if (!container) {
    return;
  }

  const id = getIdFromUrl();
  const show = catalog.find((item) => String(item.id) === id);

  if (!show) {
    renderNotFound();
    return;
  }

  document.title = `${show.titulo} | Streaming en linea`;

  const genres = show.genero.map((item) => `<span class="badge-outline">${escapeHtml(item)}</span>`).join("");
  const cast = show.reparto.map((actor) => `<span class="cast-chip">${escapeHtml(actor)}</span>`).join("");

  container.innerHTML = `
    <section class="detail-shell">
      <a class="back-link mb-4" href="index.html"><- Volver al catalogo</a>
      <div class="row g-4 align-items-start">
        <div class="col-lg-4">
          <div class="detail-poster">
            <img src="${escapeHtml(show.imagen)}" alt="Poster de ${escapeHtml(show.titulo)}">
          </div>
        </div>

        <div class="col-lg-8">
          <div class="detail-content">
            <div class="detail-badges">
              <span class="badge-soft">${show.fecha}</span>
              <span class="badge-outline">${formatType(show.tipo)}</span>
              <span class="badge-outline">${escapeHtml(show.duracion)}</span>
            </div>

            <h1 class="detail-title">${escapeHtml(show.titulo)}</h1>
            <p class="detail-lead">${escapeHtml(show.descripcion)}</p>

            <div class="genre-badges">${genres}</div>

            <div class="detail-meta-grid">
              <article class="meta-card">
                <strong>Direccion</strong>
                <p class="meta-copy">${escapeHtml(show.direccion)}</p>
              </article>
              <article class="meta-card">
                <strong>Guion</strong>
                <p class="meta-copy">${escapeHtml(show.guion)}</p>
              </article>
              <article class="meta-card">
                <strong>Reparto principal</strong>
                <p class="meta-copy">${escapeHtml(show.reparto.slice(0, 3).join(", "))}</p>
              </article>
              <article class="meta-card">
                <strong>Ano</strong>
                <p class="meta-copy">${show.anio}</p>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="row g-4 mt-1">
      <div class="col-lg-7">
        <section class="info-card h-100">
          <p class="eyebrow mb-2">Sinopsis</p>
          <h2 class="section-heading">De que trata</h2>
          <p class="section-copy">${escapeHtml(buildSynopsis(show))}</p>

          <p class="eyebrow mt-4 mb-2">Resena</p>
          <h2 class="section-heading">Por que vale la pena verla</h2>
          <p class="section-copy">${escapeHtml(buildReview(show))}</p>
        </section>
      </div>

      <div class="col-lg-5">
        <section class="info-card">
          <p class="eyebrow mb-2">Actores</p>
          <h2 class="section-heading">Reparto destacado</h2>
          <div class="cast-list mt-3">${cast}</div>
        </section>

        <section class="info-card mt-4">
          <p class="eyebrow mb-2">Ficha rapida</p>
          <h2 class="section-heading">Informacion relevante</h2>
          <div class="fact-list mt-3">
            <div class="fact-row">
              <strong>Formato</strong>
              <span>${formatType(show.tipo)}</span>
            </div>
            <div class="fact-row">
              <strong>Genero</strong>
              <span>${escapeHtml(show.genero.join(", "))}</span>
            </div>
            <div class="fact-row">
              <strong>Duracion</strong>
              <span>${escapeHtml(show.duracion)}</span>
            </div>
            <div class="fact-row">
              <strong>Direccion y guion</strong>
              <span>${escapeHtml(show.direccion)} | ${escapeHtml(show.guion)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>

    <section class="comments-card mt-4">
      <div class="comments-head">
        <div>
          <p class="eyebrow mb-2">Comunidad</p>
          <h2 class="section-heading">Comentarios y resenas cortas</h2>
        </div>
        <span id="commentsCounter" class="comments-counter">0 comentarios</span>
      </div>

      <form id="commentForm" class="comment-form mt-4">
        <label class="form-label" for="commentInput">Comparte tu opinion</label>
        <textarea id="commentInput" class="form-control" placeholder="Escribe aqui tu comentario sobre la pelicula o serie"></textarea>
        <button type="submit" class="btn btn-accent mt-3">Guardar comentario</button>
      </form>

      <div id="commentsList" class="comments-list"></div>
    </section>
  `;

  bindCommentForm(show.id);
  renderComments(show.id);
}

initHomePage();
renderDetail();
