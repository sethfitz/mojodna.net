# 11ty Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `mojodna.net` from Jekyll to Eleventy 3.x while preserving every post URL and the Atom feed URL, dropping dead third-party scripts, and adding a GitHub Actions deploy.

**Architecture:** Eleventy renders the existing repo (input dir = repo root) into `_site/`. New `_includes/layouts/*.liquid` replace the old `_layouts/*.html`. A directory data file (`_posts/_posts.11tydata.json`) tags posts and sets the Jekyll-style permalink. A GitHub Actions workflow builds on push and deploys via `actions/deploy-pages`. Custom domain stays via the existing `CNAME`.

**Tech Stack:** Node.js 20, Eleventy 3.x (Liquid templating, default), `markdown-it` with `markdown-it-anchor`, `@11ty/eleventy-plugin-syntaxhighlight` (Prism), GitHub Pages + Actions.

**Spec:** `docs/superpowers/specs/2026-04-27-11ty-migration-design.md`. Read it first.

**Out-of-scope follow-ups:** bead `blog-2x7` (content hygiene).

**Branch:** `eleventy-migration` (already created off `gh-pages`).

---

## File Structure

**Create:**
- `.nvmrc` — pins Node 20
- `.gitignore` — excludes `_site/` and `node_modules/`
- `package.json` — Eleventy + plugin deps, build/serve scripts
- `eleventy.config.mjs` — Eleventy config (ESM)
- `_includes/layouts/default.liquid` — page chrome
- `_includes/layouts/post.liquid` — post wrapper extending default
- `_posts/_posts.11tydata.json` — directory data: `posts` tag, post layout, Jekyll-style permalink
- `css/prism.css` — committed copy of Prism's default theme
- `.github/workflows/deploy.yml` — build and deploy to GitHub Pages

**Modify:**
- `index.html` — new front matter and `collections.posts` loop
- `atom.xml` — new front matter, drop FeedBurner alias, switch self-links to `/atom.xml` over HTTPS
- 13 posts under `_posts/` — mechanical `{% highlight %}` → fenced-block conversion

**Delete:**
- `_config.yml` (Jekyll-only)
- `_layouts/default.html`, `_layouts/post.html` (replaced by `_includes/layouts/*.liquid`)
- `css/syntax.css` (replaced by `css/prism.css`)

**Untouched:** all post prose, `_drafts/`, `gw2010/`, `CNAME`, `css/screen.css`.

---

## Task 1: Repo scaffolding

**Files:**
- Create: `.nvmrc`
- Create: `.gitignore`
- Create: `package.json`

- [ ] **Step 1: Add `.nvmrc`**

Create `.nvmrc` with one line:

```
20
```

- [ ] **Step 2: Add `.gitignore`**

Create `.gitignore`:

```
node_modules/
_site/
```

- [ ] **Step 3: Add `package.json`**

Create `package.json`:

```json
{
  "name": "mojodna-net",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "eleventy",
    "serve": "eleventy --serve",
    "clean": "rm -rf _site"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3",
    "@11ty/eleventy-plugin-syntaxhighlight": "^5",
    "markdown-it": "^14",
    "markdown-it-anchor": "^9"
  }
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: creates `node_modules/` and `package-lock.json` with no errors.

- [ ] **Step 5: Verify Eleventy is callable**

Run: `npx @11ty/eleventy --version`
Expected: prints a version starting with `3.`

- [ ] **Step 6: Commit**

```bash
git add .nvmrc .gitignore package.json package-lock.json
git commit -m "Add Node toolchain for Eleventy migration" -m "Pins Node 20 via .nvmrc, ignores build output and node_modules, and declares Eleventy 3.x plus the syntax-highlight plugin and markdown-it stack as dev dependencies."
```

---

## Task 2: Remove Jekyll-only files

**Files:**
- Delete: `_config.yml`
- Delete: `_layouts/default.html`
- Delete: `_layouts/post.html`
- Delete: `_layouts/` (now empty)
- Delete: `css/syntax.css`

- [ ] **Step 1: Delete Jekyll config and layouts**

Run:

```bash
git rm _config.yml _layouts/default.html _layouts/post.html css/syntax.css
rmdir _layouts
```

- [ ] **Step 2: Verify nothing else references these files**

Run: `rg -F 'syntax.css|_layouts/default|_layouts/post|_config.yml' .`
Expected: no matches outside of git history (ignore matches in `docs/superpowers/`).

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "Remove Jekyll-only config and layouts" -m "Deletes _config.yml, _layouts/, and css/syntax.css. Eleventy replacements arrive in the next commit; the Jekyll-build path no longer exists in the source tree."
```

