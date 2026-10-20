#!/usr/bin/env python3
"""Check a small static site using only Python's standard library."""

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
ORIGIN = "https://smasiha.github.io/"
ALLOWED_SCRIPTS = {
    DOCS / "assets/js/theme.js",
    DOCS / "assets/js/back-to-top.js",
    DOCS / "assets/js/article-resources.js",
    DOCS / "assets/js/research-story.js",
    DOCS / "assets/js/sampling-story.js",
    DOCS / "assets/js/ula-model.js",
    DOCS / "assets/js/normal-rise.js",
    DOCS / "assets/js/gibbs-reference.js",
    DOCS / "assets/js/gibbs-density.js",
    DOCS / "assets/js/gibbs-curves.js",
    DOCS / "assets/js/sampling-field.js",
    DOCS / "assets/js/sampling-family-geometry.js",
}
errors = []


def fail(path, message):
    errors.append(f"{path.relative_to(ROOT)}: {message}")


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.tags = []
        self.text = path.read_text(encoding="utf-8")
        self.feed(self.text)
        self.ids = [attrs["id"] for _, attrs in self.tags if "id" in attrs]

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)


public_paths = sorted(DOCS.rglob("*.html"))
template_path = ROOT / "templates/article.html"
documents = {path.resolve(): Document(path) for path in public_paths + [template_path]}
external = set()
link_count = 0
canonicals = set()

for path, doc in documents.items():
    public = path.is_relative_to(DOCS)
    duplicates = [key for key, count in Counter(doc.ids).items() if count > 1]
    if duplicates:
        fail(path, f"Duplicate IDs: {duplicates}")
    if sum(tag == "h1" for tag, _ in doc.tags) != 1:
        fail(path, "Expected exactly one h1")
    if sum(tag == "main" for tag, _ in doc.tags) != 1:
        fail(path, "Expected exactly one main landmark")
    if not re.search(r"<title>\s*\S.*?</title>", doc.text, re.S):
        fail(path, "Missing page title")
    if not any(tag == "html" and attrs.get("lang") == "en" for tag, attrs in doc.tags):
        fail(path, "Missing English document language")
    for name in ("description", "viewport"):
        if not any(tag == "meta" and attrs.get("name") == name and attrs.get("content") for tag, attrs in doc.tags):
            fail(path, f"Missing {name} metadata")
    if public:
        expected = ORIGIN + str(path.relative_to(DOCS)).removesuffix("index.html")
        canonical = [attrs.get("href") for tag, attrs in doc.tags if tag == "link" and attrs.get("rel") == "canonical"]
        if canonical != [expected]:
            fail(path, f"Expected canonical {expected}, got {canonical}")
        else:
            canonicals.add(expected)
        for tag, attrs in doc.tags:
            if tag == "script":
                src = urlsplit(attrs.get("src", ""))
                if src.scheme or src.netloc or not src.path or (path.parent / src.path).resolve() not in ALLOWED_SCRIPTS:
                    fail(path, "Only the allowlisted local site scripts are allowed in the public site")
        for marker in ("noindex", "data-preview", "review-toolbar", "#view-", "template-note", "Your article title goes here", "Publication date", "Reference placeholder"):
            if marker.lower() in doc.text.lower():
                fail(path, f"Unfinished or preview content: {marker}")
    for tag, attrs in doc.tags:
        if tag == "img" and "alt" not in attrs:
            fail(path, "Image has no alt attribute")
        if tag == "a" and "download" in attrs and not attrs.get("href"):
            fail(path, "Download link has no destination")
        if tag == "svg" and not any(attrs.get(key) for key in ("aria-label", "aria-labelledby", "aria-hidden")):
            fail(path, "SVG has no accessible description or decorative marker")
        for key in ("aria-labelledby", "aria-describedby"):
            for target in attrs.get(key, "").split():
                if target not in doc.ids:
                    fail(path, f"Missing {key} target: {target}")
        for key in ("href", "src"):
            if key not in attrs:
                continue
            value = attrs[key]
            link_count += 1
            parsed = urlsplit(value)
            if parsed.scheme in ("https", "http"):
                if tag == "a":
                    external.add(value)
                continue
            if parsed.scheme == "mailto":
                if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", parsed.path):
                    fail(path, f"Invalid email link: {value}")
                continue
            if parsed.scheme or parsed.netloc or value.startswith("/"):
                fail(path, f"Nonportable local reference: {value}")
                continue
            target = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
            if target.is_dir():
                target /= "index.html"
            if public and not target.is_relative_to(DOCS):
                fail(path, f"Public link escapes docs: {value}")
                continue
            if not target.is_file():
                fail(path, f"Missing local destination: {value}")
            elif parsed.fragment:
                if target.suffix == ".svg":
                    try:
                        svg_ids = {el.get("id") for el in ET.parse(target).iter()}
                        if unquote(parsed.fragment) not in svg_ids:
                            fail(path, f"Missing SVG symbol: {value}")
                    except ET.ParseError as exc:
                        fail(target, f"Invalid SVG: {exc}")
                target_doc = documents.get(target)
                if target_doc is None and target.suffix == ".html":
                    target_doc = Document(target)
                if target_doc and unquote(parsed.fragment) not in target_doc.ids:
                    fail(path, f"Missing anchor: {value}")

