# AIFAC — Launch Showreel (15s)

**Master:** [`public/aifac-launch-showreel-15s.mp4`](public/aifac-launch-showreel-15s.mp4)<br>
**Format:** 1920 × 1080 · 30 fps · H.264 High / AAC · 15 seconds · stereo original score

A fast editorial launch film for AIFAC. It uses the existing brand’s paper / ink / orange foundation, then turns it into a high-energy motion system: kinetic type, grid transitions, a visual agent pipeline, a procedural 3D skill object, proof-of-delivery UI, and a CTA lockup.

## On-screen story

| Time | Chapter | Message |
| --- | --- | --- |
| 00:00–00:01.75 | Manifesto | **FAIS CE QUI LIVRE.** |
| 00:01.75–00:03.40 | Reframe | Pas un cours. Un système de livraison. |
| 00:03.40–00:06.15 | Workflow | Brief → Agent → Done. |
| 00:06.15–00:08.92 | Registry | 212 skills curés + 45 effets 3D. |
| 00:08.92–00:11.40 | Method | Plan → Build → Review → QA → Deliver. |
| 00:11.40–00:13.28 | Proof | Livraison validée, relue sous 48 h. |
| 00:13.28–00:15.00 | Launch CTA | Construis ce qui compte · Rejoindre : 4 000 F. |

## Audio direction

No licensed stock music is used. The film contains an original procedural electro score: a 120 BPM kick / bass foundation, syncopated ticks, transition whooshes, and a final success chime. This means the exported video is immediately safe to use as a launch cut without sourcing a separate music bed.

## Regenerating the master

The source is deliberately procedural so messaging, price, palette, or timings can be iterated without After Effects:

```bash
python3 -m venv .video-venv
.video-venv/bin/pip install Pillow
npm install --no-save --no-package-lock --legacy-peer-deps @ffmpeg-installer/linux-x64@4.1.0
.video-venv/bin/python scripts/render_launch_showreel.py
```

The renderer writes the final MP4 to `public/aifac-launch-showreel-15s.mp4`. It creates temporary audio in `.tmp-launch-showreel/`, which can be removed after the export.
