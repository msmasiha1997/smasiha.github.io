"""Reproduce the two ULA point-cloud figures' computed no-JavaScript fallbacks.

Uses the site's actual ES modules through Python Playwright and installed
Chrome/Chromium. No server is needed. Reference clouds come from the quadrature
Gibbs law; ULA endpoints and diagnostic traces come from real gradient/noise
updates. The named cloud, path, geometry, legend and trace blocks plus six static metric outputs are
replaced; prose and controls remain outside this generator. Run --check to
verify without changing any file.
"""

import argparse
import base64
import json
import re
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / 'docs/writing/sampling-hidden-solutions/index.html'
FIGURES = ['fixed-ula', 'family-ula']


def data_url(source):
    return 'data:text/javascript;base64,' + base64.b64encode(source.encode()).decode()


def replace_block(source, name, markup):
    pattern = re.compile(r'(<!-- ' + re.escape(name) + r':start -->).*?(<!-- ' + re.escape(name) + r':end -->)', re.S)
    if len(pattern.findall(source)) != 1:
        raise ValueError(f'Expected one {name} SVG block; refusing to alter the article.')
    return pattern.sub(lambda match: match[1] + '\n' + markup + '\n' + match[2], source)


def map_point(point):
    return 239 + point['x'] * 362 / 6.8, 201 - point['y'] * 362 / 6.8


def coordinates(points):
    return ' '.join(f'{x:.2f},{y:.2f}' for x, y in points)


