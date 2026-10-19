#!/usr/bin/env python3
"""Computed toy gradient-descent paths for the preserved slide's minimizer curve.

This standard-library helper constructs a C2 natural cubic spline h through the
slide's curve vertices and all sixteen candidate positions. Its toy loss is
g(x1, x2) = (x2 - h(x1))**2 / 2. The loss and paths are a new illustrative
construction, not the original slide's plotting function or experimental data.

Coordinates: the curve's first/last x coordinates map to 0/10; the original
plot's bottom/top map to y=0/4. The source geometry is never modified.

Run ``python3 tools/manifold_gd.py`` for numerical checks and a compact summary.
Import runs() to obtain all 121 actual iterates of each 120-step GD run. Initial
x coordinates are chosen by a shooting calculation so the three distinct runs
approach the existing A/B/C candidates. No projection, endpoint snapping, or
curve-following motion is applied to any generated iterate.
"""

import bisect
from functools import lru_cache
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GEOMETRY_PATH = ROOT / "tools/manifold-geometry.json"
GEOMETRY = json.loads(GEOMETRY_PATH.read_text())
SOURCE_X_MIN = GEOMETRY["curve"][0][0]
SOURCE_X_MAX = GEOMETRY["curve"][-1][0]
SOURCE_Y_TOP = GEOMETRY["plot_bounds"][1]
SOURCE_Y_BOTTOM = GEOMETRY["plot_bounds"][3]
STEP_SIZE = 0.16
STEPS = 120


def from_source(point):
    """Convert a preserved PDF coordinate pair to toy mathematical coordinates."""
    x, y = point
    return [
        10 * (x - SOURCE_X_MIN) / (SOURCE_X_MAX - SOURCE_X_MIN),
        4 * (SOURCE_Y_BOTTOM - y) / (SOURCE_Y_BOTTOM - SOURCE_Y_TOP),
    ]


def to_source(point):
    """Convert toy mathematical coordinates to the preserved PDF coordinates."""
    x, y = point
    return [
        SOURCE_X_MIN + x * (SOURCE_X_MAX - SOURCE_X_MIN) / 10,
        SOURCE_Y_BOTTOM - y * (SOURCE_Y_BOTTOM - SOURCE_Y_TOP) / 4,
    ]


class _NaturalSpline:
    """Natural cubic interpolation with C2 linear extension beyond end knots."""

    def __init__(self, points):
        self.x = [p[0] for p in points]
        self.y = [p[1] for p in points]
        count = len(points)
        h = [self.x[i + 1] - self.x[i] for i in range(count - 1)]
        assert all(value > 0 for value in h)
        lower, diagonal, upper, rhs = (
            [0.0] * count, [1.0] * count, [0.0] * count, [0.0] * count
        )
        for i in range(1, count - 1):
            lower[i] = h[i - 1]
            diagonal[i] = 2 * (h[i - 1] + h[i])
            upper[i] = h[i]
            rhs[i] = 6 * (
                (self.y[i + 1] - self.y[i]) / h[i]
                - (self.y[i] - self.y[i - 1]) / h[i - 1]
            )
        for i in range(1, count):
            scale = lower[i] / diagonal[i - 1]
            diagonal[i] -= scale * upper[i - 1]
            rhs[i] -= scale * rhs[i - 1]
        self.second = [0.0] * count
        self.second[-1] = rhs[-1] / diagonal[-1]
        for i in range(count - 2, -1, -1):
            self.second[i] = (
                rhs[i] - upper[i] * self.second[i + 1]
            ) / diagonal[i]

    def segment(self, i, x):
        width = self.x[i + 1] - self.x[i]
        a = (self.x[i + 1] - x) / width
        b = (x - self.x[i]) / width
        left, right = self.second[i], self.second[i + 1]
        value = a * self.y[i] + b * self.y[i + 1] + (
            (a**3 - a) * left + (b**3 - b) * right
        ) * width**2 / 6
        first = (self.y[i + 1] - self.y[i]) / width + (
            (1 - 3 * a * a) * left + (3 * b * b - 1) * right
        ) * width / 6
        return value, first, a * left + b * right

    def evaluate(self, x):
        if x < self.x[0]:
            value, slope, _ = self.segment(0, self.x[0])
            return value + slope * (x - self.x[0]), slope, 0.0
        if x > self.x[-1]:
            value, slope, _ = self.segment(len(self.x) - 2, self.x[-1])
            return value + slope * (x - self.x[-1]), slope, 0.0
        i = min(len(self.x) - 2, bisect.bisect_right(self.x, x) - 1)
        return self.segment(i, x)


# Candidate positions override a duplicated curve vertex at the same source x.
# This preserves the exact positions and validation correspondence of all dots.
_source_knots = {x: y for x, y in GEOMETRY["curve"]}
for _candidate in GEOMETRY["candidates"]:
    _source_knots[_candidate["base"][0]] = _candidate["base"][1]
_SPLINE = _NaturalSpline([
    from_source([x, y]) for x, y in sorted(_source_knots.items())
])


def curve(x):
    """The height h(x) of the smooth minimizer curve."""
    return _SPLINE.evaluate(x)[0]


def derivative(x):
    """Analytic first derivative h'(x)."""
    return _SPLINE.evaluate(x)[1]


def loss(point):
    residual = point[1] - curve(point[0])
    return residual * residual / 2


def gradient(point):
    height, slope, _ = _SPLINE.evaluate(point[0])
    residual = point[1] - height
    return [-residual * slope, residual]


