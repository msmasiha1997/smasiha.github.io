#!/usr/bin/env python3
"""Regenerate the downloadable cross-model chart for the research article.

Optional authoring dependency: matplotlib (``python3 -m pip install matplotlib``).
The deployed website needs neither Python nor matplotlib; the SVG is committed.

From the project root:
    python3 tools/plot_blog_results.py
    python3 tools/plot_blog_results.py --output /tmp/blog-results.png

Data: Masiha, Shen, Kiyavash, and He, arXiv:2605.09209v1, Tables 2 and 3(a).
The CSV contains both GSM8K and MATH; the chart presents GSM8K. Protocol:
Appendix F.6. These are single-seed (2424), single-H100 LoRA results from
the paper's adapted implementation, not numbers copied from original baseline
papers. All completed math runs share final 20K-example, one-epoch fine-tuning.
ScaleBiO, HG-baseline, and HG-MS share the per-backbone reweighting budget:
approximately 12h / 9h / 15h / 15h for the four backbones below. Non-iterative
baselines have no outer reweighting horizon. OOM means no completed result;
it must never be encoded as zero accuracy. No error bars are inferred.

Update this helper, the CSV, and the article together when results change.
"""

import argparse
import csv
import math
from pathlib import Path
import re
from xml.sax.saxutils import escape

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs/assets/data/select-then-differentiate-results.csv"
DEFAULT_OUTPUT = ROOT / "docs/assets/images/select-then-differentiate-results.svg"
MODELS = ("Llama-3-8B", "Qwen-2-7B", "Gemma-2-9B", "Qwen2.5-32B")
METHODS = ("Uniform Weighting", "RHO-LOSS", "LESS", "ScaleBiO", "HG-baseline", "HG-MS")
BENCHMARKS = ("GSM8K", "MATH")
SOURCES = {
    model: f"https://arxiv.org/html/2605.09209v1#S6.T{3 if model == MODELS[-1] else 2}"
    for model in MODELS
}
PROTOCOL = "https://arxiv.org/html/2605.09209v1#A6.SS6"


def load_results() -> dict:
    """Check complete coverage, unique keys, source attribution and OOM values."""
    required_columns = {
        "model", "method", "benchmark", "accuracy_percent", "status", "source_url"
    }
    results = {}
    with DATA.open(newline="", encoding="utf-8") as source:
        reader = csv.DictReader(source)
        if set(reader.fieldnames or ()) != required_columns:
            raise ValueError("Results CSV must contain the six documented columns.")
        for row in reader:
            key = (row["model"], row["method"], row["benchmark"])
            if key in results:
                raise ValueError(f"Duplicate result: {key}")
            model, method, benchmark = key
            if model not in MODELS or method not in METHODS or benchmark not in BENCHMARKS:
                raise ValueError(f"Unexpected result: {key}")
            if row["source_url"] != SOURCES[model]:
                raise ValueError(f"Incorrect source for {key}")
            if row["status"] == "OOM":
                if row["accuracy_percent"].strip():
                    raise ValueError(f"OOM result cannot have an accuracy: {key}")
                value = None
            elif row["status"] == "completed":
                try:
                    value = float(row["accuracy_percent"])
                except ValueError as exc:
                    raise ValueError(f"Completed result needs a numeric accuracy: {key}") from exc
                if not math.isfinite(value) or not 0 <= value <= 100:
                    raise ValueError(f"Accuracy outside [0, 100]: {key}")
            else:
                raise ValueError(f"Unknown status for {key}: {row['status']}")
            results[key] = value
    expected = {(m, method, b) for m in MODELS for method in METHODS for b in BENCHMARKS}
    if set(results) != expected:
        raise ValueError(f"Missing result rows: {sorted(expected - set(results))}")
    expected_oom = {(MODELS[-1], method, b) for method in ("RHO-LOSS", "LESS") for b in BENCHMARKS}
    if {key for key, value in results.items() if value is None} != expected_oom:
        raise ValueError("OOM rows must match the two incomplete 32B methods in Table 3(a).")
    return results


