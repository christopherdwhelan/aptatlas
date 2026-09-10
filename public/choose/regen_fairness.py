#!/usr/bin/env python3
"""
Reproduces the Help Me Choose fairness numbers (Atlas of Proteomic Technologies,
engine v3.1): a prevalence-weighted baseline enumeration (see below), the plasma
discovery large/xlarge secondary-check slice (4,374 scenarios), and a rescoring
of 65 real, anonymized survey respondents against the same engine.

Self-contained: reads only choose_engine_spec.json (which embeds the platform
scores and every engine constant) and choose_real_world_data.csv (anonymized
real-world inputs - no names, institutions, emails, or timestamps), plus the
Python standard library. No RNG anywhere; every enumeration below is a full
enumeration, not a sample, so it is exactly reproducible with no seed.

IMPORTANT - rounding: this script must match JavaScript's Math.round() (round
half away from zero), not Python's built-in round() (round half to even). See
js_round() below and choose_engine_spec.json's "rounding_rule" for why this
matters: it changes real classifications, not just cosmetic display digits.

IMPORTANT - what the two platform-level statistics mean. For each scenario, look
at every eligible platform within TIE_BAND points of the top displayPct (the
"tie group" for that scenario - this is exactly HelpMeChoose.jsx's own
isTopTier condition). Two mutually exclusive things can happen to a platform in
that tie group, and every scenario resolves to exactly one of them for every
platform that reaches it:
  - OUTRIGHT WIN: the tie group has exactly one member and this platform is it.
    No other platform is even within TIE_BAND. This is the only condition under
    which the live app declares a single "Best overall match" -
    getScoreExplanation() renders that only when topTierCount == 1.
  - CO-RECOMMENDED: the tie group has two or more members and this platform is
    one of them. The app renders "N platforms are statistically tied" for all
    of them, with no winner singled out - even when their displayPct values are
    not exactly equal, only within TIE_BAND of each other.
A platform's outright-win rate and co-recommended rate are reported separately
and do NOT need to be added back together into a single "top-tier" figure: that
figure existed in an earlier version of this script and conflated the two
different questions "does this platform ever win alone?" and "is this platform
often in contention?" into one number, which was the source of real confusion
(see version history). It has been removed as a reported statistic.

Neither column sums to 100% across platforms, for different reasons. Outright
win rates sum to LESS than 100%: many scenarios (see tie_group_size_histogram
below) have no platform standing alone at all, and those scenarios contribute
to no platform's outright-win count - not a coincidence, a common outcome. This
"no sole winner" figure is NOT a platform-level statistic - it is a property of
the scenario population, not of any one platform - so it is reported
separately, as a distribution over tie-group size (how many platforms were
tied when nobody won outright), rather than jammed into the platform table
where it doesn't belong. Co-recommended rates sum to MORE than 100% whenever
average tie-group size exceeds 2, since every platform in a tie group of size k
is counted once, contributing k counts to one scenario.

An earlier version of this script defined "win" as whichever platform had the
single highest displayPct (breaking exact ties by array order, later "fixed" to
split exact ties fractionally, then further "fixed" to the topTierCount==1
outright-win definition without yet separating co-recommended from a combined
"top-tier" figure). All three of those intermediate definitions are superseded;
this version is the first to report the two platform-level statistics as
cleanly separate, mutually exclusive columns with the scenario-level tie
distribution reported on the side.

IMPORTANT - baseline methodology (prevalence-weighted, not uniform). Earlier
versions of this script (and the manuscript draft) enumerated every goal,
sample type, study size, and toggle combination as equally likely and called
that the "baseline." That is not a neutral choice: real usage is nowhere close
to uniform (the manuscript's own reasoning already rejected equal weighting for
the two toggles specifically, on the grounds that it would imply a 50%
CNS-focus rate; the same problem exists for goals, sample types, and study
sizes, just previously unaddressed). run_baseline_grid() below therefore
reweights all four axes by observed real-world prevalence (from the 65 scored
survey respondents - GOAL_PREV, SAMPLE_PREV, SIZE_PREV, CNS_PREV, LONG_PREV),
so the reported "baseline" answers "what does a randomly selected real user
experience," not "what happens if every theoretical combination is equally
likely." The previous uniform methodology is kept, unchanged, as
run_baseline_grid_uniform_legacy() - documented as superseded, not deleted -
so anyone auditing the old published numbers can still reproduce them exactly.
This does not touch how any individual real user's own recommendation is
computed: a real user's stated goal/sample/size already reflects their actual
situation, with no uniform-vs-weighted ambiguity. This is purely about how the
aggregate fairness simulation is summarized.

Note: CNS_PREV (7.7%) corrects an earlier ~20% estimate that mixed two
incompatible questionnaire schemas (45 pre-v2.0 respondents on separate
neuro-focus/pTau-focus toggles, 20 post-v2.0 respondents on a single merged
CNS-focus toggle); ~20% conflated the two. LONG_PREV (17.5%) remains an
imputed estimate, since the longitudinal toggle postdates this survey export.

Run:  python3 regen_fairness.py
"""
import csv, itertools, json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = json.load(open(os.path.join(HERE, "choose_engine_spec.json")))

