/* ---- Arm geometry ---------------------------------------------------- *
 * Everything is drawn pointing "up" from the core, then the whole <g> is
 * rotated into place. Up = decreasing y in SVG space.                    */

const CX = 500, CY = 500;
const SPOKE_IN = 274;   // inner end of the stave (just outside the core)
const SPOKE_OUT = 138;  // stave tip (just inside the inner frame ring)

// A distinct rune-terminal for each arm tip (drawn near y≈138, pointing up).
const TERMINALS = [
  "M474,168 L500,168 526,132 M474,132 L500,168 M500,138 L500,108",           // trident
  "M500,168 L472,118 M500,168 L500,102 M500,168 L528,118",                    // ᛉ splayed fork
  "M500,152 m-21,0 a21,21 0 1,0 42,0 a21,21 0 1,0 -42,0 M500,131 L500,104",   // ring finial
  "M470,150 L530,150 M477,127 L523,127 M500,127 L500,102",                    // double bar + point
  "M500,102 L521,138 L500,174 L479,138 Z",                                    // diamond finial
  "M500,150 Q500,118 474,112 M500,150 Q500,118 526,112",                      // twin hooks
  "M478,150 L500,123 522,150 M478,127 L500,100 522,127",                      // stacked chevrons
  "M470,146 L530,146 M481,120 L519,120 M500,174 L500,96",                     // cross-crosslet
];

// Rune tick-marks along each stave — varied for an organic, etched feel.
const TICKS = [
  [[250, 13], [206, 10]],
  [[256, 11], [220, 14], [184, 10]],
  [[246, 13], [200, 10]],
  [[258, 10], [222, 13], [186, 11]],
  [[250, 12], [208, 15]],
  [[256, 11], [218, 13], [182, 10]],
  [[248, 14], [204, 10]],
  [[254, 11], [220, 13], [186, 10]],
];

const SVGNS = "http://www.w3.org/2000/svg";

function buildStavePath(i) {
  let d = `M${CX},${SPOKE_IN} L${CX},${SPOKE_OUT}`;          // main spoke
  for (const [y, w] of TICKS[i]) d += ` M${CX - w},${y} L${CX + w},${y}`;
  d += " " + TERMINALS[i];
  return d;
}

/* ---- Build the eight arms ------------------------------------------- */

const armsGroup = document.getElementById("arms");
const svg = document.getElementById("sigil");

/* Desktop has hover; phones don't. On a touch device, tapping an arm reveals
   its magic and "arms" it, and tapping the glowing core plays it. */
const TOUCH = matchMedia("(hover: none), (pointer: coarse)").matches;

SIGIL.forEach((arm, i) => {
  const g = document.createElementNS(SVGNS, "g");
  g.setAttribute("class", "arm");
  g.setAttribute("transform", `rotate(${i * 45} ${CX} ${CY})`);
  g.style.setProperty("--accent", arm.accent);
  g.style.setProperty("--d", (i * 0.15) + "s");   // stagger for the touch "tap me" shimmer
  g.dataset.index = i;

  const hit = document.createElementNS(SVGNS, "path");
  hit.setAttribute("class", "hit");
  hit.setAttribute("d", `M${CX},${SPOKE_IN + 8} L${CX},${SPOKE_OUT - 14}`);

  const stave = document.createElementNS(SVGNS, "path");
  stave.setAttribute("class", "stave");
  stave.setAttribute("d", buildStavePath(i));

  g.append(hit, stave);
  armsGroup.append(g);

  // Mouse: hover reveals, click plays. Touch: tap reveals + arms (core plays).
  g.addEventListener("pointerenter", () => { if (!TOUCH) showMagic(i); });
  g.addEventListener("pointerleave", () => { if (!TOUCH) hideMagic(); });
  g.addEventListener("click", () => (TOUCH ? armArm(i) : playArm(i)));
});

// On touch there's no hover to signal the arms are alive — shimmer them.
if (TOUCH) svg.classList.add("hint");