for css_path in sorted((DOCS / "assets/css").rglob("*.css")):
    for value in re.findall(r"url\(\s*['\"]?([^)'\"]+)", css_path.read_text()):
        value = value.strip()
        parsed = urlsplit(value)
        if parsed.scheme == "data":
            continue
        if parsed.scheme or parsed.netloc or value.startswith("/"):
            fail(css_path, f"Nonportable CSS asset: {value}")
            continue
        if not parsed.path and parsed.fragment:
            continue
        target = (css_path.parent / unquote(parsed.path)).resolve()
        if not target.is_relative_to(DOCS) or not target.is_file():
            fail(css_path, f"Missing or nonpublic CSS asset: {value}")
        elif parsed.fragment and target.suffix == ".svg":
            try:
                svg_ids = {el.get("id") for el in ET.parse(target).iter()}
                if unquote(parsed.fragment) not in svg_ids:
                    fail(css_path, f"Missing SVG symbol: {value}")
            except ET.ParseError as exc:
                fail(target, f"Invalid SVG: {exc}")

for js_path in sorted((DOCS / "assets/js").glob("*.js")):
    for value in re.findall(r"^import\s+.+?\s+from\s+['\"]([^'\"]+)['\"]", js_path.read_text(), re.M):
        link_count += 1
        target = (js_path.parent / urlsplit(value).path).resolve()
        if not value.startswith("./") or target not in ALLOWED_SCRIPTS or not target.is_file():
            fail(js_path, f"Missing or nonlocal module import: {value}")

try:
    sitemap = ET.parse(DOCS / "sitemap.xml")
    urls = [el.text for el in sitemap.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    if set(urls) != canonicals or len(urls) != len(set(urls)):
        fail(DOCS / "sitemap.xml", "Sitemap must contain each public canonical exactly once")
except (ET.ParseError, FileNotFoundError) as exc:
    fail(DOCS / "sitemap.xml", str(exc))

if not (DOCS / ".nojekyll").is_file():
    fail(DOCS, "Missing .nojekyll")
for path in DOCS.rglob("*"):
    if path.is_file() and (path.suffix in (".py", ".md", ".log") or path.name in (".DS_Store", "package.json", "article.html")):
        fail(path, "Development file in publication folder")

if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
print(f"PASS: {len(public_paths)} public pages and the article template; {link_count} link/asset references checked.")
print(f"Sitemap, metadata, IDs, anchors, email syntax, image alternatives, and publication-folder checks passed.")
print(f"{len(external)} distinct external links found; network and rendered accessibility checks are separate.")
