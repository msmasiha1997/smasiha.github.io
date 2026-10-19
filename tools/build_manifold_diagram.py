#!/usr/bin/env python3
"""Rebuild the slide-inspired figure with computed toy GD; standard library only.

The curve, candidate positions and score lengths are schematic source artwork,
not measured performance. This does not require the original presentation folder.
"""
import json
from pathlib import Path
import struct
import zlib

import manifold_gd as gd

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'tools/manifold-geometry.json').read_text())


def heatmap():
    """PNG of the very same loss used for GD, with a transparent color scale."""
    width, height = 960, 420
    bx, by, br, bb = DATA['plot_bounds']
    # Low to high loss; clipped only for color display, never for GD.
    colors = [(253, 231, 37), (94, 201, 98), (33, 145, 140), (59, 82, 139), (68, 1, 84)]
    rows = bytearray()
    for iy in range(height):
        rows.append(0)  # PNG scanline: no filter.
        for ix in range(width):
            point = gd.from_source([bx + (ix + .5) / width * (br - bx), by + (iy + .5) / height * (bb - by)])
            level = min(1, gd.loss(point) / 1.2) ** .35 * (len(colors) - 1)
            index = min(len(colors) - 2, int(level))
            mix = level - index
            rows.extend(round(a + (b - a) * mix) for a, b in zip(colors[index], colors[index + 1]))
            rows.append(51)

    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', width, height, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b'')
    (ROOT / 'docs/assets/images/minimizer-gd-landscape.png').write_bytes(png)


