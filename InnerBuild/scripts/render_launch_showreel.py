#!/usr/bin/env python3
"""Render the 15-second AIFAC launch showreel.

The film is intentionally built from procedural geometry rather than stock footage:
kinetic type, editorial UI, a 3D-ish skill orb, and a custom electronic score.

Requirements (local rendering only):
  - Pillow (installed in .video-venv during production)
  - node_modules/@ffmpeg-installer/linux-x64/ffmpeg

Usage:
  .video-venv/bin/python scripts/render_launch_showreel.py
"""

from __future__ import annotations

import math
import random
import subprocess
import sys
import wave
from array import array
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "aifac-launch-showreel-15s.mp4"
WORK = ROOT / ".tmp-launch-showreel"
AUDIO = WORK / "aifac-launch-score.wav"
FFMPEG = ROOT / "node_modules" / "@ffmpeg-installer" / "linux-x64" / "ffmpeg"

W, H, FPS, DURATION = 1920, 1080, 30, 15
FRAMES = FPS * DURATION

# AIFAC's existing paper / ink DNA, pushed into a bolder motion palette.
INK = (10, 15, 32)
INK_2 = (19, 28, 51)
PAPER = (246, 243, 236)
WHITE = (255, 253, 249)
ORANGE = (255, 91, 31)
ORANGE_2 = (255, 143, 48)
LIME = (205, 250, 80)
CYAN = (85, 222, 255)
VIOLET = (133, 96, 255)
MINT = (72, 239, 166)
RED = (255, 90, 95)
MUTED = (146, 154, 174)

FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

FONT_CACHE: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def font(size: int, face: str = "bold") -> ImageFont.FreeTypeFont:
    path = {"reg": FONT_REG, "bold": FONT_BOLD, "mono": FONT_MONO, "mono-bold": FONT_MONO_BOLD}[face]
    key = (path, int(size))
    if key not in FONT_CACHE:
        FONT_CACHE[key] = ImageFont.truetype(path, int(size))
    return FONT_CACHE[key]


def clamp(v: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, v))


def ease_out(v: float) -> float:
    v = clamp(v)
    return 1 - (1 - v) ** 4


def ease_in_out(v: float) -> float:
    v = clamp(v)
    return 4 * v * v * v if v < 0.5 else 1 - (-2 * v + 2) ** 3 / 2


def spring(v: float) -> float:
    v = clamp(v)
    return 1 - math.exp(-7.5 * v) * math.cos(10.5 * v)


def seg(t: float, start: float, end: float) -> float:
    return clamp((t - start) / (end - start))


def lerp(a: float, b: float, v: float) -> float:
    return a + (b - a) * v


def mix(a: tuple[int, int, int], b: tuple[int, int, int], v: float) -> tuple[int, int, int]:
    return tuple(round(lerp(x, y, v)) for x, y in zip(a, b))  # type: ignore[return-value]


def rgba(color: tuple[int, int, int], alpha: float) -> tuple[int, int, int, int]:
    return (color[0], color[1], color[2], int(clamp(alpha) * 255))


def centered_bbox(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    bb = draw.textbbox((0, 0), text, font=fnt, stroke_width=0)
    return bb[2] - bb[0], bb[3] - bb[1]


def text(
    image: Image.Image,
    xy: tuple[float, float],
    content: str,
    size: int,
    color: tuple[int, int, int] = WHITE,
    face: str = "bold",
    anchor: str = "la",
    alpha: float = 1.0,
    stroke: int = 0,
    stroke_fill: tuple[int, int, int] | None = None,
) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.text(
        (int(xy[0]), int(xy[1])),
        content,
        font=font(size, face),
        fill=rgba(color, alpha),
        anchor=anchor,
        stroke_width=stroke,
        stroke_fill=rgba(stroke_fill or color, alpha),
    )
    image.alpha_composite(layer)


def fit_text(content: str, max_width: int, start: int, face: str = "bold") -> int:
    fsize = start
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    while fsize > 16 and centered_bbox(probe, content, font(fsize, face))[0] > max_width:
        fsize -= 2
    return fsize


def rounded(
    image: Image.Image,
    box: tuple[float, float, float, float],
    radius: float,
    fill: tuple[int, int, int] | tuple[int, int, int, int],
    outline: tuple[int, int, int] | tuple[int, int, int, int] | None = None,
    width: int = 1,
) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle(tuple(map(int, box)), radius=int(radius), fill=fill, outline=outline, width=width)
    image.alpha_composite(layer)


def line(
    image: Image.Image,
    points: Iterable[tuple[float, float]],
    fill: tuple[int, int, int] | tuple[int, int, int, int],
    width: int = 1,
) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).line([(int(x), int(y)) for x, y in points], fill=fill, width=width, joint="curve")
    image.alpha_composite(layer)


