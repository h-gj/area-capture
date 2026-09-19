# Area Capture

Windows / Linux 托盘应用，用于**框选截图**：标注屏幕区域后，可 OCR、复制或保存图片、钉在屏幕上，或上传到阿里云 OSS。

兼容 **Windows 10/11 x64** 和 **Linux x64**。安装包内置便携 Python 运行时和 RapidOCR，无需系统安装 Python 即可识别文字。

**关键词：** 框选截图、屏幕截图、OCR 文字识别、中文 OCR、系统托盘、Windows、Linux、屏幕标注、钉图、阿里云 OSS、Electron、RapidOCR、PP-OCRv4

Tray screenshot tool for Windows and Linux: region capture, annotation, local OCR, pin-on-screen, Aliyun OSS upload.

![Area Capture 标注面板](https://i.imgur.com/HJSrFkz.jpg)

截图界面实拍（[来源](https://imgur.com/a/VH2OxG4)）：拖出区域，在右侧标注，然后选择 OCR、复制、保存、OSS 或钉在屏幕上。

## 下载

从 [GitHub Releases](https://github.com/h-gj/area-capture/releases/latest) 获取最新构建：

| 平台 | 文件 |
| --- | --- |
| Windows x64 | `Area.Capture-Setup-1.0.0-x64.exe` |
| Linux x64 | `AreaCapture-1.0.0-linux-x64.tar.gz` |

**Windows：** 运行安装程序，选择目录，再从开始菜单启动 **Area Capture**。未签名安装包可能触发 SmartScreen，请选择 **更多信息 → 仍要运行**。

**Linux：** 解压后在目录中运行 `./area-capture`。应用驻留在系统托盘（部分桌面环境会隐藏托盘图标，需手动允许显示）。

```bash
tar -xzf AreaCapture-1.0.0-linux-x64.tar.gz
cd "Area Capture-1.0.0-linux-x64"
./area-capture
```

## 功能

- **托盘优先。** 应用常驻系统托盘。点击图标或按下唤醒快捷键即可截图。托盘菜单可打开 **History（历史）** 或 **Config（配置）**，**Quit** 退出。
- **框选区域。** 拖出矩形后松开即可截取。Esc 取消。
- **保存前标注。** 点击托盘后，可在侧栏对截图绘制：
  - 工具：箭头、直线、矩形、椭圆、画笔、文字、序号、模糊
  - 颜色：预设色，以及 **从截图取色**
  - 线宽：S / M / L
  - **撤销**（Ctrl+Z）上一笔
- **标注后的操作**（也可使用对应全局快捷键）：
  - **OCR** — 识别文字并复制到剪贴板
  - **复制图片** — 复制标注后的 PNG
  - **保存为图片** — 将 PNG 写入磁盘
  - **保存到 OSS** — 上传到阿里云 OSS 并复制 URL
  - **钉在屏幕上** — 将截图固定为悬浮窗口
- **本地 OCR**，基于 RapidOCR / PP-OCRv4（与 HuTu 相同方案）：
  - **PP-OCRv4 中英 Mobile** — 内置、默认、速度快
  - **PP-OCRv4 中英 Server** — 精度更高，首次使用时下载
  - **English Mobile** — 偏英文，首次使用时下载
- **悬浮贴纸。** 始终置顶。可拖动（允许部分移出屏幕），滚轮缩放，右键 **复制为图片**、**保存为图片** 或 **删除**。Esc 也可关闭贴纸。
- **历史记录。** 最多保存 50 条（窗口展示最近 5 条），可复制文字、复制图片、打开 OSS 链接或打开已保存文件。可在历史窗口中清空。
- **可配置快捷键**，用于开始截图，以及标注面板打开时的操作。
- **开机自启。** Windows 使用登录项；Linux 写入 `~/.config/autostart/area-capture.desktop`。启动后隐藏在托盘。
- **阿里云 OSS。** 可配置 Bucket、Region、Endpoint、自定义域名、AccessKey、超时、可写标记和对象前缀。上传路径为 `{prefix}/{timestamp}-{rand}.png`。若设置了自定义域名，公开 URL 使用该域名。

两端配置都保存在 `~/.config/area-capture/`（`settings.json`、`oss.json`、`history.json` 和 `captures/`）。

## 托盘 / 快捷键

| 操作 | 默认 |
| --- | --- |
| 框选区域（再选择操作） | 点击托盘或 `Alt+A` |
| OCR 选区 | `Ctrl+Shift+Alt+O` |
| 复制选区图片 | `Ctrl+Shift+Alt+C` |
| 将选区保存为 PNG | `Ctrl+Shift+Alt+F` |
| 将选区保存到 OSS | `Ctrl+Shift+Alt+S` |
| 将选区钉在屏幕上 | `Ctrl+Shift+D` |
| 历史 | 托盘菜单 |
| 配置 | 托盘菜单 |

标注面板打开时（**Config → While capturing**）：

| 操作 | 默认 |
| --- | --- |
| 复制图片 | `Ctrl+C` |
| 保存为图片 | `Ctrl+S` |
| OCR | `Ctrl+R` |
| 保存到 OSS | `Ctrl+O` |
| 钉在屏幕上 | `Ctrl+Shift+D` |

## OSS

在 **Config** 中编辑 Bucket、Region、Endpoint、自定义域名、密钥、超时、可写和对象前缀。配置保存在 `~/.config/area-capture/oss.json`（前缀在 `~/.config/area-capture/settings.json`）。若配置了自定义域名，上传 URL 使用该域名，否则使用 Endpoint。

## 开发

```bash
python3 -m venv .venv
# Windows: python -m venv .venv
.venv/bin/pip install -r python/requirements.txt
# Windows: .venv\Scripts\pip install -r python\requirements.txt
npm install
npm run dev
```

打包：

```bash
npm run dist:win     # NSIS 安装包，Windows x64（可在 Linux 或 Windows 上构建）
npm run dist:linux   # .tar.gz，Linux x64（建议在 Linux 上构建；Python wheel 按 manylinux 拉取）
```

安装包包含 `python/` 工作脚本，以及对应平台的 Python 运行时（`build/windows/python-runtime` 或 `build/linux/python-runtime`）。