def trajectory(initial, step_size=STEP_SIZE, steps=STEPS):
    """Plain fixed-step GD, including the initial point and its loss."""
    points = [list(initial)]
    losses = [loss(initial)]
    for _ in range(steps):
        current = points[-1]
        grad = gradient(current)
        point = [current[i] - step_size * grad[i] for i in range(2)]
        if not all(math.isfinite(value) for value in point):
            raise ArithmeticError("A GD iterate was not finite")
        points.append(point)
        losses.append(loss(point))
    return points, losses


def _shoot(target_x, initial_y):
    """Choose an initial x; this computation does not alter any GD trajectory."""
    def discrepancy(x):
        points, _ = trajectory([x, initial_y], steps=220)
        return points[-1][0] - target_x

    brackets = []
    left, left_value = 0.0, discrepancy(0.0)
    for i in range(1, 101):
        right = i / 10
        right_value = discrepancy(right)
        if left_value * right_value <= 0:
            brackets.append((left, right, left_value))
        left, left_value = right, right_value
    if len(brackets) != 1:
        raise ArithmeticError(f"Expected one shooting bracket; found {len(brackets)}")
    left, right, left_value = brackets[0]
    for _ in range(55):
        middle = (left + right) / 2
        middle_value = discrepancy(middle)
        if left_value * middle_value <= 0:
            right = middle
        else:
            left, left_value = middle, middle_value
    return (left + right) / 2


@lru_cache(maxsize=1)
def runs():
    """Return three computed GD runs; the returned dictionaries are read-only by convention."""
    result = []
    choices = [("A", 3, 3.8), ("B", GEOMETRY["selected_index"], 0.2), ("C", 14, 3.8)]
    for label, target_index, initial_y in choices:
        target = from_source(GEOMETRY["candidates"][target_index]["base"])
        initial = [_shoot(target[0], initial_y), initial_y]
        points, losses = trajectory(initial)
        result.append({
            "label": label,
            "target_index": target_index,
            "target": target,
            "initial": initial,
            "step_size": STEP_SIZE,
            "steps": STEPS,
            "points": points,
            "losses": losses,
            "endpoint_error": math.dist(points[-1], target),
        })
    return result


def metadata():
    return {
        "kind": "Computed toy illustration; not measured training trajectories",
        "loss": "g(x1,x2) = 0.5 * (x2 - h(x1))^2",
        "curve": "C2 natural cubic spline through preserved curve and candidate positions",
        "geometry": str(GEOMETRY_PATH.relative_to(ROOT)),
        "geometry_source_sha256": GEOMETRY["source_sha256"],
        "coordinates": "Curve endpoints x=0 and 10; original plot bottom/top y=0 and 4",
        "step_size": STEP_SIZE,
        "steps": STEPS,
        "initialization": "Three initial x coordinates chosen by shooting to the existing A/B/C minima",
        "interpretation": "Different initializations, same optimizer and step size, different zero-loss limits",
        "limitations": "Illustrates initialization dependence only; no claim about every initialization or step size",
    }


def validate():
    """Lightweight independent finite differences and trajectory checks."""
    interpolation_error = max(abs(curve(x) - y) for x, y in zip(_SPLINE.x, _SPLINE.y))
    c2_join_error = 0.0
    for i in range(1, len(_SPLINE.x) - 1):
        left = _SPLINE.segment(i - 1, _SPLINE.x[i])
        right = _SPLINE.segment(i, _SPLINE.x[i])
        c2_join_error = max(c2_join_error, *(abs(a - b) for a, b in zip(left, right)))
    gradient_error = 0.0
    epsilon = 1e-6
    for i in range(61):
        for y in (0.2, 1.3, 3.8):
            point = [10 * i / 60, y]
            analytic = gradient(point)
            for axis in (0, 1):
                plus, minus = point[:], point[:]
                plus[axis] += epsilon
                minus[axis] -= epsilon
                numeric = (loss(plus) - loss(minus)) / (2 * epsilon)
                gradient_error = max(gradient_error, abs(numeric - analytic[axis]))
    summaries = []
    left_bottom = from_source([GEOMETRY["plot_bounds"][0], SOURCE_Y_BOTTOM])
    right_top = from_source([GEOMETRY["plot_bounds"][2], SOURCE_Y_TOP])
    for run in runs():
        differences = [b - a for a, b in zip(run["losses"], run["losses"][1:])]
        maximum_increase = max(differences)
        assert maximum_increase <= 1e-14
        assert run["endpoint_error"] < 1e-6
        assert run["losses"][-1] < 1e-16
        assert all(left_bottom[0] <= x <= right_top[0] and 0 <= y <= 4 for x, y in run["points"])
        summaries.append({
            "label": run["label"], "initial": run["initial"],
            "endpoint": run["points"][-1], "target": run["target"],
            "endpoint_error": run["endpoint_error"],
            "initial_loss": run["losses"][0], "final_loss": run["losses"][-1],
            "maximum_loss_increase": maximum_increase,
        })
    assert interpolation_error < 1e-12
    assert c2_join_error < 1e-10
    assert gradient_error < 1e-7
    assert min(math.dist(a["target"], b["target"]) for i, a in enumerate(runs()) for b in runs()[i + 1:]) > 2
    return {
        "knots": len(_SPLINE.x), "interpolation_error": interpolation_error,
        "c2_join_error": c2_join_error, "gradient_finite_difference_error": gradient_error,
        "all_iterates_inside_plot": True, "runs": summaries,
    }


if __name__ == "__main__":
    print(json.dumps({"metadata": metadata(), "validation": validate()}, indent=2))
