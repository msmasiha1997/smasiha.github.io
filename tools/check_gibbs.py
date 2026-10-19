"""Check the quadrature Gibbs reference and three actual ULA schedules.

Optional authoring check: requires Python Playwright and an installed Chrome or
Chromium. No server or additional site dependency is needed. Independent finer
quadrature checks the radial CDF, normalization, and same-angle coupling cost.
Finite clouds are diagnostics; these checks are not uniform-convergence proofs.
"""
import argparse
import base64
import json
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser',default=shutil.which('chromium') or shutil.which('google-chrome') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
parser.add_argument('--report',type=Path)
args=parser.parse_args()
def data_url(text): return 'data:text/javascript;base64,'+base64.b64encode(text.encode()).decode()
model_url=data_url((ROOT/'docs/assets/js/ula-model.js').read_text())
reference_source=(ROOT/'docs/assets/js/gibbs-reference.js').read_text().replace("'./ula-model.js'",json.dumps(model_url))
reference_url=data_url(reference_source)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=args.browser,headless=True)
 page=b.new_page();page.goto('about:blank')
 result=page.evaluate('''async([modelUrl,referenceUrl])=>{
  const m=await import(modelUrl),g=await import(referenceUrl);
  const checks={maxCDFError:0,maxRelativeNormalizationError:0,maxCouplingError:0,maxTailBound:0,zeroDistance:0,inverseCDFError:0,pairedAngles:true,orderedCoupling:true},results=[],schedules=[{temperature:.3,h:.02,steps:6000},{temperature:.06,h:.01,steps:24000},{temperature:.01,h:.005,steps:120000}];
  for(const example of ['circle','ellipse'])for(const theta of [0,.5,1])for(const setup of schedules){
   const model=m.createModel(example,theta),ref=g.createGibbsReference(model,setup.temperature),particles=m.createEnsemble(model,256,2424);
   const start=performance.now();
   m.advanceULA(particles,model,{...setup,normal:m.gaussianRandom(m.seededRandom(7431))});
   results.push({example,theta,...setup,ms:performance.now()-start,...g.distributionDiagnostics(particles,model,ref),gibbsMeanDistance:ref.meanDistance,coupling:ref.couplingDistance,tail:ref.tailMassBound});
  }
  for(const setup of schedules){
   const model=m.createModel('ellipse',.5),ref=g.createGibbsReference(model,setup.temperature),particles=m.createEnsemble(model,2048,2424);
   const start=performance.now();
   m.advanceULA(particles,model,{...setup,normal:m.gaussianRandom(m.seededRandom(7431))});
   results.push({example:'ellipse',theta:.5,...setup,ms:performance.now()-start,...g.distributionDiagnostics(particles,model,ref),gibbsMeanDistance:ref.meanDistance,referenceBinTV:g.distributionDiagnostics(ref.points(2048),model,ref).binTV});
  }
  // Independently integrate with a ten-times-finer grid and a longer tail.
  // The two-dimensional Jacobian makes angle uniform exactly for this family.
  for(const example of ['circle','ellipse'])for(const theta of [0,.5,1]){
   const model=m.createModel(example,theta),r2=model.radius**2;
   let previousCoupling=0;
   const zero=g.createGibbsReference(model,0),zeroPoints=zero.points(256);
   checks.zeroDistance=Math.max(checks.zeroDistance,...zeroPoints.map(p=>model.distance(p.x,p.y)));
   const zeroDiag=g.distributionDiagnostics(zeroPoints,model,zero);
   if(zeroDiag.radialTV!==0)throw Error('Limiting radial law should be atomic.');
   for(const temperature of [.01,.06,.3]){
    const ref=g.createGibbsReference(model,temperature),cuts=[ref.inverseCDF(.25),ref.inverseCDF(.5),ref.inverseCDF(.75)];
    const dq=.00005,qEnd=ref.qMax+3;let total=0,cost=0;const cdf=[0,0,0];
    for(let i=0;i<Math.ceil(qEnd/dq);i++){
     const q=(i+.5)*dq,w=Math.exp(-((q-r2)**2)/((1+q)*temperature))*dq;
     total+=w;cost+=Math.abs(Math.sqrt(q)-model.radius)*w;
     cuts.forEach((cut,j)=>{if(q<=cut)cdf[j]+=w;});
    }
    let stretch=0;for(let j=0;j<2048;j++){const t=2*Math.PI*(j+.5)/2048;stretch+=Math.hypot(model.baseA*Math.cos(t),model.baseB*Math.sin(t))/2048;}
    checks.maxRelativeNormalizationError=Math.max(checks.maxRelativeNormalizationError,Math.abs(total-ref.normalization)/total);
    cdf.forEach((value,j)=>{checks.maxCDFError=Math.max(checks.maxCDFError,Math.abs(value/total-(j+1)/4));});
    checks.maxCouplingError=Math.max(checks.maxCouplingError,Math.abs(cost/total*stretch-ref.couplingDistance));
    checks.maxTailBound=Math.max(checks.maxTailBound,ref.tailMassBound);
    for(const u of [.001,.1,.25,.5,.75,.9,.999])checks.inverseCDFError=Math.max(checks.inverseCDFError,Math.abs(ref.radialCDF(ref.inverseCDF(u))-u));
    if(ref.couplingDistance<=previousCoupling)checks.orderedCoupling=false;
    previousCoupling=ref.couplingDistance;
    if(ref.meanDistance>ref.couplingDistance+.0001)throw Error('Nearest distance cannot exceed same-angle coupling cost.');
    const pts=ref.points(256);
    pts.forEach((point,i)=>{const difference=Math.abs(model.ellipticAngle(point.x,point.y)-model.ellipticAngle(zeroPoints[i].x,zeroPoints[i].y));if(difference>1e-10)checks.pairedAngles=false;});
   }
  }
  return {checks,runs:results};
 }''',[model_url,reference_url])
 b.close()
if args.report: args.report.write_text(json.dumps(result,indent=2)+'\n')
checks=result['checks']
assert checks['maxRelativeNormalizationError']<1e-6
assert checks['maxCDFError']<.0002
assert checks['maxCouplingError']<1e-6
assert checks['maxTailBound']<1e-12
assert checks['zeroDistance']<1e-10
assert checks['inverseCDFError']<1e-10
assert checks['pairedAngles'] and checks['orderedCoupling']
for example in ['circle','ellipse']:
 for theta in [0,.5,1]:
  rows=[r for r in result['runs'] if r['example']==example and r['theta']==theta and r['sampleCount']==256]
  distances=[r['meanDistance'] for r in rows]
  assert distances==sorted(distances,reverse=True), 'Clouds did not concentrate as temperature fell.'
  assert all(r['binTV']<.25 for r in rows), 'A coarse discrepancy remained above the fixed-seed sanity threshold.'
for row in result['runs']:
 if row['sampleCount']==2048:
  assert row['binTV']<.09
  assert abs(row['meanDistance']-row['gibbsMeanDistance'])<.012
  print(f"lambda={row['temperature']}, h={row['h']}, steps={row['steps']}: mean distance {row['meanDistance']:.5f} vs Gibbs {row['gibbsMeanDistance']:.5f}; coarse-bin discrepancy {row['binTV']:.5f} (reference cloud {row['referenceBinTV']:.5f})")
print(json.dumps(checks,indent=2))
print('PASS: reference quadrature, zero-temperature limit, paired illustrations, and three ULA schedules over six landscapes.')
