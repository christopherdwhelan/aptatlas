#!/usr/bin/env python3
"""
Standalone publication figure: six-platform radar / spider small multiples for the
Atlas of Proteomic Technologies (APT) Cell Genomics manuscript.

Reuses the app's radar logic (axis order, fixed 0-5 scale, top-start clockwise
orientation from PlatformRadar.jsx) but renders static vector output instead of the
interactive Recharts widget.

Scores are read from the Help Me Choose config (src/data/scoring.json), the
version-controlled source of truth. They are NOT hardcoded, and are NOT the Help Me
Combine engine's app_scores (which differ for some platforms). Platform colours are
the app palette from src/data/platforms.json.

Outputs (in this figures/ directory):
  platform_radars.pdf         vector
  platform_radars_600dpi.png  600 dpi raster

Run:  python3 figures/make_platform_radars.py
"""
import os, json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, 'src', 'data')

# ---- Fonts: Arial / Helvetica for Cell Press ----
for p in ['/System/Library/Fonts/Supplemental/Arial.ttf',
          '/Library/Fonts/Arial.ttf',
          '/System/Library/Fonts/Supplemental/Helvetica.ttc',
          '/System/Library/Fonts/Helvetica.ttc']:
    if os.path.exists(p):
        try: fm.fontManager.addfont(p)
        except Exception: pass
plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Arial', 'Helvetica', 'Helvetica Neue', 'DejaVu Sans'],
    'pdf.fonttype': 42, 'ps.fonttype': 42, 'svg.fonttype': 'none',
    'axes.linewidth': 0.5,
})

# ---- Load config (source of truth) ----
scoring = json.load(open(os.path.join(DATA, 'scoring.json')))
pcfg = json.load(open(os.path.join(DATA, 'platforms.json')))
plist = pcfg if isinstance(pcfg, list) else pcfg.get('platforms', pcfg)
COLOR = {p['id']: p.get('color') for p in plist}

dim_ids = [d['id'] for d in scoring['dimensions']]
EXPECTED = ['proteome_coverage', 'precision', 'specificity', 'sensitivity', 'cost_efficiency',
            'throughput', 'quantification_type', 'sample_flexibility', 'evidence_depth', 'pqtl_accuracy']
assert dim_ids == EXPECTED, f'Dimension order in config != expected:\n{dim_ids}'

# Display labels (as specified for the figure); keyed to config ids, wrapped for fit.
AXIS_LABELS = {
    'proteome_coverage': 'Proteome\ncoverage',
    'precision': 'Precision',
    'specificity': 'Specificity',
    'sensitivity': 'Sensitivity',
    'cost_efficiency': 'Cost\nefficiency',
    'throughput': 'Throughput',
    'quantification_type': 'Quantification\ntype',
    'sample_flexibility': 'Multi-Matrix\nValidation',
    'evidence_depth': 'Evidence\ndepth',
    'pqtl_accuracy': 'pQTL\naccuracy',
}
labels = [AXIS_LABELS[i] for i in dim_ids]

# Panel titles (as specified) -> config id, in the required order
PLATFORMS = [
    ('Olink Explore HT', 'olink-explore-ht'),
    ('Illumina SomaSeq / SomaScan', 'illumina-protein-prep'),
    ('Alamar NULISA', 'nulisa'),
    ('Nomic nELISA / Omni 1000', 'nomic-omni'),
    ('Seer Proteograph XT', 'seer-proteograph'),
    ('Biognosys TrueDiscovery', 'biognosys-truediscovery'),
]

# ---- Verify against config, then print the matrix actually used ----
print('Scores read from src/data/scoring.json (Help Me Choose config), NOT combine app_scores.')
print('dimension order:', dim_ids)
matrix = {}
for title, pid in PLATFORMS:
    assert pid in scoring['scores'], f'{pid} missing from scoring.scores'
    row = [scoring['scores'][pid][i] for i in dim_ids]
    assert all(isinstance(v, int) and 1 <= v <= 5 for v in row), f'{pid}: non-integer or out-of-range score'
    assert COLOR.get(pid), f'{pid}: no colour in platforms.json'
    matrix[(title, pid)] = row
    print(f'  {title:26s} {row}  colour={COLOR[pid]}')

# ---- Geometry (match app: axis 0 at top, clockwise, radial 0-5) ----
N = len(dim_ids)
angles = np.linspace(0, 2 * np.pi, N, endpoint=False)
ang_c = np.concatenate([angles, angles[:1]])

fig, axgrid = plt.subplots(2, 3, subplot_kw=dict(polar=True), figsize=(6.85, 5.4))
fig.patch.set_facecolor('white')

for ax, (title, pid) in zip(axgrid.flat, PLATFORMS):
    color = COLOR[pid]
    row = matrix[(title, pid)]
    vals = row + row[:1]
    ax.set_facecolor('white')
    ax.set_theta_offset(np.pi / 2)
    ax.set_theta_direction(-1)
    ax.set_ylim(0, 5)
    ax.set_yticks([1, 2, 3, 4, 5])
    ax.set_yticklabels(['1', '2', '3', '4', '5'], fontsize=4.0, color='#b0b4bc')
    ax.set_rlabel_position(18)
    ax.set_xticks(angles)
    ax.set_xticklabels(labels, fontsize=5.1, color='#2b2b2b')
    ax.tick_params(axis='x', pad=5)
    ax.grid(color='#d5d8e0', linewidth=0.4)
    ax.spines['polar'].set_color('#c3c7cf')
    ax.spines['polar'].set_linewidth(0.5)
    ax.fill(ang_c, vals, color=color, alpha=0.15, zorder=3)
    ax.plot(ang_c, vals, color=color, linewidth=1.3, zorder=4)
    ax.scatter(angles, row, s=5, color=color, zorder=5, edgecolors='none')
    ax.set_title(title, fontsize=7.6, fontweight='bold', color=color, pad=13)

plt.subplots_adjust(left=0.055, right=0.945, top=0.92, bottom=0.055, wspace=0.68, hspace=0.58)

pdf = os.path.join(HERE, 'platform_radars.pdf')
png = os.path.join(HERE, 'platform_radars_600dpi.png')
fig.savefig(pdf, facecolor='white')
fig.savefig(png, dpi=600, facecolor='white')
fig.savefig('/private/tmp/claude-501/-Users-chrisdwhelan-Documents-Synoptic-Code/9819e518-87dd-444e-ac4d-f77a594a7a8b/scratchpad/radar_preview.png', dpi=150, facecolor='white')

wpx = fig.get_size_inches()[0] * 25.4
print(f'\nFigure width: {fig.get_size_inches()[0]:.3f} in = {wpx:.1f} mm')
print('Wrote:', pdf)
print('Wrote:', png)
resolved = fm.findfont(fm.FontProperties(family=plt.rcParams['font.sans-serif']))
print('Font resolved to:', os.path.basename(resolved))
