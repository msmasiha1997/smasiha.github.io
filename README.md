# Saeed Masiha’s research website

A personal research website for academic hiring committees and industry research scientist / applied scientist teams. Configured for **https://smasiha.github.io/**. GitHub Pages must be enabled to make the site public.

The site uses plain HTML, shared CSS, local fonts and images, and small local scripts for the light/dark theme switch and the articles’ optional figure interactions and browser-based numerical simulations. There is no build step, package installation, or external rendering service needed to run the website. GitHub Pages serves only `docs/`.

## Preview locally

From this project folder, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs
```

Open **http://127.0.0.1:8000/**. Other pages: `/papers/`, `/writing/`, `/writing/same-training-loss/`, `/writing/sampling-hidden-solutions/`, and `/about/`. Save and refresh to see edits; use a hard refresh if old styles persist. Stop with **Ctrl+C**. If port 8000 already has this preview running, use that preview; otherwise choose a free port and use it in the URL.

## Project layout

```text
docs/
  index.html                 Portrait, short introduction, news, contact
  papers/index.html          Accepted/published papers, then preprints; grouped by topic
  writing/index.html         Research Blog listing with two real articles
  writing/same-training-loss/index.html  Visual explanation of Select-then-differentiate
  writing/sampling-hidden-solutions/index.html  Interactive explanation of manifold sampling
  about/index.html           Research, background, collaborations, contact
  assets/css/site.css        Shared styles, including article formatting
  assets/css/research-story.css  Blog listing and visual article styles
  assets/css/sampling-story.css  Sampling article’s equations and supporting figures
  assets/css/sampling-experiments.css  Gibbs/ULA experiment layout and controls
  assets/js/sampling-story.js  ULA chains, recorded paths and parameter-sweep controllers
  assets/js/sampling-field.js  Normalized Gibbs density field and fixed color scale
  assets/js/sampling-family-geometry.js  Linked perspective view of the minimizer family
  assets/js/gibbs-density.js  Fixed-loss 2D Gibbs density and limiting-law animation
  assets/js/gibbs-curves.js   Nonlinear wavy/bent losses, limiting densities and distance bounds
  assets/js/gibbs-reference.js  Numerical Gibbs reference and distribution diagnostics
  assets/js/ula-model.js      Seeded numerical model and Euclidean-distance calculation
  assets/js/normal-rise.js    Equal-displacement loss animation
  assets/data/ula-examples.json  Reproducible toy-run snapshots
  assets/js/theme.js         System preference and saved light/dark choice
  assets/js/research-story.js  Minimizer-selection and LLM procedure animations
  assets/data/select-then-differentiate-results.csv  Reported Tables 2–3 results, both math benchmarks
  assets/data/select-then-differentiate-mixtures.csv  Reported Table 14 top-three source weights
  assets/fonts/              Local WOFF2 fonts and OFL licenses
  assets/images/             Portrait, favicon, illustrations, SVG contact icons/license
  .nojekyll                  Static publishing without Jekyll processing
  robots.txt
  sitemap.xml                The six public pages
templates/article.html       Unpublished article layout
tools/check_site.py          Lightweight standard-library Python checker
tools/check_ula.py           Optional numerical checks and snapshot generation
tools/build_sampling_figures.py  Rebuild normal slices and sampling thumbnail
tools/build_sampling_experiments.py  Rebuild ULA fields, paths, clouds and family-geometry fallbacks
tools/build_gibbs_density.py  Rebuild the 2D Gibbs density figure and warm PNG
tools/check_gibbs.py         Optional quadrature and multi-schedule numerical checks
tools/plot_blog_results.py    Optional regeneration of the downloadable results figure
tools/build_manifold_diagram.py  Rebuild the minimizer figure and computed loss heatmap (standard library)
tools/manifold_gd.py  Toy loss, analytic gradient and reproducible GD trajectories
tools/manifold-geometry.json  Preserved schematic curve/candidate geometry from the slides
Slide__Paths_to_minima_slection/  Local reference slides and papers, excluded from Git
design-history/              Local-only backups, excluded from Git
Saeed-Masiha-Website-Template.html  Original preview, unchanged and excluded from Git
VERIFICATION.md              Local-only validation history, excluded from Git
```

The navigation contains **Home, Publications, Research Blog, and About**. Home keeps the research introduction and recent announcements concise. Publications separates accepted/published papers from preprints, with research-area subheadings and native HTML summary disclosures. About develops the research and background. Research Blog lists two real articles. The first, **“Same Training Loss, Different Behavior: Which Solution Should We Choose?”**, explains candidate selection using an animated minimizer diagram adapted from the supplied presentation, a schematic of LLM data reweighting, math-benchmark comparisons across four models, and then Qwen-2-7B’s measured final source mixtures; it is ready locally but has not been published. The second, **“Sampling from Manifolds of Minimizers”**, starts with a fixed loss and local growth, separates Gibbs concentration from ULA sampling, then repeats both steps with SQ-G’s parameter-uniform guarantees. A two-dimensional Gibbs density map and two computed ULA experiments illustrate these distinct steps, with linked geometry for the parameter family. Applications appear briefly at the end. Both are linked from the blog listing.

All pages share centered navigation and content columns, blue links, Newsreader headings, and Source Sans 3 body text. Light mode uses a white background; dark mode uses a dark slate background and lighter text and links. Main text is 18 px. Home and About use a comfortable 660 px reading column; Publications allows 800 px for long titles and author lists. Home’s circular portrait and name are centered above the introduction, with contact icons centered below the news. Paragraphs retain a natural left edge for reading.

The latest local backup is `design-history/before-sampling-editorial-20261019-181309.zip`. Extract into a **separate folder** to compare or restore. Historical backups, the supplied `Slide__Paths_to_minima_slection/` reference folder, the original combined preview, and `VERIFICATION.md` are preserved locally and excluded from Git because they may contain material that is not ready for public release. The current `docs/` files are the source of truth; editing the combined preview does not change the website.

## Maintain the website

Edit the HTML directly in a text editor.

| Content | Location |
| --- | --- |
| Main research introduction | `docs/index.html`: `.intro-research` |
| Current position and short collaboration account | Home: `.intro-context`; About: `#academic-background` |
| Fuller research and background | `docs/about/index.html` |
| Contact/profile links | Search all pages for the current email and profile URLs |
| Complete publication records | `docs/papers/index.html` |
| Public news announcements | Home: `.news-list` |
| Blog listing | `docs/writing/index.html` |
| First visual article, captions, references | `docs/writing/same-training-loss/index.html` |
| Sampling article, figures, and model | `docs/writing/sampling-hidden-solutions/index.html`, `sampling-story.css`, `sampling-experiments.css`, `sampling-story.js`, `sampling-field.js`, `sampling-family-geometry.js`, `gibbs-reference.js`, `gibbs-density.js`, `gibbs-curves.js`, `ula-model.js`, `normal-rise.js` |
| Article animation and figure layout | `docs/assets/js/research-story.js`, `docs/assets/css/research-story.css` |
| Colors, typography, spacing, mobile layout | `docs/assets/css/site.css` |
| Titles and search/social descriptions | Each page’s `<head>` |