PLATFORM_IDS = SPEC["platform_ids"]
PTM_CAPABLE = set(SPEC["ptm_capable"])
ABSOLUTE_QUANT_CAPABLE = set(SPEC["absolute_quant_capable"])
SLIDER_KEYS = list(SPEC["slider_dimensions"].keys())
DIM_OF = SPEC["slider_dimensions"]  # slider key -> scoring.json dimension id
GOALS, SAMPLES, SIZES = SPEC["goals"], SPEC["sample_types"], SPEC["study_sizes"]
GOAL_ADJ = SPEC["goal_adjustments"]
SIZE_BOOST_SCALE = SPEC["size_boost"]["SIZE_BOOST_SCALE"]
TIE_BAND = SPEC["tie_band"]
SCORES = {pid: SPEC["platforms"][pid]["scores"] for pid in PLATFORM_IDS}
WEIGHT_LEVELS = [1, 3, 5]

# Real-world prevalence, from the 65 scored survey respondents (see
# choose_engine_spec.json's prevalence_weighting block for the full rationale).
GOAL_PREV = {"discovery": 0.554, "disease_char": 0.169, "population": 0.138,
             "drug_target": 0.077, "validation": 0.062, "pharmacoproteomics": 0.0}
SAMPLE_PREV = {"plasma": 0.554, "multiple": 0.231, "serum": 0.062,
                "csf": 0.062, "tissue": 0.062, "cell_culture": 0.031}
SIZE_PREV = {"small": 0.108, "medium": 0.185, "large": 0.508, "xlarge": 0.200}
CNS_PREV, LONG_PREV = 0.077, 0.175
TOGGLE_STATE_PREV = [
    ({"cnsFocus": "no",  "longitudinal": "no"},  (1 - CNS_PREV) * (1 - LONG_PREV)),
    ({"cnsFocus": "yes", "longitudinal": "no"},  CNS_PREV * (1 - LONG_PREV)),
    ({"cnsFocus": "no",  "longitudinal": "yes"}, (1 - CNS_PREV) * LONG_PREV),
    ({"cnsFocus": "yes", "longitudinal": "yes"}, CNS_PREV * LONG_PREV),
]


def js_round(x):
    """Match JS Math.round(): round half away from zero. Python's round() uses
    round-half-to-even and will silently disagree on any value landing on .5."""
    return math.floor(x + 0.5) if x >= 0 else math.ceil(x - 0.5)


def size_boost(size):
    base = 2 if size == "xlarge" else 1 if size == "large" else 0
    return base * SIZE_BOOST_SCALE


