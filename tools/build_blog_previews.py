#!/usr/bin/env python3
"""Build the Research Blog's informative previews from existing toy sources.

The minimizer geometry and illustrative validation scores come from the preserved
presentation geometry. Sampling dots are the recorded ULA endpoint, not newly
drawn points or measured paper results. Only the two marked listing blocks are
owned here. Run with --check to verify without writing. Python standard library.
"""

import argparse
import json
from pathlib import Path
import re

from build_sampling_figures import geometry

ROOT = Path(__file__).resolve().parents[1]
LISTING = ROOT / 'docs/writing/index.html'


def path(points):
    return ' '.join(f'{"M" if i == 0 else "L"}{x:.2f} {y:.2f}'
                    for i, (x, y) in enumerate(points))


def selection_preview():
    source = json.loads((ROOT / 'tools/manifold-geometry.json').read_text())
    left, top, right, bottom = source['plot_bounds']

    def pixel(point):
        return (18 + (point[0] - left) / (right - left) * 264,
                52 + (point[1] - top) / (bottom - top) * 84)

    candidates = source['candidates']
    indices = [3, source['selected_index'], 14]
    scores = [candidates[i]['base'][1] - candidates[i]['end'][1] for i in indices]
    assert scores[1] == max(scores) and scores.count(max(scores)) == 1
    dots = []
    for i, candidate in enumerate(candidates):
        x, y = pixel(candidate['base'])
        dots.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{4 if i in indices else 2.3}"/>')
    labels, bars = [], []
    for i, label, score in zip(indices, 'ABC', scores):
        x, y = pixel(candidates[i]['base'])
        labels.append(f'<text class="preview-model" x="{x:.2f}" y="{y + (23 if label == "B" else -12):.2f}" text-anchor="middle">{label}</text>')
        row = 194 + 'ABC'.index(label) * 26
        width = score / max(scores) * 202
        bars.append(f'<text class="preview-model" x="20" y="{row + 11}">{label}</text>')
        bars.append(f'<rect class="preview-score{" preview-selected" if label == "B" else ""}" x="48" y="{row}" width="{width:.2f}" height="11" rx="2"/>')
        if label == 'B':
            bars.append(f'<path class="preview-check" d="M263 {row+5}l4 4 8-9"/>')
    return f'''<figure class="post-preview" aria-labelledby="selection-preview-caption">
  <svg viewBox="0 0 300 270" role="img" aria-labelledby="selection-preview-title selection-preview-desc" focusable="false">
    <title id="selection-preview-title">Equal training loss, different validation scores</title>
    <desc id="selection-preview-desc">A, B and C lie on the same zero-training-loss curve. Their illustrative validation scores differ. B has the highest score and is selected. Geometry and score proportions are from the article's presentation example; scores are not measured results.</desc>
    <text class="preview-heading" x="18" y="26">Equal training loss</text>
    <text class="preview-label" x="18" y="47">Every point on the curve has loss 0.</text>
    <path class="preview-curve" d="{path(pixel(point) for point in source['curve'])}"/>
    <g class="preview-candidates">{''.join(dots)}</g>
    {''.join(labels)}
    <path class="preview-divider" d="M18 153H282"/>
    <text class="preview-heading" x="18" y="179">Validation score ↑</text>
    {''.join(bars)}
  </svg>
  <figcaption id="selection-preview-caption">Toy example with illustrative validation scores.</figcaption>
</figure>'''


def sampling_preview():
    source = json.loads((ROOT / 'docs/assets/data/ula-examples.json').read_text())
    run = next(run for run in source['final'] if run['temperature'] == .06)
    parameters = source['parameters']

    def pixel(x, y):
        return 150 + 72 * x, 124 - 72 * y

    curve = path(pixel(x, y) for x, y in geometry(parameters))
    particles = []
    assert len(run['particles']) == parameters['count'] == 64
    for point in run['particles']:
        x, y = pixel(point['x'], point['y'])
        assert 18 < x < 282 and 45 < y < 204
        particles.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="2.8"/>')
    return f'''<figure class="post-preview" aria-labelledby="sampling-preview-caption">
  <svg viewBox="0 0 300 270" role="img" aria-labelledby="sampling-preview-title sampling-preview-desc" focusable="false">
    <title id="sampling-preview-title">Sampling near a continuum of solutions</title>
    <desc id="sampling-preview-desc">The solid blue ellipse is the exact set of zero-loss solutions. Sixty-four dots show actual simulated ULA positions after {run['step']:,} steps, at temperature {run['temperature']} and step size {parameters['h']}. At positive temperature the particles lie near the set, rather than exactly on it. This finite toy run does not establish equilibrium.</desc>
    <text class="preview-heading" x="18" y="26">Explore a whole solution set</text>
    <path class="preview-axis" d="M22 124H278M150 43V202"/>
    <text class="preview-coordinate" x="276" y="143" text-anchor="end">x₁</text>
    <text class="preview-coordinate" x="160" y="51">x₂</text>
    <path class="preview-curve" d="{curve}"/>
    <g class="preview-particles">{''.join(particles)}</g>
    <path class="preview-divider" d="M18 213H282"/>
    <path class="preview-curve" d="M20 233H41"/>
    <text class="preview-label" x="52" y="238">Zero-loss solutions</text>
    <circle class="preview-particle-key" cx="30" cy="256" r="3.5"/>
    <text class="preview-label" x="52" y="261">64 simulated ULA particles</text>
  </svg>
  <figcaption id="sampling-preview-caption">Toy ULA simulation after {run['step']:,} steps.</figcaption>
</figure>'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify generated listing blocks without writing.')
    args = parser.parse_args()
    original = LISTING.read_text()
    updated = original
    for name, markup in [('sampling-preview', sampling_preview()), ('selection-preview', selection_preview())]:
        pattern = re.compile(r'(<!-- ' + name + r':start -->).*?(<!-- ' + name + r':end -->)', re.S)
        if len(pattern.findall(updated)) != 1:
            raise ValueError(f'Expected exactly one {name} block; refusing to alter the listing.')
        updated = pattern.sub(lambda match: match[1] + '\n' + markup + '\n' + match[2], updated)
    if args.check:
        if original != updated:
            raise SystemExit('Blog preview blocks are stale. Run python3 tools/build_blog_previews.py.')
        print('PASS: blog previews match preserved geometry and the recorded ULA endpoint.')
    else:
        LISTING.write_text(updated)
        print('Rebuilt the sampling-preview and selection-preview blocks in docs/writing/index.html.')


if __name__ == '__main__':
    main()
