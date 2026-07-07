/* =========================================================================
   Vegvísir — a wayfinder for the road
   -------------------------------------------------------------------------
   HOW TO FILL IN THE MIXTAPE
   Each of the eight arms below is one song. Edit the `song` block:
     • drop the audio file into  audio/  (any name you like)
     • point `file` at it
     • fill title / artist / album / year  → these ride the rotating rings
   The `name` + `incant` are the "magic" shown when you hover an arm.
   The arms are placed clockwise starting at the top (12 o'clock).
   ========================================================================= */

const SIGIL = [
  { name: "Signal",   incant: "beacon · clarity · thread",       accent: "#23e0d4",
    songs: [{ title: "Airwaves", artist: "Thomas Dolby", album: "The Golden Age of Wireless", year: "1982", file: "audio/1-signal.m4a" }] },

  { name: "Drift",    incant: "serendipity · chance",            accent: "#8a4dff",
    songs: [{ title: "Get Confused", artist: "Fischerspooner", album: "Odyssey", year: "2005", file: "audio/2-drift.m4a" }] },

  { name: "Spark",    incant: "invention · ignition",           accent: "#ff8a1e",
    songs: [{ title: "The Grid", artist: "Daft Punk & Crystal Method", album: "TRON: Legacy R3C0NF1GUR3D", year: "2011", file: "audio/3-spark.m4a" }] },

  { name: "Mischief", incant: "cunning · chaos · games",        accent: "#ff2d95",
    songs: [
      { title: "Wolf Like Me", artist: "Local H", album: "Awesome Mix Tape #1", year: "2010", file: "audio/4-mischief-1.m4a" },
      { title: "Elvis is Everywhere", artist: "Mojo Nixon", album: "Bo-Day-Shus!!!", year: "1987", file: "audio/4-mischief-2.m4a" },
    ] },

  { name: "Storm",    incant: "confusion · weather · longing",   accent: "#3f7bff",
    songs: [{ title: "Storm on the Sea", artist: "Thompson Twins", album: "Into the Gap", year: "1984", file: "audio/5-storm.m4a" }] },

  { name: "Haven",    incant: "rest · warmth · respite",         accent: "#f5c542",
    songs: [{ title: "Protection", artist: "Massive Attack", album: "Protection", year: "1994", file: "audio/6-haven.m4a" }] },

  { name: "Crossing", incant: "departure · distance · sea & sky", accent: "#12d1c0",
    songs: [
      { title: "Crossroads",   artist: "Christopher Larkin", album: "Hollow Knight: Original Soundtrack", year: "2017", file: "audio/7-crossing-1.m4a" },
      { title: "False Knight", artist: "Christopher Larkin", album: "Hollow Knight: Original Soundtrack", year: "2017", file: "audio/7-crossing-2.m4a" },
      { title: "Greenpath",    artist: "Christopher Larkin", album: "Hollow Knight: Original Soundtrack", year: "2017", file: "audio/7-crossing-3.m4a" },
      { title: "Who Am I",     artist: "Peace Orchestra", album: "The Animatrix: The Album", year: "2003", file: "audio/7-crossing-4.m4a" },
      { title: "Ya Bouy",      artist: "Omar Faruk Tekbilek & Steve Shehan", album: "Random Thoughts", year: "2006", file: "audio/7-crossing-5.m4a" },
    ] },

  { name: "Return",   incant: "landfall · homecoming · embrace", accent: "#ff5db1",
    songs: [{ title: "To Someone From a Warm Climate", artist: "Hozier", album: "Unreal Unearth", year: "2023", file: "audio/8-return.m4a" }] },
];

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
    return {
      outer: SEP + "Go n-éirí an bóthar leat" + SEP + norse + SEP,
      inner: ("γνῶθι σεαυτόν" + SEP).repeat(4),
    };
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

