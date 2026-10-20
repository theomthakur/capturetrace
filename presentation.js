const slides = [...document.querySelectorAll(".slide")];
const counter = document.querySelector("#slide-counter");
const progress = document.querySelector("#slide-progress");
const previous = document.querySelector("#previous-slide");
const next = document.querySelector("#next-slide");
const fullscreen = document.querySelector("#fullscreen-button");
let active = 0;

function showSlide(index) {
  active = Math.max(0, Math.min(index, slides.length - 1));
  slides.forEach((slide, slideIndex) => {
    const selected = slideIndex === active;
    slide.hidden = !selected;
    slide.classList.toggle("is-active", selected);
  });
  counter.textContent = `${String(active + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
  progress.style.width = `${((active + 1) / slides.length) * 100}%`;
  previous.disabled = active === 0;
  next.innerHTML = active === slides.length - 1 ? `Return to demo <span aria-hidden="true">↗</span>` : `Next <span aria-hidden="true">→</span>`;
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      fullscreen.textContent = "Full screen unavailable";
    }
    return;
  }
  await document.exitFullscreen();
}

function updateFullscreenLabel() {
  fullscreen.innerHTML = document.fullscreenElement ? `<span aria-hidden="true">⛶</span> Exit full screen` : `<span aria-hidden="true">⛶</span> Enter full screen`;
}

previous.addEventListener("click", () => showSlide(active - 1));
next.addEventListener("click", () => {
  if (active === slides.length - 1) window.location.href = "index.html";
  else showSlide(active + 1);
});
fullscreen.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", updateFullscreenLabel);
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") showSlide(active - 1);
  if (event.key === "ArrowRight" || event.key === " ") showSlide(active + 1);
  if (event.key.toLowerCase() === "f") toggleFullscreen();
});

showSlide(0);