def dot(image: Image.Image, x: float, y: float, r: float, color: tuple[int, int, int], alpha: float = 1.0) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse((int(x-r), int(y-r), int(x+r), int(y+r)), fill=rgba(color, alpha))
    image.alpha_composite(layer)


def glow(image: Image.Image, x: float, y: float, r: float, color: tuple[int, int, int], alpha: float = 0.7) -> None:
    # A compact soft bloom, useful for the object and CTA without stock assets.
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(18, 0, -1):
        rr = r * (i / 18)
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=rgba(color, alpha * 0.009 * (19 - i)))
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius=max(2, r / 8))))


def grid(image: Image.Image, t: float, color: tuple[int, int, int], alpha: float, step: int = 82, offset: float = 0) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    move = (t * 56 + offset) % step
    for x in range(-step, W + step, step):
        d.line((x + move, 0, x + move, H), fill=rgba(color, alpha), width=1)
    for y in range(-step, H + step, step):
        d.line((0, y + move * 0.36, W, y + move * 0.36), fill=rgba(color, alpha), width=1)
    image.alpha_composite(layer)


def grain(image: Image.Image, frame: int, dark: bool = False) -> None:
    # Sparse grain reads as film texture once compressed; avoids heavy per-pixel noise.
    rng = random.Random(8000 + frame)
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = (255, 255, 255) if dark else (10, 15, 32)
    for _ in range(220):
        x, y = rng.randrange(W), rng.randrange(H)
        d.point((x, y), fill=rgba(c, rng.randrange(5, 17) / 255))
    image.alpha_composite(layer)


def corner_meta(image: Image.Image, left: str, right: str, color: tuple[int, int, int], alpha: float = 1.0) -> None:
    text(image, (82, 65), left, 20, color, "mono-bold", alpha=alpha)
    text(image, (W - 82, 65), right, 20, color, "mono-bold", anchor="ra", alpha=alpha)
    line(image, [(82, 98), (W - 82, 98)], rgba(color, 0.18 * alpha), 2)


def cube(image: Image.Image, cx: float, cy: float, size: float, angle: float, alpha: float = 1.0) -> None:
    """A simple projected rotating cube with three material faces."""
    def p(x: float, y: float, z: float) -> tuple[float, float]:
        # Rotate on two axes, project from a near camera.
        ca, sa = math.cos(angle), math.sin(angle)
        cb, sb = math.cos(angle * 0.58 + 0.6), math.sin(angle * 0.58 + 0.6)
        xx, zz = x * ca - z * sa, x * sa + z * ca
        yy, zz = y * cb - zz * sb, y * sb + zz * cb
        scale = 1.34 / (2.5 - zz)
        return cx + xx * size * scale, cy + yy * size * scale

    pts = {key: p(*coord) for key, coord in {
        "a": (-1, -1, -1), "b": (1, -1, -1), "c": (1, 1, -1), "d": (-1, 1, -1),
        "e": (-1, -1, 1), "f": (1, -1, 1), "g": (1, 1, 1), "h": (-1, 1, 1),
    }.items()}
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    faces = [
        ([pts[k] for k in ("a", "b", "c", "d")], rgba(VIOLET, 0.84 * alpha)),
        ([pts[k] for k in ("b", "f", "g", "c")], rgba(ORANGE, 0.96 * alpha)),
        ([pts[k] for k in ("d", "c", "g", "h")], rgba(LIME, 0.92 * alpha)),
    ]
    for face, fill in faces:
        d.polygon(face, fill=fill)
        d.line(face + [face[0]], fill=rgba(WHITE, 0.65 * alpha), width=3)
    image.alpha_composite(layer)


