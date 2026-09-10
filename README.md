# Atlas of Proteomic Technologies (APT)

An interactive reference and decision-support tool for selecting and combining commercial high-plex proteomics platforms. APT scores the platforms most established in the peer-reviewed literature across ten analytical dimensions, catalogues the broader landscape of protein-measurement technologies, and provides two transparent recommendation engines: **Help Me Choose** (single-platform selection) and **Help Me Combine** (two-platform pairing).

Live application: https://aptatlas.org

This repository accompanies the APT manuscript (Whelan and Smith-Byrne) and contains the application source, the scoring and catalogue data, and the reproducibility bundles for both engines' fairness analyses.

## What is here

- `src/`: the React application, including the ten-axis scoring model, both recommendation engines, the platform catalogue, and the Methods documentation shown in-app.
- `src/data/scoring.json`: the ten-axis platform scores.
- `src/data/all_platforms.json`: the 46-platform catalogue and integration-readiness data.
- `public/proteins.json`: per-protein cross-platform coverage.
- `public/choose/`: Help Me Choose reproducibility bundle. Engine specification, the anonymised real-world respondent set, the fairness script, and its output CSVs.
- `public/combine/`: Help Me Combine reproducibility bundle. Engine specification, the priority-sweep script, and its outputs.
- `figures/`: the platform radar figure and its generator.

The live data-collection backend (per-visit logging, submission handling, and the admin dashboard) is intentionally omitted from this archive.

## Reproducing the fairness analyses

Both engines' fairness results regenerate from the committed specifications. The only requirement is Python 3, plus NumPy for the Combine sweep.

```bash
# Help Me Choose: prevalence-weighted baseline, secondary check, real-world slice, tie distribution
cd public/choose && python3 regen_fairness.py

# Help Me Combine: priority sweep and coverage bootstrap confidence intervals
cd public/combine && python3 regen_fairness.py
```

Each script reads its `*_engine_spec.json`, which embeds the platform scores (byte-verified against `src/data/scoring.json`), and rewrites the result CSVs in place. Every script documents its full methodology in a header comment.

## Running the application

```bash
npm install
npm run dev      # local development server
npm run build    # production build
```

## Citation

If you use APT, please cite the manuscript (Whelan and Smith-Byrne) and this software. Machine-readable metadata is in `CITATION.cff`.

## License

Released under the MIT License (see `LICENSE`).

An independent resource, provided free of charge; not sponsored by, affiliated with, or endorsed by any platform or vendor named. Scores and recommendations reflect the authors' assessment of published literature, offered as opinion to guide study-design decisions, not definitive or commercial rankings. For research use only; not for clinical decision making.
