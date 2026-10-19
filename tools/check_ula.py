"""Optional numerical check and snapshot generator for the ULA article.

Requires Python Playwright and an installed Chromium browser; neither is a site
runtime dependency. Run `python3 tools/check_ula.py --help` for options. These
are deterministic numerical sanity checks, not convergence proofs.
"""

import argparse
import base64
import json
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', default=shutil.which('chromium') or shutil.which('google-chrome') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
parser.add_argument('--report', type=Path, help='Optional path for a detailed JSON report.')
parser.add_argument('--write-snapshots', action='store_true', help='Regenerate docs/assets/data/ula-examples.json.')
args = parser.parse_args()
module = ROOT / 'docs/assets/js/ula-model.js'
module_url = 'data:text/javascript;base64,' + base64.b64encode(module.read_bytes()).decode()

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=args.browser,headless=True)
    page=browser.new_page()
    page.goto('about:blank')
    result=page.evaluate('''async moduleUrl => {
      const m = await import(moduleUrl);
      const rng=m.seededRandom(1742);
      const out={gradient:{maxAbsError:0},distance:{maxDenseError:0},runs:[],targetChanges:[],stationary:[],snapshots:{}};
      for (const type of ['circle','ellipse']) for (const theta of [0,.5,1]) {
        const model=m.createModel(type,theta);
        for(let j=0;j<80;j++) {
          const x=7*(rng()-.5),y=7*(rng()-.5),eps=1e-5;
          const grad=model.gradient(x,y);
          const dx=(model.potential(x+eps,y)-model.potential(x-eps,y))/(2*eps);
          const dy=(model.potential(x,y+eps)-model.potential(x,y-eps))/(2*eps);
          out.gradient.maxAbsError=Math.max(out.gradient.maxAbsError,Math.abs(grad.x-dx),Math.abs(grad.y-dy));
        }
        for (let j=0;j<30;j++) {
          const x=6*(rng()-.5),y=6*(rng()-.5);
          const dense=Math.min(...model.curve(16384).map(p=>Math.hypot(p.x-x,p.y-y)));
          out.distance.maxDenseError=Math.max(out.distance.maxDenseError,Math.abs(dense-model.distance(x,y)));
        }
        const axisPoints=[[0,0],[.1,0],[model.a*.5,0],[model.a,0],[model.a*1.1,0],[0,model.b],[.001,1e-10]];
        for(const [u,v] of axisPoints) {
          const p=model.world(u,v);
          const dense=Math.min(...model.curve(16384).map(q=>Math.hypot(p.x-q.x,p.y-q.y)));
          out.distance.maxDenseError=Math.max(out.distance.maxDenseError,Math.abs(dense-model.distance(p.x,p.y)));
        }
        for(const temperature of [.02,.06,.15]) {
          const particles=m.createEnsemble(model,64,2424), normal=m.gaussianRandom(m.seededRandom(7431));
          const checkpoints=[{step:0,...m.summarize(particles,model)}];
          if(type==='ellipse'&&theta===.5&&temperature===.06)out.snapshots.initial=structuredClone(particles);
          for(let k=1;k<=60;k++) {
            m.advanceULA(particles,model,{h:.01,temperature,steps:100,normal});
            checkpoints.push({step:k*100,...m.summarize(particles,model)});
          }
          const offView=particles.filter(p=>Math.abs(p.x)>3.4||Math.abs(p.y)>3.4).length;
          out.runs.push({type,theta,temperature,offView,checkpoints});
          if(type==='ellipse'&&theta===.5)out.snapshots[String(temperature)]={particles:structuredClone(particles),...m.summarize(particles,model)};
          if(temperature===.06&&theta===0) {
            const newModel=m.createModel(type,1);
            const prior=m.summarize(particles,model),changed=m.summarize(particles,newModel);
            m.advanceULA(particles,newModel,{h:.01,temperature,steps:6000,normal});
            out.targetChanges.push({type,prior,changed,after:m.summarize(particles,newModel)});
          }
        }
      }
      // Long runs independently check radial Gibbs marginals and angular mixing.
      // The Gibbs law is uniform in elliptic angle; q has density exp(-g(q)/lambda).
      const model=m.createModel('ellipse',.5);
      for(const temperature of [.02,.06,.15]) {
        const particles=m.createEnsemble(model,128,8252),normal=m.gaussianRandom(m.seededRandom(1604));
        m.advanceULA(particles,model,{h:.01,temperature,steps:60000,normal});
        let count=0,sumLoss=0,sumDistance=0,sumCos=0,sumSin=0,sumCos2=0,sumSin2=0;
        const cuts=[.5,.75,1,1.25,1.5],hits=cuts.map(()=>0);
        for(let observation=0;observation<40;observation++) {
          m.advanceULA(particles,model,{h:.01,temperature,steps:1000,normal});
          for(const p of particles) {
            const loc=model.local(p.x,p.y),q=(loc.x/model.baseA)**2+(loc.y/model.baseB)**2;
            const t=model.ellipticAngle(p.x,p.y);
            sumLoss+=model.potential(p.x,p.y);sumDistance+=model.distance(p.x,p.y);
            sumCos+=Math.cos(t);sumSin+=Math.sin(t);sumCos2+=Math.cos(2*t);sumSin2+=Math.sin(2*t);
            cuts.forEach((cut,i)=>{if(q<=cut)hits[i]++;}); count++;
          }
        }
        const dq=0.0001;let normalizer=0,gibbsLoss=0;const cdf=cuts.map(()=>0);
        for(let i=0;i<100000;i++) {
          const q=(i+.5)*dq,g=(q-1)**2/(1+q),w=Math.exp(-g/temperature)*dq;
          normalizer+=w;gibbsLoss+=g*w;
          cuts.forEach((cut,j)=>{if(q<=cut)cdf[j]+=w;});
        }
        let expectedDistance=0;const qStep=.005,angles=128;
        for(let i=0;i<2000;i++) {
          const q=(i+.5)*qStep,g=(q-1)**2/(1+q),w=Math.exp(-g/temperature)*qStep;
          if(w<1e-16)continue;
          let meanDistance=0;
          for(let j=0;j<angles;j++) {
            const t=(j+.5)*2*Math.PI/angles;
            const p=model.world(model.baseA*Math.sqrt(q)*Math.cos(t),model.baseB*Math.sqrt(q)*Math.sin(t));
            meanDistance+=model.distance(p.x,p.y)/angles;
          }
          expectedDistance+=w*meanDistance;
        }
        out.stationary.push({temperature,samples:count,meanLoss:sumLoss/count,gibbsMeanLoss:gibbsLoss/normalizer,meanDistance:sumDistance/count,gibbsMeanDistance:expectedDistance/normalizer,firstHarmonic:Math.hypot(sumCos,sumSin)/count,secondHarmonic:Math.hypot(sumCos2,sumSin2)/count,cdf:cuts.map((q,i)=>({q,ula:hits[i]/count,gibbs:cdf[i]/normalizer}))});
      }
      // Determinism and gradient-only oracle tests.
      const a=m.createEnsemble(model,64,42),b=m.createEnsemble(model,64,42);
      const options={h:.01,temperature:.06,steps:100};
      m.advanceULA(a,model,{...options,normal:m.gaussianRandom(m.seededRandom(51))});
      m.advanceULA(b,{gradient:model.gradient},{...options,normal:m.gaussianRandom(m.seededRandom(51))});
      out.deterministicGradientOnly=JSON.stringify(a)===JSON.stringify(b);
      return out;
    }''', module_url)
    browser.close()