def orb(image: Image.Image, cx: float, cy: float, r: float, t: float, alpha: float = 1.0) -> None:
    # Layered fake-3D orb, plus orbiting nodes, rendered entirely in Pillow.
    glow(image, cx, cy, r * 1.28, VIOLET, 0.7 * alpha)
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(int(r), 2, -3):
        v = i / r
        shade = mix(VIOLET, (30, 18, 88), v)
        d.ellipse((cx-i, cy-i, cx+i, cy+i), fill=rgba(shade, alpha))
    d.ellipse((cx-r*0.34, cy-r*0.46, cx+r*0.15, cy-r*0.02), fill=rgba(WHITE, 0.55 * alpha))
    d.ellipse((cx-r*0.76, cy-r*0.26, cx-r*0.2, cy+r*0.35), fill=rgba(CYAN, 0.34 * alpha))
    image.alpha_composite(layer)
    for idx, c in enumerate((ORANGE, LIME, CYAN)):
        a = t * (1.6 + idx * 0.12) + idx * 2.1
        x = cx + math.cos(a) * r * (1.14 + idx * .04)
        y = cy + math.sin(a) * r * (0.56 + idx * .05)
        dot(image, x, y, 11 + idx * 2, c, alpha)


def card_shadow(image: Image.Image, box: tuple[float, float, float, float], radius: float = 28, alpha: float = 0.26) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    expanded = (box[0] + 10, box[1] + 20, box[2] + 10, box[3] + 25)
    d.rounded_rectangle(expanded, radius=radius, fill=rgba(INK, alpha))
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(18)))


def intro(image: Image.Image, t: float) -> None:
    p = seg(t, 0, 1.75)
    image.paste(DARK_BG)
    grid(image, t, WHITE, 0.045, 96)
    grain(image, int(t * FPS), True)
    # Hot orange horizon, first seen as a small point then becoming an editorial field.
    pulse = 1 + 0.12 * math.sin(t * 10)
    glow(image, W * 0.78, H * 0.54, 420 * pulse, ORANGE, 0.95)
    for i in range(4):
        rr = 88 + i * 54 + 14 * math.sin(t * 5 + i)
        line(image, [(W*.78-rr, H*.54), (W*.78+rr, H*.54)], rgba(ORANGE_2, 0.18 - i*0.028), 2)
    corner_meta(image, "AIFAC // LAUNCH_01", "00:15", WHITE, ease_out(seg(t, 0.05, 0.3)))

    a = spring(seg(t, 0.14, 0.65))
    b = spring(seg(t, 0.35, 0.92))
    c = spring(seg(t, 0.56, 1.18))
    exit_p = ease_in_out(seg(t, 1.4, 1.75))
    shift = -160 * exit_p
    text(image, (94 + shift, 312 - 55 * (1-a)), "FAIS", 174, WHITE, "bold", alpha=a)
    text(image, (92 + shift, 492 - 55 * (1-b)), "CE QUI", 174, WHITE, "bold", alpha=b)
    text(image, (87 + shift, 672 - 55 * (1-c)), "LIVRE.", 194, ORANGE_2, "bold", alpha=c)
    text(image, (101 + shift, 765), "pas juste ce qui paraît bien.", 27, MUTED, "mono", alpha=ease_out(seg(t, 0.86, 1.25)) * (1-exit_p))

    # Bold editorial rule / live status.
    x = 1120 + 180 * (1-a)
    rounded(image, (x, 774, 1660, 836), 31, rgba(WHITE, 0.08 * a), rgba(WHITE, 0.25*a), 2)
    dot(image, x+31, 805, 8, LIME, a)
    text(image, (x+55, 806), "MODE: SHIP", 20, WHITE, "mono-bold", alpha=a, anchor="lm")


