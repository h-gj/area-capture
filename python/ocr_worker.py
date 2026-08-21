"""Local image OCR powered by RapidOCR (same approach as HuTu ocr_utils)."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request
from typing import Any

DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(
    os.environ.get("XDG_CACHE_HOME") or os.path.expanduser("~/.cache"),
    "area-capture",
    "ocr-models",
)

MODEL_PRESETS: dict[str, dict[str, Any]] = {
    "ppocrv4-mobile": {
        "id": "ppocrv4-mobile",
        "name": "PP-OCRv4 中英 Mobile",
        "desc": "Local · fast, bundled with rapidocr-onnxruntime",
        "default": True,
        "bundled": True,
        "provider": "local",
    },
    "ppocrv4-server": {
        "id": "ppocrv4-server",
        "name": "PP-OCRv4 中英 Server",
        "desc": "Local · higher accuracy, downloads on first use",
        "default": False,
        "bundled": False,
        "provider": "local",
        "files": {
            "det": {
                "filename": "ch_PP-OCRv4_det_server.onnx",
                "url": (
                    "https://www.modelscope.cn/models/RapidAI/RapidOCR/"
                    "resolve/v3.9.1/onnx/PP-OCRv4/det/ch_PP-OCRv4_det_server.onnx"
                ),
            },
            "rec": {
                "filename": "ch_PP-OCRv4_rec_server.onnx",
                "url": (
                    "https://www.modelscope.cn/models/RapidAI/RapidOCR/"
                    "resolve/v3.9.1/onnx/PP-OCRv4/rec/ch_PP-OCRv4_rec_server.onnx"
                ),
            },
        },
    },
    "en-mobile": {
        "id": "en-mobile",
        "name": "English Mobile",
        "desc": "Local · English-leaning, downloads on first use",
        "default": False,
        "bundled": False,
        "provider": "local",
        "files": {
            "det": {
                "filename": "en_PP-OCRv3_det_mobile.onnx",
                "url": (
                    "https://www.modelscope.cn/models/RapidAI/RapidOCR/"
                    "resolve/v3.9.1/onnx/PP-OCRv4/det/en_PP-OCRv3_det_mobile.onnx"
                ),
            },
            "rec": {
                "filename": "en_PP-OCRv4_rec_mobile.onnx",
                "url": (
                    "https://www.modelscope.cn/models/RapidAI/RapidOCR/"
                    "resolve/v3.9.1/onnx/PP-OCRv4/rec/en_PP-OCRv4_rec_mobile.onnx"
                ),
            },
        },
    },
}

DEFAULT_MODEL_ID = next(
    (m["id"] for m in MODEL_PRESETS.values() if m.get("default")),
    "ppocrv4-mobile",
)

_ocr_cache: dict[str, Any] = {}
_import_error: str | None = None


def list_models() -> dict[str, Any]:
    models = []
    for mid, preset in MODEL_PRESETS.items():
        models.append({
            "id": mid,
            "name": preset["name"],
            "desc": preset.get("desc", ""),
            "default": bool(preset.get("default")),
            "bundled": bool(preset.get("bundled")),
            "provider": preset.get("provider", "local"),
            "ready": _model_ready(mid),
        })
    return {"default": DEFAULT_MODEL_ID, "models": models}


def _model_ready(model_id: str) -> bool:
    preset = MODEL_PRESETS.get(model_id)
    if not preset:
        return False
    if preset.get("bundled"):
        return True
    files = preset.get("files") or {}
    return all(
        os.path.isfile(os.path.join(MODELS_DIR, meta["filename"]))
        for meta in files.values()
    )


def _ensure_model_files(model_id: str) -> dict[str, str]:
    preset = MODEL_PRESETS.get(model_id)
    if not preset:
        raise ValueError(f"Unknown model: {model_id}")
    if preset.get("bundled"):
        return {}

    os.makedirs(MODELS_DIR, exist_ok=True)
    paths: dict[str, str] = {}
    for key, meta in (preset.get("files") or {}).items():
        dest = os.path.join(MODELS_DIR, meta["filename"])
        if not os.path.isfile(dest) or os.path.getsize(dest) < 1024:
            _download_file(meta["url"], dest)
        paths[key] = dest
    return paths


def _download_file(url: str, dest: str) -> None:
    tmp = dest + ".part"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AreaCapture-OCR/1.0"})
        with urllib.request.urlopen(req, timeout=180) as resp, open(tmp, "wb") as out:
            while True:
                chunk = resp.read(1024 * 256)
                if not chunk:
                    break
                out.write(chunk)
        os.replace(tmp, dest)
    except Exception as e:
        try:
            if os.path.isfile(tmp):
                os.remove(tmp)
        except OSError:
            pass
        raise RuntimeError(f"Model download failed ({os.path.basename(dest)}): {e}") from e


def _get_ocr(model_id: str | None = None):
    global _import_error
    mid = model_id or DEFAULT_MODEL_ID
    if mid not in MODEL_PRESETS:
        raise ValueError(f"Unknown model: {mid}, options: {', '.join(MODEL_PRESETS)}")

    if mid in _ocr_cache:
        return _ocr_cache[mid], mid

    if _import_error:
        raise RuntimeError(_import_error)
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError as e:
        _import_error = (
            "OCR extras missing. From the project dir run: "
            "python3 -m venv .venv && .venv/bin/pip install -r python/requirements.txt"
        )
        raise RuntimeError(_import_error) from e

    paths = _ensure_model_files(mid)
    kwargs = {}
    if paths.get("det"):
        kwargs["det_model_path"] = paths["det"]
    if paths.get("rec"):
        kwargs["rec_model_path"] = paths["rec"]
    if paths.get("cls"):
        kwargs["cls_model_path"] = paths["cls"]

    engine = RapidOCR(**kwargs) if kwargs else RapidOCR()
    _ocr_cache[mid] = engine
    return engine, mid


def _load_image_array(path: str):
    try:
        from PIL import Image, ImageOps
        import numpy as np
    except ImportError as e:
        raise RuntimeError(
            "Pillow / numpy missing. Install python/requirements.txt"
        ) from e

    try:
        img = Image.open(path)
    except Exception as e:
        raise ValueError(f"Cannot read image: {e}") from e

    if img.mode != "RGB":
        img = img.convert("RGB")

    w, h = img.size
    # Small crops (part numbers, labels) need upscale + padding — same as HuTu
    min_side = min(w, h)
    if min_side < 48 or max(w, h) < 180:
        scale = max(3.0, 180 / max(w, h), 48 / max(min_side, 1))
        img = img.resize(
            (max(1, int(w * scale)), max(1, int(h * scale))),
            Image.Resampling.LANCZOS,
        )
        img = ImageOps.autocontrast(img)
        img = ImageOps.expand(img, border=40, fill="white")
        w, h = img.size

    max_side = 3000
    scale_down = max(w, h) / max_side
    if scale_down > 1:
        img = img.resize((int(w / scale_down), int(h / scale_down)))

    return np.array(img)


def recognize_file(path: str, model: str | None = None) -> dict[str, Any]:
    started = time.time()
    model_id = model or DEFAULT_MODEL_ID
    if model_id not in MODEL_PRESETS:
        raise ValueError(f"Unknown model: {model_id}, options: {', '.join(MODEL_PRESETS)}")
    if not os.path.isfile(path):
        raise ValueError(f"Image not found: {path}")
    if os.path.getsize(path) > 15 * 1024 * 1024:
        raise ValueError("Image too large (over 15MB)")

    preset = MODEL_PRESETS[model_id]
    arr = _load_image_array(path)
    ocr, model_id = _get_ocr(model_id)
    result, elapse = ocr(arr)

    lines = []
    if result:
        for item in result:
            if not item or len(item) < 2:
                continue
            box = item[0]
            text = str(item[1] or "").strip()
            score = float(item[2]) if len(item) > 2 and item[2] is not None else None
            if not text:
                continue
            lines.append({
                "text": text,
                "confidence": round(score, 4) if score is not None else None,
                "box": box,
            })

    text = "\n".join(line["text"] for line in lines)
    elapsed_ms = int((time.time() - started) * 1000)
    engine_ms = None
    if isinstance(elapse, (list, tuple)) and elapse:
        try:
            engine_ms = int(sum(float(x) for x in elapse) * 1000)
        except (TypeError, ValueError):
            engine_ms = None

    return {
        "text": text,
        "lines": lines,
        "line_count": len(lines),
        "elapsed_ms": elapsed_ms,
        "engine_ms": engine_ms,
        "model": model_id,
        "model_name": preset.get("name", model_id),
        "provider": "local",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--list-models", action="store_true")
    parser.add_argument("--image")
    parser.add_argument("--model")
    args = parser.parse_args()
    if args.list_models:
        json.dump(list_models(), sys.stdout, ensure_ascii=False)
        sys.stdout.write("\n")
        return
    if not args.image:
        parser.error("--image is required unless --list-models")
    json.dump(recognize_file(args.image, args.model), sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
