// ═══════════════════════════════════════
//  CINEMATIC INTRO
// ═══════════════════════════════════════
(function() {
  const intro    = document.getElementById("cinematicIntro");
  const progress = document.querySelector(".cinematic-progress");
  const particles= document.getElementById("cinematicParticles");

  // Spawn floating hearts/stars
  const symbols = ["♥","✦","✿","★","♡","✧","❋"];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement("div");
    el.className = "cp-particle";
    el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    el.style.cssText = `
      left: ${Math.random()*100}%;
      top:  ${Math.random()*100}%;
      font-size: ${0.6 + Math.random()*1.4}rem;
      animation-delay: ${Math.random()*2}s;
      animation-duration: ${2 + Math.random()*3}s;
      opacity: ${0.1 + Math.random()*0.5};
      color: ${["#f0c4c4","#c8707a","#fde68a","#e9d5ff"][Math.floor(Math.random()*4)]};
    `;
    particles.appendChild(el);
  }

  // Progress bar animation
  let pct = 0;
  const tick = setInterval(() => {
    pct += Math.random() * 18;
    if (pct > 100) pct = 100;
    progress.style.width = pct + "%";
    if (pct >= 100) {
      clearInterval(tick);
      setTimeout(dismiss, 400);
    }
  }, 120);

  function dismiss() {
    intro.classList.add("cinematic-out");
    setTimeout(() => { intro.style.display = "none"; }, 900);
  }

  // Also dismiss if user taps
  intro.addEventListener("click", () => { clearInterval(tick); progress.style.width = "100%"; setTimeout(dismiss, 200); });
})();
