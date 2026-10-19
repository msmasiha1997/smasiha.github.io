#!/usr/bin/env python3
"""Regenerate the fixed-Gibbs 2D density figure using the site's actual modules.

Requires development-only Playwright + Chrome; no web server is needed.
The density is normalized on the whole plane. Only this figure and its warm
PNG fallback are owned here. --check verifies them without writing files.
"""
import argparse
import base64
import json
from pathlib import Path
import re
import shutil

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / 'docs/writing/sampling-hidden-solutions/index.html'
IMAGE = ROOT / 'docs/assets/images/gibbs-density-warm.png'
START, END = '<!-- fixed-gibbs-density:start -->', '<!-- fixed-gibbs-density:end -->'


def data_url(source):
    return 'data:text/javascript;base64,' + base64.b64encode(source.encode()).decode()


def markup(warm, limit, metadata):
    scale = metadata['scale']
    area_offset, area_max, arc_max = scale['areaOffset'], scale['areaMaximum'], scale['arcMaximum']
    segments = '\n'.join(f'<polyline points="{s["points"]}" stroke-opacity="{s["opacity"]:.6f}"/>' for s in limit['limitSegments'])
    # These tick positions use the very same fixed nonlinear opacity transfer
    # as the heatmap. The limiting legend uses a different, square-root scale.
    import math
    ticks = ''.join(f'<span style="--position:{100*math.log1p(v/area_offset)/math.log1p(area_max/area_offset):.5f}%">{v:g}</span>' for v in scale['areaTicks'])
    line_ticks = ''.join(f'<span style="--position:{100*math.sqrt(v/arc_max):g}%">{v:g}</span>' for v in scale['arcTicks'])
    return f'''<figure id="fixed-gibbs-experiment" class="sampling-experiment gibbs-density-figure" data-gibbs-density aria-labelledby="fixed-gibbs-experiment-title">
  <h3 id="fixed-gibbs-experiment-title">Watch Gibbs approach its limiting law</h3>
  <p class="experiment-note">A two-dimensional Gibbs density: as λ decreases, probability lies in a thinner band around the minimizer set.</p>
  <div class="experiment-settings" data-experiment-controls hidden>
    <label>Minimizer set<select data-example><option value="wavy" selected>Wavy loop</option><option value="bent">Bent loop</option></select></label>
    <label class="experiment-range" for="fixed-gibbs-temperature">Temperature λ
      <output for="fixed-gibbs-temperature" data-temperature-value>λ = 0.300</output>
      <input id="fixed-gibbs-temperature" data-temperature type="range" min="0" max="0.3" step="0.001" value="0.3">
    </label>
  </div>
  <div class="experiment-actions" data-experiment-controls hidden>
    <button type="button" data-run>Cool toward the limit</button>
    <button type="button" data-reset>Restart</button>
    <span data-progress>λ = 0.300</span>
  </div>
  <p class="density-chart-key"><span class="density-solution-key" aria-hidden="true"></span><span data-density-key>Dashed curve: exact minimizers S</span></p>
  <svg class="density-chart" viewBox="0 0 600 570" role="img" aria-labelledby="fixed-gibbs-density-title fixed-gibbs-density-desc">
    <title id="fixed-gibbs-density-title">Two-dimensional Gibbs density at λ = 0.300</title>
    <desc id="fixed-gibbs-density-desc" data-density-desc>The normalized Gibbs density is spread around a smooth wavy loop of minimizers, shown by a dashed curve. More saturated blue means higher probability density. The axes are x₁ and x₂, both from −2.8 to 2.8. Decreasing the temperature narrows the band of probability around the same curve.</desc>
    <rect class="density-plot-background" x="58" y="20" width="480" height="480"/>
    <image data-density-image href="../../assets/images/gibbs-density-warm.png" x="58" y="20" width="480" height="480" preserveAspectRatio="none"/>
    <polyline class="density-solution" data-density-solution points="{warm['curve']}"/>
    <g class="density-limit" data-density-limit visibility="hidden">{segments}</g>
    <path class="density-axes" d="M58 20V500H538"/>
    <g class="density-axis-text">
      <text x="126.571" y="529" text-anchor="middle">−2</text><text x="298" y="529" text-anchor="middle">0</text><text x="469.429" y="529" text-anchor="middle">2</text>
      <text x="46" y="96.571" text-anchor="end">2</text><text x="46" y="267" text-anchor="end">0</text><text x="46" y="438.429" text-anchor="end">−2</text>
      <text x="298" y="562" text-anchor="middle">x₁</text><text x="14" y="260" text-anchor="middle" transform="rotate(-90 14 260)">x₂</text>
    </g>
  </svg>
  <div class="density-legend" data-density-legend-area>
    <p>Probability density per unit area</p>
    <div class="density-color-scale" aria-hidden="true"></div><div class="density-color-ticks" aria-hidden="true">{ticks}</div>
    <span class="sr-only">Fixed nonlinear color scale: 0, 0.1, 0.5, 4. More saturated blue means higher density.</span>
  </div>
  <div class="density-legend" data-density-legend-line hidden>
    <p>Limiting density per unit curve length</p>
    <div class="density-color-scale" aria-hidden="true"></div><div class="density-color-ticks" aria-hidden="true">{line_ticks}</div>
    <span class="sr-only">Square-root color scale: 0 to {scale['arcMaximum']:g}. More saturated blue means more probability per unit length along the curve.</span>
  </div>
  <p class="density-note" data-density-note>λ = 0.300. The color scale stays fixed as temperature decreases.</p>
  <details class="density-details">
    <summary>What the colors and limit mean</summary>
    <p>At positive temperature, the color shows the normalized density <span class="density-inline-math" role="region" tabindex="0" aria-label="Normalized Gibbs density"><math aria-label="rho lambda of x equals exp of minus g of x divided by lambda, divided by Z lambda"><msup><mi>ρ</mi><mi>λ</mi></msup><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><msup><mi>e</mi><mrow><mo>−</mo><mi>g</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>/</mo><mi>λ</mi></mrow></msup><mo>/</mo><msub><mi>Z</mi><mi>λ</mi></msub></math></span>. Its integral over the whole plane is one. The fixed nonlinear color scale reveals both the broad warm distribution and the narrow cold band; each frame uses the same scale.</p>
    <p>At λ = 0, the limiting law lives on S and has no density per unit area. The plot switches to color along the curve, with a separate square-root color scale for density per unit curve length, keeping low-density stretches visible. The nonlinear bend changes how quickly the curve is traced, so some parts receive more probability per unit length than others.</p>
    <p>The toy loss is <span class="density-inline-math" tabindex="0" role="region" aria-label="Loss defining the curved minimizer set"><math aria-label="g equals q minus one squared divided by one plus q"><mi>g</mi><mo>=</mo><mfrac><msup><mrow><mo>(</mo><mi>q</mi><mo>−</mo><mn>1</mn><mo>)</mo></mrow><mn>2</mn></msup><mrow><mn>1</mn><mo>+</mo><mi>q</mi></mrow></mfrac></math></span>, where <span class="density-inline-math" tabindex="0" role="region" aria-label="Bent radial coordinate"><math aria-label="q equals x one over a squared plus x two minus s of x one over b squared"><mi>q</mi><mo>=</mo><msup><mrow><mo>(</mo><mfrac><msub><mi>x</mi><mn>1</mn></msub><mi>a</mi></mfrac><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><mfrac><mrow><msub><mi>x</mi><mn>2</mn></msub><mo>−</mo><mi>s</mi><mo>(</mo><msub><mi>x</mi><mn>1</mn></msub><mo>)</mo></mrow><mi>b</mi></mfrac><mo>)</mo></mrow><mn>2</mn></msup></math></span>. Here <i>a</i> = 1.45 and <i>b</i> = 0.7. The wavy loop uses <i>s</i>(<i>t</i>) = 0.5 sin(2<i>t</i>); the bent loop uses <i>s</i>(<i>t</i>) = 0.55[1 − cos(1.7<i>t</i>)] − 0.4. The solution set is {{<i>q</i> = 1}}.</p>
    <p>This smooth coordinate change has a constant Jacobian, so a one-dimensional radial integral gives the whole-plane normalization. The fixed window contains over 99.9% of the probability throughout the displayed temperatures; the image is not renormalized inside it.</p>
    <p>These examples illustrate the Gibbs limit directly. The sampling experiments below use their separately specified losses and assumptions.</p>
    <dl class="density-diagnostics">
      <div><dt>Peak area density</dt><dd data-density-peak>{warm['peak']:.3f}</dd></div>
      <div><dt>Upper bound on W₁ to the limit</dt><dd data-w1-bound>{warm['w1UpperBound']:.3f}</dd></div>
    </dl>
    <p>The bound multiplies a reference same-angle transport cost by the bend’s Lipschitz factor. It uses numerical radial quadrature and need not be sharp; it is not an exact W₁ calculation.</p>
  </details>
  <p class="experiment-status" data-experiment-status role="status" aria-live="polite">Static Gibbs density at λ = 0.300. Enable JavaScript to decrease λ or view the limiting law.</p>
  <figcaption>As λ decreases, the band narrows around S. In the limit, all probability lies on the curve; it does not collapse to a single minimizer.</figcaption>
</figure>'''


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--browser',default=shutil.which('chromium') or shutil.which('google-chrome') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    args=parser.parse_args()
    model_url=data_url((ROOT/'docs/assets/js/ula-model.js').read_text())
    reference_url=data_url((ROOT/'docs/assets/js/gibbs-reference.js').read_text().replace("'./ula-model.js'",json.dumps(model_url)))
    curves=(ROOT/'docs/assets/js/gibbs-curves.js').read_text().replace("'./ula-model.js'",json.dumps(model_url)).replace("'./gibbs-reference.js'",json.dumps(reference_url))
    curves_url=data_url(curves)
    module=(ROOT/'docs/assets/js/gibbs-density.js').read_text().replace("'./gibbs-curves.js'",json.dumps(curves_url))
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=args.browser,headless=True)
        page=browser.new_page();page.goto('about:blank')
        scenes=page.evaluate('''async url=>{const m=await import(url);return [m.createDensityScene('wavy',.3),m.createDensityScene('wavy',0),m.densityMetadata()];}''',data_url(module))
        browser.close()
    warm,limit,metadata=scenes
    assert 0 < warm['peak'] < metadata['scale']['areaMaximum'] and warm['visibleMass'] > .999
    png=base64.b64decode(warm['image'].split(',')[1])
    source=ARTICLE.read_text()
    block=START+'\n'+markup(warm,limit,metadata)+'\n'+END
    if START in source:
        updated=re.sub(re.escape(START)+'.*?'+re.escape(END),lambda _:block,source,flags=re.S)
    else:
        pattern=r'<figure id="fixed-gibbs-experiment".*?</figure>'
        assert len(re.findall(pattern,source,re.S))==1
        updated=re.sub(pattern,lambda _:block,source,flags=re.S)
    if args.check:
        assert updated==source,'Fixed Gibbs density figure is stale.'
        assert IMAGE.read_bytes()==png,'Fixed Gibbs density PNG is stale.'
        print('PASS: 2D density figure and warm PNG reproduce from the numerical model.')
    else:
        ARTICLE.write_text(updated);IMAGE.write_bytes(png)
        print('Regenerated the fixed-Gibbs 2D density figure and warm PNG.')
    print(json.dumps({key:warm[key] for key in ['temperature','peak','w1UpperBound','visibleMass']},indent=2))

if __name__=='__main__':main()