### Biography and affiliations

Home’s Email, Google Scholar, GitHub, and LinkedIn icons are together in `#home-contact` at the bottom of `.home-closing`, just above the footer. About uses the same icons and keeps a readable email address in its contact paragraph. Each icon link has an accessible `aria-label`, a hover title, and a 44 px tap target. Keep these labels and the actual `href` in sync when editing destinations. The icons share one centered row on Home and About, on desktop and phones. The current GitHub profile is `https://github.com/smasiha`; LinkedIn is `https://www.linkedin.com/in/saeed-masiha-25b30514a/`. Use the public LinkedIn URL without the `isSelfProfile` query parameter. Update both Home and About when changing a contact link.

The current biography describes a fifth-year PhD student at EPFL, advised by Negar Kiyavash and Patrick Thiran. Update Home, About, and their search/social descriptions together when a role is ready to be announced. Position information does not change automatically with the date; include only publicly announced roles.

About contains the fuller Niao He / Zebang Shen collaboration, two existing bilevel papers and two in preparation, and the Georgia Tech visit hosted by George Lan. Add forthcoming publications only once their factual records and destinations are available. Keep advisor and collaborator roles distinct.

Researcher names link to verified academic profiles using `.person-link`. George Lan and publication author Guanghui Lan link to the same profile. Your publication author lists use **Saeed Masiha**. If a profile moves, update its occurrences throughout the website.

Update each footer’s “Updated” date after meaningful edits. To change email, search for `mohammadsaeed.masiha@epfl.ch` in `docs/` and the article template; preserve `mailto:`. Navigation is repeated in each HTML page intentionally, so update all six public pages and the article template when necessary.

Write prose without em dashes. Use full stops, commas, colons, or parentheses instead. Keep punctuation in mathematical names, paper titles, and numerical ranges accurate. Page titles separate the page name and author with `|`.

### News

Edit `.news-list` in `docs/index.html`. Each `<li>` pairs a date with one short paragraph. Keep two or three recent, factual updates; link paper announcements to their existing Publications anchors rather than duplicating bibliography records. Use a `<time>` with the actual month or date, such as `datetime="2026-06"`. Preprint announcements use the first arXiv submission month; acceptance announcements use the month the acceptance is confirmed.

Include only announcements ready for public release. Remove older news as needed to keep Home minimal; the complete papers remain on Publications. Verify any contribution summary against the paper, retaining material assumptions and distinguishing practical experiments from theoretical guarantees.

### Portrait and visual styles

The latest supplied portrait is `docs/assets/images/portrait.jpg`, a 900 × 1200 JPEG converted from `IMG_3475.HEIC`. This redesign preserves that file unchanged.

The circular portrait has an inset and thin gray frame that adapt to the theme. It is 240 px wide on desktop and tablets and 208 px on phones. `.profile-portrait-frame` controls these sizes; equal width and height, `border-radius: 50%`, and clipping keep the photo and frame circular. `.profile-portrait-crop` clips the enlarged image inside the frame so the border and inset remain visible.

Clicking the portrait reveals its photo credit; clicking again hides it. Edit `.portrait-caption` in `docs/index.html` to change the message. The native `<details class="portrait-credit">` disclosure also works with Enter/Space and with JavaScript disabled. Keep the portrait inside its `<summary>` and preserve the accessible photo-credit label.

1. To replace it, save a compressed JPEG or WebP in `docs/assets/images/`. Convert HEIC before using it on the web.
2. Update Home’s image `src` if needed and set `width` and `height` to the actual file dimensions. Keep descriptive alt text.
3. Adjust `.profile-portrait-frame`, `.profile-portrait-crop`, and `.profile-portrait` in the CSS if needed. `object-position` and `transform: scale(1.5)` control the visible crop without editing the image. Keep the inner `.profile-portrait-crop` wrapper around the image and its circular radius.
4. Check desktop and mobile after changing the portrait.

