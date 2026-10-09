"""Render the editable Markdown blog draft as a standalone static page."""

from html import escape
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "blog" / "robot-use-agents-safety.md"
DESTINATION = ROOT / "blog" / "robot-use-agents-safety" / "index.html"


def inline(text):
    parts = re.split(r"(`[^`]+`)", text)
    rendered = []
    for part in parts:
        if part.startswith("`") and part.endswith("`"):
            rendered.append(f"<code>{escape(part[1:-1])}</code>")
            continue
        part = escape(part)
        part = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", part)
        part = re.sub(r"\*(.+?)\*", r"<em>\1</em>", part)
        rendered.append(part)
    return "".join(rendered)


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def render_blocks(lines):
    blocks = []
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line.startswith("## "):
            heading = line[3:]
            blocks.append(f'<h2 id="{slug(heading)}">{inline(heading)}</h2>')
            index += 1
            continue
        if re.match(r"\d+\. ", line):
            items = []
            while index < len(lines):
                match = re.match(r"\d+\. (.+)", lines[index].strip())
                if not match:
                    break
                items.append(f"<li>{inline(match.group(1))}</li>")
                index += 1
            blocks.append("<ol>" + "".join(items) + "</ol>")
            continue
        paragraph = [line]
        index += 1
        while index < len(lines) and lines[index].strip() and not lines[index].startswith("## "):
            paragraph.append(lines[index].strip())
            index += 1
        blocks.append(f"<p>{inline(' '.join(paragraph))}</p>")
    return "\n".join(blocks)


def main():
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    if not lines or not lines[0].startswith("# "):
        raise ValueError("The first line must be a Markdown title beginning with '# '.")
    title = lines[0][2:].strip()
    article = render_blocks(lines[1:])
    page = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#ffffff">
  <meta name="description" content="A blog article by Ziping Dong about motion planning and safety in Robot-Use Agents.">
  <link rel="icon" href="/images/favicon.ico">
  <link rel="stylesheet" href="/styles.css">
  <title>{escape(title)} · Ziping Dong</title>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="wrap header-inner">
    <a class="site-name" href="/">Ziping Dong</a>
    <nav aria-label="Main navigation">
      <a href="/#about">About</a><a href="/#publications">Publications</a>
      <a href="/#background">Background</a><a href="/#blog">Blog</a>
    </nav>
  </div></header>
  <main id="main" class="wrap article-page">
    <a class="back-link" href="/#blog">← Back to Blog</a>
    <article>
      <p class="article-label">Blog · Ziping Dong</p>
      <h1>{escape(title)}</h1>
      <img class="article-cover" src="/images/robot-safety-cover.svg" alt="Abstract illustration of a robot arm and a safety boundary">
      <div class="article-body">
{article}
      </div>
    </article>
  </main>
  <footer class="site-footer"><div class="wrap"><span>© 2026 Ziping Dong</span><a href="mailto:dongziping@u.nus.edu">dongziping@u.nus.edu</a></div></footer>
</body>
</html>
'''
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    DESTINATION.write_text(page, encoding="utf-8")


if __name__ == "__main__":
    main()
