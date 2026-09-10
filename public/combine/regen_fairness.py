#!/usr/bin/env python3
"""
Reproduces the Help Me Combine priority sweep and coverage bootstrap CIs
(Atlas of Proteomic Technologies, engine v2.11: 6 platforms, 15 pairs).

Self-contained: reads only combine_engine_spec.json (which embeds the platform scores,
pair data, and the exact engine constants), plus numpy and the Python standard library.
Writes two CSVs and prints the top of each table.

The priority sweep is fully deterministic, no seed involved. The bootstrap CIs use
numpy.random.default_rng(SEED), reproducible with the seed below (change SEED to resample).

A random-weight sweep (uniform [0,1) draws over all seven axis weights) was previously
part of this bundle and has been withdrawn: two of those axes (sample_volume, ms_fit) are
zero-weighted by default and reachable only when a user explicitly selects them, so a
uniform draw gives them the same expected influence as coverage -- a weighting the
priority picker cannot actually produce. It reordered pairs by construction rather than
reflecting anything a real user could select (Nomic Omni + Seer Proteograph XT placed 1st
in the priority sweep, 4th under uniform random weights) and is not reported in the paper.

Run:  python3 regen_fairness.py
"""
import csv, json, os
from itertools import combinations
import numpy as np

SEED = 42
BOOTSTRAP_DRAWS = 2000
HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = json.load(open(os.path.join(HERE, "combine_engine_spec.json")))

PLAT = SPEC["platforms"]
DISP2SLUG = SPEC["display_name_to_slug"]
PAIRS = SPEC["pairs"]
AXES = [a["key"] for a in SPEC["axes"]]
INVERT = {a["key"] for a in SPEC["axes"] if a["invert"]}
AXIS_DEFAULT = {a["key"]: a["default_weight"] for a in SPEC["axes"]}
QDIMS = [q["key"] for q in SPEC["quality_dims"]]
QDEFAULT = {q["key"]: q["default_weight"] for q in SPEC["quality_dims"]}
LEVER = SPEC["priority_to_lever"]
PRIORITIES = list(LEVER.keys())
DENOMS = ["drug_targets", "proteome_atlas_union", "proteome_canonical", "fda_biomarkers"]
DENOM_TOTAL = SPEC["denominators"]
PAIR_COV_FIELD = {
    "drug_targets": "coverage_pct", "proteome_atlas_union": "coverage_pct_atlas_union",
    "proteome_canonical": "coverage_pct_canonical", "fda_biomarkers": "coverage_pct_fda",
}
N = len(PAIRS)


def derive(keys):
    w = dict(AXIS_DEFAULT)
    picked_q = []
    for k in keys:
        lv = LEVER[k]
        if "axis" in lv:
            w[lv["axis"]] = lv["set_weight_to"]
        if "quality_dim" in lv:
            picked_q.append(lv["quality_dim"])
    if picked_q:
        w["quality"] = 5
        q = {d: (1 if d in picked_q else 0) for d in QDIMS}
    else:
        q = dict(QDEFAULT)
    return w, q


def has_ms(pr):
    return PLAT[DISP2SLUG[pr["a"]]]["ptm_proteoform_capable"] or PLAT[DISP2SLUG[pr["b"]]]["ptm_proteoform_capable"]


def key(p):
    return p["a"] + " + " + p["b"]


# ── Precompute static per-pair vectors/matrices (shared by both sweeps) ────────────────
Q = np.zeros((N, len(QDIMS)))
for i, p in enumerate(PAIRS):
    sa, sb = PLAT[DISP2SLUG[p["a"]]]["app_scores"], PLAT[DISP2SLUG[p["b"]]]["app_scores"]
    for j, d in enumerate(QDIMS):
        Q[i, j] = (sa[d] + sb[d]) / 2

cost_vec = np.array([p["total_cost"] for p in PAIRS])
class_balance_vec = np.array([p["class_balance"] for p in PAIRS])
sample_volume_vec = np.array([p["joint_volume_uL"] for p in PAIRS])
ms_fit_vec = np.array([1.0 if has_ms(p) else 0.0 for p in PAIRS])
coverage_by_denom, complementarity_by_denom = {}, {}
for denom in DENOMS:
    field = PAIR_COV_FIELD[denom]
    cvec = np.array([p[field] for p in PAIRS])
    coverage_by_denom[denom] = cvec
    nn = np.zeros(N)
    for i, p in enumerate(PAIRS):
        if denom == "drug_targets":
            nn[i] = p["net_new_pct"]
        else:
            ca = PLAT[DISP2SLUG[p["a"]]]["coverage"][denom]
            cb = PLAT[DISP2SLUG[p["b"]]]["coverage"][denom]
            nn[i] = cvec[i] - max(ca, cb)
    complementarity_by_denom[denom] = nn


