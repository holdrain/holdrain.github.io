# Ziping Dong — personal website

A minimal static website for GitHub Pages. It uses plain HTML and CSS.

- `index.html` contains the profile, news, publications, blog preview, education, honors, and hobbies.
- `styles.css` contains the shared design.
- `blog/robot-use-agents-safety.md` is the editable blog source. Run `python3 scripts/build_blog.py` to regenerate its HTML page.

To preview locally, run `python3 -m http.server 8000` in the repository root and open `http://localhost:8000`.
