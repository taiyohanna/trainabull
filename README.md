# TRAIN-A-BULL

**Training Bulls for the age of AI.**

A USF community advancing **clinical informatics and artificial intelligence** in healthcare - bridging medicine, nursing, engineering, and information sciences.

## Live site

[https://taiyohanna.github.io/trainabull](https://taiyohanna.github.io/trainabull)

## What's here

```
index.html           landing page + USF AI Collaborative meetings (next, upcoming, past)
about.html           the lab: mission, focus areas, faculty, USF affiliations
projects.html        active projects + publications, posters, talks, media
journal-club.html    redirect to index.html#meetings (kept so old links work)
events.html          USF events worth attending + a card for the next meeting
learn.html           curricula + USF resources + reading list
get-involved.html    join / submit project idea (PICO) / industry partners
assets/              css, images, js
assets/data/collaborative.json   every meeting (single source of truth)
assets/collaborative/            flyers (PDF + PNG), .ics invites, Teams QR
scripts/                         flyer/.ics builder + JSON validator
```

All submissions are email-based, with structured pre-filled templates so each submission lands with enough detail to act on.

## How to edit content (no command line needed)

1. Open the file you want to change in this repo on GitHub
2. Click the pencil icon (top right)
3. Make your edit
4. Scroll down and click **Commit changes**
5. The site rebuilds automatically within about a minute

That's it. No Jekyll, no build step, no deploy - just plain HTML with Tailwind via CDN.

## USF AI Collaborative meetings

The meetings on the home page (and the card on `events.html`) come from `assets/data/collaborative.json`, rendered by `assets/js/collaborative.js`. The script works out the current time in Eastern Time, so a meeting moves from "Next" to "Past meetings" at 1:00 PM ET on meeting day, and the following one takes over. No HTML edits needed.

### Add a meeting

1. Append an object to `events` in `assets/data/collaborative.json` (template below). Order doesn't matter; the page sorts by date.
2. Add the speaker's square headshot to `assets/img/speakers/` (about 480x480 JPG) and point `photo` at it. Leave `photo` as `null` to show initials instead.
3. Build the flyer and calendar invite (needs Google Chrome and an internet connection):
   ```
   python3 scripts/build-collaborative.py 2027-02-05
   ```
   This writes the `.ics`, the flyer PDF and the flyer PNG to `assets/collaborative/`. Run it with no date to rebuild everything, or add `--ics-only` to skip the flyers.
4. Check it:
   ```
   python3 scripts/validate-collaborative.py
   ```
5. Commit. The site rolls over on its own.

After a meeting, set `slides` (and `recording`, if there is one) to a file path or URL and the "Past meetings" row picks them up.

### Event template

```json
{
  "date": "2027-02-05",
  "start": "12:00",
  "end": "13:00",
  "tz": "America/New_York",
  "uid": "PASTE-A-NEW-UUID@usf-ai-collaborative",
  "title": "Talk title",
  "subtitle": null,
  "speaker": "First Last, MD",
  "roles": ["Title, Institution"],
  "photo": "assets/img/speakers/last.jpg",
  "bio": null,
  "bio_short": null,
  "summary": "One line under the talk title in the agenda",
  "tbd_title": false,
  "flyer_pdf": "assets/collaborative/usf-ai-collaborative-flyer-feb-5.pdf",
  "flyer_png": "assets/collaborative/usf-ai-collaborative-flyer-feb-5.png",
  "ics": "assets/collaborative/usf-ai-collaborative-feb-5.ics",
  "slides": null,
  "recording": null
}
```

- `uid` keeps calendar updates attached to the same event; make a new one per meeting (`python3 -c "import uuid; print(uuid.uuid4())"`) and never change it afterward. If you change a meeting that people already saved, raise `"sequence"` (starts at 1) so their calendars accept the update.
- `bio` is the full bio shown on the site; `bio_short` is the shorter version printed on the flyer.
- `tbd_title: true` shows a "title to be announced" badge. When the title arrives, update `title`, set `tbd_title` to `false`, and rerun the build for that date.
- Plain hyphens only. The validator rejects em and en dashes.

### Testing the rollover

Add `?now=` with an Eastern Time to any page to pretend it's that moment, e.g. `index.html?now=2026-11-07T13:00`. Serve the repo locally first so the JSON can load: `python3 -m http.server`, then open `http://localhost:8000/`.

The Open Graph image in `index.html` (the flyer shown in link previews) is static. Update it by hand when you want previews to show a newer flyer.

## How to add a collaborator

1. Open the repo on GitHub
2. **Settings** -> **Collaborators**
3. Click **Add people**
4. Enter their GitHub username or email and send the invite
5. Once they accept, they can edit any file directly from the GitHub web UI

This works the same way whether the repo is public or private.

## Roadmap

- Faculty review and approval of placeholder bios on `about.html`
- Replace placeholder content (projects, publications)
- Consider a custom domain (about $10/yr) once pilot users flow in

## Contact

Karim Hanna, MD, FAAFP, FAMIA, CAQHALM
[khanna@usf.edu](mailto:khanna@usf.edu)