def course_to_system(image: Image.Image, t: float) -> None:
    p = seg(t, 1.6, 3.4)
    image.paste(PAPER_BG)
    grid(image, t, INK, 0.07, 86, 17)
    grain(image, int(t * FPS), False)
    exit_p = ease_in_out(seg(t, 3.1, 3.4))
    corner_meta(image, "AIFAC // METHOD_02", "FORMATION + ACCOMPAGNEMENT", INK, 1-exit_p)
    in_p = ease_out(seg(t, 1.72, 2.15))
    text(image, (94 - 60*(1-in_p) - 160*exit_p, 350), "PAS UN", 160, INK, "bold", alpha=in_p)
    text(image, (94 - 60*(1-in_p) - 160*exit_p, 522), "COURS.", 160, INK, "bold", alpha=in_p)
    # Orange strike makes the semantic switch unmistakable.
    strike = ease_out(seg(t, 2.12, 2.45))
    line(image, [(87, 514), (770 * strike, 434)], rgba(ORANGE, strike), 22)
    line(image, [(96, 521), (775 * strike, 441)], rgba(WHITE, strike), 5)

    q = spring(seg(t, 2.22, 2.78))
    card_shadow(image, (854, 258, 1788, 794), alpha=0.16 * q)
    rounded(image, (854 + 100*(1-q) + 140*exit_p, 258, 1788 + 100*(1-q)+140*exit_p, 794), 38, rgba(INK, q), rgba(INK, q), 1)
    bx = 854 + 100*(1-q) + 140*exit_p
    text(image, (bx + 62, 339), "UN SYSTÈME DE", 62, WHITE, "bold", alpha=q)
    text(image, (bx + 62, 422), "LIVRAISON.", 83, LIME, "bold", alpha=q)
    for i, label in enumerate(("BRIEF", "BUILD", "PROOF")):
        x = bx + 64 + i*247
        rounded(image, (x, 572, x+203, 650), 19, rgba(WHITE, 0.09*q), rgba(WHITE, .17*q), 1)
        text(image, (x+24, 611), f"0{i+1}", 18, ORANGE_2, "mono-bold", alpha=q, anchor="lm")
        text(image, (x+69, 611), label, 19, WHITE, "mono-bold", alpha=q, anchor="lm")
    text(image, (bx+62, 725), "Chaque skill devient une preuve.", 24, (193,200,214), "reg", alpha=q)


def agent_flow(image: Image.Image, t: float) -> None:
    image.paste(DARK_BG)
    grid(image, t, WHITE, 0.045, 96, 20)
    grain(image, int(t * FPS), True)
    p = seg(t, 3.2, 6.15)
    exit_p = ease_in_out(seg(t, 5.84, 6.15))
    corner_meta(image, "AIFAC // AGENT FLOW_03", "SPEC → DONE", WHITE, 1-exit_p)
    title_a = ease_out(seg(t, 3.3, 3.66))
    text(image, (96 - 100*(1-title_a)-150*exit_p, 216), "L’IDÉE DEVIENT", 61, WHITE, "bold", alpha=title_a)
    text(image, (96 - 100*(1-title_a)-150*exit_p, 291), "UN SYSTÈME.", 72, LIME, "bold", alpha=title_a)

    # Flow rail — its travelling pulse connects the three tangible steps.
    rail_y = 784
    line(image, [(197, rail_y), (1714, rail_y)], rgba(WHITE, 0.14*(1-exit_p)), 5)
    u = (seg(t, 3.56, 5.68) * 1.22) % 1
    x = 197 + 1517*u
    glow(image, x, rail_y, 36, ORANGE, 0.72*(1-exit_p))
    line(image, [(max(197, x-150), rail_y), (min(1714, x+150), rail_y)], rgba(ORANGE, .95*(1-exit_p)), 8)

    cards = [
        (154, 402, 590, 723, "01", "BRIEF", "clair. mesurable. exécutable.", ORANGE),
        (742, 402, 1178, 723, "02", "AGENT", "construit. teste. itère.", VIOLET),
        (1330, 402, 1766, 723, "03", "DONE", "preuve jointe. validée.", LIME),
    ]
    for idx, (x1,y1,x2,y2,num,label,sub,accent) in enumerate(cards):
        cp = spring(seg(t, 3.52+idx*.24, 4.02+idx*.24))
        cx = x1 + (1-cp)*110 + exit_p*160
        card_shadow(image, (cx,y1,cx+(x2-x1),y2), alpha=.2*cp)
        rounded(image, (cx,y1,cx+(x2-x1),y2), 30, rgba(WHITE, .96*cp), rgba(WHITE, .11*cp), 1)
        rounded(image, (cx+30,y1+30,cx+94,y1+91), 18, rgba(accent, cp))
        text(image, (cx+62,y1+61), num, 21, INK, "mono-bold", alpha=cp, anchor="mm")
        text(image, (cx+31,y1+148), label, 43, INK, "bold", alpha=cp)
        text(image, (cx+31,y1+211), sub, 17, (73,82,103), "mono", alpha=cp)
        # mini visual systems inside each card
        if idx == 0:
            for j, s in enumerate((.78,.56,.89,.42)):
                rounded(image, (cx+31, y1+258+j*14, cx+31+260*s, y1+266+j*14), 4, rgba(INK, .16*cp))
        elif idx == 1:
            for j in range(4):
                xx = cx+31+j*65
                rounded(image, (xx, y1+261, xx+49, y1+285), 7, rgba(VIOLET, (.35+.12*j)*cp))
        else:
            dot(image, cx+55, y1+276, 17, MINT, cp)
            # check mark
            line(image, [(cx+47,y1+277),(cx+54,y1+284),(cx+67,y1+267)], rgba(INK,cp), 4)
            text(image, (cx+87,y1+277), "VALIDÉ", 17, INK, "mono-bold", alpha=cp, anchor="lm")
        dot(image, cx+(x2-x1)/2, rail_y, 11, accent, cp)