const AMBIENT_ALBUMS = [
  { album: "Ephemeris", artist: "mndtrp", year: "2015", tracks: [
    { title: "Dissolving Time",                       file: "audio/ambient-01.m4a" },
    { title: "Blank",                                 file: "audio/ambient-02.m4a" },
    { title: "Orientations (Above Towns Edit)",       file: "audio/ambient-03.m4a" },
    { title: "Orientations, Pt 2",                    file: "audio/ambient-04.m4a" },
    { title: "Orientations, Pt 3",                    file: "audio/ambient-05.m4a" },
    { title: "Cobalt",                                file: "audio/ambient-06.m4a" },
    { title: "Fade Away",                             file: "audio/ambient-07.m4a" },
    { title: "Diagrams",                              file: "audio/ambient-08.m4a" },
    { title: "Something Heavens",                     file: "audio/ambient-09.m4a" },
    { title: "Saturday Barbecue With New Neighbours", file: "audio/ambient-10.m4a" },
  ]},
  { album: "Instrumentals", artist: "Mouse on Mars", year: "", tracks: [
    { title: "auto orchestra", file: "audio/ambient-11.mp3" },
    { title: "owai",           file: "audio/ambient-12.mp3" },
    { title: "chromantic",     file: "audio/ambient-13.mp3" },
    { title: "pegel gesetzt",  file: "audio/ambient-14.mp3" },
    { title: "rompatroullie",  file: "audio/ambient-15.mp3" },
    { title: "1001",           file: "audio/ambient-16.mp3" },
    { title: "subnubus",       file: "audio/ambient-17.mp3" },
  ]},
  { album: "Immunity", artist: "Jon Hopkins", year: "2013", tracks: [
    { title: "We Disappear",                          file: "audio/immunity-01.m4a" },
    { title: "Open Eye Signal",                       file: "audio/immunity-02.m4a" },
    { title: "Breathe This Air",                      file: "audio/immunity-03.m4a" },
    { title: "Collider",                              file: "audio/immunity-04.m4a" },
    { title: "Abandon Window",                        file: "audio/immunity-05.m4a" },
    { title: "Form by Firelight",                     file: "audio/immunity-06.m4a" },
    { title: "Sun Harmonics",                         file: "audio/immunity-07.m4a" },
    { title: "Immunity",                              file: "audio/immunity-08.m4a" },
    { title: "Open Eye Signal (Happa remix)",         file: "audio/immunity-09.m4a" },
    { title: "Open Eye Signal (Lord of the Isles remix)", file: "audio/immunity-10.m4a" },
    { title: "Open Eye Signal (Luke Abbott remix)",   file: "audio/immunity-11.m4a" },
    { title: "Open Eye Signal (Nosaj Thing remix)",   file: "audio/immunity-12.m4a" },
  ]},
  { album: "Insides", artist: "Jon Hopkins", year: "2008", tracks: [
    { title: "The Wider Sun",         file: "audio/insides-01.m4a" },
    { title: "Vessel",                file: "audio/insides-02.m4a" },
    { title: "Insides",               file: "audio/insides-03.m4a" },
    { title: "Wire",                  file: "audio/insides-04.m4a" },
    { title: "Colour Eye",            file: "audio/insides-05.m4a" },
    { title: "Light Through the Veins", file: "audio/insides-06.m4a" },
    { title: "The Low Places",        file: "audio/insides-07.m4a" },
    { title: "Small Memory",          file: "audio/insides-08.m4a" },
    { title: "A Drifting Up",         file: "audio/insides-09.m4a" },
    { title: "Autumn Hill",           file: "audio/insides-10.m4a" },
  ]},
];

let current = null;
let currentTrack = 0;
let ambientAlbum = null;
let ambientTrack = null;

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
    const count = Math.min(320, Math.floor((w * h) / 6000));
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
      ctx.shadowBlur = 6;
      ctx.shadowColor = `hsla(${s.hue}, 90%, 70%, ${a})`;
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
