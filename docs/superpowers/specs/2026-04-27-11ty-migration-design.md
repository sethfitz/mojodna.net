# Migrate mojodna.net from Jekyll to Eleventy

## Purpose

Swap the static-site engine from Jekyll to Eleventy with light modernization.
Preserve every post URL and the Atom feed URL. Drop dead third-party scripts.
No visual redesign, no content edits.

## Context

The site is Seth's personal blog (`mojodna.net`). It is a Jekyll project
deployed via GitHub Pages' built-in Jekyll renderer from the `gh-pages` branch.
It has not been touched in several years and likely does not build with current
toolchains. The repo contains:

- 25 posts in `_posts/` spanning 2005–2015
- 1 unpublished post in `_drafts/`
- Two Liquid layouts (`_layouts/default.html`, `_layouts/post.html`)
- Two CSS files (`css/screen.css`, `css/syntax.css`)
- `index.html` (Liquid loop over posts) and `atom.xml` (Liquid Atom feed)
- A standalone subdirectory `gw2010/` with one HTML page (a 2010 talk landing)
- `CNAME` (`mojodna.net`)
- A minimal `_config.yml` that selects Redcarpet for markdown
- No `Gemfile`, no `.gitignore`, no `.github/`

13 of the 25 posts use Jekyll's old code-block syntax
(`{% highlight LANG %} … {% endhighlight %}`). The remainder use fenced
code blocks already. One post (`2009-09-08-csspring-cleaning.markdown`)
contains an in-body `## {{ page.title }}` Liquid duplicate of its title. One
post (`2009-02-24-my-work-git-workflow.markdown`) embeds GitHub gists via raw
`<script src="http://gist.github.com/…">` tags. Layouts include classic Google
Analytics (`UA-66841-1`), Woopra, TypeKit, FeedBurner alias, and Disqus —
all dead, deprecated, or not worth keeping.

## Approach