def compute_results(goal, sample_type, size, weights, toggles):
    """weights: dict of 7 raw slider values (1-5). toggles: {absoluteQuant, ptmDetection, cnsFocus, longitudinal}.
    Returns eligible platforms (hard-filtered ones excluded), sorted by displayPct descending."""
    boost = size_boost(size)
    ga = GOAL_ADJ.get(goal, {})
    csf_sens = 4 if sample_type == "csf" else 0
    cns_sens = (8 if sample_type == "csf" else 6) if toggles["cnsFocus"] == "yes" else 0
    cns_spec = (4 if sample_type == "csf" else 2) if toggles["cnsFocus"] == "yes" else 0
    long_prec = 2 if toggles["longitudinal"] == "yes" else 0

    eff = {
        "cost": max(0, weights["cost"] + boost + ga.get("cost", 0)),
        "coverage": max(0, weights["coverage"] + ga.get("coverage", 0)),
        "precision": max(0, weights["precision"] + ga.get("precision", 0) + long_prec),
        "specificity": max(0, weights["specificity"] + ga.get("specificity", 0) + cns_spec),
        "sensitivity": max(0, weights["sensitivity"] + ga.get("sensitivity", 0) + csf_sens + cns_sens),
        "throughput": max(0, weights["throughput"] + boost + ga.get("throughput", 0)),
        "pqtl": max(0, weights["pqtl"]),
    }
    quant_w = 4 if toggles["absoluteQuant"] == "yes" else 1 if toggles["absoluteQuant"] == "nice" else 0
    # v3.0: tissue matches cell_culture/multiple at 5 (was 8 - see choose_engine_spec.json
    # sample_flexibility_weight.note_v3.0). Ranking among platforms is unchanged.
    flex_w = {"tissue": 5, "cell_culture": 5, "multiple": 5, "csf": 3}.get(sample_type, 1)
    # protein-target weight is always 0 here: not exercised by any sweep (see known_limitations)

    raw = {}
    for pid in PLATFORM_IDS:
        s = SCORES[pid]
        flex_score = s["sample_flexibility"]
        if sample_type == "tissue" and pid in ("nulisa", "nomic-omni", "seer-proteograph"):
            flex_score = 1
        elif sample_type == "tissue" and pid in ("olink-explore-ht", "illumina-protein-prep"):
            flex_score = 3
        elif sample_type == "cell_culture" and pid == "nomic-omni":
            flex_score = 4

        r = (eff["cost"] * s["cost_efficiency"] + eff["coverage"] * s["proteome_coverage"] +
             eff["precision"] * s["precision"] + eff["specificity"] * s["specificity"] +
             eff["sensitivity"] * s["sensitivity"] + eff["throughput"] * s["throughput"] +
             eff["pqtl"] * s["pqtl_accuracy"] + quant_w * s["quantification_type"] +
             flex_w * flex_score)

        # priority-miss penalty: gated on the RAW slider value (v3.0), not eff.
        # Fix D: also fires when the platform has zero published validation for
        # this sample type (flex_score == 1, e.g. Nomic/NULISA/Seer in tissue),
        # so unrelated strength elsewhere can no longer buy back a recommendation
        # for a matrix the platform has never actually been deployed on.
        miss = any(s[DIM_OF[dim]] == 1 and weights[dim] >= 5 for dim in SLIDER_KEYS)
        if miss or flex_score == 1:
            r *= 0.85
        raw[pid] = r

    total_weight = sum(eff.values()) + quant_w + flex_w
    min_raw, max_raw = total_weight * 1, total_weight * 5
    span = (max_raw - min_raw) or 1

    results = []
    for pid in PLATFORM_IDS:
        display_pct = max(0, min(100, js_round((raw[pid] - min_raw) / span * 100)))
        hf = None
        if toggles["ptmDetection"] == "systematic":
            hf = "ptm_systematic"
        elif toggles["ptmDetection"] == "incidental" and pid not in PTM_CAPABLE:
            hf = "ptm"
        elif toggles["absoluteQuant"] == "yes" and pid not in ABSOLUTE_QUANT_CAPABLE:
            hf = "absquant"
        results.append({"id": pid, "displayPct": display_pct, "hardFilter": hf})

    eligible = sorted([r for r in results if not r["hardFilter"]], key=lambda r: -r["displayPct"])
    return eligible


class Tally:
    """Accumulates the two platform-level statistics plus the scenario-level
    tie-group-size distribution. outright_win and co_recommended are disjoint
    for any given platform: a platform lands in exactly one of them per
    scenario it appears in (or neither, if hard-filtered out of that scenario).

    weight (default 1.0) lets a scenario contribute a fraction of a count
    instead of a full one - used by the prevalence-weighted baseline, where
    each scenario's contribution is its bucket's real-world prevalence divided
    by the number of weight-combinations in that bucket. n becomes a weighted
    sum rather than a literal scenario count in that case; percentages
    (count / n * 100) are unaffected either way."""
    def __init__(self):
        self.outright_win = {p: 0.0 for p in PLATFORM_IDS}
        self.co_recommended = {p: 0.0 for p in PLATFORM_IDS}
        self.tie_group_size_hist = {}
        self.n = 0.0

    def add(self, eligible, weight=1.0):
        self.n += weight
        top_pct = eligible[0]["displayPct"]
        tie_group = [x for x in eligible if top_pct - x["displayPct"] <= TIE_BAND]
        k = len(tie_group)
        self.tie_group_size_hist[k] = self.tie_group_size_hist.get(k, 0) + weight
        if k == 1:
            self.outright_win[eligible[0]["id"]] += weight
        else:
            for x in tie_group:
                self.co_recommended[x["id"]] += weight

    def no_sole_winner_pct(self):
        return (self.n - self.tie_group_size_hist.get(1, 0)) / self.n * 100


