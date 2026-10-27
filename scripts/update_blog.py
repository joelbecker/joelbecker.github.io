#!/usr/bin/env python3
"""Fill the Blog section of index.html with previews of the latest worse.ink posts.

Reads the Shopify Atom feed, takes each post's featured image from the
article page's og:image tag, and rewrites everything between the
<!-- blog:start --> and <!-- blog:end --> markers in index.html.

Needs only the standard library and curl. If the feed can't be fetched, index.html is
left untouched so a deploy still goes out.
"""

import html
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

FEED_URL = "https://worse.ink/blogs/art.atom"
BLOG_URL = "https://worse.ink/blogs/art"
MAX_POSTS = 4
EXCERPT_LENGTH = 160
IMAGE_WIDTH = 800

INDEX = Path(__file__).resolve().parent.parent / "index.html"
MARKERS = re.compile(r"(<!-- blog:start -->\n)(.*?)(^[ \t]*<!-- blog:end -->)", re.S | re.M)
ATOM = {"a": "http://www.w3.org/2005/Atom"}


def fetch(url):
    # Shopify answers Python's own HTTP client with 429s, but lets curl through.
    try:
        result = subprocess.run(
            ["curl", "--silent", "--show-error", "--fail", "--location", "--max-time", "20", url],
            capture_output=True, check=True, text=True,
        )
    except subprocess.CalledProcessError as error:
        raise OSError(error.stderr.strip()) from error
    return result.stdout


def strip_tags(markup):
    # Block tags separate words; inline tags like <i> sit inside them.
    text = re.sub(r"</?(?:p|div|br|li|h[1-6])\b[^>]*>", " ", markup)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def excerpt(text):
    if len(text) <= EXCERPT_LENGTH:
        return text
    return text[:EXCERPT_LENGTH].rsplit(" ", 1)[0].rstrip(",.;:—-") + "…"


def featured_image(url, content):
    # The feed doesn't include featured images, but the article page's og:image does.
    try:
        page = fetch(url)
        match = re.search(r'<meta property="og:image:secure_url" content="([^"]+)"', page)
        if match:
            src = html.unescape(match.group(1))
            return src + ("&" if "?" in src else "?") + f"width={IMAGE_WIDTH}"
    except OSError as error:
        print(f"warning: couldn't fetch {url}: {error}", file=sys.stderr)
    match = re.search(r'<img[^>]+src="([^"]+)"', content)
    return html.unescape(match.group(1)) if match else None


def read_posts():
    feed = ET.fromstring(fetch(FEED_URL))
    posts = []
    for entry in feed.findall("a:entry", ATOM)[:MAX_POSTS]:
        url = entry.find("a:link[@rel='alternate']", ATOM).get("href")
        content = entry.findtext("a:content", "", ATOM)
        summary = strip_tags(entry.findtext("a:summary", "", ATOM)) or strip_tags(content)
        published = datetime.fromisoformat(entry.findtext("a:published", "", ATOM))
        posts.append({
            "title": entry.findtext("a:title", "", ATOM).strip(),
            "url": url,
            "date": f"{published:%B} {published.day}, {published.year}",
            "excerpt": excerpt(summary),
            "image": featured_image(url, content),
        })
    return posts


def render(posts, indent):
    esc = html.escape
    lines = ['<div class="blog-posts">']
    for post in posts:
        lines.append(f'\t<a class="blog-post" href="{esc(post["url"])}">')
        if post["image"]:
            lines.append(f'\t\t<img src="{esc(post["image"])}" alt="" loading="lazy" />')
        lines.append(f'\t\t<h3>{esc(post["title"])}</h3>')
        lines.append(f'\t\t<p class="blog-date">{esc(post["date"])}</p>')
        lines.append(f'\t\t<p>{esc(post["excerpt"])}</p>')
        lines.append("\t</a>")
    lines.append("</div>")
    lines.append('<ul class="actions">')
    lines.append(f'\t<li><a href="{BLOG_URL}" class="button">More on worse.ink</a></li>')
    lines.append("</ul>")
    return "".join(f"{indent}{line}\n" for line in lines)


def main():
    try:
        posts = read_posts()
    except (OSError, ET.ParseError) as error:
        print(f"warning: couldn't read {FEED_URL}, leaving index.html as is: {error}", file=sys.stderr)
        return
    if not posts:
        print("warning: feed has no posts, leaving index.html as is", file=sys.stderr)
        return

    page = INDEX.read_text(encoding="utf-8")
    match = MARKERS.search(page)
    if not match:
        sys.exit("error: blog markers not found in index.html")
    indent = re.match(r"[ \t]*", match.group(3)).group(0)
    updated = page[:match.start(2)] + render(posts, indent) + page[match.end(2):]

    if updated != page:
        INDEX.write_text(updated, encoding="utf-8")
        print(f"updated index.html with {len(posts)} posts")
    else:
        print("index.html already up to date")


if __name__ == "__main__":
    main()
