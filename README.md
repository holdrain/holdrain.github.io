# Ziping Dong — personal website

A minimal static website for GitHub Pages. It uses plain HTML and CSS, with no build step.

- `index.html` contains the profile, news, publications, education, honors, hobbies, and blog section.
- `blog/robot-use-agents-safety.md` is the editable source for the first article.
- `scripts/build_blog.py` renders that Markdown into the article page.
- `styles.css` contains the shared design.

To preview locally, run `python3 -m http.server 8000` in the repository root and open `http://localhost:8000`.

To revise the article, edit `blog/robot-use-agents-safety.md`, then run `python3 scripts/build_blog.py` and commit both the Markdown and generated HTML. The homepage card is edited separately in `index.html`.
