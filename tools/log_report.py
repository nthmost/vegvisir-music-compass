#!/usr/bin/env python3
"""
Parse Apache access logs for Vegvísir audio plays and write logs/index.html.

Usage:
    python3 tools/log_report.py [--log /path/to/access.log] [--out logs/index.html]

Defaults:
    --log  /var/log/apache2/zs.nthmost.net_access.log
    --out  logs/index.html   (relative to script's parent dir)

Reads the named log plus all rotated siblings (.1, .2.gz, …) automatically.
Deduplication: (ip, file) requests within a 5-minute window = one play.
IP labels cached in logs/ip_cache.json; unknown IPs looked up via ip-api.com.
Run via cron for a live-ish report, e.g.:
    */15 * * * * cd /var/www/vegvisir && python3 tools/log_report.py
"""

import argparse
import gzip
import json
import re
import sys
import urllib.request
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

# ── IP labelling ──────────────────────────────────────────────────────────────

# ISP substrings that identify the home connection (Sonic fiber, SF).
HOME_ISP_KEYWORDS = ["sonic telecom", "sonic.net"]

# ISP/org substrings that indicate a mobile carrier.
MOBILE_KEYWORDS = ["mobile", "wireless", "cellular", "t-mobile", "verizon", "sprint",
                   "at&t enterprises", "at&t mobility", "dish network"]

# Org substrings that indicate cloud/hosting (likely bots or scanners).
CLOUD_KEYWORDS = ["digitalocean", "amazon", "google", "linode", "vultr", "ovh",
                  "hetzner", "cloudflare", "fastly", "akamai", "leaseweb",
                  "octopus web", "multacom", "choopa", "m247"]


def make_label(info):
    """Turn an ip-api.com result dict into a human-readable location label."""
    isp     = (info.get("isp")    or "").lower()
    org     = (info.get("org")    or "").lower()
    city    = info.get("city",    "")
    region  = info.get("regionName", "")
    country = info.get("country", "")
    cc      = info.get("countryCode", "")

    combined = isp + " " + org

    if any(k in combined for k in HOME_ISP_KEYWORDS):
        return "home"

    if any(k in combined for k in CLOUD_KEYWORDS):
        loc = city or country
        return f"{loc} (cloud)" if loc else "cloud"

    if any(k in combined for k in MOBILE_KEYWORDS):
        loc = city or country
        return f"{loc} (mobile)" if loc else "mobile"

    # Regular ISP — show city + state/country
    if cc == "US":
        parts = [p for p in [city, region] if p]
        return ", ".join(parts) if parts else "US"

    parts = [p for p in [city, country] if p]
    return ", ".join(parts) if parts else cc or "?"


def load_cache(cache_path):
    try:
        return json.loads(cache_path.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def save_cache(cache_path, cache):
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, indent=2))