def run_baseline_grid():
    """Primary baseline: goals x sample types x study sizes x toggle states,
    each reweighted by real-world prevalence (see module docstring), x the full
    3^7 = 2,187 weight-level sweep per bucket. 6 x 6 x 4 x 4 x 2,187 =
    1,259,712 scenarios enumerated; results combined by prevalence weight, not
    raw count, so t.n is a weighted sum close to 1.0, not a literal scenario
    count."""
    t = Tally()
    n_weight_combos = len(WEIGHT_LEVELS) ** 7
    for goal in GOALS:
        for sample in SAMPLES:
            for size in SIZES:
                for toggle_extra, toggle_prev in TOGGLE_STATE_PREV:
                    toggles = {"absoluteQuant": "no", "ptmDetection": "no", **toggle_extra}
                    bucket_weight = GOAL_PREV[goal] * SAMPLE_PREV[sample] * SIZE_PREV[size] * toggle_prev
                    per_scenario_weight = bucket_weight / n_weight_combos
                    for wvals in itertools.product(WEIGHT_LEVELS, repeat=7):
                        weights = dict(zip(SLIDER_KEYS, wvals))
                        eligible = compute_results(goal, sample, size, weights, toggles)
                        if eligible:
                            t.add(eligible, weight=per_scenario_weight)
    return t


def run_baseline_grid_uniform_legacy():
    """Superseded methodology, kept for transparency/audit only - do not use
    for reporting. Treats every goal, sample type, and study size as equally
    likely (toggles fixed off), which the module docstring explains is not
    representative of real usage. 6 x 6 x 4 x 2,187 = 314,928 scenarios."""
    t = Tally()
    toggles = {"absoluteQuant": "no", "ptmDetection": "no", "cnsFocus": "no", "longitudinal": "no"}
    for goal in GOALS:
        for sample in SAMPLES:
            for size in SIZES:
                for wvals in itertools.product(WEIGHT_LEVELS, repeat=7):
                    weights = dict(zip(SLIDER_KEYS, wvals))
                    eligible = compute_results(goal, sample, size, weights, toggles)
                    if eligible:
                        t.add(eligible)
    return t


def run_secondary_check():
    """Plasma matrix, biomarker-discovery goal, large or extra-large study size:
    the most prevalent real-world user profile (see Figure 4B). 2 sizes x 3^7
    weight combinations = 4,374 scenarios, specialised toggles off. Deliberately
    NOT prevalence-weighted: this is a single fixed profile, not a population
    average, and is unaffected by the baseline reweighting above."""
    t = Tally()
    toggles = {"absoluteQuant": "no", "ptmDetection": "no", "cnsFocus": "no", "longitudinal": "no"}
    for size in ("large", "xlarge"):
        for wvals in itertools.product(WEIGHT_LEVELS, repeat=7):
            weights = dict(zip(SLIDER_KEYS, wvals))
            eligible = compute_results("discovery", "plasma", size, weights, toggles)
            if eligible:
                t.add(eligible)
    return t


GOAL_MAP = {"Population-scale": "population", "Biomarker discovery": "discovery", "Drug target ID": "drug_target",
            "Biomarker validation": "validation", "Disease characterization": "disease_char"}
SAMPLE_MAP = {"Plasma": "plasma", "Serum": "serum", "CSF": "csf", "Tissue": "tissue",
              "Cell culture": "cell_culture", "Multiple matrices": "multiple"}
SIZE_MAP = {"1,000-10,000": "large", ">10,000": "xlarge", "100-1,000": "medium", "<100": "small"}
PTM_MAP = {"no": "no", "systematic": "systematic", "incidental": "incidental", "not_selected": "no"}


def run_real_world():
    t = Tally()
    with open(os.path.join(HERE, "choose_real_world_data.csv")) as f:
        for row in csv.DictReader(f):
            weights = {k: int(row[f"w_{k}"]) for k in SLIDER_KEYS}
            toggles = {
                "absoluteQuant": row["absolute_quant"],
                "ptmDetection": PTM_MAP[row["ptm_detection"]],
                "cnsFocus": row["cns_focus"],
                "longitudinal": "no",  # not present in the public survey schema at collection time
            }
            eligible = compute_results(GOAL_MAP[row["primary_goal"]], SAMPLE_MAP[row["sample_type"]],
                                        SIZE_MAP[row["study_size"]], weights, toggles)
            if eligible:
                t.add(eligible)
    return t