def skills_scene(image: Image.Image, t: float) -> None:
    image.paste(PAPER_BG)
    grid(image, t, INK, 0.055, 90)
    grain(image, int(t * FPS), False)
    exit_p = ease_in_out(seg(t, 8.62, 8.92))
    corner_meta(image, "AIFAC // REGISTRY_04", "212 SKILLS CURÉS", INK, 1-exit_p)
    p = spring(seg(t, 6.08, 6.68))
    text(image, (94 - 90*(1-p)-150*exit_p, 253), "212", 256, INK, "bold", alpha=p)
    text(image, (107 - 90*(1-p)-150*exit_p, 478), "SKILLS CURÉS", 65, INK, "bold", alpha=p)
    text(image, (109 - 90*(1-p)-150*exit_p, 565), "dans un registre prêt à livrer.", 28, (72, 80, 100), "reg", alpha=p)

    q = ease_out(seg(t, 6.3, 7.1)) * (1-exit_p)
    # Skill chips stack under the statistic and reveal a very tangible library.
    chips = [("SPEC", ORANGE), ("FRONTEND", VIOLET), ("AGENTS", CYAN), ("QA", MINT)]
    for i, (label, c) in enumerate(chips):
        yy = 655 + i*64
        rounded(image, (108, yy, 393, yy+45), 20, rgba(c, .94*q))
        text(image, (130, yy+23), f"0{i+1}", 14, INK, "mono-bold", alpha=q, anchor="lm")
        text(image, (181, yy+23), label, 16, INK, "mono-bold", alpha=q, anchor="lm")

    cx, cy = 1352 + exit_p*210, 536
    orb(image, cx, cy, 203 * q, t, q)
    cube(image, cx+4, cy+1, 118*q, -t*1.25+0.4, q)
    for i, label in enumerate(("45 EFFETS 3D", "SPECS & PLANS", "TESTS + REVIEW")):
        a = t*0.78 + i*2.1
        xx = cx + math.cos(a) * (306 + i*18)
        yy = cy + math.sin(a) * (194 + i*9)
        rounded(image, (xx-88, yy-23, xx+88, yy+23), 15, rgba(INK, .9*q), rgba(WHITE,.22*q), 1)
        text(image, (xx,yy), label, 13, WHITE, "mono-bold", alpha=q, anchor="mm")