if args.report:
    args.report.write_text(json.dumps(result, indent=2) + '\n')

assert result['gradient']['maxAbsError'] < 1e-7, 'Gradient differs from central finite differences.'
assert result['distance']['maxDenseError'] < 1e-4, 'Distance differs from dense geometric reference.'
assert result['deterministicGradientOnly'], 'Update should use only gradients and seeded randomness.'
assert all(r['checkpoints'][-1]['meanDistance'] < r['checkpoints'][0]['meanDistance'] * .5 for r in result['runs']), 'A run failed to approach the set.'
assert all(abs(s['meanDistance'] - s['gibbsMeanDistance']) < .012 for s in result['stationary']), 'Long-run distance disagrees with Gibbs quadrature.'
assert all(max(abs(c['ula'] - c['gibbs']) for c in s['cdf']) < .05 for s in result['stationary']), 'Radial Gibbs marginal check failed.'
assert all(s['firstHarmonic'] < .1 and s['secondHarmonic'] < .1 for s in result['stationary']), 'Angular mixing sanity check failed.'
for example in ['circle', 'ellipse']:
    for theta in [0, .5, 1]:
        ordered = [r['checkpoints'][-1]['meanDistance'] for r in result['runs'] if r['type'] == example and r['theta'] == theta]
        assert ordered == sorted(ordered), 'Temperature comparison is not ordered in this fixed-seed example.'