Single-branch, single-PR migration. Replace Jekyll with Eleventy 3.x using
Liquid templating (closest match to Jekyll's existing syntax) and the
`markdown-it` markdown renderer. Convert the 13 `{% highlight %}` blocks to
fenced code blocks in place. Delete `syntax.css` in favor of Prism's
default theme. Drop the dead third-party scripts from layouts. Pass `gw2010/`
through unchanged. Build and deploy via GitHub Actions to GitHub Pages so the
existing custom domain keeps working.

Content edits beyond the mechanical `{% highlight %}` sweep are deferred to
bead `blog-2x7`.

## Architecture

```
_posts/*.markdown ──┐
index.html ─────────┼─► Eleventy ──► _site/ ──► actions/deploy-pages ──► mojodna.net
atom.xml ───────────┘                  ▲
                                       │
css/, gw2010/, CNAME ── passthrough ───┘
```

- Source branch: a feature branch off `gh-pages` for the migration work.
  After merge, the source branch identity (rename `gh-pages` → `main` or
  keep as-is) is a finishing-time decision, out of scope for this spec.
- Build output: `_site/` (gitignored).
- Deployment: GitHub Actions invokes `@11ty/eleventy`, uploads via
  `actions/upload-pages-artifact@v3`, and deploys via
  `actions/deploy-pages@v4`. Pages source in repo settings must be set to
  "GitHub Actions" (one-time manual change documented in the plan).
- Custom domain: `CNAME` is passthrough-copied so DNS keeps resolving.

## Components

### Eleventy config (`eleventy.config.mjs`)

ESM, Node 20+. Exports a default function that registers:

- Input directory: repo root.
- Output directory: `_site/`.
- Includes directory: `_includes/`.
- Templating: Liquid (default).
- Markdown library: `markdown-it` configured with `linkify: true`,
  `html: true`, `typographer: false`, plus `markdown-it-anchor` for heading
  IDs.
- Plugin: `@11ty/eleventy-plugin-syntaxhighlight` (Prism-based, fenced blocks).
- Passthrough copies: `css/`, `gw2010/`, `CNAME`.
- Posts collection: defined via `eleventyConfig.addCollection("posts", …)`
  selecting items tagged `posts`, sorted by `date` ascending (Eleventy
  default). Newest-first iteration is achieved with Liquid's `reverse`
  filter at the call sites in `index.html` and `atom.xml`.
- Posts directory data file (`_posts/_posts.11tydata.json`) sets:
  - `tags: ["posts"]` so files in `_posts/` join the collection.
  - `layout: "post"` as a default (so existing `layout: post` front matter
    is redundant but harmless).
  - `permalink: "/{{ page.date | date: '%Y/%m/%d' }}/{{ page.fileSlug }}.html"`
    matching Jekyll's default `/YYYY/MM/DD/slug.html`.
- Layouts aliases (via `eleventyConfig.addLayoutAlias`): `default` →
  `layouts/default.liquid`, `post` → `layouts/post.liquid`.

### Layouts (`_includes/layouts/`)

`default.liquid`:

- HTML5 doctype.
- `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- `<title>{{ title }} :: Drive-by Digressions</title>` (homepage uses
  page-level `title: Seth Fitzsimmons`).
- `<link rel="alternate" type="application/atom+xml" href="/atom.xml">`.
- `<link rel="stylesheet" href="/css/screen.css">`.
- `<link rel="stylesheet" href="/css/prism.css">` (committed copy of the
  Prism theme — see CSS section).
- Body: `<div id="container">{{ content }}<div id="footer">…</div></div>`.
- Footer: CC BY-SA 3.0 badge linking to creativecommons.org (image kept
  pointing at the original CC URL), name link to `/`, GitHub link, email.
- No Google Analytics, Woopra, TypeKit, FeedBurner indirection.

`post.liquid`:

- `layout: layouts/default.liquid`.
- Renders `<article><h1>{{ title }}</h1>{{ content }}</article>`. No Disqus.

### Existing root templates

`index.html`:

- Front matter changed to:
  ```yaml
  layout: default
  title: Seth Fitzsimmons
  permalink: /index.html
  ```
- Body: existing heading block plus a Liquid loop
  `{% for post in collections.posts reversed %}` emitting
  `<li><span>{{ post.date | date: "%b %-d, %Y" }}</span>:
  <a href="{{ post.url }}">{{ post.data.title }}</a></li>`. The visible
  output matches what Jekyll produced.

`atom.xml`:

- Front matter:
  ```yaml
  permalink: /atom.xml
  eleventyExcludeFromCollections: true
  ```
  No `layout` (Eleventy applies none by default).
- Loops `{% for post in collections.posts reversed %}` (newest first).
  Self link points at `https://mojodna.net/atom.xml` (FeedBurner alias
  dropped). Each entry renders title, link, updated, id, and content
  via Liquid's `escape` filter on `post.templateContent`.

### Posts (`_posts/*.markdown`)

- Mechanical conversion: `{% highlight LANG %}` → ```` ```LANG ```` and
  `{% endhighlight %}` → ```` ``` ````, applied to the 13 affected files.
  Performed via `gsed -i` (or equivalent), verified by grepping for any
  remaining `{% highlight` or `{% endhighlight` after the sweep.
- Prose otherwise untouched. Gist `<script>` embeds, `## {{ page.title }}`
  duplicate, and `http://` links are preserved. The `## {{ page.title }}`
  line will render the title twice on that page; accepted and tracked in
  `blog-2x7`.

### CSS

- `css/screen.css` kept verbatim.
- `css/syntax.css` deleted.
- `css/prism.css` added — Prism's `prism.css` default theme, copied once
  from `node_modules/prismjs/themes/prism.css` and committed to the repo.
  An `npm run copy:prism` script regenerates the copy if the theme is ever
  refreshed.

### Drafts

- `_drafts/` is excluded from the posts collection. The directory and its
  one file remain on disk untouched. The publish-or-delete decision is
  deferred to `blog-2x7`.

### Standalone `gw2010/`

- The directory is passthrough-copied to `_site/gw2010/` exactly as-is. Its
  HTML still contains the dead third-party scripts; cleanup is deferred to
  `blog-2x7`.

