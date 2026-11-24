const isEN = (document.documentElement.lang || "").toLowerCase().startsWith("en");
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  if (nav && toggle) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? (isEN ? "Close menu" : "Cerrar menú") : (isEN ? "Open menu" : "Abrir menú"));
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    nav.querySelectorAll(".nav__links a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    window.matchMedia("(min-width: 761px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
  }

  const form = document.querySelector("[data-contact-form]");
  if (form) {
    const status = form.querySelector("[data-form-status]");

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const privacy = form.querySelector("#aviso");
      if (privacy && !privacy.checked) {
        if (status) {
          status.hidden = false;
          status.textContent = isEN ? "Please accept the privacy notice to continue." : "Debe aceptar el aviso de privacidad para continuar.";
        }
        return;
      }

      // Stub: ready for Google Sheets / endpoint wiring later.
      const payload = Object.fromEntries(new FormData(form).entries());
      console.info("[GP Inmobiliaria] solicitud (stub)", payload);

      form.reset();
      if (status) {
        status.hidden = false;
        status.textContent = isEN
          ? "Inquiry saved locally. Delivery to Google Sheets will be connected at a later stage."
          : "Solicitud registrada localmente. El envío a Sheets se conectará en una etapa posterior.";
      }
    });
  }

  const formatCount = (value, decimals) => {
    if (decimals > 0) return value.toFixed(decimals);
    return String(Math.round(value));
  };

  const animateCount = (el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;

    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const decimals = Number(el.dataset.decimals || 0);
    const duration = 1400;

    if (reduceMotion) {
      el.textContent = `${prefix}${formatCount(target, decimals)}${suffix}`;
      return;
    }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = target * eased;
      el.textContent = `${prefix}${formatCount(current, decimals)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = `${prefix}${formatCount(target, decimals)}${suffix}`;
    };
    requestAnimationFrame(tick);
  };

  const stats = [...document.querySelectorAll(".stat__value[data-count]")];
  if (stats.length) {
    stats.forEach((el) => {
      const prefix = el.dataset.prefix || "";
      const suffix = el.dataset.suffix || "";
      const decimals = Number(el.dataset.decimals || 0);
      if (!reduceMotion) {
        el.textContent = `${prefix}${formatCount(0, decimals)}${suffix}`;
      }
    });

    if (!("IntersectionObserver" in window) || reduceMotion) {
      stats.forEach(animateCount);
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            animateCount(entry.target);
            io.unobserve(entry.target);
          });
        },
        { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
      );
      stats.forEach((el) => io.observe(el));
    }
  }

  /* Parallax sutil en fondos de paneles (sin fixed; móvil OK) */
  const panels = [...document.querySelectorAll(".panel-stack .panel")];
  if (panels.length && !reduceMotion) {
    let ticking = false;
    const shiftPanels = () => {
      const vh = window.innerHeight || 1;
      panels.forEach((panel) => {
        const rect = panel.getBoundingClientRect();
        const progress = (vh / 2 - (rect.top + rect.height / 2)) / vh;
        const y = Math.max(-8, Math.min(8, progress * 10));
        panel.style.backgroundPosition = `center calc(50% + ${y.toFixed(2)}%)`;
      });
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(shiftPanels);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    shiftPanels();
  }

  /* Reveal sutil al scroll — secciones y textos */
  if (!reduceMotion && "IntersectionObserver" in window) {
    const revealTargets = [];

    const mark = (el) => {
      if (!el || el.classList.contains("reveal")) return;
      el.classList.add("reveal");
      revealTargets.push(el);
    };

    const markGroup = (parent, childSelector) => {
      if (!parent) return;
      parent.classList.add("reveal-stagger");
      [...parent.querySelectorAll(childSelector)].forEach(mark);
    };

    // Secciones de contenido (hero entra ya visible)
    document.querySelectorAll("main > section, main > .panel-stack").forEach((section) => {
      if (section.classList.contains("hero")) {
        mark(section.querySelector(".hero__inner"));
        return;
      }
      if (section.classList.contains("panel-stack")) {
        section.querySelectorAll(".panel__inner").forEach(mark);
        return;
      }
      mark(section);
    });

    markGroup(document.querySelector(".stats"), ".stat");
    markGroup(document.querySelector(".pillars"), ".pillar");
    markGroup(document.querySelector(".process"), ":scope > li");
    markGroup(document.querySelector(".type-list"), ":scope > li");
    markGroup(document.querySelector(".muni-grid"), ".muni");
    markGroup(document.querySelector(".use-grid"), ":scope > li");
    markGroup(document.querySelector(".contact-meta"), ":scope > li");
    markGroup(document.querySelector(".form"), ":scope > div");

    document
      .querySelectorAll(
        ".intro-block, .manifesto__inner, .split, .band, .type-head, .uses, .map-placeholder, .page-intro, .cta-band__row, .cta-photo .wrap"
      )
      .forEach(mark);

    const rio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          rio.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    revealTargets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        el.classList.add("is-in");
      } else {
        rio.observe(el);
      }
    });
  }
})();

// Footer: volver arriba
document.querySelectorAll("[data-to-top]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });
});