for change in result['targetChanges']:
    assert change['changed']['meanDistance'] > 3 * change['prior']['meanDistance']
    assert change['after']['meanDistance'] < .5 * change['changed']['meanDistance']

if args.write_snapshots:
    def rounded(value):
        if isinstance(value, float): return round(value, 7)
        if isinstance(value, list): return [rounded(item) for item in value]
        if isinstance(value, dict): return {key: rounded(item) for key, item in value.items()}
        return value

    default_runs = [r for r in result['runs'] if r['type'] == 'ellipse' and r['theta'] == .5]
    snapshots = {
        'description': 'Deterministic toy ULA snapshots, not empirical paper results. All particle positions result from actual gradient-and-Gaussian updates. The exact ellipse is used only for display and distance diagnostics.',
        'modelSource': '../js/ula-model.js',
        'potential': 'g=(q-r^2)^2/(1+q), q=(R^T(x-c))_1^2/baseA^2+(R^T(x-c))_2^2/baseB^2',
        'update': 'x_next=x-h*gradient(g)(x)+sqrt(2*h*temperature)*standard_normal_2d',
        'parameters': {'example': 'ellipse', 'theta': .5, 'baseA': 1.4, 'baseB': .8, 'angle': -.15, 'radius': 1, 'center': {'x': 0, 'y': 0}, 'h': .01, 'count': 64, 'steps': 6000, 'initialSeed': 2424, 'noiseSeed': 7431, 'rng': 'Mulberry32; Box-Muller standard normals'},
        'initial': {'step': 0, 'particles': result['snapshots']['initial'], 'meanDistance': default_runs[0]['checkpoints'][0]['meanDistance']},
        'final': [{'temperature': r['temperature'], 'step': 6000, **result['snapshots'][str(r['temperature'])], 'checkpoints': r['checkpoints']} for r in default_runs],
        'limits': ['One finite run per temperature, with matched starts, step size, random stream, and step budget.', 'At positive temperature the cloud stays near the solution set; it does not collapse onto it.', 'Finite-step ULA approximates the Gibbs law with discretization and finite-run error.', 'Distance reduction alone does not certify angular mixing or equilibrium.'],
    }
    destination = ROOT / 'docs/assets/data/ula-examples.json'
    destination.write_text(json.dumps(rounded(snapshots), separators=(',', ':')) + '\n')
    print(f'Wrote {destination.relative_to(ROOT)}')

print(f"Gradient error: {result['gradient']['maxAbsError']:.3g}; distance error: {result['distance']['maxDenseError']:.3g}")
for row in result['stationary']:
    print(f"lambda={row['temperature']}: long-run mean distance {row['meanDistance']:.5f}; Gibbs quadrature {row['gibbsMeanDistance']:.5f}")
print('PASS: 18 ULA runs; deterministic gradient-only updates; geometry; temperature comparisons; parameter changes; long-run Gibbs checks.')
