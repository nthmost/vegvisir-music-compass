#!/usr/bin/env python3
"""
Parse Apache access logs for Vegvísir audio plays and write logs/index.html.

Usage:
    python3 tools/log_report.py [--log /path/to/access.log] [--out logs/index.html]

Defaults:
    --log  /var/log/apache2/access.log
    --out  logs/index.html   (relative to script's parent dir)

Deduplication: (ip, file) requests within a 5-minute window = one play.
Run via cron for a live-ish report, e.g.:
    */15 * * * * cd /var/www/vegvisir && python3 tools/log_report.py
"""

import argparse
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# ── Song metadata (mirrors data.js) ──────────────────────────────────────────

SONGS = {
    "audio/1-signal.m4a":       ("Signal",   "Airwaves",                            "Thomas Dolby"),
    "audio/2-drift.m4a":        ("Drift",    "Get Confused",                         "Fischerspooner"),
    "audio/3-spark.m4a":        ("Spark",    "The Grid",                             "Daft Punk & Crystal Method"),
    "audio/4-mischief-1.m4a":   ("Mischief", "Wolf Like Me",                         "Local H"),
    "audio/4-mischief-2.m4a":   ("Mischief", "Elvis is Everywhere",                  "Mojo Nixon"),
    "audio/5-storm.m4a":        ("Storm",    "Storm on the Sea",                     "Thompson Twins"),
    "audio/6-haven.m4a":        ("Haven",    "Protection",                           "Massive Attack"),
    "audio/6-haven-2.m4a":      ("Haven",    "Dry the Rain",                         "The Beta Band"),
    "audio/7-crossing-1.m4a":   ("Crossing", "Crossroads",                           "Christopher Larkin"),
    "audio/7-crossing-4.m4a":   ("Crossing", "Who Am I",                             "Peace Orchestra"),
    "audio/7-crossing-5.m4a":   ("Crossing", "Ya Bouy",                              "Omar Faruk Tekbilek & Steve Shehan"),
    "audio/8-return.m4a":       ("Return",   "To Someone From a Warm Climate",        "Hozier"),
}

AMBIENT_ALBUMS = {
    "ambient":   ("mndtrp",     "Ephemeris"),
    "immunity":  ("Jon Hopkins", "Immunity"),
    "insides":   ("Jon Hopkins", "Insides"),
}

# ── Log parsing ───────────────────────────────────────────────────────────────

# Combined Log Format: ip - - [dd/Mon/yyyy:hh:mm:ss +zone] "METHOD /path HTTP/x" status bytes ...
LOG_RE = re.compile(
    r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] '
    r'"(?:GET|HEAD) (?P<path>[^ "]+) HTTP[^"]*" (?P<status>\d{3})'
)
TIME_FMT = "%d/%b/%Y:%H:%M:%S %z"


def parse_time(raw):
    try:
        return datetime.strptime(raw, TIME_FMT)
    except ValueError:
        return None


def classify(path):
    """Return (file_key, label) or None if not an audio request we care about."""
    path = path.lstrip("/").split("?")[0]
    if path in SONGS:
        arm, title, artist = SONGS[path]
        return path, f"{title} — {artist} [{arm}]"
    # ambient: audio/ambient-01.m4a, audio/immunity-03.m4a, etc.
    m = re.match(r"audio/(ambient|immunity|insides)-\d+\.\w+", path)
    if m:
        key = m.group(1)
        artist, album = AMBIENT_ALBUMS.get(key, ("?", "?"))
        return path, f"[ambient] {artist} · {album}"
    return None, None


def parse_log(log_path):
    """Return list of (ip, file_key, label, dt) for audio plays (200 or 206)."""
    events = []
    try:
        fh = open(log_path, errors="replace")
    except OSError as e:
        sys.exit(f"Cannot open log: {e}")
    with fh:
        for line in fh:
            m = LOG_RE.match(line)
            if not m:
                continue
            status = m.group("status")
            if status not in ("200", "206"):
                continue
            file_key, label = classify(m.group("path"))
            if file_key is None:
                continue
            dt = parse_time(m.group("time"))
            if dt is None:
                continue
            events.append((m.group("ip"), file_key, label, dt))
    return events


