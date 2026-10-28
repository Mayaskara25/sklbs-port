# Kushal Gowda — Driven by Curiosity

An orange motorsport-inspired portfolio built with semantic HTML, CSS, JavaScript, Three.js, and Vite. Project descriptions, education, and skills are based on the supplied branch’s `resume.pdf`; project result tables and test counts are omitted from the page. The original résumé remains available for download.

## Run locally

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. To build the deployable site, run `npm run build`; the output is in `dist/`.

## Explore

- Drag the hero monogram, or focus it and use the arrow keys. Press R to reset.
- Filter or search projects; press `/` to focus search.
- Open project details for implementation descriptions and repository links.
- Use Motion On/Off to pause the scene and ticker. Reduced motion is respected automatically.

## Activity calendars

GitHub (`ksu-gitreaper807`) and LeetCode (`SuedForAdultery`) heatmaps use real public activity, fetched from each service’s own endpoint. Their orange shades indicate daily activity; individual counts are available by pointer, touch, and keyboard. The timestamp shows the snapshot date. Future or unfetched dates are not rendered as zero activity. LeetCode counts submissions rather than unique solved problems.

Run `npm run refresh:activity` to update `public/activity.json`, then rebuild. A temporary source failure retains a previously fetched calendar with an explicit stale label. No credentials or third-party calendar service are required.

`scene.js` shares one WebGL renderer across seven visible scene slots. It includes extruded geometry, physically based materials, generated environment reflections, instanced waveform bars, particle connections, and a custom GLSL steam shader above a procedural dim sum steamer. Motion drives the render phase and the dish’s hover spring, using its Three.js integration. Scenes are created when visible, capped in resolution, and paused when the page is hidden. Static artwork remains when WebGL is unavailable.

## GitHub checkpoints

Run `npm run sync:github` from this workspace’s `Portfolio` directory. It maintains a separate sibling checkout named `kushal-port`, based on `Mayaskara25/sklbs-port`, and copies only the portfolio’s source and public assets. It builds before committing and pushes only to `kushal-port`, without force-pushing or changing `main`. It stops if that checkout contains user edits, the remote has diverged, or the authenticated GitHub account lacks Write access. Sites hosting identity, dependencies, and build output are excluded from the GitHub copy.

The recurring check runs every five minutes using `npm run sync:github -- --min-lines=100`. It creates a checkpoint once the combined added and removed text-line count reaches 100; smaller edits accumulate. Binary asset changes trigger a checkpoint without waiting for a text-line threshold. A manually run command without the threshold checkpoints all current changes. Pending committed changes can be pushed as soon as repository Write access is available.

The brief on semantic HTML, selectors, the box model, Flexbox, and responsive behavior is in [TECHNIQUES.md](TECHNIQUES.md).
