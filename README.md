# Area Capture

Linux tray app for **selected-area OCR** and **selected-area screenshot upload to Aliyun OSS**.

- OCR uses the same RapidOCR / PP-OCRv4 approach as `~/proj/HuTu`
- OSS upload config is stored in `~/.config/area-capture/oss.json`

## Run

```bash
cd ~/Projects/area-capture
python3 -m venv .venv
.venv/bin/pip install -r python/requirements.txt
npm install
npm run dev
```

Build a Windows x64 installer from Linux:

```bash
npm run dist:win
```

The app stays in the **system tray**. **Click** the tray icon to select an area, then pick an action from the panel at the right of the selection. Open **History** or **Config** from the tray menu. Use **Quit** in the tray menu to exit.

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

While the annotate panel is open (configurable in **Config → While capturing**):

| Action | Default |
| --- | --- |
| Copy image | `Ctrl+C` |
| Save as image | `Ctrl+S` |
| OCR | `Ctrl+R` |
| Save to OSS | `Ctrl+O` |
| Stick on screen | `Ctrl+Shift+D` |

Drag a rectangle, release to capture. After a tray click, annotate with arrow, line, rectangle, ellipse, pen, text, step numbers, or blur, then choose OCR, copy image, save as image, save to OSS, or stick on screen — or use the shortcuts above. Esc cancels. Ctrl+Z undoes the last mark. A stuck capture stays on top; drag to move it (including partly off-screen), scroll to scale, and right-click to **Copy as image**, **Save as image**, or **Delete** (Esc also removes it).

## OSS

Edit bucket, region, endpoint, custom domain, keys, timeout, writable, and object prefix in **Config**. Values are saved to `~/.config/area-capture/oss.json` (prefix in `~/.config/area-capture/settings.json`). Upload URLs use the custom domain when configured, and the endpoint otherwise.

Uploads go to `{prefix}/{timestamp}-{rand}.png`.
