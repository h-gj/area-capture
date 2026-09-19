# Area Capture

Windows and Linux tray app for **selected-area capture**: annotate a screen region, then OCR it, copy or save the image, pin it on screen, or upload it to Aliyun OSS.

Compatible with **Windows 10/11 x64** and **Linux x64**. Packaged builds bundle a portable Python runtime and RapidOCR, so OCR works without a system Python install.

![Area Capture annotate panel](https://i.imgur.com/HJSrFkz.jpg)

Photo of the capture overlay ([source](https://imgur.com/a/VH2OxG4)): drag a region, annotate on the right, then pick OCR, copy, save, OSS, or stick.

## Downloads

Get the latest builds from [GitHub Releases](https://github.com/h-gj/area-capture/releases/latest):

| Platform | File |
| --- | --- |
| Windows x64 | `Area.Capture-Setup-1.0.0-x64.exe` |
| Linux x64 | `AreaCapture-1.0.0-linux-x64.tar.gz` |

**Windows:** run the installer, choose a folder, then start **Area Capture** from the Start menu. Windows SmartScreen may warn on an unsigned build — use **More info → Run anyway**.

**Linux:** extract the archive and run `./area-capture` from the unpacked folder. The app lives in the system tray (some desktops hide tray icons until you allow them).

```bash
tar -xzf AreaCapture-1.0.0-linux-x64.tar.gz
cd "Area Capture-1.0.0-linux-x64"
./area-capture
```

## Features

- **Tray-first.** The app stays in the system tray. Click the icon or press the wake hotkey to capture. Open **History** or **Config** from the tray menu. **Quit** exits.
- **Area selection.** Drag a rectangle, release to capture. Esc cancels.
- **Annotate before you save.** After a tray click, draw on the capture from the side panel:
  - Tools: arrow, line, rectangle, ellipse, pen, text, step numbers, blur
  - Colors: presets plus **Pick from capture**
  - Stroke sizes: S / M / L
  - **Undo** (Ctrl+Z) for the last mark
- **Actions** after annotate (or from a dedicated global hotkey):
  - **OCR** — recognize text and copy it to the clipboard
  - **Copy image** — copy the annotated PNG
  - **Save as image** — write a PNG to disk
  - **Save to OSS** — upload to Aliyun OSS and copy the URL
  - **Stick on screen** — pin the capture as a floating window
- **Local OCR** with RapidOCR / PP-OCRv4 (same approach as HuTu):
  - **PP-OCRv4 中英 Mobile** — bundled, default, fast
  - **PP-OCRv4 中英 Server** — higher accuracy, downloads on first use
  - **English Mobile** — English-leaning, downloads on first use
- **Floating stickers.** Always on top. Drag to move (including partly off-screen), scroll to scale, right-click to **Copy as image**, **Save as image**, or **Delete**. Esc also removes the sticker.
- **History.** Recent captures (up to 50 stored; the window lists the latest 5) with copy text, copy image, open OSS URL, or open the saved file. Clear from the History window.
- **Configurable hotkeys** for starting a capture and for actions while the annotate panel is open.
- **Start with system.** Windows uses a login item; Linux writes `~/.config/autostart/area-capture.desktop`. The app starts hidden in the tray.
- **Aliyun OSS.** Bucket, region, endpoint, custom domain, AccessKey, timeout, writable flag, and object prefix. Uploads go to `{prefix}/{timestamp}-{rand}.png`. The public URL uses the custom domain when set.

Settings live under `~/.config/area-capture/` on both platforms (`settings.json`, `oss.json`, `history.json`, and `captures/`).

## Tray / hotkeys

| Action | Default |
| --- | --- |
| Capture area (then pick action) | Click tray or `Alt+A` |
| OCR selected area | `Ctrl+Shift+Alt+O` |
| Copy selected area image | `Ctrl+Shift+Alt+C` |
| Save selected area as PNG | `Ctrl+Shift+Alt+F` |
| Save selected area to OSS | `Ctrl+Shift+Alt+S` |
| Stick selected area on screen | `Ctrl+Shift+D` |
| History | Tray menu |
| Config | Tray menu |

While the annotate panel is open (**Config → While capturing**):

| Action | Default |
| --- | --- |
| Copy image | `Ctrl+C` |
| Save as image | `Ctrl+S` |
| OCR | `Ctrl+R` |
| Save to OSS | `Ctrl+O` |
| Stick on screen | `Ctrl+Shift+D` |

## OSS

Edit bucket, region, endpoint, custom domain, keys, timeout, writable, and object prefix in **Config**. Values are saved to `~/.config/area-capture/oss.json` (prefix in `~/.config/area-capture/settings.json`). Upload URLs use the custom domain when configured, and the endpoint otherwise.

## Develop

```bash
python3 -m venv .venv
# Windows: python -m venv .venv
.venv/bin/pip install -r python/requirements.txt
# Windows: .venv\Scripts\pip install -r python\requirements.txt
npm install
npm run dev
```

Packaged builds:

```bash
npm run dist:win     # NSIS installer, Windows x64 (from Linux or Windows)
npm run dist:linux   # .tar.gz, Linux x64 (from Linux; Python wheels are fetched for manylinux)
```

The packaged app includes the `python/` workers plus a platform Python runtime (`build/windows/python-runtime` or `build/linux/python-runtime`).
