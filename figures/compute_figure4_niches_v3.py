#!/usr/bin/env python3
"""
Figure 4 Panel A conditional ("niche") win-shares, engine v3.0 (Fix A-D +
prevalence-weighted baseline).

  Baseline   - the primary, prevalence-weighted baseline (read directly from
               choose_engine_spec.json's baseline_grid.outright_win_pct; same
               statistic regen_fairness.py's run_baseline_grid() produces).
  Coverage / Throughput / Sensitivity / pQTL - "slider maximised alone":
               target slider = 5, other six sliders = 1, restricted to
               PLASMA (the dominant real matrix), swept over 6 goals x 4
               study sizes (24 scenarios), toggles off. Restricted to plasma
               (v2.4/pre-Fix-C versions swept all 6 sample types) specifically
               to remove tissue-matrix cross-contamination: Biognosys
               TrueDiscovery's genuine tissue-fit advantage was otherwise
               leaking into all four of these columns (confirmed empirically -
               87.5-100% of its presence in each column traced to tissue-only
               sub-scenarios), which has nothing to do with the dimension each
               column is meant to test. Plasma-restriction is unaffected by
               Fix D (no platform has flex_score=1 in plasma), so these four
               columns do not need to be recomputed again if the engine
               changes elsewhere in a way that only touches tissue.
  Tissue     - sample type fixed to "tissue", full goals x sizes x 3^7-weight
               sweep (52,488 scenarios), toggles off.
  Abs. quant - absoluteQuant toggle fixed to "yes", otherwise the full
               (unweighted) enumeration over goals x samples x sizes x
               weights (314,928 scenarios). nomic-omni is the only
               absolute_quant_capable platform, so it is the sole eligible
               platform in every one of these scenarios by construction
               (hard_filters.absquant), not a scored contest - prevalence
               weighting would not change a 100%/0% hard-filter result, so
               the unweighted enumeration is used for simplicity.

All figures are OUTRIGHT WIN % (topTierCount == 1), matching Panel A's
existing colorbar label ("Simulated outright win-share (%)"). Imports
regen_fairness.py directly (compute_results, Tally, and every constant) so
this reuses the exact live-engine reproduction rather than re-deriving it.

Run (from any directory): python3 figures/compute_figure4_niches_v3.py
"""
import itertools
import sys
import os

# regen_fairness.py and choose_engine_spec.json live in public/choose, relative to this script.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "choose"))
import regen_fairness as rf

TOGGLES_OFF = {"absoluteQuant": "no", "ptmDetection": "no", "cnsFocus": "no", "longitudinal": "no"}
WEIGHT_LEVELS = [1, 3, 5]

DISPLAY_NAME = {pid: rf.SPEC["platforms"][pid]["display_name"] for pid in rf.PLATFORM_IDS}


def slider_maxed_alone_plasma(slider_key):
    """Target slider = 5, other six = 1, sample type fixed to plasma. Swept over goals x sizes (24 scenarios)."""
    t = rf.Tally()
    weights = {k: (5 if k == slider_key else 1) for k in rf.SLIDER_KEYS}
    for goal in rf.GOALS:
        for size in rf.SIZES:
            eligible = rf.compute_results(goal, "plasma", size, weights, TOGGLES_OFF)
            if eligible:
                t.add(eligible)
    return t


def tissue_matrix():
    """Sample type fixed to tissue; full goals x sizes x 3^7-weight sweep, toggles off."""
    t = rf.Tally()
    for goal in rf.GOALS:
        for size in rf.SIZES:
            for wvals in itertools.product(WEIGHT_LEVELS, repeat=7):
                weights = dict(zip(rf.SLIDER_KEYS, wvals))
                eligible = rf.compute_results(goal, "tissue", size, weights, TOGGLES_OFF)
                if eligible:
                    t.add(eligible)
    return t


def absquant_required():
    """absoluteQuant toggle fixed to 'yes'; otherwise the full baseline grid."""
    t = rf.Tally()
    toggles = dict(TOGGLES_OFF, absoluteQuant="yes")
    for goal in rf.GOALS:
        for sample in rf.SAMPLES:
            for size in rf.SIZES:
                for wvals in itertools.product(WEIGHT_LEVELS, repeat=7):
                    weights = dict(zip(rf.SLIDER_KEYS, wvals))
                    eligible = rf.compute_results(goal, sample, size, weights, toggles)
                    if eligible:
                        t.add(eligible)
    return t


def outright_pct(t, pid):
    return round(t.outright_win[pid] / t.n * 100, 1)


if __name__ == "__main__":
    print(f"Figure 4 Panel A niche win-shares (engine {rf.SPEC['engine_version']})\n")

    columns = {}
    columns["Baseline"] = {pid: round(v, 1) for pid, v in rf.SPEC["baseline_grid"]["outright_win_pct"].items()}

    print("Coverage-maximised, plasma only (n=24) ...")
    t = slider_maxed_alone_plasma("coverage")
    columns["Coverage"] = {pid: outright_pct(t, pid) for pid in rf.PLATFORM_IDS}

    print("Throughput-maximised, plasma only (n=24) ...")
    t = slider_maxed_alone_plasma("throughput")
    columns["Throughput"] = {pid: outright_pct(t, pid) for pid in rf.PLATFORM_IDS}

    print("Sensitivity-maximised, plasma only (n=24) ...")
    t = slider_maxed_alone_plasma("sensitivity")
    columns["Sensitivity"] = {pid: outright_pct(t, pid) for pid in rf.PLATFORM_IDS}

    print("pQTL-maximised, plasma only (n=24) ...")
    t = slider_maxed_alone_plasma("pqtl")
    columns["pQTL"] = {pid: outright_pct(t, pid) for pid in rf.PLATFORM_IDS}

    print("Tissue matrix (n=52,488) ...")
    t = tissue_matrix()
    columns["Tissue"] = {pid: outright_pct(t, pid) for pid in rf.PLATFORM_IDS}

    print("Absolute-quant required (n=314,928) ...")
    t = absquant_required()
    columns["Abs. quant"] = {pid: outright_pct(t, pid) for pid in rf.PLATFORM_IDS}

    col_order = ["Baseline", "Coverage", "Throughput", "Sensitivity", "pQTL", "Tissue", "Abs. quant"]
    row_order = ["illumina-protein-prep", "olink-explore-ht", "nulisa",
                 "seer-proteograph", "biognosys-truediscovery", "nomic-omni"]

    print(f"\n{'Platform':26s}" + "".join(f"{c:>12s}" for c in col_order))
    for pid in row_order:
        print(f"{DISPLAY_NAME[pid]:26s}" + "".join(f"{columns[c][pid]:12.1f}" for c in col_order))

    print("\nHM (row order = illumina-protein-prep/olink/nulisa/seer/biognosys/nomic, "
          "col order = Baseline/Coverage/Throughput/Sensitivity/pQTL/Tissue/Abs.quant):")
    print("HM = [")
    for pid in row_order:
        vals = ", ".join(f"{columns[c][pid]:5.1f}" for c in col_order)
        print(f"    [{vals}],   # {DISPLAY_NAME[pid]}")
    print("]")
