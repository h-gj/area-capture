"""Generate docs/demo.gif — a short Area Capture overlay walkthrough."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "demo.gif"
W, H = 960, 540
SEL = (168, 96, 612, 392)  # left, top, right, bottom of captured region


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = (
        ("msyhbd.ttc", "msyh.ttc") if bold else ("msyh.ttc", "msyhbd.ttc")
    )
    for name in names:
        path = Path(r"C:\Windows\Fonts") / name
        try:
            return ImageFont.truetype(str(path), size)
        except OSError:
            continue
    try:
        return ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", size)
    except OSError:
        return ImageFont.load_default()


F12 = font(12)
F13 = font(13)
F14 = font(14)
F15b = font(15, bold=True)
F16 = font(16)
F18b = font(18, bold=True)
F22b = font(22, bold=True)
F28b = font(28, bold=True)


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def desktop() -> Image.Image:
    img = Image.new("RGB", (W, H), (32, 36, 44))
    d = ImageDraw.Draw(img)
    d.rectangle((0, H - 40, W, H), fill=(24, 26, 32))
    d.ellipse((16, H - 30, 36, H - 10), fill=(90, 140, 255))
    d.text((48, H - 30), "Area Capture", font=F13, fill=(220, 224, 230))
    d.text((W - 90, H - 28), "16:17", font=F13, fill=(180, 184, 190))

    rounded(d, (72, 36, 888, 470), 14, (248, 248, 250), (228, 228, 232), 1)
    d.rectangle((72, 36, 888, 76), fill=(240, 240, 243))
    d.ellipse((90, 50, 102, 62), fill=(239, 68, 68))
    d.ellipse((110, 50, 122, 62), fill=(234, 179, 8))
    d.ellipse((130, 50, 142, 62), fill=(34, 197, 94))
    d.text((164, 46), "采购单  PO-8821  ·  华途电子", font=F14, fill=(40, 40, 48))

    d.text((108, 104), "供应商", font=F13, fill=(120, 120, 128))
    d.text((108, 124), "深圳市芯谷半导体有限公司", font=F18b, fill=(24, 24, 28))
    d.text((108, 168), "物料", font=F13, fill=(120, 120, 128))
    d.text((108, 188), "LM124DR   SOP-14   德州仪器", font=F16, fill=(24, 24, 28))
    d.text((108, 228), "数量", font=F13, fill=(120, 120, 128))
    d.text((108, 248), "2,500 pcs", font=F16, fill=(24, 24, 28))

    rounded(d, (108, 300, 420, 392), 10, (255, 251, 235), (253, 224, 71), 1)
    d.text((124, 316), "含税合计", font=F13, fill=(146, 64, 14))
    d.text((124, 338), "¥ 12,800.00", font=F28b, fill=(180, 83, 9))
    return img


def overlay(base: Image.Image, dim: float) -> Image.Image:
    if dim <= 0:
        return base.copy()
    veil = Image.new("RGBA", (W, H), (26, 27, 32, int(255 * dim)))
    out = base.convert("RGBA")
    out.alpha_composite(veil)
    return out.convert("RGB")


def selection(img: Image.Image, box, shot: Image.Image | None = None) -> Image.Image:
    out = img.convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    l, t, r, b = box
    d.rectangle((0, 0, W, H), fill=(26, 27, 32, 70))
    d.rectangle((l, t, r, b), fill=(0, 0, 0, 0))
    out.alpha_composite(layer)
    rgb = out.convert("RGB")
    if shot is not None:
        crop = shot.crop(box)
        rgb.paste(crop, (l, t))
    d2 = ImageDraw.Draw(rgb)
    d2.rectangle((l, t, r, b), outline=(255, 255, 255), width=2)
    return rgb


def hint(img: Image.Image, text: str) -> Image.Image:
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), text, font=F13)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (W - tw) // 2
    y = 22
    rounded(d, (x - 14, y - 8, x + tw + 14, y + th + 8), 999, (26, 27, 32))
    d.text((x, y), text, font=F13, fill=(255, 255, 255))
    return img


def sidebar(img: Image.Image, ocr_active: bool = False) -> Image.Image:
    x, y, w = 628, 96, 232
    d = ImageDraw.Draw(img)
    rounded(d, (x, y, x + w, y + 428), 8, (255, 255, 255), (228, 228, 232), 1)
    d.text((x + 12, y + 12), "Annotate", font=F15b, fill=(24, 24, 28))
    d.text((x + 12, y + 34), "Draw, then choose an action.", font=F12, fill=(118, 118, 126))

    tools = [
        ("Arrow", True),
        ("Line", False),
        ("Rect", False),
        ("Ellipse", False),
        ("Pen", False),
        ("Text", False),
        ("Step", False),
        ("Blur", False),
        ("Undo", False),
    ]
    tx, ty = x + 12, y + 58
    for i, (label, active) in enumerate(tools):
        col, row = i % 2, i // 2
        bx = tx + col * 106
        by = ty + row * 34
        fill = (24, 24, 28) if active else (255, 255, 255)
        fg = (250, 250, 250) if active else (24, 24, 28)
        outline = (24, 24, 28) if active else (228, 228, 232)
        rounded(d, (bx, by, bx + 100, by + 28), 8, fill, outline, 1)
        d.text((bx + 28, by + 7), label, font=F12, fill=fg)

    d.text((x + 12, y + 232), "COLOR", font=F12, fill=(118, 118, 126))
    colors = [(225, 29, 72), (234, 179, 8), (37, 99, 235), (24, 24, 27), (250, 250, 250)]
    for i, color in enumerate(colors):
        cx = x + 20 + i * 30
        cy = y + 254
        d.ellipse((cx - 9, cy - 9, cx + 9, cy + 9), fill=color, outline=(228, 228, 232))
        if i == 0:
            d.ellipse((cx - 13, cy - 13, cx + 13, cy + 13), outline=(24, 24, 28), width=2)

    d.text((x + 12, y + 276), "SAVE", font=F12, fill=(118, 118, 126))
    actions = [
        ("OCR", "Ctrl+R", ocr_active),
        ("Copy image", "Ctrl+C", False),
        ("Save as image", "Ctrl+S", False),
        ("Save to OSS", "Ctrl+O", True and not ocr_active),
        ("Stick on screen", "Ctrl+Shift+D", False),
    ]
    ay = y + 296
    for label, kbd, primary in actions:
        fill = (24, 24, 28) if primary else (255, 255, 255)
        fg = (250, 250, 250) if primary else (24, 24, 28)
        kbd_fg = (200, 200, 204) if primary else (140, 140, 148)
        rounded(d, (x + 12, ay, x + w - 12, ay + 22), 8, fill, (24, 24, 28) if primary else (228, 228, 232), 1)
        d.text((x + 22, ay + 4), label, font=F12, fill=fg)
        d.text((x + w - 88, ay + 5), kbd, font=F12, fill=kbd_fg)
        ay += 26
    return img


def arrow(img: Image.Image, progress: float) -> Image.Image:
    d = ImageDraw.Draw(img)
    x0, y0 = 236, 214
    x1, y1 = 236 + int(168 * progress), 214 + int(96 * progress)
    d.line((x0, y0, x1, y1), fill=(225, 29, 72), width=5)
    if progress > 0.82:
        d.polygon([(x1, y1), (x1 - 16, y1 - 5), (x1 - 5, y1 - 16)], fill=(225, 29, 72))
    return img


def toast(img: Image.Image, text: str) -> Image.Image:
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), text, font=F14)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (W - tw) // 2
    y = H - 86
    rounded(d, (x - 18, y - 12, x + tw + 18, y + th + 12), 12, (24, 24, 28))
    d.text((x, y), text, font=F14, fill=(250, 250, 250))
    return img


def lerp_box(p: float):
    l0, t0 = 420, 240
    l, t, r, b = SEL
    return (
        int(l0 + (l - l0) * p),
        int(t0 + (t - t0) * p),
        int(l0 + (r - l0) * p),
        int(t0 + (b - t0) * p),
    )


def build_frames() -> list[Image.Image]:
    base = desktop()
    frames: list[Image.Image] = []

    frames.extend([base.copy()] * 3)

    dimmed = overlay(base, 0.18)
    h = hint(dimmed.copy(), "Drag to select an area · Esc cancels")
    frames.extend([h] * 2)

    for p in (0.18, 0.38, 0.58, 0.78, 1.0):
        frame = overlay(base, 0.18)
        frame = selection(frame, lerp_box(p))
        hint(frame, "Drag to select an area · Esc cancels")
        frames.append(frame)

    compose = overlay(base, 0.22)
    compose = selection(compose, SEL, shot=base)
    compose = sidebar(compose)
    hint(compose, "Annotate, then choose an action · Esc cancels · Ctrl+Z undo")
    frames.extend([compose.copy()] * 2)

    for p in (0.25, 0.5, 0.75, 1.0):
        frame = overlay(base, 0.22)
        frame = selection(frame, SEL, shot=base)
        frame = sidebar(frame)
        arrow(frame, p)
        hint(frame, "Annotate, then choose an action · Esc cancels · Ctrl+Z undo")
        frames.append(frame)

    ocr = overlay(base, 0.22)
    ocr = selection(ocr, SEL, shot=base)
    ocr = sidebar(ocr, ocr_active=True)
    arrow(ocr, 1.0)
    hint(ocr, "Annotate, then choose an action · Esc cancels · Ctrl+Z undo")
    frames.extend([ocr.copy()] * 2)

    done = ocr.copy()
    toast(done, "OCR 已复制    LM124DR  ·  ¥ 12,800.00")
    frames.extend([done] * 6)
    frames.extend([base.copy()] * 2)
    return frames


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rgb_frames = build_frames()
    palette = rgb_frames[11].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    frames = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in rgb_frames]
    durations = [90] * len(frames)
    durations[-8:-2] = [180] * 6
    frames[0].save(
        OUT,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB, {len(frames)} frames)")


if __name__ == "__main__":
    main()