### GitHub Actions workflow (`.github/workflows/deploy.yml`)

Triggers on push to the source branch (initially `gh-pages`; the workflow
file uses the active branch name as configured at merge time) and on
`workflow_dispatch`. Permissions: `contents: read`, `pages: write`,
`id-token: write`. Concurrency group `pages` with `cancel-in-progress: false`.

Steps:

1. `actions/checkout@v4`.
2. `actions/setup-node@v4` with `node-version-file: .nvmrc` and
   `cache: npm`.
3. `npm ci`.
4. `npx @11ty/eleventy`.
5. `actions/configure-pages@v5`.
6. `actions/upload-pages-artifact@v3` with `path: _site`.
7. `actions/deploy-pages@v4`.

### Project files added

- `package.json` pinning:
  - `@11ty/eleventy@^3`
  - `@11ty/eleventy-plugin-syntaxhighlight`
  - `markdown-it`
  - `markdown-it-anchor`
  - `prismjs` (for the theme CSS source)

  Scripts: `build` (`eleventy`), `serve` (`eleventy --serve`),
  `clean` (`rm -rf _site`), `copy:prism`
  (`cp node_modules/prismjs/themes/prism.css css/prism.css`).

- `.gitignore`:
  - `_site/`
  - `node_modules/`

- `.nvmrc`: `20`.

## Failure modes

- **Build fails in Actions** — the site keeps serving the previous
  successful deploy. Failure surfaces in the Actions tab; nothing else
  required.
- **Markdown rendering drift** — Redcarpet and markdown-it differ in
  edge cases (escaping, HTML-in-markdown handling, list behavior). The
  recent commits `db9ec2f "Escaping"` and `d08c202 "Work-around <code> in
  <em>s"` are evidence of past Redcarpet quirks. Old posts may render with
  subtly different escaping or whitespace. Accepted; not in scope to chase.
  Anything objectionable becomes work under `blog-2x7`.
- **Leftover Liquid in post bodies** — 11ty processes Liquid in markdown by
  default. The `{% highlight %}` sweep is mechanical; any other Liquid in a
  post body will either render (as in csspring-cleaning's `{{ page.title }}`)
  or fail loudly at build time. The build-time error is the desired signal.
- **GH Pages source-branch misconfiguration** — switching the Pages source
  to "GitHub Actions" is a one-time manual step in repo settings. The
  migration plan includes this step explicitly; otherwise the Action will
  succeed but Pages will keep serving the old branch.

## Validation (how to experience it)

1. Switch to the migration branch.
2. `npm ci && npm run serve`.
3. Open `http://localhost:8080/` — the homepage shows the 25-post list.
4. Click `2015-01-27 Resolved: GDAL on AWS GPU Instances` — bash blocks
   render with Prism syntax colors.
5. Click `2009-02-24 my work git workflow` — the gist `<script>` embeds
   still render as GitHub-styled gists (assuming live internet).
6. Visit `/atom.xml` — confirm well-formed (`xmllint --noout _site/atom.xml`),
   25 entries, self-link points at `/atom.xml` (no FeedBurner indirection).
7. Visit `/2005/04/19/mbta-maps.html` — URL shape matches Jekyll's old
   default.
8. Visit `/gw2010/` — standalone landing page renders unchanged.
9. View source on any post — no GA, Woopra, TypeKit, or Disqus markup.
10. After merge: push to the source branch, watch the GH Action run, and
    verify `mojodna.net` serves the new build.

## Out of scope

- Visual redesign.
- Content edits in post bodies (gist embeds, redundant title, `http://` →
  `https://`) — `blog-2x7`.
- Cleanup of `gw2010/index.html`'s embedded scripts — `blog-2x7`.
- Publish/delete decision for the unpublished 2012 draft — `blog-2x7`.
- Reintroducing any analytics — declined.
- Renaming the source branch from `gh-pages` to `main` — a finishing
  decision, made when the branch lands.

## References

- Bead `blog-2x7` — Content hygiene pass after 11ty migration (deferred
  edits from "Approach 3" of the brainstorm).