def method_scene(image: Image.Image, t: float) -> None:
    image.paste(DARK_BG)
    grid(image, t, WHITE, 0.035, 92)
    grain(image, int(t * FPS), True)
    exit_p = ease_in_out(seg(t, 11.11, 11.4))
    corner_meta(image, "AIFAC // EXECUTION_05", "LOOP UNTIL DONE", WHITE, 1-exit_p)
    p = ease_out(seg(t, 8.88, 9.34))
    text(image, (96-160*(1-p)-150*exit_p, 232), "UNE BOUCLE", 94, WHITE, "bold", alpha=p)
    text(image, (96-160*(1-p)-150*exit_p, 342), "JUSQU’À DONE.", 94, ORANGE_2, "bold", alpha=p)

    steps = [("PLAN", ORANGE), ("BUILD", VIOLET), ("REVIEW", CYAN), ("QA", MINT), ("DELIVER", LIME)]
    x0, y, gap = 108, 704, 351
    line(image, [(x0+56, y+44), (x0+gap*4+56, y+44)], rgba(WHITE,.16*(1-exit_p)), 4)
    phase = seg(t, 9.22, 10.96)
    for i, (label, c) in enumerate(steps):
        pp = spring(seg(phase, i*.145, i*.145+.24)) * (1-exit_p)
        x = x0+i*gap
        # an actively moving orange pulse gives the loop a sense of progression.
        rounded(image, (x, y, x+260, y+87), 43, rgba(WHITE,.075*pp), rgba(WHITE,.16*pp), 2)
        dot(image, x+44, y+44, 15, c, pp)
        text(image, (x+76,y+44), label, 25, WHITE, "mono-bold", alpha=pp, anchor="lm")
        text(image, (x+8,y+131), f"0{i+1}", 15, MUTED, "mono-bold", alpha=pp)
    active_x = x0+56+gap*4*clamp(phase)
    glow(image, active_x, y+44, 39, ORANGE, .88*(1-exit_p))
    dot(image, active_x, y+44, 13, ORANGE, 1-exit_p)
    text(image, (109, 552), "PLAN → BUILD → REVIEW → QA → DELIVER", 27, (189,197,215), "mono", alpha=ease_out(seg(t,9.65,10.06))*(1-exit_p))


def proof_scene(image: Image.Image, t: float) -> None:
    image.paste(PAPER_BG)
    grid(image, t, INK, .055, 94)
    grain(image, int(t * FPS), False)
    exit_p = ease_in_out(seg(t, 12.98, 13.28))
    corner_meta(image, "AIFAC // PROOF_06", "RELUE SOUS 48H", INK, 1-exit_p)
    p = spring(seg(t, 11.34, 11.88))
    text(image, (96-130*(1-p)-150*exit_p, 260), "LA PREUVE,", 78, INK, "bold", alpha=p)
    text(image, (96-130*(1-p)-150*exit_p, 352), "PAS LA PROMESSE.", 78, ORANGE, "bold", alpha=p)
    text(image, (100-130*(1-p)-150*exit_p, 482), "Ta livraison est relue, testée, validée.", 25, (74,81,100), "reg", alpha=p)

    q = spring(seg(t, 11.64, 12.2))*(1-exit_p)
    # Device / live deliverable frame.
    bx, by = 1008+130*(1-q)+130*exit_p, 223
    card_shadow(image, (bx,by,bx+650,by+620), 40, .17*q)
    rounded(image, (bx,by,bx+650,by+620), 39, rgba(INK,q), rgba(INK,q), 1)
    rounded(image, (bx+30,by+30,bx+620,by+106), 20, rgba(WHITE,.07*q))
    dot(image,bx+68,by+68,8, ORANGE,q); dot(image,bx+94,by+68,8,VIOLET,q); dot(image,bx+120,by+68,8,LIME,q)
    text(image,(bx+165,by+68),"aifac / delivery-status",16,WHITE,"mono",alpha=q,anchor="lm")
    rounded(image,(bx+52,by+142,bx+598,by+503),28,rgba(WHITE,.96*q))
    text(image,(bx+88,by+208),"LIVRAISON",28,INK,"mono-bold",alpha=q)
    text(image,(bx+88,by+255),"VALIDÉE",66,INK,"bold",alpha=q)
    # check seal
    dot(image,bx+508,by+248,45,MINT,q)
    line(image,[(bx+485,by+248),(bx+503,by+266),(bx+536,by+226)],rgba(INK,q),9)
    for i, (label,c) in enumerate((("TESTS",MINT),("REVIEW",CYAN),("CERTIF",ORANGE))):
        xx = bx+87+i*151
        rounded(image,(xx,by+342,xx+128,by+389),15,rgba(c,.25*q))
        text(image,(xx+64,by+366),label,14,INK,"mono-bold",alpha=q,anchor="mm")
    rounded(image,(bx+52,by+536,bx+598,by+571),15,rgba(LIME,.88*q))
    text(image,(bx+325,by+553),"DONE / PROOF ATTACHED",15,INK,"mono-bold",alpha=q,anchor="mm")