The CSS `:root` contains shared colors and font families. Edit the relevant existing section rather than appending conflicting overrides. Newsreader and Source Sans 3 load locally with system fallbacks and `font-display: swap`; keep both OFL license files with the fonts. Existing research SVGs are reusable conceptual illustrations, not experimental results. The browser favicon remains in `assets/images/favicon.svg`; the navigation header has no name or monogram.

### Light/dark themes and contact icons

The small sun/moon button beside the navigation switches between light and dark mode. On a first visit, the site follows the system’s color preference, including changes while the page is open. An explicit choice is saved locally under `saeed-theme`, persists across pages and reloads, and synchronizes between tabs. There are no cookies or network services. If storage is blocked, the switch still works for the current page. With JavaScript disabled, CSS follows the system and hides the inactive switch. Printing uses the light palette.

`assets/js/theme.js` loads before the stylesheet to apply a saved choice before painting the page. Keep this order on new pages and adjust both asset paths for their depth. The public pages and unpublished article template share the switch. Theme colors are CSS variables: update both dark-palette blocks together (the system-preference media query and `[data-theme='dark']`) and check text, links, focus outlines, summaries, portrait frame, and article code/equations in both themes. Keep the light canvas and dark canvas values in the script’s browser-toolbar color update in sync with CSS.

`assets/images/contact-icons.svg` is a local SVG sprite: `email`, `google-scholar`, `github`, `linkedin`, `sun`, and `moon`. Google Scholar, GitHub, and LinkedIn marks come from Simple Icons 13.21.0; source URLs and the CC0 license are in `contact-icons-LICENSE.txt`. The email and theme icons are simple site-specific drawings. Icons inherit the theme’s text/link colors; do not use image filters on the portrait. Keep each icon SVG decorative (`aria-hidden="true"`) and label its enclosing link/button.

### Publications

Every full record is an `<article class="publication">` in `docs/papers/index.html`. **Accepted & published papers** contains seven records: four in Nonconvex optimization and three in Information-theoretic methods in ML. **Preprints** contains three Nonconvex optimization records. These are sections with ordinary anchor links, not filters. Preserve exact titles, author order, confirmed venue/status, years, and paper URLs. Published years may differ from arXiv submission years.

To add a paper, copy an existing record into the appropriate status section and research category, then update:

- Unique article/heading IDs and the matching `aria-labelledby`.
- Title and link, `.paper-authors`, `.venue`, and `.paper-year` / `<time>`.
- Direct PDF and arXiv/proceedings/published-version links and their descriptive `aria-label` values.
- `.paper-summary` inside `<details class="paper-abstract">`. Omit the disclosure if no reliable summary is available.

Use `h2` for status sections, `h3` for research categories, and `h4` for paper titles. On confirmed acceptance, move the entire existing article from Preprints to the appropriate Accepted & published category, preserving its IDs and links, then update its venue and year. Keep publication years in descending order within each category. There is no empty preprint category for information-theoretic work.

Preserve category and paper IDs: Home and About link to those anchors. Retain **Preprint** until acceptance is confirmed. Add “Code” only for a real, verified paper-specific repository; none has been added in this version. If using local PDFs, store them under `docs/assets/` and use the correct relative paths.

Home links to the complete bibliography and highlights recent papers through brief news entries. Maintain factual metadata in Publications and update any related news when needed. Do not infer individual contributions from author order. Select-then-differentiate and Zeroth-Order Stackelberg Control display “NeurIPS · 2026,” based on the author’s confirmation on September 24, 2026. Their existing arXiv/PDF links remain available; add proceedings links only when verified. The older NeurIPS paper displays “NeurIPS · 2022.”

The lower-bounds paper is titled “Sharp First-Order Lower Bounds under α-Polyak-Lojasiewicz Conditions.” The title and accessible paper-link labels use this wording. Keep its existing `sublevel-pl-lower-bounds` anchor stable so incoming links continue to work. `VERIFICATION.md` records the title update and external-link checks.

## Maintain the Research Blog

The first article lives at `docs/writing/same-training-loss/index.html`. Its opening figure shows three **computed gradient-descent runs** from different initializations, using the same toy loss and step size (η = 0.16). Dashed rust paths approach A, B and C on the solid blue minimizer curve. The background is computed from that same loss. The source presentation's 16 candidate positions and relative validation scores are preserved, with A/B/C labels linking the panels. Validation bars are schematic, not measured performance.

One Play/Pause/Resume/Replay button runs a finite nine-second sequence: descent, different zero-loss limits, validation scores, then selection of B. It does not autoplay or loop. Early iterations receive more playback time; the displayed iteration counter follows the actual precomputed iterates. Reduced motion steps through the four states without animation. Without JavaScript or when printing, all three paths and the final selection remain visible; printing restores the prior interactive state afterward. The disclosure explains the construction and its limits. Check all four states in both themes on mobile and desktop.

The LLM animation at `#llm-loop` shows three distinct objects: ten labeled source-weight rows with percentages, four identical network diagrams representing different candidate LoRA parameters, and a held-out-data icon with A–D validation-loss bars. These source proportions and loss rankings are schematic, not measured results; C has the lowest illustrative validation loss. Model parameters use x; training proportions use p(θ), consistent with the formulas below. Edit the objects directly in the article HTML (this figure is not generated), their styles in the method section of `research-story.css`, and the stage notes/illustrative target weights in `research-story.js`. The percentage labels use rounding that preserves a 100% displayed total.

