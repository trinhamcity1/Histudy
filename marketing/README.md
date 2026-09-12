# Shui — Media Kit

Everything here is safe to use as-is for marketing, social, and press. If you
need something that isn't in this folder, ask before recreating it from
scratch — see "What's not here yet" below.

## Files

| File | Size | Use it for |
|---|---|---|
| `shui-logo-dark-background.png` | 1095×795 | The primary logo. **Dark backgrounds only** (it's baked onto our ink color, `#0F2830`) — social posts, slide decks, press kits, anything on a dark or black background. This is the default; reach for it first. |
| `shui-app-icon-1024.png` | 1024×1024 | Square version of the same logo, for anywhere you need a square tile — app store listings, social profile photos, favicons. See caveat below. |
| `shui-logo-watermark-transparent.png` | 462×342 | Transparent background, word in dark ink instead of white. Only for placing on **light backgrounds** (e.g. over a white or light-colored image) — this is the same mark, re-colored so it doesn't disappear. |
| `brand-guidelines.html` | — | The full design rationale: every color pairing, why the app-icon and watermark versions use different colors, and the hex codes below. Open it in any browser. |

## Colors

| Name | Hex | Where it's used |
|---|---|---|
| Ink | `#0F2830` | The dark background behind the primary logo |
| Current Bright | `#6FC2CD` | The wave/thread color on the dark version |
| Foam | `#EEF4F1` | The word color on the dark version |
| Current | `#2E7A88` | The wave/thread color on the light/transparent version |
| Brass | `#C79A5C` | Sparing accent only — not part of the standard lockup |

Font is Fraunces (italic), free on Google Fonts, if you need to typeset "Shui"
in copy to match.

## Rules of thumb

- Don't recolor the logo, add effects (drop shadows, outlines, gradients), or
  stretch/distort it.
- Keep clear space around it — don't crop text or other graphics right up
  against the edges.
- Dark version on dark backgrounds, transparent version on light backgrounds.
  Don't put the dark version on a light background or vice versa — the word
  and the wave are specifically colored for one background each and won't
  read correctly on the other (see `brand-guidelines.html` for a side-by-side
  of why).

## What's not here yet

Being upfront so nobody spends time hunting for something that doesn't exist:

- **No vector file (SVG/AI/EPS).** Everything above is a PNG rendered from a
  real webfont, not outlined paths — it'll look soft if scaled up much larger
  than 1095px wide. If you need a huge print banner or billboard-size export,
  flag it — that needs someone to open this in a design tool and re-trace it
  first.
- **`shui-app-icon-1024.png` is a square crop of the wide logo, not a
  purpose-built icon.** It works fine as a placeholder or for anything shown
  at a reasonable size, but it hasn't been tuned for how small an app icon
  actually gets shown (a phone home screen icon is tiny, and iOS also rounds
  the corners for you). Good enough for now; flag it if a true small-size app
  icon becomes a blocker.
- **No pre-sized social banners** (Twitter/X header, LinkedIn banner, etc.).
  These are straightforward to make from the primary logo — ask if you need
  specific dimensions and they can be produced on request.
- **No product screenshots or in-app footage** in this folder yet — those
  would come from an actual build once there's something worth screenshotting
  for a store listing or a demo reel.
