# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.1] - 2026-10-11

### Added
- **Manual App Updates & In-App Update Banner**: Added an update notification banner in the Settings modal when an update is available or in progress, along with controls to manually check for updates and trigger installation.
- **KaTeX Math Support**: Added KaTeX mathematical formula rendering support with inline math rendering in the markdown editor and preview.

### Fixed
- **Updater Status Lifecycle & Race Conditions**: Improved update lifecycle tracking across main and renderer processes, preserving target version metadata through download progress and preventing state overwrite races between live events and initial status fetches.
- **Code Block Enhancements**: Enhanced code block background styling and UI for language selection menus.
- **Color Theme Switching**: Optimized color theme switching responsiveness.
- **Window Transparency**: Resolved window decoration and transparency rendering issues on Windows and Linux platforms.

---

## [3.1.0] - 2026-10-01

### Fixed
- **Spreadsheet Demo Data Override**: Fixed an issue where the Univer Spreadsheet component would overwrite saved user content with default demo data on reload/initialization.
- **Terminal Connection Issues**: Resolved terminal shell refusing to connect by enhancing shell path detection, fallback handling, environment variable passing, and command palette integration.

### Changed
- **Frontend CSS Centralization**: Centralized common styling and reusable CSS classes in `main.css` across key UI components (File Explorer, Context Menu, Settings Modal, Kanban Board, Task Details, and Markdown Toolbars).
- **Code Cleanups**: General repository maintenance and dependency cleanup.

---

## [3.0.1] - 2026-09-26

### Added
- CI/CD automated release workflow for macOS (x64/arm64), Windows, and Linux.
- macOS installation and unverified developer instructions.

### Fixed
- Increased Node.js memory limit for Vite builds in CI to avoid heap out-of-memory errors.
