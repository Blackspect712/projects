/* Meridian Planning — shared behaviour */
(function () {
  "use strict";

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- Highlight current page in nav ---- */
  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    var target = a.getAttribute("href");
    if (target === here || (here === "index.html" && target === "index.html")) {
      a.classList.add("active");
    }
  });

  /* ---- Reveal on scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---- Contact form validation (demo — no backend) ---- */
  var form = document.querySelector("form[data-validate]");
  if (form) {
    var success = form.querySelector(".form-success");

    function setError(field, on) {
      field.closest(".field").classList.toggle("invalid", on);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;

      form.querySelectorAll("[required]").forEach(function (input) {
        var valid = input.value.trim() !== "";
        if (valid && input.type === "email") {
          valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        }
        setError(input, !valid);
        if (!valid) ok = false;
      });

      if (ok) {
        form.reset();
        if (success) {
          success.classList.add("show");
          success.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        var firstBad = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
        if (firstBad) firstBad.focus();
      }
    });

    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      input.addEventListener("input", function () {
        if (input.closest(".field").classList.contains("invalid")) {
          setError(input, false);
        }
      });
    });
  }

  /* ---- Footer year ---- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