---

## Task 3: Eleventy config and layouts

**Files:**
- Create: `eleventy.config.mjs`
- Create: `_includes/layouts/default.liquid`
- Create: `_includes/layouts/post.liquid`

- [ ] **Step 1: Write the Eleventy config**

Create `eleventy.config.mjs`:

```js
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  const md = markdownIt({ html: true, linkify: true, typographer: false });
  md.use(markdownItAnchor);
  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("gw2010");
  eleventyConfig.addPassthroughCopy("CNAME");

  eleventyConfig.ignores.add("_drafts/**");
  eleventyConfig.ignores.add("docs/**");
  eleventyConfig.ignores.add("README.md");
  // gw2010/index.html matches Eleventy's templateFormats (.html), so without
  // this ignore the file would be template-processed instead of copied
  // verbatim. Passthrough above does the actual copy.
  eleventyConfig.ignores.add("gw2010/**");

  eleventyConfig.addLayoutAlias("default", "layouts/default.liquid");
  eleventyConfig.addLayoutAlias("post", "layouts/post.liquid");

  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi.getFilteredByTag("posts").sort((a, b) => a.date - b.date),
  );

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
    },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
  };
}
```

- [ ] **Step 2: Write `default.liquid`**

Create `_includes/layouts/default.liquid`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ title }} :: Drive-by Digressions</title>
<meta name="author" content="Seth Fitzsimmons">
<link rel="alternate" type="application/atom+xml" href="/atom.xml" title="Drive-by Digressions">
<link rel="stylesheet" href="/css/screen.css">
<link rel="stylesheet" href="/css/prism.css">
</head>
<body>
<div id="container">
  {{ content }}
  <div id="footer">
    <div>
      <a rel="license" href="https://creativecommons.org/licenses/by-sa/3.0/us/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/3.0/us/80x15.png"></a>
    </div>
    <div><a href="/">Seth Fitzsimmons</a></div>
    <div><a class="code" href="https://github.com/mojodna">github.com/mojodna</a></div>
    <div>seth@mojodna.net</div>
  </div>