The existing `data-stage` state emphasizes the active operation: Explore highlights the first arrow and all four parameter candidates; Evaluate highlights the second arrow, validation data and losses; Select marks candidate C and its lowest-loss row; Update highlights the feedback arrow and source weights. Bold labels and thicker strokes reinforce the blue accent. C keeps its checkmark during Update but loses its active outline. Mobile stacks the three objects, preserving the 2×2 candidate grid, with downward flow arrows and a heavier return border/upward arrow. Keep these CSS selectors aligned with the four controller stages; the animation timing is unchanged.

Immediately after the LLM animation, `#method-formulas` gives a concise native MathML explanation of training/validation losses, optimistic selection, and the hypergradient. It specializes the paper’s formula to validation loss independent of the source logits, so the direct outer derivative is zero. Preserve the local regularity/uniqueness qualification and the distinction from finite candidate LoRA updates. Edit the MathML and its accessible labels together; `.method-formulation` and `.formula-*` in the shared article CSS control layout. Equations wrap into separate rows on narrow screens, and keyboard-focusable equation regions allow horizontal scrolling when text is enlarged. No mathematics script, font download, or runtime dependency is added.

The research source is [Select-then-differentiate, arXiv v1](https://arxiv.org/html/2605.09209v1). Keep the figures’ evidence distinct. In “What changed in practice?”, show performance across models first, then Qwen-2-7B’s source mixtures as a concrete example:

- The first figure combines **computed toy GD trajectories with schematic validation scores adapted from the presentation**, not measured LLM performance. The source is `Slide__Paths_to_minima_slection/images/blo/minimizer_manifold_two_subfigures_landscape_no_contours.pdf`, used on “Not Every Minimizer Is a Good Solution” in `slide-paths-tightened.tex`. The preserved geometry includes the curve, all 16 candidate positions, their source score lengths, and the unique largest score (candidate index 11, labeled B). The score bars preserve the original relative stem lengths on a common baseline, normalized to the plot height. A and C label source indices 3 and 14. These display labels do not identify experimental models. Its source PDF SHA256 is recorded in `tools/manifold-geometry.json`. Parameters x₁/x₂ are model coordinates; the blue curve is a set of training minimizers, not a plot of loss versus a parameter or an optimization path. Background color indicates lower/higher training loss. The separate bar chart scores individual models, not counts of observations. Higher score can represent a shifted negative validation loss, consistent with minimizing the paper’s outer objective. Describe selection as best **among the illustrated candidates**; the artwork does not establish the theorem’s assumptions, identify the continuous optimum, or support empirical accuracy claims.
- The LLM loop illustrates the paper’s practical four-candidate LoRA procedure, validation-based selection, and training-data source-weight feedback. These are finite training updates; do not imply they are exact equal-loss minimizers or that every theoretical assumption was established for LLMs.
- The performance comparison at `#cross-model-results` shows **GSM8K accuracy for Llama-3-8B, Qwen-2-7B, Gemma-2-9B, and Qwen2.5-32B**, from Tables 2 and 3(a). Four small charts use the same six-method order and a shared 0–100% scale, with HG-MS highlighted. The disclosure includes exact GSM8K and MATH tables for all four models. HG-MS has the highest reported math scores among completed runs on these tested models; this is single-seed evidence (seed 2424), not statistical significance or a claim about all models/tasks. Show RHO-LOSS and LESS on Qwen2.5-32B as OOM, never zero. Completed runs share a final 20,000-example, one-epoch fine-tuning protocol within each model. Iterative reweighting budgets are matched within a backbone (approximately 12h for Llama, 9h for Qwen-2, and 15h for Gemma and Qwen2.5), not across all backbones or all methods. Preserve the paper’s adapted-baseline setting and do not invent error bars.
- The source-mixture comparison uses **reported final Qwen-2-7B weights from Table 14**, unlike the illustrative weights in the preceding LLM loop. ScaleBiO and HG-baseline each assign 99.6% to MathInstruct; HG-MS assigns 94.0% to DART-Math, 5.6% to MathInstruct, and 0.4% to Orca-Math at the reported precision. All three use the same ten-source portfolio and nine-hour reweighting budget. Each resulting distribution samples a 20,000-example final fine-tuning set, followed by the same one-epoch protocol. This is a single-seed comparison, not evidence that one source is best for every model or that the mixture alone explains the outcome.


The source-mixture figure at `#source-mixtures` is a static comparison of three equal-size SVG rings, arranged in columns on desktop and compact rows on mobile. Each ring totals 100% of the final sampling weights. The center shows the dominant source’s percentage, its name appears below or beside the ring, and smaller shares are explicitly labeled. Segment lengths remain proportional to the reported weights; tiny shares are not enlarged. All three mixtures are always visible, including without JavaScript and when printing. There are no playback controls, reveal masks or animation controller for this figure.

`docs/assets/data/select-then-differentiate-mixtures.csv` contains only the **top three reported weights per method**, in decimal proportions, with their source URL. It is not a complete ten-source distribution. The chart groups each baseline’s remaining 0.4% as “remaining sources”; individual DART-Math weights for those baselines are unreported and must not be inferred as zero. HG-MS’s 0.4% share is explicitly labeled Orca-Math at the published precision. The rings preserve the same rounded data as the earlier bar comparison. A rounded 0.000 in the CSV does not establish an exactly zero weight. These are sampling weights, not exact counts of examples in the sampled dataset.

To maintain this figure, edit `#source-mixtures` in the article (SVG slices, labels, table, captions, and comparison details) and `.source-*` rules in `docs/assets/css/research-story.css` (layout and colors). Each slice has `pathLength="100"`: set `data-weight` to its percentage, `stroke-dasharray` to that percentage followed by its complement to 100, and `stroke-dashoffset` to the negative sum of preceding slices. Keep `stroke-linecap: butt` and no artificial gaps. The CSV is a download, not a runtime input: update it and the HTML together after checking Table 14 and the experimental protocol. Preserve the 100% displayed totals, grouping explanation, accessible text, and source links. Recheck all three static rings in both themes, with JavaScript disabled, and when printing.

The results CSV is `docs/assets/data/select-then-differentiate-results.csv`: 48 rows (four models × six methods × two benchmarks), with `model`, `method`, `benchmark`, `accuracy_percent`, `status`, and `source_url` columns. Use `completed` with a numeric accuracy or `OOM` with a blank accuracy; a failed run is not a zero score. The standalone downloadable GSM8K chart is `docs/assets/images/select-then-differentiate-results.svg`. The in-page charts and exact-value tables are static HTML and CSS, so the CSV is not a runtime input. If results change, verify them against the paper and update the CSV, chart rows and accessible descriptions, tables, prose, captions, and source links together. The optional `tools/plot_blog_results.py` script validates the data and regenerates the four-panel downloadable SVG using matplotlib; matplotlib is not required for previewing or publishing the website. The source-mixture diagram and its separate CSV remain independent of these accuracy results.

To regenerate the download in a Python environment with matplotlib installed:

```sh
python3 tools/plot_blog_results.py
```

The first figure uses responsive inline SVG, shared CSS, and the `[data-manifold]` controller in `docs/assets/js/research-story.js`. `tools/manifold_gd.py` constructs a C² natural cubic spline `h` through the preserved curve vertices and candidate positions, with linear extension beyond its endpoints. The toy loss is `g(x₁,x₂) = ½(x₂ − h(x₁))²`; its gradient is analytic. The coordinates map the original curve endpoints to x₁ = 0 and 10, and the plot bottom/top to x₂ = 0 and 4. Three initializations are chosen by shooting so unmodified, fixed-step GD approaches the existing A/B/C minimizers. No iterate is projected or snapped onto the curve. Each run contains 120 steps. This demonstrates initialization dependence in this constructed example, not convergence for every initialization or step size.

The generator creates `docs/assets/images/minimizer-gd-landscape.png` directly from this loss, preserving transparency for both themes. Its color scale increases monotonically with loss and saturates at 1.2; display scaling does not affect GD. The old extracted background `minimizer-landscape.png` is retained as a source asset. Desktop/mobile SVGs share mathematical coordinates and precomputed iterates. The listing thumbnail retains the original slide geometry. No plotting package or network request is needed.

Validate the numerical construction and regenerate the figure after editing its source:

```sh
python3 tools/manifold_gd.py
python3 tools/build_manifold_diagram.py
```

The first command checks the analytic gradient against finite differences, spline continuity, decreasing losses, distinct endpoints near A/B/C, and plot bounds. The generator runs those checks too, then updates the PNG and only the `manifold-diagrams` / `manifold-thumbnail` marked HTML blocks. Edit the generator for those blocks, including the disclosure; edit the surrounding article and controller for stage captions and timing. Keep the generated paths, static descriptions, four stage captions, and mathematical explanation consistent. The local reference slide folder is not needed for rebuilding or publishing and is excluded from Git. The source PDF and preserved JSON are unchanged. Preserve the separate LLM controller and measured-results assets when revising the opening figure.

Do not add a Code button until a real paper-specific repository is available. Use the article’s paper and section links for evidence.

### Maintain the sampling article

The second article is `docs/writing/sampling-hidden-solutions/index.html`. Its local ES modules require the HTTP preview above; opening the HTML directly as a file is not a supported preview. The page has no remote runtime dependency.

Keep the sequence **fixed loss and local growth → Gibbs limit → ULA sampling → combined error → the same two steps uniformly across θ**. The opening introduces Superquantile–Gibbs (SQ-G) and the destination: common concentration and sampling guarantees across a parameter family. Keep established fixed-loss background distinct from the paper’s uniform results. Explain the reason for uniformity in the opening: settings that work for one loss can deteriorate when it changes. Keep the Gibbs definition before the first density figure; the conditional W₁ rate, its exact assumptions and source references follow the figure. Do not imply that the wavy/bent examples satisfy all of SQ-G’s sampling hypotheses. Application links belong at the end. The main scientific references are:

- **Hasenpflug, Rudolf and Sprungk (2024), Theorem 3.6**, for the Laplace/Wasserstein argument adapted in SQ-G. SQ-G Propositions **2.9–2.10** establish its fixed-loss limiting measure and `W₁ ≤ K√λ` bound. Normal-Hessian stiffness determines the limiting density; it need not be uniform in manifold volume.
- **Yun Gong, Niao He and Zebang Shen**, [arXiv:2501.00429v2, Theorem 4](https://arxiv.org/html/2501.00429v2#Thmtheorem4), for fixed-landscape low-temperature Poincaré control. All three authors should remain credited. The article uses `Var ≤ C_PI × Dirichlet energy`, the reciprocal of that paper’s spectral-gap convention. The diffusion bound retains a `1/λ` timescale, apart from accuracy and initialization factors; it is not a finite-step ULA rate.
- **SQ-G Proposition 3.10**, then **Proposition 3.11**, for uniform concentration and Poincaré control. **Proposition 5.6 / Section 5.3** also require smoothness, controlled initialization, and jointly selected step size and horizon. Local quadratic growth or PL alone is insufficient. A fixed-step ULA chain generally has discretization bias.

The full-distribution estimate separates `W₁(ULA law, Gibbs law)` from `W₁(Gibbs law, limiting law)`. Polynomial complexity as accuracy increases relies on the paper’s controlled Gaussian initialization; merely finite initial Rényi divergence at each temperature is insufficient. Uniform bounds concern runs at each fixed θ, not automatic tracking of a changing target.

The page has one fixed-loss Gibbs density map and two independent ULA experiments (fixed loss and parameter family). Each ULA view overlays actual chains and six short recorded paths on its normalized target density. The family view links this to a perspective portrait of nine computed minimizer sets with the selected θ slice emphasized. The fixed ULA demonstration teaches approach to a Gibbs target; the family demonstration emphasizes θ and the shared settings. Keep its shape/schedule selectors and repeated metrics in the “Shared sampling settings” and diagnostic disclosures, while leaving θ, the restart reminder and current settings visible. Its reading task compares θ = 0 and θ = 1, restarting each run and keeping the schedule fixed. The fixed-loss metrics and trace also live inside “Sampling diagnostics and reference cloud”, so the main view emphasizes the distribution. Keep `#sampling-diagnostics` for the family’s interpretation link. Controls do not autoplay. Playback sits above the plots so the live cloud remains visible on mobile. Reduced motion uses manual batches; offscreen playback pauses. Printing pauses the experiments and labels their current computed state (it does not silently replace it with an endpoint); returning from print leaves them paused. Without JavaScript, the warm Gibbs density image, medium-schedule ULA endpoint, recorded paths, independent reference clouds and family portrait remain visible. Keep light/dark and keyboard behavior intact.

- `ula-model.js` defines the smooth circular/elliptical toy losses, analytic gradients, seeded Gaussian noise, ULA updates, and Euclidean-distance diagnostics. The sampler uses gradients and random draws, never a projection or a parametrization of the minimizer set. Geometry is used only for drawing and diagnostics.
- `gibbs-reference.js` evaluates the toy Gibbs density by radial quadrature and uniform angle. Its direct point clouds provide independent reference draws for the ULA comparisons. At λ = 0 it constructs the actual limiting law on the ellipse. The reported same-angle coupling cost is a numerical **upper bound on W₁**, not an optimal-transport computation. `meanDistance` is a separate quantity.
- Its joint-bin discrepancy compares empirical frequencies with Gibbs probabilities in **4 radial quartiles × 8 angular sectors**. This is a coarse diagnostic, not full continuous total variation, Wasserstein distance, or a mixing certificate. Finite samples leave fluctuations even when drawn independently from the target; never force the curve to decrease monotonically. The independent Gibbs cloud’s score is an example of these fluctuations, not an error floor or acceptance threshold. A sampler can score below that particular cloud without establishing smaller full-distribution error. Keep the definition and interpretation together in `#sampling-diagnostics`, linked from the family example.
- `sampling-story.js` runs **256 ULA chains**, with initialization seed 2424 and noise seed 7431. The three illustrative schedules are `(λ, h, steps) = (0.30, 0.020, 6,000)`, `(0.06, 0.010, 24,000)`, and `(0.01, 0.005, 120,000)`. Each run holds θ fixed. Changing θ retains positions **and the ongoing Gaussian random stream**, pauses the animation, and resets the run clock under the new target. Restart resets both the Cartesian starting cloud and the noise seed; changing shape or schedule also restarts. Keep “Restart before comparing runs at different θ values” beside the slider. These illustrative schedules are not theorem-calibrated accuracy guarantees, and warm starts do not certify the theorem’s initialization condition.
- `sampling-field.js` computes the whole-plane normalized target `exp(−g/λ)/(π baseA baseB Iλ)` on a fixed 420×420 grid covering [−3.4,3.4]². It never estimates density from ULA particles or renormalizes to the viewport. The fixed blue-opacity scale is `.65 log(1+ρ/.02)/log(1+1.5/.02)`, covering all displayed shapes, temperatures and θ values. The matching legend uses the same mapping, including dark-mode brightness on the color layer only. The field is recalculated only when the model or temperature changes. Its approximate visible mass is retained in a data attribute; samples outside the frame are counted and remain in the computation.
- Six chains (indices 0, 42, 85, 128, 170, 213) have short copper-colored paths connecting the last 24 positions recorded every ten ULA updates. Recording is independent of frame rate; there is no trajectory smoothing or projection. Restart and θ changes clear these paths to avoid connecting runs with different targets. The sampler still consumes exactly the original Gaussian stream. Independent reference clouds remain in the diagnostic disclosures, with their finite-sample interpretation.
- `sampling-family-geometry.js` draws nine model-generated slices in a fixed oblique projection of `(θ,x₁,x₂)`. It is a geometric overview, not a loss surface or time axis. The slider updates the active slice and Gibbs field while retaining particles. **Sweep θ** browses from the current value to 1 (or starts at 0 if already at 1), in 0.05 increments over a six-second full interval. It takes no ULA steps and keeps the noise stream unchanged. Run ULA stops any sweep and holds θ fixed. Reduced motion uses **Next θ** in increments of 0.25. Sweeps pause offscreen, on tab hiding, on printing and on motion-preference changes. Shared schedules are illustrative; this interaction does not establish tracking of an online-varying target.
- Inside “Which distribution lives on the minimizer set?”, `normal-rise.js` compares equal outward-normal displacements at two minimizers of the fixed ellipse (θ = 0.5). Positions and loss bars use the exact model, with a shared 0–0.50 loss scale. The four-second animation is started manually; the slider also works from the keyboard. Reduced motion advances by 0.10 per click. Offscreen or hidden playback pauses, as does closing this disclosure. The static fallback shows both points 0.40 units from the set. It illustrates local loss growth, not sampled trajectories.
- `sampling-story.css` styles prose, equations and supporting figures; `sampling-experiments.css` styles the density map and two point-cloud experiments. Density-specific rules are scoped under `.gibbs-density-figure`.

The fixed Gibbs figure is owned by `tools/build_gibbs_density.py`; edit its copy, controls, SVG and disclosure there, then regenerate. Its two choices are **Wavy loop** and **Bent loop**, with Wavy loop as the default. `gibbs-curves.js` defines their actual losses, using the invertible transformation `(X,Y) → (X,Y+s(X))` of `(a cos φ,b sin φ)`, with `a=1.45,b=.7`. The shifts are `.5 sin(2X)` and `.55(1−cos(1.7X))−.4`. The loss is `g=(q−1)²/(1+q)`, where `q=(x₁/a)²+((x₂−s(x₁))/b)²`. Its exact minimizers form the displayed nonconvex loop. The closing “The toy losses and what the figures compute” disclosure distinguishes these sheared loops from the normal-rise and ULA examples; preserve this distinction when editing the illustrations. These are separate fixed Gibbs illustrations: the original circle/ellipse losses, ULA simulations, stiffness figure and parametric rate theorem remain unchanged. The nonlinear models have regular compact minimizers and local quadratic growth; do not claim they have globally Lipschitz gradients or satisfy every sampling assumption.

`gibbs-density.js` evaluates the normalized density `exp(−g/λ)/(πab Iλ)`. The shear's constant Jacobian preserves the existing one-dimensional radial normalization `Iλ`. It renders a720×720 raster on [−2.8,2.8]², retaining the whole-plane normalization; the window contains over99.9% of mass at the displayed temperatures. For λ>0, a fixed nonlinear blue-opacity scale `log(1+ρ/.02)/log(1+4/.02)` spans density0–4. Dark mode brightens the same color layer in the heatmap, limiting curve and legend, preserving their common opacity mapping and plot background. The dashed curve shows exact minimizers. Atλ=0, the area image is removed and the limiting density `1/(2π|γ′(φ)|)` per unit curve length is shown on a separate square-root color scale spanning0–0.4. This keeps low-density stretches visible while preserving the true densities; legend positions use the same mapping. The maximum line density shown in accessible text is sampled on16,384 angles; the helper also exposes an analytic upper bound. Keep the model, generator formulas and color-scale metadata consistent; the generator reads the tick scales from the renderer.

The diagnostic is a **W₁ upper bound**, not an exact distance or exact coupling cost. With κ=sup|s′|, the shear's Lipschitz factor is `L=(√(κ²+4)+κ)/2`. Multiplying the unsheared same-angle cost by L bounds the transformed cost and hence W₁. `createDensityReference` deliberately omits the original affine distance diagnostic and only exposes the quantities valid for the new curve. Do not reuse the old exact-ellipse distance or label this conservative bound as a measured error.

The shape selector keeps the current temperature. Restart returns the selected shape to λ = .3. Cooling runs only on request and can be paused; the λ slider also stops playback. Reduced motion steps through .3, .15, .06, .02, .005 and 0. Printing pauses and retains the current distribution. `gibbs-density-warm.png` supplies the initial no-JavaScript view, with an explicit static-state explanation. The stiffness animation remains inside the following limiting-law disclosure.

The normal-displacement illustration’s static endpoint and listing thumbnail retain their reproducible source in `ula-examples.json`. Update `normal_slices()` in `tools/build_sampling_figures.py` when changing the illustration’s markup; preserve its `normal-slices` generation markers and keep its geometry/scales synchronized with `normal-rise.js`. Rebuild them with the standard-library helper:

```sh
python3 tools/build_sampling_figures.py
python3 tools/build_sampling_figures.py --check
```

The density figure and four ULA/reference clouds are generated from the actual ES modules. With Python Playwright and an installed Chrome/Chromium browser:

```sh
python3 tools/build_gibbs_density.py
python3 tools/build_gibbs_density.py --check
python3 tools/build_sampling_experiments.py
python3 tools/build_sampling_experiments.py --check
```

The first helper replaces only the `fixed-gibbs-density` block and its warm PNG. The second owns the four cloud blocks (including recorded paths and the target image), two trace blocks, two field-legend blocks, the family-geometry block, six static diagnostic outputs, and `ula-target-medium.png`. It reads the renderer modules to keep static geometry and color scales synchronized. Edit surrounding prose and controls in the HTML, and edit these generated blocks in the generator or their respective rendering modules. ULA fallbacks show the actual medium-schedule endpoint after 24,000 steps; the family fallback uses θ = .5. No server is needed for regeneration.

For numerical changes, use the optional checks with the same development dependencies:

```sh
python3 tools/check_gibbs.py --report /tmp/gibbs-checks.json
python3 tools/check_ula.py --write-snapshots --report /tmp/ula-checks.json
python3 tools/build_sampling_figures.py
```

Use `--browser /path/to/chrome` if browser auto-detection does not match your machine. Playwright is only a development dependency; previewing and publishing need no Python packages. The checks compare gradients against finite differences, distances against a dense curve, Gibbs quadrature against an independent finer grid, zero-temperature samples against the exact set, and ULA schedules across models/parameters. These are sanity checks, not proofs of the uniform theorem.

After editing, check the Gibbs density map, both ULA point-cloud experiments, all schedules, the λ = 0 Gibbs endpoint, θ changes after sampling, Run/Pause/Reset, equal-displacement playback/slider, reduced motion, no-JavaScript snapshots, and print behavior. Positive-temperature samples remain spread around the set even after sampling error decreases. Lower temperature needs a smaller step and longer exploration. Keep the figures labeled as two-dimensional toys, not LLM experiments. SQ-G uses an upper tail for pessimistic selection; Select-then-differentiate uses optimistic selection.

### Add a future post

`templates/article.html` remains outside `docs/` as an unpublished reusable layout with a table of contents, native MathML equation, SVG figure/caption, code block, takeaway, and citations/back-references. It needs no external mathematics script. The visual article is a separate implementation; the sample layout is not a public post.

To inspect it, run a second server from the project root:

```sh
python3 -m http.server 8001 --bind 127.0.0.1
```

Open **http://127.0.0.1:8001/templates/article.html**. This root server is for local template review; Pages must still serve `/docs`.

When a real post is ready:

1. Copy the template to `docs/writing/your-post-slug/index.html`, creating the folder first. Keep drafts outside `docs/`.
2. Replace all sample content, dates, reading time, figure, code, and references. Remove `.template-note` and unused sections, including their table-of-contents links.
3. Replace `../docs/assets/` paths with `../../assets/`. Set the Home, Publications, Research Blog, and About navigation links to `../../index.html`, `../../papers/index.html`, `../index.html`, and `../../about/index.html`. Preserve the theme script and accessible switch. Load additional animation code only when the new post uses it.
4. Set the actual title/description. Remove `noindex,nofollow` only when ready to publish. Add the canonical URL `https://smasiha.github.io/writing/your-post-slug/` and matching social metadata if desired.
5. Keep one main heading, meaningful figure alternatives, equation explanations, valid citations, and a real `<time datetime="YYYY-MM-DD">` date.
6. Add the post to the existing `docs/writing/index.html` listing with a linked title, short description, and date. Add its canonical URL to `docs/sitemap.xml`; do not duplicate the listing’s existing entry.
7. Preview links, keyboard access, mathematics, code scrolling, and narrow layouts before committing.

Nothing automatically copies or publishes posts. Only `docs/` is served by Pages. Files committed to a public repository are also visible on GitHub, so keep the ignored historical files local.

## Check changes

```sh
python3 tools/check_site.py
```

The checker covers local links/assets (including downloads, SVG symbols, all shared CSS assets, and the allowed local theme/article scripts and ES module imports), anchors, metadata, unique IDs, image alternatives, email syntax, sitemap coverage, and accidental preview/sample content. It includes template links and does not contact external sites.

Also inspect desktop, tablet, and phone layouts in both themes; Tab through the theme switch, contact links, summary disclosures, and animation controls; use “Skip to content”; and open changed external destinations. Check that the theme persists across navigation and reloads and that a fresh visit follows the system. For the article, test all three minimizer-diagram states, the four-step LLM loop, and the static source-mixture comparison; check Play/Pause/Resume/Replay, both CSV downloads, the results SVG, reduced motion, disabled JavaScript, print restoration, and legible labels at narrow widths. Browser automation used during preparation lives outside this project and is not required to run the site. The local-only `VERIFICATION.md` records completed checks and limitations; it is not part of the upload.

## Upload and publish

The public repository is **[smasiha/smasiha.github.io](https://github.com/smasiha/smasiha.github.io)**. This local project uses `main`; its `origin` should point to `https://github.com/smasiha/smasiha.github.io.git`. The website address is **https://smasiha.github.io/**. A successful upload alone does not enable Pages.

1. From this project folder, check and upload your changes:

   ```sh
   python3 tools/check_site.py
   git status
   git add README.md .gitignore docs templates tools
   git diff --cached --stat
   git commit -m "Update research website"
   git push -u origin main
   ```

   If the working tree is clean, skip the `git add`, `git diff`, and `git commit` commands. Inspect `git remote -v` if uploads target the old account name; update an old `origin` with `git remote set-url origin https://github.com/smasiha/smasiha.github.io.git`. Use your usual GitHub authentication and preserve existing remote history.

2. In [the repository’s Pages settings](https://github.com/smasiha/smasiha.github.io/settings/pages), select **Source: Deploy from a branch → Branch: main → Folder: /docs → Save**, following [GitHub’s branch publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
3. Wait for the Pages deployment to succeed in **Actions**, then check **https://smasiha.github.io/** and all six pages, including the blog listing and both articles. Canonicals, sitemap, and robots target this address. No custom domain or `CNAME` is needed.

For later updates: edit, preview, check, commit the intended files, and `git push`. Pages redeploys from `main` and `/docs`; keep `.nojekyll` in place.