def cloud_markup(curve, particles, trails=None):
    path = coordinates(map_point(p) for p in curve)
    circles = ''
    for i, particle in enumerate(particles):
        x, y = map_point(particle)
        tracked = ' class="tracked-chain"' if trails is not None and i in [0,42,85,128,170,213] else ''
        circles += f'<circle{tracked} cx="{x:.2f}" cy="{y:.2f}" r="2.5"/>'
    field = ''
    if trails is not None:
        paths = ''.join('<polyline points="' + coordinates(map_point(p) for p in trail) + '"/>' for trail in trails)
        field = '<image data-sampling-field x="58" y="20" width="362" height="362" href="../../assets/images/ula-target-medium.png"/>\n<polyline data-previous points=""/>\n'
        field += f'<g data-trails>{paths}</g>\n'
    return field + f'<polyline class="sampler-target" data-solution points="{path}"/>\n<g class="sampler-particles" data-particles>{circles}</g>'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--browser', default=shutil.which('chromium') or shutil.which('google-chrome') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    parser.add_argument('--report', type=Path, help='Optional JSON output with static metrics and provenance.')
    args = parser.parse_args()
    source = ARTICLE.read_text()
    for figure in FIGURES:
        for plot in ['primary', 'reference']:
            for edge in ['start', 'end']:
                if f'<!-- {figure}-{plot}:{edge} -->' not in source:
                    raise ValueError(f'Missing {figure}-{plot}:{edge} marker.')
    model_url = data_url((ROOT / 'docs/assets/js/ula-model.js').read_text())
    reference_source = (ROOT / 'docs/assets/js/gibbs-reference.js').read_text().replace("'./ula-model.js'", json.dumps(model_url))
    reference_url = data_url(reference_source)
    field_url = data_url((ROOT / 'docs/assets/js/sampling-field.js').read_text())
    geometry_url = data_url((ROOT / 'docs/assets/js/sampling-family-geometry.js').read_text().replace("'./ula-model.js'", json.dumps(model_url)))
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.browser, headless=True)
        page = browser.new_page()
        page.goto('about:blank')
        data = page.evaluate('''async ([modelUrl, referenceUrl, fieldUrl, geometryUrl]) => {
          const m = await import(modelUrl), g = await import(referenceUrl);
          const field = await import(fieldUrl), geometry = await import(geometryUrl);
          const model = m.createModel('ellipse', .5), count = 256;
          const medium = g.createGibbsReference(model, .06);
          const particles = m.createEnsemble(model, count, 2424);
          const normal = m.gaussianRandom(m.seededRandom(7431));
          const checkpoints = [{steps: 0, binTV: g.distributionDiagnostics(particles, model, medium).binTV}];
          const indices = [0,42,85,128,170,213];
          const trails = indices.map(i => [{...particles[i]}]);
          for (let step = 10; step <= 24000; step += 10) {
            m.advanceULA(particles, model, {h: .01, temperature: .06, steps: 10, normal});
            indices.forEach((i,j) => {trails[j].push({...particles[i]}); if(trails[j].length>24) trails[j].shift();});
            if (step % 600 === 0) checkpoints.push({steps: step, binTV: g.distributionDiagnostics(particles, model, medium).binTV});
          }
          const mediumPoints = medium.points(count, 9173);
          return {
            curve: model.curve(),
            trails, field: field.renderSamplingField(model, medium), legend: field.fieldLegendMarkup(), geometry: geometry.familyGeometryMarkup(model,.5),
            ula: {primary: particles, reference: mediumPoints, checkpoints},
            metrics: {
              example: 'ellipse', theta: .5, particles: count,
              ulaTemperature: .06, ulaStepSize: .01, ulaSteps: 24000,
              meanDistance: g.distributionDiagnostics(particles, model, medium).meanDistance,
              binTV: g.distributionDiagnostics(particles, model, medium).binTV,
              referenceBinTV: g.distributionDiagnostics(mediumPoints, model, medium).binTV,
              referenceMeanDistance: medium.meanDistance,
              initialSeed: 2424, noiseSeed: 7431, referenceSeed: 9173,
              note: 'Reference point clouds are direct paired-uniform transforms of the numerical Gibbs CDF. ULA clouds and 600-step checkpoint traces are actual simulation output. Coarse-bin TV has finite-cloud variation.'
            }
          };
        }''', [model_url, reference_url, field_url, geometry_url])
        browser.close()
    # Read again after numerical work so unrelated concurrent prose edits survive.
    source = ARTICLE.read_text()
    updated = source
    for figure in FIGURES:
        kind = 'ula'
        for plot in ['primary', 'reference']:
            updated = replace_block(updated, f'{figure}-{plot}', cloud_markup(data['curve'], data[kind][plot], data['trails'] if plot == 'primary' else None))
        updated = replace_block(updated, f'{figure}-field-legend', data['legend'])
        if kind == 'ula':
            trace = coordinates((24 + 280 * p['steps'] / 24000, 90 - 80 * p['binTV']) for p in data['ula']['checkpoints'])
            updated = replace_block(updated, f'{figure}-trace', f'<polyline class="distance-trace" data-error-trace points="{trace}"/>')
    updated = replace_block(updated, 'family-geometry', data['geometry'])
    image_path = ROOT / 'docs/assets/images/ula-target-medium.png'
    image_bytes = base64.b64decode(data['field']['dataUrl'].split(',')[1])
    metric_fields = {
        'discrepancy': data['metrics']['binTV'],
        'reference-discrepancy': data['metrics']['referenceBinTV'],
        'distance': data['metrics']['meanDistance'],
    }
    for field, value in metric_fields.items():
        pattern = re.compile(r'(<(?:strong|span)\b[^>]*\bdata-' + re.escape(field) + r'(?:="[^"]*")?[^>]*>)[^<]*(</(?:strong|span)>)')
        updated, count = pattern.subn(lambda match: match[1] + f'{value:.3f}' + match[2], updated)
        expected = 2
        if count != expected:
            raise ValueError(f'Expected {expected} data-{field} static metric outputs, found {count}.')
    if args.check:
        assert updated == source, 'Computed experiment fallbacks are stale.'
        assert image_path.read_bytes() == image_bytes, 'ULA target image is stale.'
        print('PASS: density, family geometry, clouds, recorded paths and ULA traces match the numerical source.')
    else:
        image_path.write_bytes(image_bytes)
        ARTICLE.write_text(updated)
        print('Regenerated four static point clouds and two actual ULA diagnostic traces.')
    if args.report:
        args.report.write_text(json.dumps(data['metrics'], indent=2) + '\n')
    print(json.dumps(data['metrics'], indent=2))


if __name__ == '__main__':
    main()