def lookup_ips(ips, cache):
    """Fetch labels for any IPs not already in cache. Updates cache in-place."""
    unknown = [ip for ip in ips if ip not in cache]
    if not unknown:
        return

    # ip-api.com batch: up to 100 per request, free for non-commercial use.
    BATCH = 100
    for i in range(0, len(unknown), BATCH):
        chunk = unknown[i:i + BATCH]
        body  = json.dumps([{"query": ip} for ip in chunk]).encode()
        req   = urllib.request.Request(
            "http://ip-api.com/batch?fields=status,country,countryCode,regionName,city,isp,org,query",
            data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                results = json.loads(r.read())
            for entry in results:
                ip = entry.get("query", "")
                if ip:
                    cache[ip] = make_label(entry) if entry.get("status") == "success" else "?"
        except Exception as e:
            print(f"Warning: IP lookup failed: {e}", file=sys.stderr)
            for ip in chunk:
                cache.setdefault(ip, "?")

# ── Log parsing ───────────────────────────────────────────────────────────────

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
    path = path.lstrip("/").split("?")[0]
    if path in SONGS:
        arm, title, artist = SONGS[path]
        return path, f"{title} — {artist} [{arm}]"
    m = re.match(r"audio/(ambient|immunity|insides)-\d+\.\w+", path)
    if m:
        key = m.group(1)
        artist, album = AMBIENT_ALBUMS.get(key, ("?", "?"))
        return path, f"[ambient] {artist} · {album}"
    return None, None


def _open(path):
    return gzip.open(path, "rt", errors="replace") if str(path).endswith(".gz") else open(path, errors="replace")


def parse_log(log_path):
    base = Path(log_path)
    siblings = sorted(base.parent.glob(base.name + "*"), key=lambda p: p.name)
    if not siblings:
        sys.exit(f"No log files found matching {base}*")

    events = []
    for path in siblings:
        try:
            fh = _open(path)
        except OSError as e:
            print(f"Warning: skipping {path}: {e}", file=sys.stderr)
            continue
        with fh:
            for line in fh:
                m = LOG_RE.match(line)
                if not m:
                    continue
                if m.group("status") not in ("200", "206"):
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
    plays = []
    last = {}
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
table { border-collapse: collapse; width: 100%; max-width: 960px; margin-bottom: 2.5rem; }
th { text-align: left; color: #f5c542; border-bottom: 1px solid #f5c54244;
     padding: .4em .8em; font-size: .8rem; letter-spacing: .1em; text-transform: uppercase; }
td { padding: .35em .8em; border-bottom: 1px solid #ffffff0d; font-size: .9rem; }
tr:hover td { background: #ffffff08; }
.dim  { color: #888; font-size: .8rem; }
.ip   { font-family: monospace; color: #a09080; font-size: .8rem; }
.lbl  { color: #f5c542; font-size: .8rem; }
.lbl-home   { color: #23e0d4; }
.lbl-cloud  { color: #555; }
.lbl-mobile { color: #8a4dff; }
.play-entry { line-height: 1.6; }
.play-entry .dim { display: inline-block; min-width: 11ch; }
"""


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def lbl_class(label):
    if label == "home":
        return "lbl lbl-home"
    if "(cloud)" in label:
        return "lbl lbl-cloud"
    if "(mobile)" in label:
        return "lbl lbl-mobile"
    return "lbl"


def build_html(plays, ip_cache, generated_at):
    total_plays = len(plays)
    unique_ips  = len({ip for ip, *_ in plays})

    # Per-song stats
    song_stats = defaultdict(lambda: {"plays": 0, "ips": set(), "last": None})
    for ip, fkey, slabel, dt in plays:
        s = song_stats[(fkey, slabel)]
        s["plays"] += 1
        s["ips"].add(ip)
        if s["last"] is None or dt > s["last"]:
            s["last"] = dt

    # Per-IP stats
    ip_stats = defaultdict(lambda: {"plays": 0, "events": [], "last": None})
    for ip, fkey, slabel, dt in plays:
        s = ip_stats[ip]
        s["plays"] += 1
        s["events"].append((dt, slabel))
        if s["last"] is None or dt > s["last"]:
            s["last"] = dt

    def fmt_dt(dt):
        return dt.strftime("%Y-%m-%d %H:%M") if dt else "—"

    rows_songs = ""
    for (fkey, slabel), s in sorted(song_stats.items(), key=lambda x: -x[1]["plays"]):
        rows_songs += (
            f"<tr><td>{esc(slabel)}</td>"
            f"<td>{s['plays']}</td>"
            f"<td>{len(s['ips'])}</td>"
            f"<td class='dim'>{fmt_dt(s['last'])}</td></tr>\n"
        )

    rows_ips = ""
    for ip, s in sorted(ip_stats.items(), key=lambda x: -x[1]["plays"]):
        label  = ip_cache.get(ip, "?")
        lclass = lbl_class(label)
        events_html = "".join(
            f"<div class='play-entry'><span class='dim'>{fmt_dt(dt)}</span> {esc(slabel)}</div>"
            for dt, slabel in sorted(s["events"])
        )
        rows_ips += (
            f"<tr>"
            f"<td><span class='ip'>{esc(ip)}</span> <span class='{lclass}'>{esc(label)}</span></td>"
            f"<td>{s['plays']}</td>"
            f"<td>{events_html}</td>"
            f"</tr>\n"
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

<h2>By visitor</h2>
<table>
<thead><tr><th>IP · location</th><th>Plays</th><th>Play history</th></tr></thead>
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
    parser.add_argument("--log", default="/var/log/apache2/zs.nthmost.net_access.log")
    parser.add_argument("--out", default=str(here / "logs" / "index.html"))
    parser.add_argument("--cache", default=str(here / "logs" / "ip_cache.json"))
    args = parser.parse_args()

    events = parse_log(args.log)
    plays  = deduplicate(events)

    cache_path = Path(args.cache)
    cache      = load_cache(cache_path)
    unique_ips = {ip for ip, *_ in plays}
    lookup_ips(unique_ips, cache)
    save_cache(cache_path, cache)

    now  = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    html = build_html(plays, cache, now)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"Wrote {len(plays)} plays ({len(unique_ips)} IPs labelled) → {out}")


if __name__ == "__main__":
    main()
