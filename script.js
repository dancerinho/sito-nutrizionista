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
  ------------------------------------------------------------------ */
  // La transizione va spenta durante il reset: altrimenti gli elementi
  // interpolano all'indietro per un paio di frame e la successiva entrata
  // riparte da una posizione intermedia, che è ciò che si legge come scatto.
  function resetAnimations(view) {
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
    items.forEach((el, i) => {
      const delay = el.dataset.delay !== undefined ? Number(el.dataset.delay) : i * 120;
      el.style.transitionDelay = `${delay}ms`;
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => items.forEach((el) => el.classList.add("in")));
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

    if (name === current) {
      closeDrawer();
      views.get(name)?.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
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