def final_scene(image: Image.Image, t: float) -> None:
    image.paste(DARK_BG)
    grid(image, t, WHITE, .04, 88)
    grain(image, int(t * FPS), True)
    p = spring(seg(t, 13.16, 13.78))
    glow(image, W*.51, H*.49, 540*(.85+.1*math.sin(t*6)), ORANGE, .9*p)
    # animated concentric rings make the end frame feel engineered, not static.
    for i in range(6):
        rr = 92+i*83 + 18*math.sin(t*2.3+i)
        layer = Image.new("RGBA", image.size, (0,0,0,0))
        d = ImageDraw.Draw(layer)
        d.ellipse((W*.51-rr,H*.49-rr*.55,W*.51+rr,H*.49+rr*.55), outline=rgba(ORANGE_2,.18*p), width=3)
        image.alpha_composite(layer)
    corner_meta(image, "AIFAC // NOW OPEN", "00:00", WHITE, p)
    text(image, (W*.5, 293-65*(1-p)), "CONSTRUIS", 122, WHITE, "bold", anchor="ma", alpha=p)
    text(image, (W*.5, 435-65*(1-p)), "CE QUI COMPTE.", 122, LIME, "bold", anchor="ma", alpha=p)
    text(image, (W*.5, 594), "FORMATION + ACCOMPAGNEMENT POUR LIVRER TON SAAS.", 24, (203,210,224), "mono", anchor="ma", alpha=ease_out(seg(t,13.72,14.05)))
    q = spring(seg(t, 13.94, 14.46))
    rounded(image, (W*.5-268, 679, W*.5+268, 775), 48, rgba(WHITE,.98*q))
    text(image,(W*.5-184,728),"REJOINDRE",22,INK,"mono-bold",anchor="lm",alpha=q)
    text(image,(W*.5+185,728),"4 000 F",24,ORANGE,"mono-bold",anchor="rm",alpha=q)
    text(image,(W*.5,880),"ai-factory.eltonhounnou.me",29,WHITE,"mono-bold",anchor="ma",alpha=ease_out(seg(t,14.2,14.62)))
    text(image,(W*.5,951),"AIFAC  /  LE SYSTÈME QUI T’APPREND À LIVRER",16,MUTED,"mono",anchor="ma",alpha=ease_out(seg(t,14.35,14.75)))


def render_frame(t: float, frame: int) -> Image.Image:
    if t < 1.75:
        image = Image.new("RGBA", (W, H), INK + (255,))
        intro(image, t)
    elif t < 3.4:
        image = Image.new("RGBA", (W, H), PAPER + (255,))
        course_to_system(image, t)
    elif t < 6.15:
        image = Image.new("RGBA", (W, H), INK + (255,))
        agent_flow(image, t)
    elif t < 8.92:
        image = Image.new("RGBA", (W, H), PAPER + (255,))
        skills_scene(image, t)
    elif t < 11.4:
        image = Image.new("RGBA", (W, H), INK + (255,))
        method_scene(image, t)
    elif t < 13.28:
        image = Image.new("RGBA", (W, H), PAPER + (255,))
        proof_scene(image, t)
    else:
        image = Image.new("RGBA", (W, H), INK + (255,))
        final_scene(image, t)
    return image.convert("RGB")


def make_backgrounds() -> tuple[Image.Image, Image.Image]:
    dark = Image.new("RGBA", (W, H), INK + (255,))
    paper = Image.new("RGBA", (W, H), PAPER + (255,))
    # low-key vertical tints prevent any scene from feeling like a flat slide.
    d = ImageDraw.Draw(dark)
    p = ImageDraw.Draw(paper)
    for y in range(0, H, 3):
        d.line((0, y, W, y), fill=mix(INK, INK_2, y/H) + (255,), width=3)
        p.line((0, y, W, y), fill=mix(PAPER, WHITE, y/H) + (255,), width=3)
    return dark, paper


