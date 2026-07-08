# Vegvísir — a wayfinder for the road

An interactive eight-armed vegvísir sigil built as a going-away gift. Each arm
is a song; hover an arm to feel its "magic," click it to loose the song into the
player carved into the core. The song's metadata rides the outer runic band,
rotating slowly in place of the Futhark.

**Aesthetic:** ancient weathered space viking · Guardians-of-the-Galaxy colors.

## The eight arms (the arc)

| # | Arm | Magic | Colour |
|---|-----|-------|--------|
| I | Signal | beacon · clarity · thread | cyan |
| II | Drift | serendipity · chance | violet |
| III | Spark | invention · ignition | amber |
| IV | Mischief | cunning · chaos · games | magenta |
| V | Storm | confusion · weather · longing | electric blue |
| VI | Haven | rest · warmth · respite | gold |
| VII | Crossing | departure · distance · sea & sky | teal |
| VIII | Return | landfall · homecoming · embrace | pink |

The arc runs Signal → Return, clockwise from the top. When *Return* ends, the
circle closes back to *Signal*.

## Adding the music

1. Drop eight audio files into [`audio/`](audio/).
2. In [`app.js`](app.js), edit the `SIGIL` array at the very top — for each arm:
   - point `file` at your audio filename (default names are `audio/1-signal.mp3` … `audio/8-return.mp3`)
   - fill in `title`, `artist`, `album`, `year` — these are what rotate on the rings
     (`title` rides the outer band; `artist · album · year` ride the inner band).

That's the only file you need to touch. The names and incantations are already set.

## Running it locally

Any static server works (the audio just needs to be served over http, not `file://`):

```sh
cd ~/projects/vegvisir
python3 -m http.server 8080
# open http://localhost:8080
```

## Controls

**Desktop (mouse):**
- **Hover an arm** → its magic appears.
- **Click an arm** → plays its song.
- **Click the core** → play / pause.
- **Space** → play / pause · **← / →** → walk between arms.

**Mobile (touch):** there's no hover, so the model is *reveal then play*.
- On load the arms shimmer once in their colors — a wordless "tap me."
- **Tap an arm** → its magic appears and stays, and the song loads into the core, which starts glowing in that arm's color.
- **Tap the glowing core** → plays. Tap another arm to switch. Once a song is
  playing, the meaning lingers a few seconds, then fades and the rotating band
  carries the song's identity.

Touch vs mouse is detected via `matchMedia("(hover: none)")`, so each device
gets the right model automatically.

## Deploying

Static site — bound for a subdomain on **zephyr** (Apache2). Copy the folder to a
webroot and point an Apache vhost at it. (Deploy steps to be finalized once the
songs are in and the subdomain is chosen.)

## Performance notes

The app is designed to run on modest hardware (tested on Librem 5). Several
rendering choices were made specifically to keep the GPU and compositor load low:

**Canvas starfield**
- `shadowBlur` is not used — it requires a per-pixel blur pass every frame and is
  the single most expensive canvas operation at 60 fps.
- Star count is capped at 150 on touch/coarse-pointer devices (vs. 320 on desktop)
  and the density formula is less aggressive, so the rAF budget is preserved for
  audio decode.

**CSS animations**
- The nebula `filter: blur()` is 50 px (was 80 px) — smaller kernel means less GPU
  work per compositor frame. All three nebula divs carry `will-change: transform`
  so they get their own compositor layers and their drift animation never touches
  the main thread.
- The frame-ring glow is static (no `bifrost` animation). Animating `filter`
  forces a full GPU repaint each frame; a handpicked midpoint value looks
  identical in practice.
- The core breathe and armed-pulse animations use `opacity` instead of
  `stroke-opacity`. SVG `stroke-opacity` cannot be composited — it forces a
  repaint every frame. `opacity` on an element IS composited and runs free on the
  compositor thread.
- The `armed-pulse` animation drops the `filter` keyframes; only `opacity` pulses.
  The glow is now a static `drop-shadow` on the element, not a per-frame repaint.