def diagram(mode, panel='landscape'):
    thumbnail = mode == 'thumbnail'
    width, height, left, top, pw, ph = {
        'desktop': (760, 300, 48, 12, 694, 244),
        'mobile': (360, 244, 38, 12, 312, 190),
        'thumbnail': (190, 112, 12, 10, 166, 90),
    }[mode]
    bx, by, br, bb = DATA['plot_bounds']

    def xy(point):
        return left + (point[0] - bx) * pw / (br - bx), top + (point[1] - by) * ph / (bb - by)

    def n(value):
        return f'{value:.3f}'

    if panel == 'scores':
        height, top, ph = (170, 12, 112) if mode == 'desktop' else (152, 12, 98)
    prefix = f'manifold-{mode}-{panel}'
    a11y = 'aria-hidden="true"' if thumbnail else f'role="img" aria-labelledby="{prefix}-title {prefix}-desc"'
    parts = [f'<svg class="manifold-diagram manifold-{mode}" data-panel="{panel}" viewBox="0 0 {width} {height}" {a11y} focusable="false">']
    if not thumbnail:
        if panel == 'scores':
            parts += [f'<title id="{prefix}-title">Validation scores of the same models</title>',
                      f'<desc id="{prefix}-desc" data-manifold-desc="scores">One bar per model, in the same horizontal order as the landscape. All bars start at the same baseline; bar height is an illustrative validation score, not a count. Model B has the tallest bar among the sixteen shown. Letters A, B and C match the labeled models in the landscape.</desc>']
        else:
            parts += [f'<title id="{prefix}-title">Different initializations approach different training solutions</title>',
                      f'<desc id="{prefix}-desc" data-manifold-desc="landscape">Both axes are model parameters. The blue curve is the set of minimizers of a computed toy loss; background color shows that same loss. Three dashed paths are actual gradient-descent runs with step size 0.16, from hollow starting points to A, B and C after 120 steps. All three approach zero training loss. Sixteen blue dots mark example solutions. Model B is circled because its illustrative validation score below is highest among these examples.</desc>']
    if not thumbnail and panel == 'landscape':
        parts += [f'<defs><clipPath id="{prefix}-clip"><rect x="{left}" y="{top}" width="{pw}" height="{ph}" rx="4"/></clipPath></defs>',
                  f'<image class="manifold-landscape" href="../../assets/images/minimizer-gd-landscape.png" x="{left}" y="{top}" width="{pw}" height="{ph}" preserveAspectRatio="none" clip-path="url(#{prefix}-clip)"/>',
                  f'<path class="manifold-axes" d="M{left} {top}V{top+ph}H{left+pw}"/>',
                  f'<text class="manifold-axis-label" x="{left+pw/2}" y="{height-9}" text-anchor="middle">Parameter x₁</text>',
                  f'<text class="manifold-axis-label" transform="translate(16 {top+ph/2}) rotate(-90)" text-anchor="middle">Parameter x₂</text>']
    curve_points = DATA['curve']
    if not thumbnail and panel == 'landscape':
        x_min, x_max = gd.from_source([bx, by])[0], gd.from_source([br, bb])[0]
        curve_points = [gd.to_source([x, gd.curve(x)]) for x in (x_min + i / 600 * (x_max - x_min) for i in range(601))]
    curve = ' '.join(('M' if i == 0 else 'L') + ' '.join(map(n, xy(point))) for i, point in enumerate(curve_points))
    labels = {3: 'A', DATA['selected_index']: 'B', 14: 'C'}
    if panel == 'landscape':
        if not thumbnail:
            for run in gd.runs():
                points = [xy(gd.to_source(point)) for point in run['points']]
                path = ' '.join(','.join(map(n, point)) for point in points)
                sx, sy = points[0]
                anchor, dx = ('end', -12) if run['label'] == 'A' else ('start', 12)
                parts += [f'<g data-gd-run="{run["label"]}">',
                          f'<polyline class="manifold-gd-path" data-gd-path points="{path}"/>',
                          f'<circle class="manifold-gd-start" cx="{n(sx)}" cy="{n(sy)}" r="5"/>',
                          f'<text class="manifold-gd-start-label" x="{n(sx+dx)}" y="{n(sy+5)}" text-anchor="{anchor}">Start {run["label"]}</text>',
                          '</g>']
        parts.append(f'<path class="manifold-curve" d="{curve}"/>')
        parts.append('<g class="manifold-candidates">')
        for candidate in DATA['candidates']:
            x, y = xy(candidate['base'])
            parts.append(f'<circle cx="{n(x)}" cy="{n(y)}" r="{2 if thumbnail else 4.5}"/>')
        parts.append('</g>')
        if not thumbnail:
            for run in gd.runs():
                x, y = xy(gd.to_source(run['points'][-1]))
                parts.append(f'<circle class="manifold-gd-head" data-gd-head="{run["label"]}" cx="{n(x)}" cy="{n(y)}" r="5"/>')
        x, y = xy(DATA['candidates'][DATA['selected_index']]['base'])
        parts.append(f'<circle class="manifold-selection" cx="{n(x)}" cy="{n(y)}" r="{5 if thumbnail else 11}"/>')
    else:
        baseline = top + ph
        lengths = [c['base'][1] - c['end'][1] for c in DATA['candidates']]
        parts.append(f'<path class="manifold-axes" d="M{left} {baseline}H{left+pw}"/>')
        for i, candidate in enumerate(DATA['candidates']):
            x, _ = xy(candidate['base'])
            bar_height = lengths[i] / max(lengths) * ph
            bar_width = 16 if mode == 'desktop' else 10
            selected = ' manifold-best-score' if i == DATA['selected_index'] else ''
            parts.append(f'<rect class="manifold-score{selected}" data-manifold-score data-base="{baseline}" data-height="{n(bar_height)}" x="{n(x-bar_width/2)}" y="{n(baseline-bar_height)}" width="{bar_width}" height="{n(bar_height)}" rx="1"/>')
    if not thumbnail:
        for i, label in labels.items():
            x, y = xy(DATA['candidates'][i]['base'])
            # A/C are approached from above: keep labels below their endpoints.
            y = y + (25 if label in ('A', 'C') else -16) if panel == 'landscape' else top + ph + 27
            selected = ' manifold-best-label' if label == 'B' else ''
            parts.append(f'<text class="manifold-model-label{selected}" x="{n(x)}" y="{n(y)}" text-anchor="middle">{label}</text>')
    parts.append('</svg>')
    return '\n'.join(parts)


