#!/usr/bin/env python3
"""Build the .ics invite and the PDF + PNG flyer for each USF AI Collaborative meeting.

Everything comes from assets/data/collaborative.json. Flyers are rendered with
headless Google Chrome, so Chrome must be installed and the machine online
(the flyer loads Tailwind and Google Fonts).

    python3 scripts/build-collaborative.py              # every event
    python3 scripts/build-collaborative.py 2027-01-08   # just one date
    python3 scripts/build-collaborative.py --ics-only   # skip the flyers
"""
import datetime as dt
import html
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets", "data", "collaborative.json")
CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
    "chromium",
    "chromium-browser",
]

VTIMEZONE = """BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE"""


def clock(hhmm):
    h, m = (int(x) for x in hhmm.split(":"))
    return f"{(h % 12) or 12}:{m:02d}"


def ampm(hhmm):
    return "PM" if int(hhmm.split(":")[0]) >= 12 else "AM"


def span(start, end):
    return f"{clock(start)} - {clock(end)}"


def ics_escape(text):
    return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def fold(line):
    raw = line.encode("utf-8")
    if len(raw) <= 75:
        return line
    out, cur = [], b""
    for ch in line:
        b = ch.encode("utf-8")
        limit = 75 if not out else 74
        if len(cur) + len(b) > limit:
            out.append(cur.decode("utf-8"))
            cur = b""
        cur += b
    out.append(cur.decode("utf-8"))
    return "\r\n ".join(out)


def build_ics(series, ev):
    d = ev["date"].replace("-", "")
    full_title = ev["title"] + (f": {ev['subtitle']}" if ev.get("subtitle") else "")
    talk = ev["title"] + (" (talk title to be announced)" if ev.get("tbd_title") else "")
    agenda = series["agenda"]
    desc = [
        f"{series['series']}: {full_title}",
        "",
        f"{span(agenda[0]['start'], agenda[0]['end'])}  Talk: {talk}",
        f"Presented by {ev['speaker']}",
        *ev["roles"],
        f"{span(agenda[1]['start'], agenda[1]['end'])}  {agenda[1]['what']}: open discussion",
    ]
    if ev.get("bio"):
        desc += ["", f"About the speaker: {ev['bio']}"]
    desc += ["", f"Join on Microsoft Teams: {series['teams_url']}"]
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//USF AI Collaborative//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        *VTIMEZONE.split("\n"),
        "BEGIN:VEVENT",
        f"UID:{ev['uid']}",
        f"SEQUENCE:{int(ev.get('sequence', 1))}",
        f"DTSTAMP:{stamp}",
        f"DTSTART;TZID={ev['tz']}:{d}T{ev['start'].replace(':', '')}00",
        f"DTEND;TZID={ev['tz']}:{d}T{ev['end'].replace(':', '')}00",
        f"SUMMARY:{ics_escape(series['series'] + ': ' + ev['title'])}",
        f"DESCRIPTION:{ics_escape(chr(10).join(desc))}",
        "LOCATION:Microsoft Teams",
        f"URL:{series['teams_url']}",
        "STATUS:CONFIRMED",
        "BEGIN:VALARM",
        "TRIGGER:-PT15M",
        "ACTION:DISPLAY",
        f"DESCRIPTION:{series['series']} starts in 15 minutes",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(fold(l) for l in lines) + "\r\n"


FLYER = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {{ theme: {{ extend: {{
    colors: {{ usfgreen: {{ DEFAULT: '#006747', deep: '#004D34', dark: '#00321F' }}, usfgold: {{ DEFAULT: '#CFC493', warm: '#E8A317', bright: '#FDB927' }}, ink: {{ DEFAULT: '#0F1714', soft: '#3B4A44' }}, paper: {{ DEFAULT: '#FAFAF7', warm: '#F4F1E8' }} }},
    fontFamily: {{ display: ['Fraunces', 'Georgia', 'serif'], sans: ['Inter', 'system-ui', 'sans-serif'] }}
  }}}}}};
