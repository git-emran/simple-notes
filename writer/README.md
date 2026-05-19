# Writr

Welcome to my Simple notes series. My First project of this series is WritR.

# What is WritR

WritR is a Desktop markdown application. Currently available only on macOS. It has the basic markdown feature.

# Tech Stack

WritR is a very memory efficient Electron and Typescript based desktop app. Styled with Tailwind, state management with Jotai.
#typescript #electron #react

# Images

- Drag & drop an image into the editor to save it under `~/Writr/image/` and insert a `![[image/<file>]]` link.
- You can also manually add images to `~/Writr/image/` and reference them via `![[image/<file>]]` (or standard markdown `![](image/<file>)`).

---

## 🛠️ Development & Build Instructions

I have configured a cross-platform, single-command bootstrap and packaging pipeline that operates flawlessly across **Windows, macOS, and Linux**.

### 1. Bootstrapping Dependencies
```bash
npm run bootstrap
```

### 2. Live Development Server
```bash
npm run dev
```

### 3. Unified Cross-Platform Build & Package
```bash
npm run build && npm run package
```

### 4. Modular Pipeline Commands
- **Clean output folders**: `npm run clean`
- **Compile Frontend React**: `npm run build:frontend`
- **Compile Electron Core**: `npm run build:electron`
- **Build targeted packages**:
  - macOS: `npm run package:mac`
  - Windows: `npm run package:win`
  - Linux: `npm run package:linux`

### 🐧 Linux Package Prerequisite Validation
If packaging to Linux distribution formats (like `.deb`, `.rpm`, `.pacman`, `.snap`), run our host prerequisite validator to verify packages like `fakeroot` or `rpmbuild` are present:
```bash
./scripts/check-prerequisites.sh
```

