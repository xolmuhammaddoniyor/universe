# A Little Universe, Just For You

An interactive 3D birthday gift: a black-hole-like object built entirely out
of birthday wishes in 100 languages, orbiting behind a password-protected
entrance. Built with plain HTML/CSS/JS and Three.js — no build step, no
framework, deploy it anywhere that serves static files.

## Files

- `index.html` — page structure: password gate, 3D canvas, HUD, info panel, personal message.
- `style.css` — the luxury black/gold visual language, fully responsive.
- `script.js` — the Three.js scene: starfield, core void, 100-language text rings, drag/zoom/lens interaction, intro sequence, audio player.
- `translations.js` — the 100 greetings, each with language name, native name, greeting text, English meaning, and RTL flag.
- `audio/` — put an optional `ambient.mp3` here for background music (see below).

## Running it

Any static file server works, because the page is loaded with
`type="module"` and fetches Three.js from a CDN — opening `index.html`
directly via `file://` will be blocked by the browser's module/CORS rules.
From this folder:

```bash
npx serve .
```

or Python:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Configure it for her

Open `script.js` and edit the `CONFIG` block at the top:

```js
const CONFIG = {
  PASSWORD: "stardust",       // the word she'll type to unlock it
  FRIEND_NAME: "",             // her name — leave blank until you fill it in
  BIRTHDAY_AGE: "",            // optional — leave blank to hide the age
  PERSONAL_MESSAGE_SIGNOFF: "Happy Birthday!",
};
```

The longer personal message paragraphs live directly in `index.html` inside
`#personal-message` — edit the `.personal-line` paragraphs to say whatever
you want.

### About the password

This is a **client-side-only** password check: the password string sits in
plain text inside `script.js`. Anyone who opens the browser's dev tools or
views the page source can read it in seconds. That's fine for "keep a
casual visitor from stumbling onto the link before her birthday" — it is
**not** real security. Don't reuse a real password here, and don't rely on
this to protect anything sensitive.

### Adding music

Drop an MP3 at `audio/ambient.mp3` (any ambient/ cosmic track you have the
rights to use — the project ships with no audio file and works perfectly
without one). Music never autoplays; the visitor has to press the sound
button first, per browser autoplay rules and good manners.

## How the "black hole made of words" works

- Each of the 100 greetings is rendered once onto a `<canvas>` with the
  browser's own text engine (so Arabic, CJK, Devanagari, Cyrillic, etc. all
  render through native font fallback) and turned into a `THREE.CanvasTexture`.
- That texture is applied to many `THREE.Sprite` instances — the same word
  reappears at different sizes/positions so the structure feels dense and
  textured. On a high-power device there are roughly 900–1100 sprites total.
- Sprites are distributed across four tilted elliptical "rings" (inner ones
  smaller and tighter, like the Saturn-ring layers) plus a spherical halo
  of smaller, dimmer wishes further out — giving the foreground/midground/
  background depth the brief asked for.
- A solid black sphere plus an additive-blended golden glow sprite forms the
  central void.
- Every frame, each sprite's angle advances along its own orbit (the whole
  group can also be rotated by drag, with inertia and damping).

## The magnifying lens

On pointer move, every visible sprite's 3D position is projected to screen
space; sprites within a pixel radius of the cursor are scaled up to ~2.6×,
brightened, and nudged slightly toward the pointer (the "bend toward the
lens" effect — a practical approximation, since true per-letter bending
would require splitting each phrase into hundreds of separate single-glyph
sprites across 100 different scripts, which is not realistic to keep fast
on a phone). The effect eases in and back out, and works identically for
touch via the same pointer events.

## Known simplifications / honesty notes

- **Font coverage**: text is drawn with the browser's default sans-serif
  stack. Windows, macOS and most mobile OSes ship broad Unicode font
  coverage out of the box, so this looks correct on the vast majority of
  devices — but a handful of rarer scripts (e.g. Tibetan, Hmong) could show
  a fallback glyph on a system with no matching font installed. If you want
  bulletproof rendering everywhere, bundle the relevant Noto Sans web fonts
  and reference them in the `font` string inside `makeTextTexture()` in
  `script.js`.
- **Translation accuracy**: the 100 greetings were assembled from widely
  published birthday-greeting phrases. The handful of less common languages
  on the list are best-effort — if you personally know a speaker of one of
  the rarer ones, it's worth a 30-second double-check before this goes out
  as a gift.
- Performance auto-scales down (fewer sprites, lower particle counts, capped
  pixel ratio) on phones and lower-core devices so it stays smooth there.

## Browser support

Any modern browser with WebGL (Chrome, Edge, Safari, Firefox, mobile
Safari/Chrome). If WebGL is unavailable, the page falls back to a plain
text list of all 100 greetings instead of a blank screen.
