document.addEventListener("DOMContentLoaded", () => {
  /* ---------------------------------------------------------
     1. Header: sfondo al momento dello scroll
  --------------------------------------------------------- */
  const header = document.getElementById("header");

  const toggleHeaderBackground = () => {
    if (window.scrollY > 20) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  };

  toggleHeaderBackground();
  window.addEventListener("scroll", toggleHeaderBackground);

  /* ---------------------------------------------------------
     2. Menu mobile
  --------------------------------------------------------- */
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const iconOpen = document.getElementById("icon-open");
  const iconClose = document.getElementById("icon-close");

  const closeMobileMenu = () => {
    mobileMenu.classList.add("hidden");
    iconOpen.classList.remove("hidden");
    iconClose.classList.add("hidden");
  };

  menuBtn.addEventListener("click", () => {
    const isHidden = mobileMenu.classList.contains("hidden");
    if (isHidden) {
      mobileMenu.classList.remove("hidden");
      iconOpen.classList.add("hidden");
      iconClose.classList.remove("hidden");
    } else {
      closeMobileMenu();
    }
  });

  document.querySelectorAll(".mobile-link").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  /* ---------------------------------------------------------
     3. Animazione "reveal" allo scroll
  --------------------------------------------------------- */
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealEls.forEach((el) => observer.observe(el));
  } else {
    // Fallback per browser senza IntersectionObserver
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------------------------------------------------------
     4. Validazione modulo di contatto
  --------------------------------------------------------- */
  const form = document.getElementById("contact-form");
  const successMsg = document.getElementById("form-success");

  const fields = {
    name: {
      el: document.getElementById("name"),
      validate: (value) => value.trim().length >= 2,
      message: "Inserisci il tuo nome e cognome.",
    },
    email: {
      el: document.getElementById("email"),
      validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
      message: "Inserisci un indirizzo email valido.",
    },
    message: {
      el: document.getElementById("message"),
      validate: (value) => value.trim().length >= 10,
      message: "Il messaggio deve contenere almeno 10 caratteri.",
    },
  };

  const showError = (fieldName, message) => {
    const { el } = fields[fieldName];
    const errorEl = form.querySelector(`[data-error-for="${fieldName}"]`);
    el.classList.add("input-error");
    if (errorEl) errorEl.textContent = message;
  };

  const clearError = (fieldName) => {
    const { el } = fields[fieldName];
    const errorEl = form.querySelector(`[data-error-for="${fieldName}"]`);
    el.classList.remove("input-error");
    if (errorEl) errorEl.textContent = "";
  };

  const validateField = (fieldName) => {
    const { el, validate, message } = fields[fieldName];
    const isValid = validate(el.value);
    if (isValid) {
      clearError(fieldName);
    } else {
      showError(fieldName, message);
    }
    return isValid;
  };

  Object.keys(fields).forEach((fieldName) => {
    fields[fieldName].el.addEventListener("blur", () => validateField(fieldName));
    fields[fieldName].el.addEventListener("input", () => {
      if (fields[fieldName].el.classList.contains("input-error")) {
        validateField(fieldName);
      }
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    let isFormValid = true;
    Object.keys(fields).forEach((fieldName) => {
      const valid = validateField(fieldName);
      if (!valid) isFormValid = false;
    });

    if (!isFormValid) {
      successMsg.classList.add("hidden");
      return;
    }

    // Nessun backend collegato: simuliamo l'invio riuscito.
    successMsg.classList.remove("hidden");
    form.reset();

    setTimeout(() => {
      successMsg.classList.add("hidden");
    }, 6000);
  });

  /* ---------------------------------------------------------
     5. Chiusura menu mobile con tasto Escape
  --------------------------------------------------------- */
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  });
});