/* ---- An arm's "magic": watermark text ghosting in on hover ---------- */

const magic = document.getElementById("magic");
const magicInner = magic.querySelector(".magic-inner");
const magicName = magic.querySelector(".magic-name");
const magicIncant = magic.querySelector(".magic-incant");
const magicDownload = document.getElementById("magicDownload");

// Shrink a name to fit its box when it's wider than the space (long words like
// MISCHIEF / CROSSING on a narrow phone). CSS sizing alone can't guarantee this
// across font metrics, so measure and scale down only when it actually overflows.
function fitName() {
  magicName.style.fontSize = "";
  const avail = magicInner.clientWidth;
  const w = magicName.offsetWidth;   // inline-block hugs the text, so this is its true width
  if (w > avail) {
    const px = parseFloat(getComputedStyle(magicName).fontSize);
    magicName.style.fontSize = (px * avail / w * 0.99) + "px";
  }
}

let magicTimer;

function showMagic(i) {
  clearTimeout(magicTimer);
  document.querySelectorAll(".arm.hovered").forEach((el) => el.classList.remove("hovered"));
  const arm = SIGIL[i];
  document.querySelector(`.arm[data-index="${i}"]`).classList.add("hovered");
  magicName.textContent = arm.name;
  magicIncant.textContent = arm.incant;
  magic.style.setProperty("--accent", arm.accent);
  const trackIdx = (i === current) ? currentTrack : 0;
  const song = arm.songs[trackIdx];
  const ext = song.file.match(/\.[^.]+$/)?.[0] ?? ".mp3";
  const fname = [song.artist, song.title].filter(Boolean).join(" - ") + ext;
  magicDownload.href = song.file;
  magicDownload.download = fname;
  fitName();
  magic.classList.add("show");
}

function hideMagic() {
  clearTimeout(magicTimer);
  document.querySelectorAll(".arm.hovered").forEach((el) => el.classList.remove("hovered"));
  magic.classList.remove("show");
}

// Reveal a name for a few seconds, then fade (used on touch once a song starts;
// the rotating band carries the song's identity from there).
function revealFor(i, ms) {
  showMagic(i);
  magicTimer = setTimeout(hideMagic, ms);
}

// Re-fit if the viewport changes while a name is showing (orientation flip).
addEventListener("resize", () => { if (magic.classList.contains("show")) fitName(); });

/* ---- Rotating metadata rings ---------------------------------------- */

let ambientAlbum = null;
let ambientTrack = null;

const ringText      = document.getElementById("ringText");
const ringText2     = document.getElementById("ringText2");
const ringTextInner = document.getElementById("ringTextInner");

// Ten individual symbol elements (5 per gap) — one glyph each so positions
// are exact and the twinkle animation can target them independently.
const ringSymbolEls = Array.from({length: 12}, (_, i) => document.getElementById(`rSym${i}`));
const SEP = "  ✦  "; // ✦

// Maximum character budget for the outer ring (one copy = half the circumference).
// Return (69 chars) works; Ya Bouy (75 chars) overlaps — 70 is the safe ceiling.
const OUTER_MAX = 70;

// Shrink a parts array to fit within max chars when joined by SEP:
//   1. try full values
//   2. strip leading articles (The, A, An) from each part
//   3. iteratively trim the longest part with "…" until it fits
function shrinkToFit(parts, max) {
  if (parts.join(SEP).length <= max) return parts.join(SEP);

  const p = parts.map(s => s.replace(/^(the|an?)\s+/i, ""));
  if (p.join(SEP).length <= max) return p.join(SEP);

  while (p.join(SEP).length > max) {
    const li = p.reduce((mi, s, i) => s.length > p[mi].length ? i : mi, 0);
    if (p[li].length <= 2) break;
    const f = p[li];
    p[li] = (f.endsWith("…") ? f.slice(0, -2) : f.slice(0, -1)) + "…";
  }
  return p.join(SEP);
}