def _clean_num(x):
    """Strip a redundant .0 from whole-number floats (Tally's counts are floats
    to support fractional prevalence weights, but unweighted tallies - secondary
    check, real-world, the legacy uniform baseline - are always whole numbers)."""
    return int(x) if isinstance(x, float) and x == int(x) else x


def write_platform_csv(path, t, n_display=None):
    """Sorted by co-recommended rate descending: calibrated match percentages are typically
    only a point or two apart (v2.3), so a statistically tied field is the more common
    outcome, and co-recommended rate is the metric Methods.jsx leads with for that reason.
    n_display overrides the printed n for prevalence-weighted tallies, where t.n is a
    weighted sum (~1.0), not a literal scenario count."""
    with open(path, "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["platform_id", "co_recommended_pct", "outright_win_pct", "n"])
        n_out = n_display if n_display is not None else _clean_num(t.n)
        for pid in sorted(PLATFORM_IDS, key=lambda p: -t.co_recommended[p]):
            wr.writerow([pid, round(t.co_recommended[pid] / t.n * 100, 2),
                         round(t.outright_win[pid] / t.n * 100, 2), n_out])


def write_tie_distribution_rows(dataset_name, t, n_display=None):
    rows = []
    n_out = n_display if n_display is not None else _clean_num(t.n)
    for k in sorted(t.tie_group_size_hist):
        label = "outright_win" if k == 1 else f"{k}_way_tie"
        count = t.tie_group_size_hist[k]
        rows.append([dataset_name, k, label, _clean_num(round(count, 2)), round(count / t.n * 100, 2), n_out])
    return rows


def show(title, t, n_display=None):
    n_out = n_display if n_display is not None else f"{t.n:,.0f}"
    print(f"\n=== {title} (n={n_out}) ===")
    print(f"{'Platform':28s} {'Co-recommended':>15s} {'Outright win':>13s}")
    for p in sorted(PLATFORM_IDS, key=lambda p: -t.co_recommended[p]):
        print(f"{p:28s} {t.co_recommended[p]/t.n*100:14.2f}% {t.outright_win[p]/t.n*100:12.2f}%")
    print(f"  tie-group size at the top (scenario-level, not platform-level):")
    for k in sorted(t.tie_group_size_hist):
        label = "outright win (1 platform)" if k == 1 else f"{k}-way tie"
        count = t.tie_group_size_hist[k]
        print(f"    {label:28s} {count/t.n*100:6.2f}%")


if __name__ == "__main__":
    print(f"Help Me Choose fairness reproduction (engine {SPEC['engine_version']})")

    baseline = run_baseline_grid()
    show("BASELINE (prevalence-weighted: goals, sample types, sizes, toggles)", baseline, n_display="1,259,712 scenarios, prevalence-weighted")
    write_platform_csv(os.path.join(HERE, "choose_baseline_grid_results.csv"), baseline, n_display=1259712)

    baseline_uniform = run_baseline_grid_uniform_legacy()
    show("BASELINE, UNIFORM (superseded methodology - audit/comparison only)", baseline_uniform)
    write_platform_csv(os.path.join(HERE, "choose_baseline_grid_uniform_legacy.csv"), baseline_uniform)

    secondary = run_secondary_check()
    show("SECONDARY CHECK (plasma, discovery, large/xlarge)", secondary)
    write_platform_csv(os.path.join(HERE, "choose_secondary_check_results.csv"), secondary)

    real_world = run_real_world()
    show("REAL-WORLD (anonymized survey respondents)", real_world)
    write_platform_csv(os.path.join(HERE, "choose_real_world_results.csv"), real_world)

    tie_rows = (write_tie_distribution_rows("baseline_grid", baseline, n_display=1259712) +
                write_tie_distribution_rows("baseline_grid_uniform_legacy", baseline_uniform) +
                write_tie_distribution_rows("secondary_check", secondary) +
                write_tie_distribution_rows("real_world", real_world))
    with open(os.path.join(HERE, "choose_tie_distribution.csv"), "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["dataset", "tie_group_size", "label", "count", "pct", "n"])
        wr.writerows(tie_rows)

    print("\nWrote choose_baseline_grid_results.csv, choose_baseline_grid_uniform_legacy.csv, "
          "choose_secondary_check_results.csv, choose_real_world_results.csv, and choose_tie_distribution.csv")