def score(denom, w, q):
    qw = np.array([q[d] for d in QDIMS])
    qsum = qw.sum()
    quality_vec = (Q @ qw) / qsum if qsum > 0 else np.zeros(N)
    raw = np.stack([coverage_by_denom[denom], complementarity_by_denom[denom], quality_vec,
                     cost_vec, class_balance_vec, sample_volume_vec, ms_fit_vec], axis=1)
    norm = np.zeros_like(raw)
    for j, ax in enumerate(AXES):
        col = raw[:, j]
        mn, mx = col.min(), col.max()
        rng = (mx - mn) or 1
        norm[:, j] = (mx - col) / rng if ax in INVERT else (col - mn) / rng
    wvec = np.array([w[ax] for ax in AXES])
    wsum = wvec.sum() or 1
    return norm @ wvec / wsum


def tally(scenarios):
    win = np.zeros(N)
    top3 = np.zeros(N)
    regret_sum = np.zeros(N)
    rank_sum = np.zeros(N)
    part = {p["display_name"]: 0 for p in PLAT.values()}
    for w, q, denom in scenarios:
        c = score(denom, w, q)
        order = np.argsort(-c)
        win[order[0]] += 1
        part[PAIRS[order[0]]["a"]] += 1
        part[PAIRS[order[0]]["b"]] += 1
        top3[order[:3]] += 1
        best = c[order[0]]
        regret_sum += best - c
        ranks = np.empty(N, dtype=int)
        ranks[order] = np.arange(1, N + 1)
        rank_sum += ranks
    n = len(scenarios)
    return win, top3, regret_sum, rank_sum, part, n


# ── Bootstrap coverage CIs (drug-target universe, n=1450), pair order ──────────────────
rng_ci = np.random.default_rng(SEED)
ci_rows = []
for p in PAIRS:
    draws = rng_ci.binomial(DENOM_TOTAL["drug_targets"], p["coverage_pct"] / 100, size=BOOTSTRAP_DRAWS) / DENOM_TOTAL["drug_targets"] * 100
    ci_rows.append((p["a"], p["b"], p["coverage_pct"], round(float(np.percentile(draws, 2.5)), 1), round(float(np.percentile(draws, 97.5)), 1)))

# ── Priority sweep (deterministic) ──────────────────────────────────────────────────────
combos = [list(c) for r in (1, 2, 3) for c in combinations(PRIORITIES, r)]
prio_scen = [(*derive(c), d) for d in DENOMS for c in combos]
p_win, p_top3, p_regret, p_rank, p_part, p_n = tally(prio_scen)


def write_sweep_csv(path, win, top3, regret, rank, part, n):
    rows = []
    for i, p in enumerate(PAIRS):
        rows.append(["pair", key(p), int(win[i]), round(100 * win[i] / n, 2), int(top3[i]), round(100 * top3[i] / n, 2),
                     round(regret[i] / n, 4), round(rank[i] / n, 2), ""])
    for k, v in sorted(part.items(), key=lambda t: -t[1]):
        rows.append(["platform", k, "", "", "", "", "", "", round(100 * v / n, 1)])
    with open(path, "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["type", "entity", "win_count", "win_pct", "top3_count", "top3_pct", "mean_regret", "mean_rank", "participation_pct"])
        wr.writerows(rows)
    return path


write_sweep_csv(os.path.join(HERE, "fairness_priority_sweep.csv"), p_win, p_top3, p_regret, p_rank, p_part, p_n)

with open(os.path.join(HERE, "coverage_bootstrap_ci.csv"), "w", newline="") as f:
    wr = csv.writer(f)
    wr.writerow(["platform_a", "platform_b", "coverage_pct", "ci_lo", "ci_hi"])
    wr.writerows(ci_rows)


def show(title, win, top3, regret, rank, part, n):
    print(f"\n== {title} (n={n:,}) ==")
    order = sorted(range(N), key=lambda i: -win[i])
    for i in order:
        p = PAIRS[i]
        print(f"  {key(p):48s} win {100*win[i]/n:5.1f}%   top3 {100*top3[i]/n:5.1f}%   regret {regret[i]/n:.3f}   rank {rank[i]/n:.2f}")
    print("  platform participation: " + ", ".join(f"{k} {100*v/n:.1f}%" for k, v in sorted(part.items(), key=lambda t: -t[1])))


print(f"Help Me Combine fairness reproduction (engine {SPEC['engine_version']}, seed {SEED})")
show("PRIORITY SWEEP (deterministic)", p_win, p_top3, p_regret, p_rank, p_part, p_n)
print(f"\nWrote fairness_priority_sweep.csv and coverage_bootstrap_ci.csv")
