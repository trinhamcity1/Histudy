# Shui LLC — company website

Static HTML/CSS, no build step, no backend. Exists to satisfy Apple Developer
Program enrollment verification and the Privacy Policy / support URLs App Store
Connect requires — not the Shui app itself. See `../prompts/` for that.

## Structure

```
company-site/
  index.html      Home
  privacy.html    Privacy Policy
  terms.html      Terms of Service
  contact.html    Contact / support
  styles.css      Shared stylesheet (Shui brand palette/type — see ../assets/branding/README.md)
  assets/
    shui-logo.png
```

Every page is fully self-contained plain HTML linking the one shared stylesheet —
open any file directly in a browser, no server or build step required.

## Deploying

1. **First deploy — get a preview URL.** Push this folder to a static host (Netlify,
   Vercel, or Cloudflare Pages all work and provision HTTPS automatically):
   - **Netlify**: drag the `company-site/` folder onto https://app.netlify.com/drop,
     or connect the repo and set the site's base directory to `company-site` with no
     build command.
   - **Vercel**: `vercel --cwd company-site` (or import the repo in the dashboard,
     Root Directory = `company-site`, Framework Preset = "Other").
   - **Cloudflare Pages**: connect the repo, Root directory = `company-site`, no
     build command, output directory = `/`.

   Whichever you pick, you'll get a temporary `*.netlify.app` / `*.vercel.app` /
   `*.pages.dev` URL first — good enough to sanity-check before touching DNS.

2. **Connect shuillc.com.** In whatever DNS panel manages `shuillc.com` (confirm
   whether that's Zoho Domains or a separate registrar), add the A/CNAME records
   your host's dashboard gives you for a custom domain. **Do not touch the existing
   MX records** — those route business email through Zoho and are unrelated to the
   site's A/CNAME records; both coexist fine.

3. **Confirm HTTPS.** These hosts auto-provision an SSL certificate for the custom
   domain once DNS propagates, usually within minutes.

## Content notes for whoever reviews this before it goes live

- Home page copy, and the specifics of what data Shui collects/shares in
  `privacy.html`, were written from the actual product spec and backend
  (`prompts/phase-*.md`, `functions/src/`) — not a generic template. If the product
  changes in a way that changes what data is collected or who it's shared with,
  this page needs updating to match, not just the app.
- Legal name used throughout: **Shui LLC**. Governing law on `terms.html`: **Texas**.
  Support/contact address used throughout: **uyennguyen@shuillc.com**. No business
  address is published anywhere on the site (by choice — a plain email address
  satisfies Apple's requirement).
- No production vector logo exists yet — `assets/shui-logo.png` is the same raster
  export already used elsewhere in the app; see `../assets/branding/README.md` for
  status and the real palette/type if this site's design needs to evolve.

## This is a placeholder, not final infrastructure

Once the real Shui product has its own public-facing site/backend, the same
`shuillc.com` domain gets pointed at that instead — no new domain purchase, no
change to email. Nothing here should block that swap.
