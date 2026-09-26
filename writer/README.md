# Writer

Welcome to my Simple notes series. My First project of this series is Writer.

# What is Writer

Writer is a Desktop markdown application. Currently available only on macOS. It has the basic markdown feature.

# Tech Stack

WritR is a very memory efficient Electron and Typescript based desktop app. Styled with Tailwind, state management with Jotai.
#typescript #electron #react

---

## 📥 Download & Install

Download the latest release from the [**Releases page**](https://github.com/git-emran/simple-notes/releases).

| Platform | File | Notes |
|---|---|---|
| **macOS (Apple Silicon)** | `writer-x.x.x-arm64.dmg` | M1/M2/M3/M4 Macs |
| **macOS (Intel)** | `writer-x.x.x-x64.dmg` | Older Intel Macs |
| **Windows** | `writer-x.x.x-setup.exe` | Windows 10+ |
| **Linux** | `writer-x.x.x.AppImage` | Universal Linux |
| **Linux (Debian/Ubuntu)** | `writer-x.x.x.deb` | Debian-based distros |

### ⚠️ macOS: "App is damaged" fix

Since Writer is not notarized with Apple, macOS may block it. After installing, open **Terminal** and run:

```bash
xattr -cr /Applications/Writer.app
```

Then open the app normally. You only need to do this once.

<details>
<summary>Why does this happen?</summary>

macOS Gatekeeper quarantines apps that aren't signed with an Apple Developer certificate. The `xattr -cr` command removes the quarantine flag so macOS trusts the app. This is standard for open-source apps distributed outside the Mac App Store.

</details>

---

## 🖼️ Images

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

---

## 🚀 Releasing a New Version

To create a new release:

```bash
# 1. Bump version in package.json (e.g., to 3.1.0)
npm version 3.1.0 --no-git-tag-version

# 2. Commit the version bump
git add -A && git commit -m "release: v3.1.0"

# 3. Create and push a tag — this triggers the GitHub Actions build
git tag v3.1.0
git push origin main --tags
```

GitHub Actions will automatically:
1. Build for macOS (x64 + arm64), Windows, and Linux
2. Create a **draft release** with all binaries attached
3. Go to [Releases](https://github.com/git-emran/simple-notes/releases), review the draft, and click **Publish**
