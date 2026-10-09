# Ziping Dong — personal website

A small, static personal website for GitHub Pages. It uses plain HTML and CSS, so it needs no build step or Jekyll installation.

## Pages

- `/` — introduction, updates, publications, and contact
- `/blog/` — long-form writing
- `/thinking/` — short reflections

The Blog and Thinking pages currently show an empty state because no entries have been provided. To publish an entry, create a standalone HTML page in the appropriate directory and add a link to that directory’s `index.html`. Copy its header and footer so the page keeps the same design.

## Preview

Run `python3 -m http.server 8000` from the repository root and open `http://localhost:8000`. GitHub Pages serves this site directly from the repository root. The `.nojekyll` file keeps the site independent of Jekyll.
