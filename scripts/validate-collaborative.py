#!/usr/bin/env python3
"""Check assets/data/collaborative.json before committing.

    python3 scripts/validate-collaborative.py

Exits non-zero and lists every problem if anything is off.
"""
import datetime as dt
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets", "data", "collaborative.json")

TOP_KEYS = ["series", "tagline", "teams_url", "qr", "agenda", "events"]
EVENT_KEYS = ["date", "start", "end", "tz", "uid", "title", "speaker", "roles", "tbd_title", "flyer_pdf", "flyer_png", "ics"]
FILE_KEYS = ["flyer_pdf", "flyer_png", "ics", "photo", "slides"]
DASHES = ("\u2014", "\u2013")


def walk_strings(value, path):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for k, v in value.items():
            yield from walk_strings(v, f"{path}.{k}")
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from walk_strings(v, f"{path}[{i}]")


def main():
    problems = []
    try:
        with open(DATA, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        sys.exit(f"Cannot read {DATA}: {e}")

    for k in TOP_KEYS:
        if k not in data:
            problems.append(f"missing top-level key '{k}'")
    if data.get("qr") and not os.path.isfile(os.path.join(ROOT, data["qr"])):
        problems.append(f"qr file not found: {data['qr']}")

    for path, text in walk_strings(data, "json"):
        if any(d in text for d in DASHES):
            problems.append(f"{path}: contains an em or en dash; use a plain hyphen or rephrase")

    seen_dates, seen_uids = set(), set()
    for i, ev in enumerate(data.get("events", [])):
        label = f"events[{i}] ({ev.get('date', '?')})"
        for k in EVENT_KEYS:
            if k not in ev:
                problems.append(f"{label}: missing '{k}'")
        try:
            dt.date.fromisoformat(ev.get("date", ""))
        except ValueError:
            problems.append(f"{label}: date must be YYYY-MM-DD")
        for k in ("start", "end"):
            try:
                dt.datetime.strptime(ev.get(k, ""), "%H:%M")
            except ValueError:
                problems.append(f"{label}: {k} must be 24-hour HH:MM")
        if ev.get("start", "") >= ev.get("end", "~"):
            problems.append(f"{label}: end must be after start")
        if not isinstance(ev.get("roles"), list) or not ev.get("roles"):
            problems.append(f"{label}: roles must be a non-empty list")
        if ev.get("date") in seen_dates:
            problems.append(f"{label}: duplicate date")
        seen_dates.add(ev.get("date"))
        if ev.get("uid") in seen_uids:
            problems.append(f"{label}: duplicate uid")
        seen_uids.add(ev.get("uid"))
        for k in FILE_KEYS:
            rel = ev.get(k)
            if rel and not os.path.isfile(os.path.join(ROOT, rel)):
                problems.append(f"{label}: {k} file not found: {rel}")

    if problems:
        print(f"{len(problems)} problem(s) in collaborative.json:")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)
    print(f"collaborative.json OK: {len(data['events'])} events, all referenced files present.")


if __name__ == "__main__":
    main()
