# Vegvísir — a wayfinder for the road

An interactive eight-armed vegvísir sigil built as a going-away gift. Each arm
is a song; hover an arm to feel its "magic," click it to loose the song into the
player carved into the core. The song's metadata rides the outer runic band,
rotating slowly in place of the Futhark.

**Aesthetic:** ancient weathered space viking · Guardians-of-the-Galaxy colors.

## The eight arms (the arc)

| # | Arm | Magic | Colour |
|---|-----|-------|--------|
| I | Signal | the thread through noise | cyan |
| II | Drift | the unplanned route | violet |
| III | Spark | invention · ignition | amber |
| IV | Mischief | trickster door | magenta |
| V | Storm | confusion · weather · longing | electric blue |
| VI | Haven | rest · warmth · quiet holding | gold |
| VII | Crossing | departure · distance · sea & sky | teal |
| VIII | Return | re-entry · the path back | pink |

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