def make_audio(path: Path) -> None:
    """Tiny original electro score: kick, bass, hats, tonal movement and transition risers."""
    sr = 44100
    samples = int(DURATION * sr)
    rng = random.Random(8042026)
    mono = array("h")
    transition_times = (1.64, 3.31, 6.04, 8.82, 11.29, 13.18)
    notes = (55.0, 65.41, 73.42, 49.0, 55.0, 82.41, 73.42, 65.41)

    for n in range(samples):
        time = n / sr
        beat = time * 2  # 120 BPM
        beat_phase = beat % 1.0
        eighth = (time * 4) % 1.0
        bar_step = int(time * 2) % len(notes)
        s = 0.0
        # Kick: a fast pitch drop at every beat.
        env_kick = math.exp(-beat_phase * 17)
        kick_freq = 105 - 66 * min(1.0, beat_phase * 12)
        s += math.sin(2 * math.pi * kick_freq * time) * 0.74 * env_kick
        # Rounded bass with a gated rhythmic envelope.
        b_env = max(0.0, 1 - beat_phase * 1.8) ** 1.7
        note = notes[bar_step]
        s += math.sin(2 * math.pi * note * time) * .22 * b_env
        s += math.sin(2 * math.pi * note * 2 * time) * .055 * b_env
        # Airy pad becomes stronger in the CTA.
        pad = .045 + (.028 if time > 13.1 else 0)
        s += math.sin(2*math.pi*(220 + 8*math.sin(time*.7))*time) * pad
        s += math.sin(2*math.pi*(277.18 + 6*math.sin(time*.9))*time) * pad*.62
        # Hats: filtered-ish white noise bursts on eighths.
        hat_env = math.exp(-eighth * 35)
        s += (rng.random()*2-1) * .07 * hat_env
        # two small syncopated tonal ticks per second.
        tick_phase = (time * 8) % 1.0
        s += math.sin(2*math.pi*1150*time) * .018 * math.exp(-tick_phase*55)
        # Each scene change gets a short rising/noise whoosh.
        for event in transition_times:
            relative = time - event
            if -0.15 <= relative <= .28:
                q = (relative + .15) / .43
                whoosh = math.sin(2*math.pi*(190 + 1550*q*q)*time) * math.sin(math.pi*q)
                s += whoosh * .11
                s += (rng.random()*2-1) * .045 * math.sin(math.pi*q)
        # Finale contains a deliberately clean little success chime.
        relative = time - 14.0
        if 0 <= relative < 1.0:
            s += math.sin(2*math.pi*880*relative) * .13 * math.exp(-relative*3.6)
            s += math.sin(2*math.pi*1320*relative) * .07 * math.exp(-relative*4.3)
        # Fade both ends softly.
        fade = min(1.0, time/.08, (DURATION-time)/.28)
        s *= fade
        mono.append(max(-32767, min(32767, int(s * 21000))))

    stereo = array("h")
    for val in mono:
        stereo.append(val)
        stereo.append(val)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        wav.writeframes(stereo.tobytes())


def main() -> int:
    if not FFMPEG.exists():
        print(f"ffmpeg not found at {FFMPEG}", file=sys.stderr)
        return 1
    WORK.mkdir(exist_ok=True)
    print("Synthesising original score…")
    make_audio(AUDIO)
    print(f"Rendering {FRAMES} frames at {W}×{H} / {FPS} fps…")
    command = [
        str(FFMPEG), "-y", "-loglevel", "warning",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0",
        "-i", str(AUDIO),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(OUT),
    ]
    proc = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert proc.stdin is not None
    try:
        for frame in range(FRAMES):
            image = render_frame(frame / FPS, frame)
            proc.stdin.write(image.tobytes())
            if frame % 30 == 0:
                print(f"  {frame/FPS:05.2f}s / {DURATION:02d}s", flush=True)
    except BrokenPipeError:
        return proc.wait()
    finally:
        proc.stdin.close()
    code = proc.wait()
    if code == 0:
        print(f"Wrote {OUT.relative_to(ROOT)}")
    return code


DARK_BG, PAPER_BG = make_backgrounds()

if __name__ == "__main__":
    raise SystemExit(main())
