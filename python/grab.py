"""Screen-region grab for Area Capture (X11 / mss, PIL fallback)."""

from __future__ import annotations

import argparse
from pathlib import Path


def grab(left: int, top: int, width: int, height: int, out: str) -> None:
    if width < 2 or height < 2:
        raise ValueError("Selected area is too small")
    dest = Path(out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        import mss
        import mss.tools

        with mss.mss() as sct:
            shot = sct.grab({"left": left, "top": top, "width": width, "height": height})
            mss.tools.to_png(shot.rgb, shot.size, output=str(dest))
            return
    except ImportError:
        pass

    from PIL import ImageGrab

    img = ImageGrab.grab(bbox=(left, top, left + width, top + height), all_screens=True)
    img.save(dest)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--left", type=int, required=True)
    parser.add_argument("--top", type=int, required=True)
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    grab(args.left, args.top, args.width, args.height, args.out)
    print(args.out)


if __name__ == "__main__":
    main()
