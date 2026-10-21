// USF AI Collaborative meeting listings, driven by assets/data/collaborative.json.
// Pages opt in with mount points:
//   data-collab-next             full card for the next meeting
//   data-collab-next-compact     "pill" (hero) or "card" (events page) teaser for the next meeting
//   data-collab-upcoming         rows for the meetings after the next one
//   data-collab-past             rows for meetings that have ended
// A wrapper with data-collab-section="upcoming" or "past" is hidden when that list is empty.
// Testing: add ?now=2026-11-07T13:00 to the URL to pretend it is that Eastern time.
(function () {
  var DATA_URL = 'assets/data/collaborative.json';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Wall-clock "YYYY-MM-DDTHH:MM" in the given time zone, so comparisons with event times are plain string compares.
  function nowIn(tz) {
    var override = new URLSearchParams(window.location.search).get('now');
    if (override && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(override)) return override;
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute;
  }

  function dateParts(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    function f(o) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: 'UTC' }, o)).format(d); }
    return { weekday: f({ weekday: 'long' }), month: f({ month: 'long' }), mon: f({ month: 'short' }), day: d.getUTCDate(), year: d.getUTCFullYear() };
  }

  function clock(hhmm) {
    var h = parseInt(hhmm.split(':')[0], 10), m = hhmm.split(':')[1];
    return ((h % 12) || 12) + ':' + m;
  }

  function timeRange(ev) {
    var pm = parseInt(ev.end.split(':')[0], 10) >= 12 ? 'PM' : 'AM';
    return clock(ev.start) + ' - ' + clock(ev.end) + ' ' + pm + ' ET';
  }

  function split(data) {
    var events = data.events.slice().sort(function (a, b) { return (a.date + a.start).localeCompare(b.date + b.start); });
    var upcoming = [], past = [];
    events.forEach(function (ev) {
      var end = ev.date + 'T' + ev.end;
      (end > nowIn(ev.tz || 'America/New_York') ? upcoming : past).push(ev);
    });
    past.reverse();
    return { next: upcoming[0] || null, later: upcoming.slice(1), past: past };
  }

  function initials(name) {
    return name.split(',')[0].split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join('');
  }

  function avatar(ev, size) {
    if (ev.photo) return '<img src="' + esc(ev.photo) + '" alt="' + esc(ev.speaker) + '" class="' + size + ' rounded-full object-cover object-top ring-2 ring-usfgold-warm/60 shrink-0" />';
    return '<div class="' + size + ' rounded-full bg-usfgreen/15 text-usfgreen font-display font-semibold flex items-center justify-center ring-2 ring-usfgold-warm/60 shrink-0">' + esc(initials(ev.speaker)) + '</div>';
  }

  var ICON_DL = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>';
  var ICON_CAL = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
  var ICON_VIDEO = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>';

  function tbdBadge(ev, dark) {
    if (!ev.tbd_title) return '';
    var cls = dark ? 'bg-paper/15 text-paper/85' : 'bg-usfgold-warm/15 text-ink-soft';
    return ' <span class="align-middle inline-flex items-center rounded-full ' + cls + ' px-2.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider">Title to be announced</span>';
  }

  function renderNext(el, data, s) {
    var ev = s.next;
    if (!ev) {
      el.innerHTML = '<div class="rounded-3xl border border-dashed border-ink/15 p-8 md:p-12 text-ink-soft">The next meeting date will be posted soon. <a href="https://forms.gle/w4dyBEY8TXfP5Ae48" target="_blank" rel="noopener" class="font-semibold text-usfgreen underline underline-offset-2 decoration-usfgold-warm decoration-2">Sign up for announcements</a> to hear first.</div>';
      return;
    }
    var d = dateParts(ev.date), a = data.agenda;
    var isToday = ev.date === nowIn(ev.tz || 'America/New_York').slice(0, 10);
    var bio = ev.bio ? '<details class="mb-8 max-w-3xl group"><summary class="cursor-pointer text-sm font-semibold text-usfgold-warm hover:text-usfgold-bright list-none">About the speaker <span class="group-open:hidden">+</span><span class="hidden group-open:inline">-</span></summary><p class="mt-3 text-paper/80 text-sm leading-relaxed">' + esc(ev.bio) + '</p></details>' : '';
    el.innerHTML =
      '<article class="bg-gradient-to-br from-usfgreen to-usfgreen-deep rounded-3xl p-8 md:p-12 text-paper relative overflow-hidden">' +
        '<div class="absolute inset-0 opacity-[0.08]" style="background-image: radial-gradient(circle at 1px 1px, #CFC493 1px, transparent 0); background-size: 24px 24px;"></div>' +
        '<div class="relative md:flex md:gap-10">' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-xs font-semibold tracking-[0.2em] uppercase text-usfgold-warm mb-5">' + (isToday ? 'Today' : 'Next Meeting') + '</p>' +
            '<div class="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5 mb-6">' +
              '<div class="self-start bg-paper text-usfgreen rounded-2xl px-4 py-3 text-center shrink-0 min-w-[5.5rem]">' +
                '<p class="text-[10px] font-semibold tracking-[0.18em] uppercase text-usfgold-warm">' + esc(d.month) + '</p>' +
                '<p class="font-display text-4xl font-bold leading-none my-1">' + d.day + '</p>' +
                '<p class="text-[11px] text-ink-soft">' + esc(d.weekday) + '</p>' +
              '</div>' +
              '<div class="min-w-0">' +
                '<h3 class="font-display text-2xl md:text-4xl font-semibold leading-tight">' + esc(ev.title) + tbdBadge(ev, true) + '</h3>' +
                (ev.subtitle ? '<p class="text-lg text-paper/85 mt-2">' + esc(ev.subtitle) + '</p>' : '') +
              '</div>' +
            '</div>' +
            '<div class="flex items-start gap-4 mb-6">' + avatar(ev, 'w-20 h-20') +
              '<div class="border-l-4 border-usfgold-warm pl-4">' +
                '<p class="font-display text-xl font-semibold">' + esc(ev.speaker) + '</p>' +
                ev.roles.map(function (r) { return '<p class="text-paper/70 text-sm leading-snug">' + esc(r) + '</p>'; }).join('') +
              '</div>' +
            '</div>' +
            bio +
            '<div class="grid sm:grid-cols-2 gap-6 mb-8 pb-8 border-b border-paper/15">' +
              '<div><p class="text-xs uppercase tracking-wider text-paper/60 mb-1">When</p><p class="font-display text-xl">' + esc(d.weekday + ', ' + d.month + ' ' + d.day + ', ' + d.year) + '</p><p class="text-paper/75 text-sm">' + esc(timeRange(ev)) + '</p></div>' +
              '<div><p class="text-xs uppercase tracking-wider text-paper/60 mb-1">Where</p><p class="font-display text-xl">Virtual on Microsoft Teams</p><p class="text-paper/75 text-sm">Open to anyone at USF</p></div>' +
            '</div>' +
            '<p class="text-xs uppercase tracking-wider text-paper/60 mb-4">Agenda</p>' +
            '<div class="space-y-4 mb-10 max-w-3xl">' +
              '<div class="sm:flex sm:gap-6"><p class="font-semibold text-usfgold-warm text-sm sm:w-32 shrink-0 pt-0.5">' + esc(clock(a[0].start) + ' - ' + clock(a[0].end)) + '</p><div><p class="font-semibold">Talk: ' + esc(ev.title) + '</p>' + (ev.summary ? '<p class="text-paper/75 text-sm leading-relaxed">' + esc(ev.summary) + '</p>' : '') + '</div></div>' +
              '<div class="sm:flex sm:gap-6 pt-4 border-t border-paper/10"><p class="font-semibold text-usfgold-warm text-sm sm:w-32 shrink-0 pt-0.5">' + esc(clock(a[1].start) + ' - ' + clock(a[1].end)) + '</p><div><p class="font-semibold">' + esc(a[1].what) + '</p>' + (a[1].detail ? '<p class="text-paper/75 text-sm leading-relaxed">' + esc(a[1].detail) + '</p>' : '') + '</div></div>' +
            '</div>' +
            '<div class="flex flex-wrap gap-3">' +
              '<a href="' + esc(data.teams_url) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 bg-usfgold-warm text-ink px-6 py-3 rounded-full font-semibold hover:bg-usfgold-bright transition">' + ICON_VIDEO + 'Join on Teams</a>' +
              '<a href="' + esc(ev.ics) + '" download class="inline-flex items-center gap-2 bg-paper text-usfgreen px-6 py-3 rounded-full font-semibold hover:bg-paper-warm transition">' + ICON_CAL + 'Add to calendar</a>' +
              '<a href="' + esc(ev.flyer_pdf) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 border border-paper/30 text-paper px-6 py-3 rounded-full font-semibold hover:bg-paper/10 transition">' + ICON_DL + 'Download flyer</a>' +
            '</div>' +
          '</div>' +
          '<div class="hidden md:block w-52 shrink-0 self-start">' +
            '<a href="' + esc(data.teams_url) + '" target="_blank" rel="noopener" class="block bg-white rounded-2xl p-3"><img src="' + esc(data.qr) + '" alt="QR code that opens the Microsoft Teams meeting" class="w-full h-auto" /></a>' +
            '<p class="mt-3 text-center text-xs font-semibold tracking-[0.18em] uppercase text-usfgold-warm">Scan to join</p>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderCompact(el, s) {
    var ev = s.next;
    var variant = el.getAttribute('data-collab-next-compact') || 'pill';
    var href = el.getAttribute('data-collab-href') || 'index.html#meetings';
    if (!ev) { el.hidden = true; return; }
    var d = dateParts(ev.date);
    var speakerLast = ev.speaker.split(',')[0];
    if (variant === 'banner') {
      el.innerHTML =
        '<div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-usfgreen to-usfgreen-deep text-paper p-5 sm:p-6 shadow-xl shadow-usfgreen/20 max-w-3xl">' +
          '<div class="absolute inset-0 opacity-[0.08]" style="background-image: radial-gradient(circle at 1px 1px, #CFC493 1px, transparent 0); background-size: 20px 20px;"></div>' +
          '<div class="relative flex items-start gap-4 sm:gap-5">' +
            '<div class="hidden sm:block bg-paper text-usfgreen rounded-xl px-3 py-2 text-center shrink-0 min-w-[4.5rem]">' +
              '<p class="text-[10px] font-semibold tracking-[0.18em] uppercase text-usfgold-warm">' + esc(d.mon) + '</p>' +
              '<p class="font-display text-3xl font-bold leading-none my-0.5">' + d.day + '</p>' +
              '<p class="text-[10px] text-ink-soft">' + esc(d.weekday.slice(0, 3)) + '</p>' +
            '</div>' +
            '<div class="min-w-0 flex-1">' +
              '<p class="text-[11px] font-semibold tracking-[0.2em] uppercase text-usfgold-warm mb-1">Next meeting &middot; <span class="sm:hidden">' + esc(d.mon + ' ' + d.day) + ' &middot; </span>' + esc(timeRange(ev)) + ' &middot; Teams</p>' +
              '<p class="font-display text-xl sm:text-2xl font-semibold leading-snug">' + esc(ev.title) + tbdBadge(ev, true) + '</p>' +
              '<div class="flex items-center gap-2 mt-2 mb-4">' + avatar(ev, 'w-8 h-8') + '<p class="text-sm text-paper/85 truncate">' + esc(ev.speaker) + '</p></div>' +
              '<div class="flex flex-wrap gap-2 text-sm">' +
                '<a href="' + esc(href) + '" class="inline-flex items-center gap-2 bg-usfgold-warm text-ink px-4 py-2 rounded-full font-semibold hover:bg-usfgold-bright transition">Details &darr;</a>' +
                '<a href="' + esc(ev.ics) + '" download class="inline-flex items-center gap-2 bg-paper/10 border border-paper/30 text-paper px-4 py-2 rounded-full font-semibold hover:bg-paper/20 transition">' + ICON_CAL + 'Add to calendar</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      return;
    }
    if (variant === 'card') {
      el.innerHTML =
        '<a href="' + esc(href) + '" class="block bg-gradient-to-br from-usfgreen to-usfgreen-deep text-paper rounded-2xl p-8 hover:shadow-xl hover:shadow-usfgreen/20 transition group">' +
          '<p class="text-xs uppercase tracking-wider text-usfgold-warm mb-2">USF AI Collaborative &middot; Monthly on Teams</p>' +
          '<div class="flex items-start gap-5">' + avatar(ev, 'w-16 h-16') +
            '<div class="min-w-0">' +
              '<p class="text-sm text-paper/75 mb-1">Next: ' + esc(d.weekday + ', ' + d.mon + ' ' + d.day) + ' &middot; ' + esc(timeRange(ev)) + '</p>' +
              '<h3 class="font-display text-2xl font-semibold mb-1">' + esc(ev.title) + tbdBadge(ev, true) + '</h3>' +
              '<p class="text-paper/80 mb-4">' + esc(ev.speaker) + '</p>' +
              '<span class="text-sm font-semibold text-usfgold-warm group-hover:text-usfgold-bright">Details, calendar invite and flyer &rarr;</span>' +
            '</div>' +
          '</div>' +
        '</a>';
      return;
    }
    el.innerHTML =
      '<a href="' + esc(href) + '" class="group inline-flex items-center gap-3 rounded-full border border-usfgreen/20 bg-paper/80 pl-2 pr-5 py-2 text-sm text-ink-soft hover:border-usfgreen/40 hover:text-ink transition max-w-full">' +
        '<span class="inline-flex items-center rounded-full bg-usfgreen px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-paper shrink-0">Next meeting</span>' +
        '<span class="truncate"><span class="font-semibold text-ink">' + esc(d.mon + ' ' + d.day) + '</span> &middot; ' + esc(speakerLast) + ': ' + esc(ev.title) + '</span>' +
        '<svg class="w-4 h-4 text-usfgreen group-hover:translate-y-0.5 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>' +
      '</a>';
  }

  function row(ev, isPast) {
    var d = dateParts(ev.date);
    var links = [];
    if (isPast && ev.slides) links.push('<a href="' + esc(ev.slides) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 bg-usfgreen text-paper px-4 py-2 rounded-full font-semibold hover:bg-usfgreen-deep transition">Slides (PDF)</a>');
    if (isPast && ev.recording) links.push('<a href="' + esc(ev.recording) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 bg-usfgreen text-paper px-4 py-2 rounded-full font-semibold hover:bg-usfgreen-deep transition">Recording</a>');
    if (!isPast) links.push('<a href="' + esc(ev.ics) + '" download class="inline-flex items-center gap-2 bg-usfgreen text-paper px-4 py-2 rounded-full font-semibold hover:bg-usfgreen-deep transition">Add to calendar</a>');
    links.push('<a href="' + esc(ev.flyer_pdf) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 border border-usfgreen/30 text-usfgreen px-4 py-2 rounded-full font-semibold hover:bg-usfgreen/5 transition">Flyer (PDF)</a>');
    return '<li class="bg-paper rounded-2xl border border-ink/10 p-6 md:p-7">' +
      '<div class="md:flex md:items-start md:gap-8">' +
        '<div class="md:w-36 shrink-0 mb-4 md:mb-0">' +
          (isPast ? '<span class="inline-flex items-center rounded-full bg-ink/10 text-ink-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-wider mb-3">Past</span>' : '') +
          '<p class="font-display text-xl text-ink leading-tight">' + esc(d.weekday) + '<br />' + esc(d.month + ' ' + d.day + ', ' + d.year) + '</p>' +
          '<p class="text-sm text-ink-soft mt-1">' + esc(timeRange(ev)) + '</p>' +
        '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<h4 class="font-display text-xl md:text-2xl font-semibold text-ink leading-tight mb-1">' + esc(ev.title) + tbdBadge(ev, false) + '</h4>' +
          (ev.subtitle ? '<p class="text-ink-soft mb-3">' + esc(ev.subtitle) + '</p>' : '<div class="mb-3"></div>') +
          '<div class="flex items-center gap-3 mb-5">' + avatar(ev, 'w-12 h-12') +
            '<div class="min-w-0"><p class="font-semibold text-ink text-sm">' + esc(ev.speaker) + '</p><p class="text-ink-soft text-xs leading-snug">' + esc(ev.roles[0] || '') + '</p></div>' +
          '</div>' +
          '<div class="flex flex-wrap gap-2 text-sm">' + links.join('') + '</div>' +
        '</div>' +
      '</div>' +
    '</li>';
  }

  function renderList(el, events, isPast) {
    var wrap = el.closest('[data-collab-section]');
    if (!events.length) { if (wrap) wrap.hidden = true; return; }
    if (wrap) wrap.hidden = false;
    el.innerHTML = events.map(function (ev) { return row(ev, isPast); }).join('');
  }

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  function render(data) {
    var s = split(data);
    each('[data-collab-next]', function (el) { renderNext(el, data, s); });
    each('[data-collab-next-compact]', function (el) { renderCompact(el, s); });
    each('[data-collab-upcoming]', function (el) { renderList(el, s.later, false); });
    each('[data-collab-past]', function (el) { renderList(el, s.past, true); });
  }

  window.USFCollaborative = { split: split, render: render, nowIn: nowIn };

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () { /* leave each mount's static fallback (with the Teams link) in place */ });
})();