def replace(path, key, content):
    text = path.read_text()
    start, end = f'<!-- {key}:start -->', f'<!-- {key}:end -->'
    a, b = text.index(start) + len(start), text.index(end)
    path.write_text(text[:a] + '\n' + content + '\n' + text[b:])


if __name__ == '__main__':
    gd.validate()
    heatmap()
    lengths = [c['base'][1] - c['end'][1] for c in DATA['candidates']]
    assert len(lengths) == 16 and all(length > 0 for length in lengths)
    assert lengths.index(max(lengths)) == DATA['selected_index']
    assert sum(length == max(lengths) for length in lengths) == 1
    landscape = diagram('desktop') + '\n' + diagram('mobile')
    scores = diagram('desktop', 'scores') + '\n' + diagram('mobile', 'scores')
    panels = f'''<div class="manifold-panel">
  <h4>1. Models that minimize training loss</h4>
  <div class="manifold-keys">
    <p class="manifold-panel-key"><span class="manifold-line-key" aria-hidden="true"></span>Blue curve: training-loss minimizers</p>
    <p class="manifold-panel-key"><span class="manifold-gd-key" aria-hidden="true"></span>Dashed paths: gradient descent (GD)</p>
  </div>
  <p class="manifold-run-status"><span data-gd-iteration>GD step 120 / 120</span> · Same step size η = 0.16</p>
  {landscape}
  <p class="manifold-color-key"><span>Background: training loss</span><span><i class="manifold-low" aria-hidden="true"></i>Lower</span><span><i class="manifold-high" aria-hidden="true"></i>Higher</span></p>
</div>
<div class="manifold-panel manifold-score-panel">
  <h4>2. Validation score for each model</h4>
  <p class="manifold-panel-key">One bar per model, in the same order. Taller means a higher score.</p>
  <div class="manifold-score-plot">
    {scores}
    <p class="manifold-score-prompt" aria-hidden="true">Next: compare these models on validation data.</p>
  </div>
</div>
<details class="manifold-gd-details">
  <summary>How this toy example is computed</summary>
  <p>The loss is <span class="manifold-inline-math" tabindex="0" role="region" aria-label="Toy loss formula"><math aria-label="g of x equals one half times x two minus h of x one squared"><mi>g</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><msup><mrow><mo>(</mo><msub><mi>x</mi><mn>2</mn></msub><mo>−</mo><mi>h</mi><mo>(</mo><msub><mi>x</mi><mn>1</mn></msub><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup></math></span>, where <i>h</i> is a smooth cubic interpolation of the curve in my presentation. Its graph is the blue set of zero-loss solutions. The background and paths use this same loss.</p>
  <p>Each run uses <span class="manifold-inline-math" tabindex="0" role="region" aria-label="Gradient descent update"><math aria-label="x k plus one equals x k minus eta gradient g of x k"><msub><mi>x</mi><mrow><mi>k</mi><mo>+</mo><mn>1</mn></mrow></msub><mo>=</mo><msub><mi>x</mi><mi>k</mi></msub><mo>−</mo><mi>η</mi><mo>∇</mo><mi>g</mi><mo>(</mo><msub><mi>x</mi><mi>k</mi></msub><mo>)</mo></math></span>, with η = 0.16 for 120 steps. The three initializations are chosen so the runs approach A, B and C. Their final losses are below 10<sup>−16</sup>; the paths are computed, without projecting onto the curve. Playback slows the early iterations so their movement is visible.</p>
  <p>The validation scores are schematic values from the presentation, not experimental measurements. This illustrates dependence on initialization; it does not assert convergence for every starting point or step size.</p>
</details>'''
    replace(ROOT / 'docs/writing/same-training-loss/index.html', 'manifold-diagrams', panels)
    replace(ROOT / 'docs/writing/index.html', 'manifold-thumbnail', diagram('thumbnail'))
    print('Validated GD; rebuilt its loss heatmap, responsive diagrams and unchanged slide thumbnail.')
