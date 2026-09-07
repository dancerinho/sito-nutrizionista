document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- Header: sfondo allo scroll ---------------- */
  const header = document.getElementById("header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------------- Menu mobile ---------------- */
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const iconOpen = document.getElementById("icon-open");
  const iconClose = document.getElementById("icon-close");

  const setMenu = (open) => {
    mobileMenu.classList.toggle("hidden", !open);
    iconOpen.classList.toggle("hidden", open);
    iconClose.classList.toggle("hidden", !open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
  };

  menuBtn.addEventListener("click", () => {
    setMenu(mobileMenu.classList.contains("hidden"));
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });

  /* ---------------- Reveal allo scroll ---------------- */
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------------- Voce di menu attiva ---------------- */
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) =>
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === `#${entry.target.id}`
            )
          );
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((section) => navObserver.observe(section));
  }

  /* ---------------- Contatore hero ---------------- */
  const counter = document.querySelector("[data-count]");

  if (counter && "IntersectionObserver" in window) {
    const target = Number(counter.dataset.count);
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          countObserver.unobserve(entry.target);

          let current = 0;
          const tick = () => {
            current += Math.max(1, Math.ceil(target / 22));
            if (current >= target) {
              counter.textContent = target;
              return;
            }
            counter.textContent = current;
            requestAnimationFrame(tick);
          };
          tick();
        });
      },
      { threshold: 0.6 }
    );
    countObserver.observe(counter);
  }

  /* ---------------- Carosello recensioni ---------------- */
  const track = document.getElementById("reviews-track");
  const prevBtn = document.getElementById("reviews-prev");
  const nextBtn = document.getElementById("reviews-next");
  const dotsWrap = document.getElementById("reviews-dots");

  if (track && prevBtn && nextBtn && dotsWrap) {
    const pageCount = () =>
      Math.max(1, Math.round(track.scrollWidth / track.clientWidth));
    const currentPage = () =>
      Math.round(track.scrollLeft / track.clientWidth);

    const buildDots = () => {
      dotsWrap.innerHTML = "";
      for (let i = 0; i < pageCount(); i++) {
        const dot = document.createElement("button");
        dot.className = "carousel-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", `Vai al gruppo di recensioni ${i + 1}`);
        dot.addEventListener("click", () => {
          track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
        });
        dotsWrap.appendChild(dot);
      }
    };

    const syncControls = () => {
      const page = currentPage();
      [...dotsWrap.children].forEach((dot, i) =>
        dot.classList.toggle("is-active", i === page)
      );
      prevBtn.disabled = track.scrollLeft <= 4;
      nextBtn.disabled =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };

    const scrollByPage = (direction) => {
      track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
    };

    prevBtn.addEventListener("click", () => scrollByPage(-1));
    nextBtn.addEventListener("click", () => scrollByPage(1));

    track.addEventListener("scroll", syncControls, { passive: true });
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); scrollByPage(1); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); scrollByPage(-1); }
    });

    window.addEventListener("resize", () => {
      buildDots();
      syncControls();
    });

    buildDots();
    syncControls();
  }

  /* ---------------- Modulo di contatto ---------------- */
  const form = document.getElementById("contact-form");
  const feedback = document.getElementById("form-feedback");

  const fields = {
    name: {
      el: document.getElementById("name"),
      isValid: (el) => el.value.trim().length >= 2,
      error: "Inserisci il tuo nome.",
    },
    email: {
      el: document.getElementById("email"),
      isValid: (el) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()),
      error: "Inserisci un indirizzo email valido.",
    },
    message: {
      el: document.getElementById("message"),
      isValid: (el) => el.value.trim().length >= 10,
      error: "Scrivi almeno 10 caratteri, così posso aiutarti meglio.",
    },
    privacy: {
      el: document.getElementById("privacy"),
      isValid: (el) => el.checked,
      error: "È necessario accettare il trattamento dei dati.",
    },
  };

  const validate = (key) => {
    const { el, isValid, error } = fields[key];
    const errorEl = form.querySelector(`[data-error-for="${key}"]`);
    const valid = isValid(el);

    el.classList.toggle("input-error", !valid);
    el.setAttribute("aria-invalid", String(!valid));
    if (errorEl) errorEl.textContent = valid ? "" : error;

    return valid;
  };

  Object.keys(fields).forEach((key) => {
    const { el } = fields[key];
    const event = el.type === "checkbox" ? "change" : "blur";
    el.addEventListener(event, () => validate(key));
    el.addEventListener("input", () => {
      if (el.classList.contains("input-error")) validate(key);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const results = Object.keys(fields).map(validate);
    const allValid = results.every(Boolean);

    if (!allValid) {
      feedback.textContent = "Controlla i campi evidenziati e riprova.";
      feedback.className =
        "mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700";
      form.querySelector(".input-error")?.focus();
      return;
    }

    // Nessun backend collegato: qui va inserito l'invio reale (es. Formspree, EmailJS, API).
    feedback.textContent =
      "Grazie! La tua richiesta è stata registrata. Ti ricontatterò al più presto.";
    feedback.className =
      "mt-5 rounded-2xl bg-brand-50 px-5 py-4 text-sm text-brand-700";
    form.reset();

    setTimeout(() => feedback.classList.add("hidden"), 8000);
  });

  /* ---------------- Anno nel footer ---------------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