def deduplicate(events, window_minutes=5):
    """Collapse (ip, file) hits within a window into one play."""
    plays = []
    last = {}  # (ip, file_key) → last-seen datetime
    for ip, fkey, label, dt in sorted(events, key=lambda e: e[3]):
        k = (ip, fkey)
        prev = last.get(k)
        if prev is None or (dt - prev).total_seconds() > window_minutes * 60:
            plays.append((ip, fkey, label, dt))
        last[k] = dt
    return plays


# ── HTML generation ───────────────────────────────────────────────────────────

CSS = """
body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a051a;
       color: #e9dcc3; margin: 0; padding: 2rem; }
h1 { color: #f5c542; letter-spacing: .08em; margin-bottom: .2em; }
.meta { color: #888; font-size: .85rem; margin-bottom: 2rem; }
h2 { color: #23e0d4; border-bottom: 1px solid #23e0d422; padding-bottom: .3em; }
table { border-collapse: collapse; width: 100%; max-width: 900px; margin-bottom: 2.5rem; }
th { text-align: left; color: #f5c542; border-bottom: 1px solid #f5c54244;
     padding: .4em .8em; font-size: .8rem; letter-spacing: .1em; text-transform: uppercase; }
td { padding: .35em .8em; border-bottom: 1px solid #ffffff0d; font-size: .9rem; }
tr:hover td { background: #ffffff08; }
.dim { color: #888; font-size: .8rem; }
.ip  { font-family: monospace; }
"""

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_html(plays, generated_at):
    total_plays = len(plays)
    unique_ips = len({ip for ip, *_ in plays})

    # Per-song stats
    song_stats = defaultdict(lambda: {"plays": 0, "ips": set(), "last": None})
    for ip, fkey, label, dt in plays:
        s = song_stats[(fkey, label)]
        s["plays"] += 1
        s["ips"].add(ip)
        if s["last"] is None or dt > s["last"]:
            s["last"] = dt

    # Per-IP stats
    ip_stats = defaultdict(lambda: {"plays": 0, "songs": set(), "last": None})
    for ip, fkey, label, dt in plays:
        s = ip_stats[ip]
        s["plays"] += 1
        s["songs"].add(label)
        if s["last"] is None or dt > s["last"]:
            s["last"] = dt

    def fmt_dt(dt):
        return dt.strftime("%Y-%m-%d %H:%M") if dt else "—"

    rows_songs = ""
    for (fkey, label), s in sorted(song_stats.items(), key=lambda x: -x[1]["plays"]):
        rows_songs += (
            f"<tr><td>{esc(label)}</td>"
            f"<td>{s['plays']}</td>"
            f"<td>{len(s['ips'])}</td>"
            f"<td class='dim'>{fmt_dt(s['last'])}</td></tr>\n"
        )

    rows_ips = ""
    for ip, s in sorted(ip_stats.items(), key=lambda x: -x[1]["plays"]):
        songs_list = "; ".join(sorted(s["songs"]))
        rows_ips += (
            f"<tr><td class='ip'>{esc(ip)}</td>"
            f"<td>{s['plays']}</td>"
            f"<td class='dim'>{esc(songs_list)}</td>"
            f"<td class='dim'>{fmt_dt(s['last'])}</td></tr>\n"
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Vegvísir · Play Log</title>
<style>{CSS}</style>
</head>
<body>
<h1>Vegvísir · Play Log</h1>
<p class="meta">
  {total_plays} plays · {unique_ips} unique IPs ·
  generated {esc(generated_at)}
</p>

<h2>By song</h2>
<table>
<thead><tr><th>Song</th><th>Plays</th><th>Unique IPs</th><th>Last played</th></tr></thead>
<tbody>
{rows_songs}</tbody>
</table>

<h2>By IP</h2>
<table>
<thead><tr><th>IP</th><th>Plays</th><th>Songs</th><th>Last seen</th></tr></thead>
<tbody>
{rows_ips}</tbody>
</table>
</body>
</html>
"""


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    here = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--log", default="/var/log/apache2/access.log",
                        help="Apache access log path")
    parser.add_argument("--out", default=str(here / "logs" / "index.html"),
                        help="Output HTML file")
    args = parser.parse_args()

    events = parse_log(args.log)
    plays  = deduplicate(events)
    now    = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    html   = build_html(plays, now)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"Wrote {len(plays)} plays → {out}")


if __name__ == "__main__":
    main()