</div>
</body>
</html>
```

- [ ] **Step 3: Write `post.liquid`**

Create `_includes/layouts/post.liquid`:

```html
---
layout: default
---
<article>
<h1>{{ title }}</h1>
{{ content }}
</article>
```

- [ ] **Step 4: Verify the build runs (expected to fail on `{% highlight %}`)**

Run: `npx @11ty/eleventy`

Expected: build fails when it reaches a post containing `{% highlight LANG %}` Liquid tags (Eleventy parses Liquid in markdown, and that tag is Jekyll-only). The failure confirms the templating chain is wired up. The next task sweeps those tags. If the build *succeeds* unexpectedly, that's also fine — proceed to Task 4 anyway.

- [ ] **Step 5: Commit**

```bash
git add eleventy.config.mjs _includes/layouts/default.liquid _includes/layouts/post.liquid
git commit -m "Add Eleventy config and Liquid layouts" -m "Configures input=., output=_site, includes=_includes; registers the syntax-highlight plugin; sets up the posts collection (ascending; templates iterate reversed) and layout aliases. Layouts replace the deleted _layouts/*.html with HTML5 chrome free of GA, Woopra, TypeKit, FeedBurner, and Disqus markup."
```

---

## Task 4: Convert `{% highlight %}` blocks to fenced code

**Files:**
- Modify: 13 posts under `_posts/` (listed below)

This task lands before the posts data file because the `{% highlight %}` Liquid tags would fail to parse during any build. Sweeping first means subsequent builds in Task 5 onward work cleanly.

The 13 affected files:

```
_posts/2005-11-30-sprout-annotation-powered-simplicity-for-struts.markdown
_posts/2006-10-02-searchable-annotation-driven-indexing-and-searching-with-lucene.markdown
_posts/2007-02-12-classloading-in-rails.markdown
_posts/2007-03-08-teach-capistrano-to-deploy-from-a-tag-or-branch.markdown
_posts/2007-06-14-extending-activerecord-attributes.markdown
_posts/2009-02-24-my-work-git-workflow.markdown
_posts/2009-05-20-updating-ruby-consumers-and-providers-to-oauth-10a.markdown
_posts/2009-07-16-switchboard-curl-for-xmpp.markdown
_posts/2009-07-19-switchboard-as-a-framework.markdown
_posts/2009-07-21-subscribing-to-wordpress-com-with-switchboard.markdown
_posts/2009-08-21-exploring-oauth-protected-apis.markdown
_posts/2009-09-08-csspring-cleaning.markdown
_posts/2009-12-05-the-os-x-spatial-stack.markdown
```

- [ ] **Step 1: Run the conversion**

Use Perl (works identically on macOS and Linux, no `gsed` quoting concerns):

```bash
perl -i -pe 's/\{%\s*highlight\s+(\w+)\s*%\}/```$1/g; s/\{%\s*endhighlight\s*%\}/```/g' _posts/*.markdown
```

- [ ] **Step 2: Verify no `{% highlight %}` or `{% endhighlight %}` remain**

Run: `rg '\{%\s*(end)?highlight' _posts/`
Expected: no matches.

- [ ] **Step 3: Spot-check one converted post**

Run: `rg -A1 '^```' _posts/2009-09-08-csspring-cleaning.markdown | head -10`
Expected: shows fenced code blocks like ```` ```bash ```` opening and ```` ``` ```` closing.

- [ ] **Step 4: Run the build**

Run: `npx @11ty/eleventy`
Expected: completes without error. Posts emit at default Eleventy paths (e.g. `_site/_posts/2005-04-19-mbta-maps/index.html`) — that's expected. The next task adds the Jekyll-style permalink.

- [ ] **Step 5: Commit**

```bash
git add _posts/*.markdown
git commit -m "Convert Jekyll {% highlight %} to fenced code blocks" -m "Mechanical sweep across 13 posts: {% highlight LANG %} -> triple-backtick LANG, {% endhighlight %} -> triple-backtick. Prose untouched. Prepares posts for markdown-it + Prism syntax highlighting (added in a later task)."
```

---

## Task 5: Posts directory data file (permalinks)

**Files:**
- Create: `_posts/_posts.11tydata.json`

- [ ] **Step 1: Write the directory data file**

Create `_posts/_posts.11tydata.json`:

```json
{
  "tags": ["posts"],
  "layout": "post",
  "permalink": "/{{ page.date | date: '%Y/%m/%d' }}/{{ page.fileSlug }}.html"
}
```

- [ ] **Step 2: Run the build**

Run: `npx @11ty/eleventy`
Expected: build succeeds.

- [ ] **Step 3: Verify a sample of post URLs match Jekyll's old default**

Run:

```bash
for url in 2005/04/19/mbta-maps.html 2009/02/24/my-work-git-workflow.html 2015/01/27/resolved-gdal-on-aws-gpus.html; do
  test -f "_site/$url" && echo "OK: $url" || echo "MISSING: $url"
done
```

Expected: three `OK:` lines.

- [ ] **Step 4: Commit**

```bash
git add _posts/_posts.11tydata.json
git commit -m "Tag posts and set Jekyll-style permalink" -m "Directory data tags every file in _posts/ as 'posts' for the collection, defaults the layout to post, and emits at /YYYY/MM/DD/slug.html (Jekyll's default). page.fileSlug strips the YYYY-MM-DD- prefix so the slug matches Jekyll's behavior."
```

---

## Task 6: Pre-flight Liquid sanity check

**Files:** none modified.

- [ ] **Step 1: Search for any remaining Liquid tokens in post bodies**

Run: `rg '\{[{%]' _posts/`

Expected matches (one, expected and accepted):

```
_posts/2009-09-08-csspring-cleaning.markdown:## {{ page.title }}
```

- [ ] **Step 2: Confirm no other Liquid leaked in**

If the search produced any match other than the `## {{ page.title }}` line in csspring-cleaning, inspect each match. Possibilities:
- A `{{` inside a code block that survived because the highlight sweep already wrapped it in fenced blocks — Liquid will still try to parse it. Wrap the offending fenced block by escaping `{{` to `{% raw %}{{{% endraw %}` if the post needs to render literal Liquid (none of our posts should).
- An accidental Liquid token in prose.

If anything else turns up, resolve it (escape with `{% raw %}…{% endraw %}` blocks or fix the source) before continuing.

- [ ] **Step 3: No commit needed**

This is a verification step, not a code change. The known csspring-cleaning duplicate is documented in bead `blog-2x7`.

---

## Task 7: Update `index.html` for Eleventy

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Rewrite `index.html`**

Replace the entire file contents with:

```liquid
---
layout: default
title: Seth Fitzsimmons
permalink: /index.html
eleventyExcludeFromCollections: true
---

<h1>Digressions of a Drive-by Hacker</h1>

<h2>Assorted Scribblings</h2>
<ul class="posts">
  {% for post in collections.posts reversed %}
    <li><span>{{ post.date | date: "%b %-d, %Y" }}</span>: <a href="{{ post.url }}">{{ post.data.title }}</a></li>
  {% endfor %}
</ul>
```

- [ ] **Step 2: Run the build**

Run: `npx @11ty/eleventy`
Expected: build succeeds.

- [ ] **Step 3: Verify the homepage renders the post list**

Run: `rg 'mbta-maps' _site/index.html`
Expected: a match showing the link to `2005/04/19/mbta-maps.html` with the post title.

Run: `grep -c '<li>' _site/index.html`
Expected: `25`.

- [ ] **Step 4: Verify newest-first ordering**

Run: `head -40 _site/index.html | rg -o '20[0-9]{2}'`
Expected: the first listed year is `2015` (newest post is 2015-01-27).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Rewrite index.html for Eleventy collections" -m "Switches the homepage to iterate collections.posts (reversed for newest-first) using post.data.title and the same date format Jekyll's date_to_string produced. Adds eleventyExcludeFromCollections so a future tag-everything scheme cannot accidentally pull index.html into the post list."
```

---

## Task 8: Update `atom.xml` for Eleventy

**Files:**
- Modify: `atom.xml`

- [ ] **Step 1: Rewrite `atom.xml`**

Replace the entire file contents with:

```liquid
---
permalink: /atom.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">

  <title>Digressions of a Drive-by Hacker</title>
  <link href="https://mojodna.net/atom.xml" rel="self"/>
  <link href="https://mojodna.net/"/>
  <updated>{{ "now" | date: "%Y-%m-%dT%H:%M:%SZ" }}</updated>
  <id>https://mojodna.net/</id>
  <author>
    <name>Seth Fitzsimmons</name>
    <email>seth@mojodna.net</email>
  </author>

  {% for post in collections.posts reversed %}
  <entry>
    <title>{{ post.data.title }}</title>
    <link href="https://mojodna.net{{ post.url }}"/>
    <updated>{{ post.date | date: "%Y-%m-%dT%H:%M:%SZ" }}</updated>
    <id>https://mojodna.net{{ post.url }}</id>
    <content type="html">{{ post.templateContent | escape }}</content>
  </entry>
  {% endfor %}

</feed>
```

- [ ] **Step 2: Run the build**

Run: `npx @11ty/eleventy`
Expected: build succeeds.

- [ ] **Step 3: Verify the feed is well-formed XML**

Run: `xmllint --noout _site/atom.xml`
Expected: no output (well-formed). If `xmllint` is missing, `brew install libxml2` (already preinstalled on macOS).

- [ ] **Step 4: Verify entry count**

Run: `grep -c '<entry>' _site/atom.xml`
Expected: `25`.

- [ ] **Step 5: Verify the self-link points at `/atom.xml`, not FeedBurner**

Run: `rg 'feedburner' _site/atom.xml`
Expected: no matches.

Run: `rg 'rel="self"' _site/atom.xml`
Expected: one match showing `https://mojodna.net/atom.xml`.

- [ ] **Step 6: Commit**

```bash
git add atom.xml
git commit -m "Rewrite atom.xml for Eleventy collections" -m "Iterates collections.posts (reversed), uses Liquid's escape filter on post.templateContent (markdown-it output) for the <content type=\"html\"> blocks, and replaces the FeedBurner alias with a direct https://mojodna.net/atom.xml self-link."
```

---

## Task 9: Add Prism syntax highlighting CSS

**Files:**
- Create: `css/prism.css`

- [ ] **Step 1: Install `prismjs` temporarily for the theme file**

Run: `npm install --no-save prismjs`
Expected: `node_modules/prismjs/themes/prism.css` now exists.

- [ ] **Step 2: Copy the default theme into the repo**

Run: `cp node_modules/prismjs/themes/prism.css css/prism.css`

- [ ] **Step 3: Verify the file is non-empty CSS**

Run: `head -3 css/prism.css`
Expected: prints CSS comments / rules. File should be roughly 2 KB.

- [ ] **Step 4: Run the build**

Run: `npx @11ty/eleventy`
Expected: build succeeds, `_site/css/prism.css` exists.

- [ ] **Step 5: Verify a code-heavy post has Prism markup**

Run: `rg 'class="language-bash"' _site/2015/01/27/resolved-gdal-on-aws-gpus.html | head -3`
Expected: at least one match (Prism wraps fenced bash blocks with `language-bash` and `token` classes).

Run: `rg 'class="token' _site/2015/01/27/resolved-gdal-on-aws-gpus.html | head -3`
Expected: at least one match.

- [ ] **Step 6: Commit**

```bash
git add css/prism.css
git commit -m "Add Prism default theme for syntax highlighting" -m "Commits a one-time copy of node_modules/prismjs/themes/prism.css. The Eleventy syntax-highlight plugin emits Prism token classes; this theme styles them. prismjs is not added as a runtime dep — refreshing the theme is one cp invocation."
```

---

## Task 10: Eyes-on review pass

**Files:** none modified.

- [ ] **Step 1: Start the dev server**

Run: `npx @11ty/eleventy --serve`
Expected: serves at `http://localhost:8080/`.

- [ ] **Step 2: Walk every post**

Open the homepage and click through all 25 posts. For each, look for:

- Code blocks that didn't render as code (look like prose or have raw backticks visible)
- Inline `<code>` that swallowed surrounding text (a known Redcarpet quirk — see commit `d08c202`)
- Escaping artifacts in `<em>`, `<strong>`, or anchor text (see commit `db9ec2f`)
- Broken Liquid output (`{{` or `{%` visible in the rendered HTML)
- Missing or duplicated headings

The known duplicate-title rendering on `2009/09/08/csspring-cleaning.html` is expected and tracked in `blog-2x7`. Anything else: write a one-line note per issue and append to bead `blog-2x7` via `br update blog-2x7 --comment "<note>"`.

- [ ] **Step 3: Sanity-check the home page and feed**

- Visit `http://localhost:8080/` — confirm the post list shows 25 entries newest-first, dates formatted like `Jan 27, 2015`.
- Visit `http://localhost:8080/atom.xml` — confirm the browser parses it as XML (not "this XML file does not appear to have any style information").
- Visit `http://localhost:8080/2005/04/19/mbta-maps.html` — confirm the URL works.
- Visit `http://localhost:8080/gw2010/` — confirm the standalone landing page renders unchanged.

- [ ] **Step 4: Stop the server**

Hit Ctrl-C in the terminal running `eleventy --serve`.

- [ ] **Step 5: No commit**

Verification step. Issues found get appended to `blog-2x7`.

---

## Task 11: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and deploy

on:
  push:
    branches: [gh-pages, main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npx @11ty/eleventy
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Lint the YAML**

Run: `python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/deploy.yml'))"`
Expected: no output (no parse errors).

- [ ] **Step 3: Run a final clean build to confirm no regressions**

Run:

```bash
npm run clean && npm run build
```

Expected: completes without error.

- [ ] **Step 4: Sanity-check the build output one more time**

Run:

```bash
test -f _site/index.html && \
test -f _site/atom.xml && \
test -f _site/CNAME && \
test -f _site/css/screen.css && \
test -f _site/css/prism.css && \
test -f _site/2005/04/19/mbta-maps.html && \
test -f _site/2015/01/27/resolved-gdal-on-aws-gpus.html && \
test -f _site/gw2010/index.html && \
echo "All expected outputs present"
```

Expected: prints `All expected outputs present`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deploy workflow" -m "Builds Eleventy on push to gh-pages or main (covers either post-merge source-branch outcome) and on manual dispatch. Deploys via actions/deploy-pages, which works with the existing CNAME (mojodna.net) once the repo's Pages source is set to 'GitHub Actions' in Settings (one-time manual step)."
```

---

## Post-implementation: manual GitHub Pages setting

After the branch is merged, one manual step is required in the GitHub UI:

1. Repo → Settings → Pages
2. Change "Build and deployment > Source" from "Deploy from a branch" to "GitHub Actions"

The first push after this change triggers the workflow and deploys to `mojodna.net`. The change is sticky; nothing else is needed.

If the source branch is renamed (`gh-pages` → `main`), no workflow edit is required — the workflow already triggers on either name.

---

## Validation summary (matches spec's "How to experience it")

After Task 11 completes, the validation in the spec's "How to experience it" section should be re-walked once on the dev server:

1. `npm run serve`, open `http://localhost:8080/`.
2. Confirm the post list (25 posts), code-heavy posts have Prism colors, the gist-embedded post still loads embeds, the atom feed parses, the URL shape matches Jekyll's, `gw2010/` renders, no GA/Woopra/TypeKit/Disqus markup in any post source.
3. Push to the source branch and confirm the GH Action runs and `mojodna.net` serves the new build.

Issues found during validation that aren't in scope go into bead `blog-2x7`.