function ringStrings(i) {
  if (i == null) {
    const norse = "ᚠᛅᚱᚦᚢ ᚼᛅᛁᛚ";
    const idle = {
      outer: SEP + "Go n-éirí an bóthar leat" + SEP + norse + SEP,
      inner: ("γνῶθι σεαυτόν" + SEP).repeat(4),
    };
    if (ambientAlbum == null) return idle;
    const alb = AMBIENT_ALBUMS[ambientAlbum];
    const label = [alb.artist, alb.album].filter(Boolean).join(SEP);
    console.log("[vegvisir] ambient ring:", label);
    return { outer: idle.outer, inner: (label + SEP).repeat(3) };
  }
  const s = SIGIL[i].songs[currentTrack];
  const parts = [s.title || SIGIL[i].name];
  if (s.artist) parts.push(s.artist);
  if (s.album)  parts.push(s.album);
  if (s.year)   parts.push(s.year);

  return {
    outer: shrinkToFit(parts, OUTER_MAX),
    inner: SIGIL[i].incant,
  };
}

function updateRings(i) {
  const { outer, inner } = ringStrings(i);
  ringText.textContent      = outer;
  ringText2.textContent     = outer;
  ringTextInner.textContent  = inner;
  // Show symbols only when idle; hide when a song is loaded.
  const showSym = (i == null);
  ringSymbolEls.forEach(el => el.setAttribute("visibility", showSym ? "visible" : "hidden"));
}
updateRings(null);

/* ---- Nav symbol twinkle --------------------------------------------- */
// Each symbol can briefly flash a random palette color, then fade back.
// Only fires when symbols are visible (idle state).

const TWINKLE_COLORS = [
  "#ff2d95", "#23e0d4", "#8a4dff", "#ff8a1e",
  "#f5c542", "#3f7bff", "#12d1c0", "#ff5db1",
];

(function twinkle() {
  const el = ringSymbolEls[Math.floor(Math.random() * ringSymbolEls.length)];
  if (el.getAttribute("visibility") !== "hidden") {
    const color = TWINKLE_COLORS[Math.floor(Math.random() * TWINKLE_COLORS.length)];
    el.style.transition = "fill 0.08s ease, filter 0.08s ease";
    el.style.fill = "#ffffff";
    el.style.filter = [
      "drop-shadow(0 0 2px #fff)",
      `drop-shadow(0 0 8px ${color})`,
      `drop-shadow(0 0 22px ${color})`,
      `drop-shadow(0 0 50px ${color})`,
    ].join(" ");
    setTimeout(() => {
      el.style.transition = "fill 0.7s ease, filter 1.1s ease";
      el.style.fill = "";
      el.style.filter = "";
    }, 500 + Math.random() * 800);
  }
  setTimeout(twinkle, 500 + Math.random() * 1500);
})();

/* ---- The core player ------------------------------------------------ */

const player = document.getElementById("player");
const progressBar = document.getElementById("progressBar");
const coreElapsed = document.getElementById("coreElapsed");

const R_PROG = 130;
const CIRC = 2 * Math.PI * R_PROG;
progressBar.style.strokeDasharray = CIRC;
progressBar.style.strokeDashoffset = CIRC;

let current = null;
let currentTrack = 0;

// Load an arm into the core WITHOUT playing: light the arm, aim the rings at it,
// set the core glowing "armed". On touch a tap does this, so the meaning can be
// read before committing to a listen.
function armArm(i) {
  svg.classList.remove("hint");   // first interaction ends the come-hither shimmer
  current = i;
  currentTrack = 0;
  ambientAlbum = null;
  ambientTrack = null;
  svg.classList.add("has-active", "armed");
  svg.style.setProperty("--active-accent", SIGIL[i].accent);

  document.querySelectorAll(".arm").forEach((el) =>
    el.classList.toggle("active", +el.dataset.index === i));

  updateRings(i);
  progressBar.style.strokeDashoffset = CIRC;
  player.src = SIGIL[i].songs[0].file;

  if (TOUCH) showMagic(i);        // reveal the meaning and keep it up
}

