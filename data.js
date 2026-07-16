/* =========================================================================
   Vegvísir — shared data
   Edit this file to add/remove arms and ambient albums.
   Both index.html (the compass) and manifest.html (the overview) load it.
   ========================================================================= */

const SIGIL = [
  { name: "Signal",   incant: "beacon · clarity · thread",       accent: "#23e0d4",
    songs: [{ title: "Airwaves", artist: "Thomas Dolby", album: "The Golden Age of Wireless", year: "1982", file: "audio/1-signal.m4a" }] },

  { name: "Drift",    incant: "serendipity · chance",            accent: "#8a4dff",
    songs: [
      { title: "Get Confused", artist: "Fischerspooner", album: "Odyssey", year: "2005", file: "audio/2-drift.m4a" },
      { title: "Yekte",        artist: "Seren Saraç",    album: "YEKTE",   year: "2026", file: "audio/2-drift-2.m4a" },
    ] },

  { name: "Spark",    incant: "invention · ignition",           accent: "#ff8a1e",
    songs: [{ title: "The Grid", artist: "Daft Punk & Crystal Method", album: "TRON: Legacy R3C0NF1GUR3D", year: "2011", file: "audio/3-spark.m4a" }] },

  { name: "Mischief", incant: "cunning · chaos · games",        accent: "#ff2d95",
    songs: [
      { title: "Wolf Like Me",        artist: "Local H",     album: "Awesome Mix Tape #1", year: "2010", file: "audio/4-mischief-1.m4a" },
      { title: "Elvis is Everywhere", artist: "Mojo Nixon",  album: "Bo-Day-Shus!!!", year: "1987", file: "audio/4-mischief-2.m4a" },
    ] },

  { name: "Storm",    incant: "confusion · weather · longing",   accent: "#3f7bff",
    songs: [{ title: "Storm on the Sea", artist: "Thompson Twins", album: "Into the Gap", year: "1984", file: "audio/5-storm.m4a" }] },

  { name: "Haven",    incant: "rest · warmth · respite",         accent: "#f5c542",
    songs: [
      { title: "Protection",   artist: "Massive Attack", album: "Protection",  year: "1994", file: "audio/6-haven.m4a" },
      { title: "Dry the Rain", artist: "The Beta Band",  album: "The Three EPs", year: "1998", file: "audio/6-haven-2.m4a" },
    ] },

  { name: "Crossing", incant: "departure · distance · sea & sky", accent: "#12d1c0",
    songs: [
      { title: "Crossroads", artist: "Christopher Larkin", album: "Hollow Knight: Original Soundtrack", year: "2017", file: "audio/7-crossing-1.m4a" },
      { title: "Who Am I",   artist: "Peace Orchestra",    album: "The Animatrix: The Album", year: "2003", file: "audio/7-crossing-4.m4a" },
      { title: "Ya Bouy",    artist: "Omar Faruk Tekbilek & Steve Shehan", album: "Random Thoughts", year: "2006", file: "audio/7-crossing-5.m4a" },
    ] },

  { name: "Return",   incant: "landfall · homecoming · embrace", accent: "#ff5db1",
    songs: [{ title: "To Someone From a Warm Climate", artist: "Hozier", album: "Unreal Unearth", year: "2023", file: "audio/8-return.m4a" }] },
];

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
    { title: "We Disappear",                              file: "audio/immunity-01.m4a" },
    { title: "Open Eye Signal",                           file: "audio/immunity-02.m4a" },
    { title: "Breathe This Air",                          file: "audio/immunity-03.m4a" },
    { title: "Collider",                                  file: "audio/immunity-04.m4a" },
    { title: "Abandon Window",                            file: "audio/immunity-05.m4a" },
    { title: "Form by Firelight",                         file: "audio/immunity-06.m4a" },
    { title: "Sun Harmonics",                             file: "audio/immunity-07.m4a" },
    { title: "Immunity",                                  file: "audio/immunity-08.m4a" },
    { title: "Open Eye Signal (Happa remix)",             file: "audio/immunity-09.m4a" },
    { title: "Open Eye Signal (Lord of the Isles remix)", file: "audio/immunity-10.m4a" },
    { title: "Open Eye Signal (Luke Abbott remix)",       file: "audio/immunity-11.m4a" },
    { title: "Open Eye Signal (Nosaj Thing remix)",       file: "audio/immunity-12.m4a" },
  ]},
  { album: "Insides", artist: "Jon Hopkins", year: "2008", tracks: [
    { title: "The Wider Sun",           file: "audio/insides-01.m4a" },
    { title: "Vessel",                  file: "audio/insides-02.m4a" },
    { title: "Insides",                 file: "audio/insides-03.m4a" },
    { title: "Wire",                    file: "audio/insides-04.m4a" },
    { title: "Colour Eye",              file: "audio/insides-05.m4a" },
    { title: "Light Through the Veins", file: "audio/insides-06.m4a" },
    { title: "The Low Places",          file: "audio/insides-07.m4a" },
    { title: "Small Memory",            file: "audio/insides-08.m4a" },
    { title: "A Drifting Up",           file: "audio/insides-09.m4a" },
    { title: "Autumn Hill",             file: "audio/insides-10.m4a" },
  ]},
];
