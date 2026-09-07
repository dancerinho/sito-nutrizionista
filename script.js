(() => {
  "use strict";

  const ORDER = ["home", "servizi", "recensioni", "contatti"];
  const DEFAULT_VIEW = "home";
  // #chi-sono era una vista a sé: ora è una sezione della home, il vecchio link resta valido.
  const ALIASES = { "chi-sono": "home" };

  const views = new Map();
  document.querySelectorAll("[data-view]").forEach((el) => views.set(el.dataset.view, el));

  const tabs = [...document.querySelectorAll("[data-nav]")];
  const tabPill = document.querySelector(".tab-pill");
  const burger = document.getElementById("burger");
  const drawer = document.getElementById("drawer");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const OUT_MS = reduceMotion ? 0 : 320;

  let current = null;
  let animating = false;

  /* ------------------------------------------------------------------
     Animazioni sfalsate degli elementi interni alla vista

     Gli elementi entrano quando entrano davvero in campo, non tutti
     all'attivazione della vista: prima chi stava sotto la piega aveva
     già finito l'animazione quando lo si raggiungeva scorrendo.

     Il root dell'osservatore è la vista, non il viewport: lo scorrimento
     avviene dentro .view (overflow-y: auto) e con root null ogni elemento
     risulterebbe già intersecante al primo frame.
  ------------------------------------------------------------------ */
  const observers = new WeakMap();

  function getObserver(view) {
    let obs = observers.get(view);
    if (obs) return obs;

    obs = new IntersectionObserver((entries, self) => {
      const shown = entries
        .filter((e) => e.isIntersecting)
        .map((e) => e.target)
        // L'osservatore consegna le voci in ordine arbitrario: la
        // scalettatura deve seguire l'ordine di lettura, non quello.
        .sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        );

      const intro = view.dataset.introDone !== "1";

      shown.forEach((el, i) => {
        // Alla prima schermata vale la coreografia scritta nel markup
        // (data-delay); scorrendo serve una scalettatura corta, altrimenti
        // l'ultimo elemento comparirebbe mezzo secondo dopo essere entrato.
        const delay = intro && el.dataset.delay !== undefined
          ? Number(el.dataset.delay)
          : Math.min(i * 90, 360);
        el.style.transitionDelay = `${delay}ms`;
        el.classList.add("in");
        self.unobserve(el);
      });

      if (shown.length) view.dataset.introDone = "1";
    }, {
      root: view,
      // L'entrata parte poco prima che l'elemento sia del tutto dentro,
      // così il movimento finisce sotto gli occhi invece che fuori campo.
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12,
    });

    observers.set(view, obs);
    return obs;
  }

  // La transizione va spenta durante il reset: altrimenti gli elementi
  // interpolano all'indietro per un paio di frame e la successiva entrata
  // riparte da una posizione intermedia, che è ciò che si legge come scatto.
  function resetAnimations(view) {
    getObserver(view).disconnect();
    delete view.dataset.introDone;

    const items = view.querySelectorAll("[data-anim]");
    items.forEach((el) => {
      el.style.transition = "none";
      el.style.transitionDelay = "";
      el.classList.remove("in");
    });
    void view.offsetWidth;
    items.forEach((el) => { el.style.transition = ""; });
  }

  function playAnimations(view) {
    const items = view.querySelectorAll("[data-anim]");

    if (reduceMotion) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }

    const obs = getObserver(view);
    // Doppio rAF: l'osservatore deve misurare a vista già visibile e con
    // lo scorrimento riportato in cima, non sulle posizioni precedenti.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => items.forEach((el) => obs.observe(el)));
    });
  }

  /* ------------------------------------------------------------------
     Indicatore scorrevole del tab switcher
  ------------------------------------------------------------------ */
  function moveTabPill(name) {
    if (!tabPill) return;
    const active = document.querySelector(`.tab[data-nav="${name}"]`);
    if (!active) return;
    tabPill.style.width = `${active.offsetWidth}px`;
    tabPill.style.transform = `translateX(${active.offsetLeft}px)`;
    tabPill.classList.add("ready");
  }

  function syncNavState(name) {
    tabs.forEach((el) => el.classList.toggle("is-active", el.dataset.nav === name));
    moveTabPill(name);
    // Espone la vista attiva al CSS: serve a nascondere il FAB WhatsApp
    // nella schermata contatti su mobile.
    document.body.dataset.view = name;
  }

  /* ------------------------------------------------------------------
     Altezza della testata
     La testata ha due livelli e la striscia superiore cambia altezza col
     wrapping e con la safe area: misurarla evita che i contenuti finiscano
     sotto la barra fissa.
  ------------------------------------------------------------------ */
  const appHeader = document.getElementById("app-header");

  function syncHeaderHeight() {
    if (!appHeader) return;
    document.documentElement.style.setProperty(
      "--header-h", `${appHeader.offsetHeight}px`
    );
  }

  syncHeaderHeight();
  window.addEventListener("resize", syncHeaderHeight);
  window.addEventListener("orientationchange", syncHeaderHeight);
  // I webfont cambiano l'altezza del testo nella striscia una volta caricati.
  if (document.fonts?.ready) document.fonts.ready.then(syncHeaderHeight);

  /* ------------------------------------------------------------------
     Preselezione del servizio dalle card
     La CTA di ogni card porta ai contatti e imposta il menu a tendina.
     Il valore va applicato quando la vista è già attiva, altrimenti lo
     scroll e l'evidenziazione agirebbero su un elemento ancora nascosto.
  ------------------------------------------------------------------ */
  let pendingService = null;

  function applyPendingService() {
    const slug = pendingService;
    pendingService = null;
    if (!slug || current !== "contatti") return;

    const select = document.getElementById("servizio");
    if (!select) return;

    const match = [...select.options].some((o) => o.value === slug);
    if (!match) return;

    select.value = slug;
    select.dispatchEvent(new Event("change", { bubbles: true }));

    select.classList.add("is-preselected");
    setTimeout(() => select.classList.remove("is-preselected"), 1500);

    if (!reduceMotion) {
      // Attende che l'entrata della card contatti sia quasi conclusa,
      // così lo scroll non insegue un elemento ancora in movimento.
      setTimeout(() => {
        select.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 700);
    }
  }

  /* ------------------------------------------------------------------
     Transizione tra viste — direzionale in base all'ordine del menu
  ------------------------------------------------------------------ */
  function show(name, { instant = false } = {}) {
    const next = views.get(name);
    if (!next || name === current || animating) return;

    const prev = current ? views.get(current) : null;
    const goingBack = current ? ORDER.indexOf(name) < ORDER.indexOf(current) : false;

    const enter = () => {
      next.classList.add(goingBack ? "is-entering-back" : "is-entering");
      resetAnimations(next);
      // Forza il reflow così lo stato iniziale viene applicato prima della transizione.
      void next.offsetWidth;
      next.classList.remove("is-entering", "is-entering-back");
      next.classList.add("is-active");
      next.scrollTop = 0;

      current = name;
      syncNavState(name);
      playAnimations(next);
      animating = false;
      applyPendingService();
    };

    if (!prev || instant) {
      if (prev) prev.classList.remove("is-active");
      enter();
      return;
    }

    animating = true;
    prev.classList.add("is-leaving");
    if (goingBack) prev.classList.add("is-leaving-back");

    setTimeout(() => {
      prev.classList.remove("is-active", "is-leaving", "is-leaving-back");
      enter();
    }, OUT_MS);
  }

  /* ------------------------------------------------------------------
     Routing via hash — supporta back/forward e link diretti
  ------------------------------------------------------------------ */
  function viewFromHash() {
    const raw = location.hash.replace(/^#/, "");
    const name = ALIASES[raw] || raw;
    return views.has(name) ? name : DEFAULT_VIEW;
  }

  function route(instant = false) {
    show(viewFromHash(), { instant });
  }

  window.addEventListener("hashchange", () => {
    closeDrawer();
    route();
  });

  // I link con data-nav aggiornano solo l'hash: hashchange fa il resto.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-nav]");
    if (!link) return;

    e.preventDefault();
    const name = link.dataset.nav;
    pendingService = link.dataset.serviceTarget || null;

    if (name === current) {
      closeDrawer();
      if (pendingService) {
        applyPendingService();
      } else {
        views.get(name)?.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }
      return;
    }
    location.hash = name;
  });

  /* ------------------------------------------------------------------
     Drawer mobile
  ------------------------------------------------------------------ */
  function openDrawer() {
    drawer.hidden = false;
    void drawer.offsetWidth;
    drawer.classList.add("is-open");
    document.body.classList.add("drawer-open");
    burger.classList.add("is-open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Chiudi il menu");
  }

  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove("is-open");
    document.body.classList.remove("drawer-open");
    burger.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Apri il menu");
    setTimeout(() => { drawer.hidden = true; }, reduceMotion ? 0 : 380);
  }

  burger.addEventListener("click", () => {
    drawer.hidden ? openDrawer() : closeDrawer();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  window.addEventListener("resize", () => {
    if (current) moveTabPill(current);
    if (window.innerWidth >= 900) closeDrawer();
  });

  /* ------------------------------------------------------------------
     Mappa: percorso dalla posizione dell'utente allo studio.
     L'embed gratuito di Google non espone il puntino "la mia posizione",
     ma accetta saddr/daddr: leggiamo le coordinate dal browser e
     ricarichiamo la mappa in modalità itinerario. La posizione viene
     richiesta solo su click esplicito, mai al caricamento.
  ------------------------------------------------------------------ */
  const mapFrame = document.getElementById("map-frame");
  const locateBtn = document.getElementById("locate-btn");

  if (mapFrame && locateBtn) {
    const locateLabel = document.getElementById("locate-label");
    const mapStatus = document.getElementById("map-status");
    const mapExternal = document.getElementById("map-external");

    const STUDIO = "Via Livigno 26, 20158 Milano";
    const defaultSrc = mapFrame.src;
    const defaultHref = mapExternal.href;
    let showingRoute = false;

    const setStatus = (text, tone) => {
      mapStatus.textContent = text;
      mapStatus.className = tone ? `map-status is-${tone}` : "map-status";
      mapStatus.hidden = !text;
    };

    const resetMap = () => {
      mapFrame.src = defaultSrc;
      mapExternal.href = defaultHref;
      locateLabel.textContent = "Percorso da dove sei";
      showingRoute = false;
      setStatus("");
    };

    const errorMessage = (err) => {
      if (err.code === err.PERMISSION_DENIED)
        return "Permesso negato. Puoi consentire l'accesso alla posizione dalle impostazioni del browser.";
      if (err.code === err.POSITION_UNAVAILABLE)
        return "Posizione non disponibile in questo momento.";
      if (err.code === err.TIMEOUT)
        return "La richiesta è scaduta. Riprova.";
      return "Non è stato possibile recuperare la posizione.";
    };

    locateBtn.addEventListener("click", () => {
      if (showingRoute) { resetMap(); return; }

      if (!navigator.geolocation) {
        setStatus("Il tuo browser non supporta la geolocalizzazione.", "error");
        return;
      }

      locateBtn.disabled = true;
      setStatus("Recupero la tua posizione…");

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const from = `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
          mapFrame.src =
            `https://maps.google.com/maps?saddr=${encodeURIComponent(from)}` +
            `&daddr=${encodeURIComponent(STUDIO)}&output=embed`;
          mapExternal.href =
            `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}` +
            `&destination=${encodeURIComponent(STUDIO)}`;

          locateLabel.textContent = "Torna alla mappa dello studio";
          showingRoute = true;
          locateBtn.disabled = false;
          setStatus("Percorso calcolato dalla tua posizione attuale.", "ok");
        },
        (err) => {
          locateBtn.disabled = false;
          setStatus(errorMessage(err), "error");
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  /* ------------------------------------------------------------------
     Modulo di contatto
  ------------------------------------------------------------------ */
  const form = document.getElementById("contact-form");

  if (form) {
    const feedback = document.getElementById("form-feedback");

    const fields = {
      name: {
        el: document.getElementById("name"),
        ok: (el) => el.value.trim().length >= 2,
        msg: "Inserisci il tuo nome.",
      },
      email: {
        el: document.getElementById("email"),
        ok: (el) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()),
        msg: "Inserisci un indirizzo email valido.",
      },
      message: {
        el: document.getElementById("message"),
        ok: (el) => el.value.trim().length >= 10,
        msg: "Scrivi almeno 10 caratteri, così posso aiutarti meglio.",
      },
      privacy: {
        el: document.getElementById("privacy"),
        ok: (el) => el.checked,
        msg: "È necessario accettare il trattamento dei dati.",
      },
    };

    const validate = (key) => {
      const { el, ok, msg } = fields[key];
      const errEl = form.querySelector(`[data-error-for="${key}"]`);
      const valid = ok(el);

      el.classList.toggle("input-error", !valid);
      el.setAttribute("aria-invalid", String(!valid));
      if (errEl) errEl.textContent = valid ? "" : msg;
      return valid;
    };

    Object.keys(fields).forEach((key) => {
      const { el } = fields[key];
      el.addEventListener(el.type === "checkbox" ? "change" : "blur", () => validate(key));
      el.addEventListener("input", () => {
        if (el.classList.contains("input-error")) validate(key);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const allValid = Object.keys(fields).map(validate).every(Boolean);

      feedback.hidden = false;

      if (!allValid) {
        feedback.className = "form-feedback ko";
        feedback.textContent = "Controlla i campi evidenziati e riprova.";
        form.querySelector(".input-error")?.focus();
        return;
      }

      // Nessun backend collegato: qui va inserito l'invio reale (Formspree, EmailJS, API).
      feedback.className = "form-feedback ok";
      feedback.textContent = "Grazie! La tua richiesta è stata registrata. Ti ricontatterò al più presto.";
      form.reset();
      setTimeout(() => { feedback.hidden = true; }, 8000);
    });
  }

  /* ------------------------------------------------------------------
     Avvio
  ------------------------------------------------------------------ */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  if (!location.hash) location.replace("#home");
  route(true);
  window.addEventListener("load", () => moveTabPill(current));
})();