def make_chart(output: Path) -> None:
    results = load_results()
    accent, ink, muted, grid = "#2458a6", "#202b3c", "#526176", "#e2e7ee"
    plt.rcParams.update({
        "font.family": "DejaVu Sans",
        "font.size": 10.5,
        "text.color": ink,
        "axes.labelcolor": muted,
        "xtick.color": muted,
        "ytick.color": ink,
        "svg.fonttype": "none",
        "svg.hashsalt": "select-then-differentiate-cross-model-results",
    })
    fig = plt.figure(figsize=(12.8, 9.3), facecolor="white")
    fig.text(0.045, 0.947, "Math accuracy across four tested models", fontsize=22, weight="bold")
    fig.text(0.045, 0.910, "GSM8K accuracy after fine-tuning · Higher is better", fontsize=12, color=muted)

    for index, model in enumerate(MODELS):
        column, row = index % 2, index // 2
        ax = fig.add_axes([0.16 + column * 0.49, 0.54 - row * 0.35, 0.285, 0.265])
        ax.set_title(model, loc="left", fontsize=15, weight="bold", pad=16)
        ax.set_axisbelow(True)
        ax.xaxis.grid(True, color=grid, linewidth=0.75)
        ax.set_xlim(0, 100)
        ax.set_ylim(5.6, -0.6)
        ax.set_xticks([0, 25, 50, 75, 100], ["0", "25", "50", "75", "100%"])
        ax.set_yticks(range(len(METHODS)), METHODS)
        ax.tick_params(axis="x", length=0, pad=9, labelsize=9.5)
        ax.tick_params(axis="y", length=0, pad=11, labelsize=10.5)
        for spine in ax.spines.values():
            spine.set_visible(False)
        for position, method in enumerate(METHODS):
            value = results[(model, method, "GSM8K")]
            if value is None:
                ax.text(2, position, "OOM · no completed run", va="center", fontsize=9.5, color=muted)
                continue
            selected = method == "HG-MS"
            ax.barh(position, value, height=0.51, color=accent if selected else "#929fb1", zorder=2)
            ax.text(value + 2, position, f"{value:.2f}", va="center", fontsize=10.5,
                    color=accent if selected else ink, weight="bold" if selected else "normal",
                    clip_on=False)
        for label in ax.get_yticklabels():
            if label.get_text() == "HG-MS":
                label.set_color(accent)
                label.set_weight("bold")

    fig.text(0.045, 0.112, "Single seed · Shared final 20K-example, one-epoch fine-tuning protocol",
             fontsize=10, color=muted, url=PROTOCOL)
    fig.text(0.045, 0.087, "Iterative reweighting budgets: Llama ≈12h · Qwen2 ≈9h · Gemma ≈15h · Qwen2.5 ≈15h.",
             fontsize=9.5, color=muted)
    fig.text(0.045, 0.063, "Budgets matched within each model for ScaleBiO, HG-baseline and HG-MS; other methods have no outer loop.",
             fontsize=9, color=muted)
    fig.text(0.045, 0.028, "Masiha et al., Select-then-differentiate · arXiv:2605.09209v1",
             fontsize=9, color=muted, url="https://arxiv.org/html/2605.09209v1")
    fig.text(0.660, 0.028, "Table 2: 7B–9B models", fontsize=9, color=accent, url=SOURCES[MODELS[0]])
    fig.text(0.825, 0.028, "Table 3(a): 32B", fontsize=9, color=accent, url=SOURCES[MODELS[-1]])

    output.parent.mkdir(parents=True, exist_ok=True)
    svg_output = output.suffix.lower() == ".svg"
    metadata = {"Date": None, "Title": "GSM8K accuracy across four language models: select-then-differentiate"} if svg_output else None
    fig.savefig(output, facecolor="white", dpi=180, metadata=metadata)
    plt.close(fig)

    if svg_output:
        descriptions = []
        for model in MODELS:
            scores = []
            for method in METHODS:
                value = results[(model, method, "GSM8K")]
                scores.append(f"{method}: {'OOM, no completed run' if value is None else f'{value:.2f}%'}")
            descriptions.append(f"{model}: " + "; ".join(scores))
        description = ". ".join(descriptions) + (
            ". Single-seed results from Tables 2 and 3(a). All completed rows share final one-epoch "
            "fine-tuning on 20,000 examples. Iterative methods share per-backbone reweighting budgets; "
            "non-iterative methods have no outer-loop budget. OOM means out of memory, not zero accuracy."
        )
        content = output.read_text(encoding="utf-8")
        content = re.sub(r"(<svg\b[^>]*)(>)",
                         r'\1 role="img" aria-labelledby="chart-title chart-description"\2', content, count=1)
        content = re.sub(r"(<svg\b[^>]*>)",
                         r'\1\n <title id="chart-title">GSM8K accuracy across four language models</title>\n'
                         + '<desc id="chart-description">' + escape(description) + '</desc>', content, count=1)
        output.write_text(content, encoding="utf-8")
    print(f"Validated {len(results)} results (44 completed, 4 OOM); wrote {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    make_chart(parser.parse_args().output)