function playCurrent() {
  if (current == null) return;
  player.play().catch(() => {
    /* Audio not present yet — the sigil still lights and the rings carry the
       song's name. Drop the file into audio/ to hear it. */
  });
}

// Arm + play together (mouse click, keyboard, auto-advance).
function playArm(i) {
  armArm(i);
  playCurrent();
}

function playAmbient() {
  if (ambientAlbum === null) {
    ambientAlbum = Math.floor(Math.random() * AMBIENT_ALBUMS.length);
    ambientTrack = 0;
    updateRings(null);
  }
  player.src = AMBIENT_ALBUMS[ambientAlbum].tracks[ambientTrack].file;
  player.play().catch(() => {});
}

function togglePlay() {
  if (current == null) {
    if (player.paused) playAmbient();
    else player.pause();
    return;
  }
  if (player.paused) playCurrent();
  else player.pause();
}

function fmt(t) {
  if (!isFinite(t)) return "—";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const core = document.getElementById("core");
core.addEventListener("click", togglePlay);
core.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePlay(); }
});

player.addEventListener("play", () => {
  svg.classList.add("playing");
  svg.classList.remove("armed");
  if (TOUCH && current != null) revealFor(current, 3200);  // linger, then fade to the band
});
player.addEventListener("pause", () => {
  svg.classList.remove("playing");
  if (current != null) svg.classList.add("armed");
});

player.addEventListener("timeupdate", () => {
  const dur = player.duration;
  if (isFinite(dur) && dur > 0) {
    progressBar.style.strokeDashoffset = CIRC * (1 - player.currentTime / dur);
    coreElapsed.textContent = `${fmt(player.currentTime)} · ${fmt(dur)}`;
  }
});

player.addEventListener("ended", () => {
  svg.classList.remove("playing");
  if (current == null) {
    const album = AMBIENT_ALBUMS[ambientAlbum];
    if (album && ambientTrack < album.tracks.length - 1) {
      ambientTrack++;
      player.src = album.tracks[ambientTrack].file;
      player.play().catch(() => {});
    } else {
      ambientAlbum = null;
      ambientTrack = null;
      updateRings(null);
    }
    return;
  }
  const arm = SIGIL[current];
  if (currentTrack < arm.songs.length - 1) {
    currentTrack++;
    player.src = arm.songs[currentTrack].file;
    updateRings(current);
    playCurrent();
  }
});

/* ---- Keyboard: space toggles, arrows walk the arms ------------------ */

document.addEventListener("keydown", (e) => {
  if (e.target === core) return;
  if (e.key === " ") { e.preventDefault(); togglePlay(); }
  else if (e.key === "ArrowRight") playArm(current == null ? 0 : (current + 1) % SIGIL.length);
  else if (e.key === "ArrowLeft")  playArm(current == null ? 0 : (current + SIGIL.length - 1) % SIGIL.length);
});

/* ---- Starfield backdrop --------------------------------------------- */

(function starfield() {
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  let w, h, stars;

  function seed() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    const count = Math.min(TOUCH ? 150 : 320, Math.floor((w * h) / (TOUCH ? 9000 : 6000)));
    stars = Array.from({ length: count }, (_, k) => ({
      x: (Math.sin(k * 12.9898) * 43758.5453 % 1 + 1) % 1 * w,
      y: (Math.sin(k * 78.233) * 12543.988 % 1 + 1) % 1 * h,
      r: ((Math.sin(k * 3.17) + 1) / 2) * 1.4 + 0.2,
      tw: ((Math.sin(k * 5.71) + 1) / 2) * 0.9 + 0.1,
      hue: [255, 210, 320][k % 3], // pink-ish / gold-ish / magenta-ish twinkles
    }));
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.tw + s.x));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue}, 80%, 85%, ${a})`;
      ctx.fill();
    }
  }
  function frame() {
    t += 0.012;
    draw();
    requestAnimationFrame(frame);
  }

  seed();
  addEventListener("resize", () => { seed(); draw(); });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) draw();
  else frame();
})();