</script>
<style>
  @page {{ size: letter; margin: 0; }}
  html, body {{ margin: 0; padding: 0; }}
  * {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  .sheet {{ width: 8.5in; height: 11in; }}
</style>
</head>
<body class="font-sans text-ink antialiased">
<div class="sheet bg-paper flex flex-col overflow-hidden">

  <header class="bg-gradient-to-br from-usfgreen-dark via-usfgreen-deep to-usfgreen text-paper px-12 pt-7 pb-7 border-b-[6px] border-usfgold-warm">
    <p class="font-display font-bold text-[22px] tracking-tight text-right mb-1">TR<span class="text-usfgold-warm text-[29px]">AI</span>N-A-BULL</p>
    <h1 class="font-display font-bold text-[50px] leading-[1.02] mb-3">USF AI<br />Collaborative</h1>
    <p class="text-[15px] font-light leading-relaxed text-paper/90 max-w-[5.6in]">{tagline}</p>
  </header>

  <main class="flex-1 min-h-0 overflow-hidden px-12 pt-7 pb-4" style="background-image: radial-gradient(circle at 1px 1px, rgba(0,103,71,0.10) 1px, transparent 0); background-size: 22px 22px;">
    <div class="flex gap-8">
      <div class="flex-1 min-w-0">
        <p class="text-[11px] font-semibold tracking-[0.24em] uppercase text-usfgold-warm mb-2">Next Meeting</p>
        <h2 class="font-display font-bold text-usfgreen leading-[1.08] mb-2 {title_size}">{title}</h2>
        {subtitle}
        <div class="flex items-start gap-4 mt-4 mb-4">
          {photo}
          <div class="border-l-4 border-usfgold-warm pl-4">
            <p class="font-semibold text-[17px] text-ink leading-snug">{speaker}</p>
            {roles}
          </div>
        </div>
        {bio}
        <div class="flex items-center gap-5 mb-4">
          <div class="bg-usfgreen-deep text-paper rounded-2xl px-5 py-3 text-center shrink-0 min-w-[1.35in]">
            <p class="text-[11px] font-semibold tracking-[0.2em] uppercase text-usfgold-warm">{month}</p>
            <p class="font-display text-[46px] font-bold leading-none my-1">{day}</p>
            <p class="text-xs text-usfgold">{weekday} · {year}</p>
          </div>
          <div>
            <p class="font-display text-[32px] font-bold text-ink leading-none mb-2 whitespace-nowrap">{time}</p>
            <p class="text-ink-soft text-sm">Eastern Time · Virtual on Microsoft Teams</p>
          </div>
        </div>
        <div class="border-t border-usfgold pt-4">
          <p class="text-xs font-semibold tracking-[0.24em] uppercase text-usfgreen mb-3">Agenda</p>
          <div class="flex gap-5 mb-3">
            <p class="text-[15px] font-semibold text-usfgreen w-28 shrink-0">{agenda1}</p>
            <div>
              <p class="text-ink text-[15px] leading-snug">Talk: {talk}</p>
              <p class="text-ink-soft font-light text-sm leading-snug">{summary}</p>
            </div>
          </div>
          <div class="flex gap-5 pt-3 border-t border-dashed border-ink/15">
            <p class="text-[15px] font-semibold text-usfgreen w-28 shrink-0">{agenda2}</p>
            <div>
              <p class="text-ink text-[15px] leading-snug">{agenda2_what}</p>
              <p class="text-ink-soft font-light text-sm leading-snug">{agenda2_detail}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="w-[2.4in] shrink-0">
        <div class="bg-paper-warm border border-usfgold rounded-3xl p-5 text-center">
          <div class="bg-white rounded-xl p-3 mb-4"><img src="{qr}" alt="" class="w-full h-auto" /></div>
          <p class="text-xs font-semibold tracking-[0.18em] uppercase text-usfgreen mb-2">Scan to join</p>
          <p class="text-[13px] text-ink-soft leading-relaxed mb-4">Opens the Microsoft Teams meeting directly on your phone or laptop.</p>
          <p class="bg-usfgreen-deep text-usfgold-warm text-xs font-semibold tracking-[0.12em] uppercase rounded-full py-3 px-4">Calendar invite attached</p>
        </div>
      </div>
    </div>
  </main>

  <footer class="bg-ink text-paper/80 px-12 py-4 flex items-center justify-between text-sm shrink-0">
    <p><span class="text-usfgold-warm font-semibold">USF AI Collaborative</span> · TR<span class="text-usfgold-warm">AI</span>N-A-BULL</p>
    <p>{footer_date} · {footer_time} ET · Microsoft Teams</p>
  </footer>
</div>
</body>
</html>
"""


def file_url(rel):
    return "file://" + os.path.join(ROOT, rel)


def build_flyer_html(series, ev):
    e = html.escape
    day = dt.date.fromisoformat(ev["date"])
    title = ev["title"]
    title_size = "text-[38px]" if len(title) <= 28 else "text-[30px]"
    if ev.get("tbd_title"):
        subtitle = '<p class="text-base text-ink-soft">Talk title to be announced</p>'
    elif ev.get("subtitle"):
        subtitle = f'<p class="text-base text-ink-soft">{e(ev["subtitle"])}</p>'
    else:
        subtitle = ""
    photo = ""
    if ev.get("photo"):
        photo = f'<img src="{file_url(ev["photo"])}" alt="" class="w-16 h-16 rounded-full object-cover object-top ring-2 ring-usfgold-warm/70 shrink-0" />'
    roles = "".join(f'<p class="text-ink-soft text-[13px] leading-snug">{e(r)}</p>' for r in ev["roles"])
    bio = ""
    if ev.get("bio_short"):
        bio = f'<p class="text-ink-soft font-light text-[13px] leading-relaxed mb-4">{e(ev["bio_short"])}</p>'
    agenda = series["agenda"]
    return FLYER.format(
        tagline=e(series["tagline"]),
        title=e(title),
        title_size=title_size,
        subtitle=subtitle,
        photo=photo,
        speaker=e(ev["speaker"]),
        roles=roles,
        bio=bio,
        month=day.strftime("%B"),
        day=day.day,
        weekday=day.strftime("%A"),
        year=day.year,
        time=f"{span(ev['start'], ev['end'])} {ampm(ev['end'])}",
        agenda1=span(agenda[0]["start"], agenda[0]["end"]),
        agenda2=span(agenda[1]["start"], agenda[1]["end"]),
        agenda2_what=e(agenda[1]["what"]),
        agenda2_detail=e(agenda[1].get("detail") or ""),
        talk=e(title),
        summary=e(ev.get("summary") or ""),
        qr=file_url(series["qr"]),
        footer_date=f"{day.strftime('%A, %B')} {day.day}",
        footer_time=f"{clock(ev['start'])} {ampm(ev['start'])}",
    )


def find_chrome():
    for p in CHROME_PATHS:
        if os.path.isfile(p) or shutil.which(p):
            return p if os.path.isfile(p) else shutil.which(p)
    sys.exit("Google Chrome not found; rerun with --ics-only or install Chrome.")


def render(chrome, html_path, pdf_path, png_path):
    common = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=15000"]
    url = "file://" + html_path
    subprocess.run(common + ["--no-pdf-header-footer", f"--print-to-pdf={pdf_path}", url], check=True, capture_output=True)
    subprocess.run(common + ["--window-size=816,1056", "--force-device-scale-factor=2", f"--screenshot={png_path}", url], check=True, capture_output=True)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ics_only = "--ics-only" in sys.argv
    with open(DATA, encoding="utf-8") as f:
        series = json.load(f)
    events = [ev for ev in series["events"] if not args or ev["date"] in args]
    if not events:
        sys.exit(f"No events match {args}")
    chrome = None if ics_only else find_chrome()
    tmp = tempfile.mkdtemp(prefix="collab-flyer-")
    for ev in events:
        with open(os.path.join(ROOT, ev["ics"]), "w", encoding="utf-8", newline="") as f:
            f.write(build_ics(series, ev))
        print(f"wrote {ev['ics']}")
        if chrome:
            page = os.path.join(tmp, ev["date"] + ".html")
            with open(page, "w", encoding="utf-8") as f:
                f.write(build_flyer_html(series, ev))
            render(chrome, page, os.path.join(ROOT, ev["flyer_pdf"]), os.path.join(ROOT, ev["flyer_png"]))
            print(f"wrote {ev['flyer_pdf']} and {ev['flyer_png']}")
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
