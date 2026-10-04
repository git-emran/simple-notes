/**
 * codeBlockEnhancements.ts
 *
 * Production-ready CodeBlock Enhancement for CodeMirror 6:
 *  - Interactive Language Picker Dropdown with search filter & keyboard navigation
 *  - 1-Click Code Copy button with animated feedback
 *  - Language SVG icons for all popular and standard languages
 *  - Smooth, glitch-free text selection across lines without DOM tearing
 *  - Clean Obsidian-themed visual styling
 */

import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  Decoration,
  DecorationSet,
  WidgetType,
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { Range } from '@codemirror/state'

/* ─── Language Icons (Optimized SVGs) ────────────────────────────────────── */

const ICONS: Record<string, string> = {
  javascript: '<svg viewBox="0 0 448 512" width="13" height="13" fill="#f7df1e" xmlns="http://www.w3.org/2000/svg"><path d="M0 32v448h448V32H0zm243.8 349.4c0 43.6-25.6 63.5-62.9 63.5-33.7 0-53.2-17.4-63.2-38.5l34.3-20.7c6.6 11.7 12.6 21.6 27.1 21.6 13.8 0 22.6-5.4 22.6-26.5V237.7h42.1v143.7zm99.6 63.5c-39.1 0-74.4-22.6-74.4-73.5 0-50 35.8-73.5 73.9-73.5 28.3 0 43.2 9.7 54.7 22.6l-28.9 22.3c-7.5-8.5-16.3-13.6-26.2-13.6-18.7 0-31.4 14.1-31.4 39.5 0 25 11.8 39.2 30.5 39.2 12.1 0 21.4-6.4 29.5-16l27.1 23.3c-11.4 15.3-29.4 29.7-54.8 29.7z"/></svg>',
  js: '<svg viewBox="0 0 448 512" width="13" height="13" fill="#f7df1e" xmlns="http://www.w3.org/2000/svg"><path d="M0 32v448h448V32H0zm243.8 349.4c0 43.6-25.6 63.5-62.9 63.5-33.7 0-53.2-17.4-63.2-38.5l34.3-20.7c6.6 11.7 12.6 21.6 27.1 21.6 13.8 0 22.6-5.4 22.6-26.5V237.7h42.1v143.7zm99.6 63.5c-39.1 0-74.4-22.6-74.4-73.5 0-50 35.8-73.5 73.9-73.5 28.3 0 43.2 9.7 54.7 22.6l-28.9 22.3c-7.5-8.5-16.3-13.6-26.2-13.6-18.7 0-31.4 14.1-31.4 39.5 0 25 11.8 39.2 30.5 39.2 12.1 0 21.4-6.4 29.5-16l27.1 23.3c-11.4 15.3-29.4 29.7-54.8 29.7z"/></svg>',
  typescript: '<svg viewBox="0 0 512 512" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="50" fill="#3178c6"/><path fill="#fff" d="M317 407v52c8 4 18 7 29 9s22 3 34 3c11 0 22-1 32-4s19-7 27-13 14-14 19-23 7-21 7-34c0-10-1-19-4-27s-7-15-12-21-12-11-19-16-16-10-25-14c-7-3-13-6-18-9s-10-6-13-9-6-6-8-10-3-8-3-13c0-4 1-8 3-12s5-7 8-10 7-5 12-7 10-2 16-2c4 0 9 0 13 1s9 2 13 4 8 3 11 5 6 4 9 7v-49c-7-2-15-4-24-5s-19-2-30-2c-11 0-21 1-31 4s-19 7-27 13-14 14-19 24-7 22-7 36c0 17 5 32 14 43s23 21 41 29c8 3 15 6 21 10s11 7 15 10 7 7 9 11 3 9 3 14c0 5-1 9-3 13s-5 8-9 11-9 5-15 7-13 2-21 2c-14 0-27-3-40-8s-24-13-33-23zm-84-121h64v-41H152v41h63v178h38z"/></svg>',
  ts: '<svg viewBox="0 0 512 512" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="50" fill="#3178c6"/><path fill="#fff" d="M317 407v52c8 4 18 7 29 9s22 3 34 3c11 0 22-1 32-4s19-7 27-13 14-14 19-23 7-21 7-34c0-10-1-19-4-27s-7-15-12-21-12-11-19-16-16-10-25-14c-7-3-13-6-18-9s-10-6-13-9-6-6-8-10-3-8-3-13c0-4 1-8 3-12s5-7 8-10 7-5 12-7 10-2 16-2c4 0 9 0 13 1s9 2 13 4 8 3 11 5 6 4 9 7v-49c-7-2-15-4-24-5s-19-2-30-2c-11 0-21 1-31 4s-19 7-27 13-14 14-19 24-7 22-7 36c0 17 5 32 14 43s23 21 41 29c8 3 15 6 21 10s11 7 15 10 7 7 9 11 3 9 3 14c0 5-1 9-3 13s-5 8-9 11-9 5-15 7-13 2-21 2c-14 0-27-3-40-8s-24-13-33-23zm-84-121h64v-41H152v41h63v178h38z"/></svg>',
  tsx: '<svg viewBox="0 0 512 512" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="50" fill="#3178c6"/><path fill="#fff" d="M317 407v52c8 4 18 7 29 9s22 3 34 3c11 0 22-1 32-4s19-7 27-13 14-14 19-23 7-21 7-34c0-10-1-19-4-27s-7-15-12-21-12-11-19-16-16-10-25-14c-7-3-13-6-18-9s-10-6-13-9-6-6-8-10-3-8-3-13c0-4 1-8 3-12s5-7 8-10 7-5 12-7 10-2 16-2c4 0 9 0 13 1s9 2 13 4 8 3 11 5 6 4 9 7v-49c-7-2-15-4-24-5s-19-2-30-2c-11 0-21 1-31 4s-19 7-27 13-14 14-19 24-7 22-7 36c0 17 5 32 14 43s23 21 41 29c8 3 15 6 21 10s11 7 15 10 7 7 9 11 3 9 3 14c0 5-1 9-3 13s-5 8-9 11-9 5-15 7-13 2-21 2c-14 0-27-3-40-8s-24-13-33-23zm-84-121h64v-41H152v41h63v178h38z"/></svg>',
  jsx: '<svg viewBox="0 0 448 512" width="13" height="13" fill="#61dafb" xmlns="http://www.w3.org/2000/svg"><path d="M0 32v448h448V32H0zm243.8 349.4c0 43.6-25.6 63.5-62.9 63.5-33.7 0-53.2-17.4-63.2-38.5l34.3-20.7c6.6 11.7 12.6 21.6 27.1 21.6 13.8 0 22.6-5.4 22.6-26.5V237.7h42.1v143.7zm99.6 63.5c-39.1 0-74.4-22.6-74.4-73.5 0-50 35.8-73.5 73.9-73.5 28.3 0 43.2 9.7 54.7 22.6l-28.9 22.3c-7.5-8.5-16.3-13.6-26.2-13.6-18.7 0-31.4 14.1-31.4 39.5 0 25 11.8 39.2 30.5 39.2 12.1 0 21.4-6.4 29.5-16l27.1 23.3c-11.4 15.3-29.4 29.7-54.8 29.7z"/></svg>',
  python: '<svg viewBox="0 0 256 255" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path fill="#3776AB" d="M126.9 0C60.6 0 64.4 28 64.4 28l.1 29h63.7v8.7H40.3S0 61 0 128.3c0 67.2 37.2 64.9 37.2 64.9H59v-31.2s-1.3-37.2 36.6-37.2h63.2s35.4.6 35.4-34.2V35.3S199.9 0 126.9 0zm-35.2 20.3a11.3 11.3 0 110 22.6 11.3 11.3 0 010-22.6z"/><path fill="#FFD43B" d="M129.1 255c66.4 0 62.6-28 62.6-28l-.1-29H128v-8.7h87.9s40.3 4.7 40.3-62.6c0-67.2-37.2-64.9-37.2-64.9H197v31.2s1.3 37.2-36.6 37.2H97.2s-35.4-.6-35.4 34.2v57.5S56.1 255 129.1 255zm35.2-20.3a11.3 11.3 0 110-22.6 11.3 11.3 0 010 22.6z"/></svg>',
  py: '<svg viewBox="0 0 256 255" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path fill="#3776AB" d="M126.9 0C60.6 0 64.4 28 64.4 28l.1 29h63.7v8.7H40.3S0 61 0 128.3c0 67.2 37.2 64.9 37.2 64.9H59v-31.2s-1.3-37.2 36.6-37.2h63.2s35.4.6 35.4-34.2V35.3S199.9 0 126.9 0zm-35.2 20.3a11.3 11.3 0 110 22.6 11.3 11.3 0 010-22.6z"/><path fill="#FFD43B" d="M129.1 255c66.4 0 62.6-28 62.6-28l-.1-29H128v-8.7h87.9s40.3 4.7 40.3-62.6c0-67.2-37.2-64.9-37.2-64.9H197v31.2s1.3 37.2-36.6 37.2H97.2s-35.4-.6-35.4 34.2v57.5S56.1 255 129.1 255zm35.2-20.3a11.3 11.3 0 110-22.6 11.3 11.3 0 010 22.6z"/></svg>',
  html: '<svg viewBox="0 0 512 512" width="13" height="13" fill="#e44d26" xmlns="http://www.w3.org/2000/svg"><path d="M41 460h430l-45-412H86L41 460zm88-301h254l-11 127H178l-5-55h65l2 24h90l4-41H212l-9-55zm183 205l-56 16-56-16-4-45h55l1 14 26 7 26-7 2-26H210l-4-41h172l-10 98z"/></svg>',
  css: '<svg viewBox="0 0 512 512" width="13" height="13" fill="#264de4" xmlns="http://www.w3.org/2000/svg"><path d="M41 460h430l-45-412H86L41 460zm253-157H184l-4-41h172l-10 98-56 16-56-16-4-45h55l1 14 26 7 26-7 2-26zm11-127H184l-9-55h254l-33 375-110 32-110-32-8-91h55l4 55 59 17 59-17 4-45H305l-2-24h177l4-41z"/></svg>',
  json: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#cbcb41" xmlns="http://www.w3.org/2000/svg"><path d="M5 3h2v2H5v5a2 2 0 01-2 2 2 2 0 012 2v5h2v2H5c-1.07-.27-2-.9-2-2v-4a2 2 0 00-2-2H0v-2h1a2 2 0 002-2V5a2 2 0 012-2m14 0a2 2 0 012 2v4a2 2 0 002 2h1v2h-1a2 2 0 00-2 2v4a2 2 0 01-2 2h-2v-2h2v-5a2 2 0 012-2 2 2 0 01-2-2V5h-2V3h2z"/></svg>',
  rust: '<svg viewBox="0 0 106 106" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><circle cx="53" cy="53" r="53" fill="#DEA584"/><path fill="#1a1a1a" d="M53 12a41 41 0 100 82 41 41 0 000-82zm0 8a33 33 0 110 66 33 33 0 010-66z"/></svg>',
  rs: '<svg viewBox="0 0 106 106" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><circle cx="53" cy="53" r="53" fill="#DEA584"/><path fill="#1a1a1a" d="M53 12a41 41 0 100 82 41 41 0 000-82zm0 8a33 33 0 110 66 33 33 0 010-66z"/></svg>',
  go: '<svg viewBox="0 0 100 40" width="18" height="10" fill="#00ACD7" xmlns="http://www.w3.org/2000/svg"><text y="32" font-size="40" font-family="sans-serif" font-weight="bold">Go</text></svg>',
  golang: '<svg viewBox="0 0 100 40" width="18" height="10" fill="#00ACD7" xmlns="http://www.w3.org/2000/svg"><text y="32" font-size="40" font-family="sans-serif" font-weight="bold">Go</text></svg>',
  java: '<svg viewBox="0 0 48 48" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path fill="#f89820" d="M21 34s-4.9 2.8 3.5 3.8c10.1 1.2 15.2.9 26.3-1.1 0 0 2.9 1.8 7 3.4C39.1 45.5 8.9 43.2 21 34zm-2.1-7.2s-5.5 4.1 2.9 5c10.8 1.1 19.3.8 27-1.1 0 0 2 2 5.1 3.1-23.9 6.9-50.7.6-35-7z"/></svg>',
  cpp: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#00599c" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 15.97l.41 2.44c-.26.14-.68.27-1.24.39-.57.13-1.24.2-2.01.2-2.21-.04-3.87-.7-4.98-1.96C1.58 15.77 1 14.16 1 12.21c.05-2.31.72-4.08 2-5.32C4.32 5.55 5.95 4.94 8 5c.75 0 1.4.07 1.94.19.54.13.94.25 1.2.36l-.39 2.5-.64-.27c-.26-.08-.59-.12-.99-.12-1.06.06-1.86.42-2.4 1.08-.56.66-.84 1.55-.84 2.67 0 1.02.25 1.86.76 2.54.51.68 1.31 1.03 2.4 1.05.45 0 .84-.06 1.17-.13l.79-.27.5-.24z"/></svg>',
  'c++': '<svg viewBox="0 0 24 24" width="13" height="13" fill="#00599c" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 15.97l.41 2.44c-.26.14-.68.27-1.24.39-.57.13-1.24.2-2.01.2-2.21-.04-3.87-.7-4.98-1.96C1.58 15.77 1 14.16 1 12.21c.05-2.31.72-4.08 2-5.32C4.32 5.55 5.95 4.94 8 5c.75 0 1.4.07 1.94.19.54.13.94.25 1.2.36l-.39 2.5-.64-.27c-.26-.08-.59-.12-.99-.12-1.06.06-1.86.42-2.4 1.08-.56.66-.84 1.55-.84 2.67 0 1.02.25 1.86.76 2.54.51.68 1.31 1.03 2.4 1.05.45 0 .84-.06 1.17-.13l.79-.27.5-.24z"/></svg>',
  c: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#555555" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z"/><path d="M14.5 8.5a4 4 0 100 7 1 1 0 000-2 2 2 0 110-3 1 1 0 000-2z"/></svg>',
  markdown: '<svg viewBox="0 0 640 512" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M593.8 59.1H46.2C20.7 59.1 0 79.8 0 105.2v301.5c0 25.5 20.7 46.2 46.2 46.2h547.7c25.5 0 46.2-20.7 46.2-46.2V105.2c0-25.4-20.7-46.1-46.3-46.1zM338.3 360.6H258V198.4l-42.5 85.1-42.5-85.1v162.2H92.7V151.4h80.3l42.5 85.1 42.5-85.1h80.3v209.2zm108.9 0l-71.5-98.1h45.8V151.4h51.5v111.1h45.8l-71.6 98.1z"/></svg>',
  md: '<svg viewBox="0 0 640 512" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M593.8 59.1H46.2C20.7 59.1 0 79.8 0 105.2v301.5c0 25.5 20.7 46.2 46.2 46.2h547.7c25.5 0 46.2-20.7 46.2-46.2V105.2c0-25.4-20.7-46.1-46.3-46.1zM338.3 360.6H258V198.4l-42.5 85.1-42.5-85.1v162.2H92.7V151.4h80.3l42.5 85.1 42.5-85.1h80.3v209.2zm108.9 0l-71.5-98.1h45.8V151.4h51.5v111.1h45.8l-71.6 98.1z"/></svg>',
  sql: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#e38c00" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 5v4c0 1.66-4 3-9 3S3 10.66 3 9V5M21 9v4c0 1.66-4 3-9 3s-9-1.34-9-3V9M21 13v4c0 1.66-4 3-9 3s-9-1.34-9-3v-4"/></svg>',
  yaml: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#cb171e" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L2 7l10 5 10-5-4-4M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
  yml: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#cb171e" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L2 7l10 5 10-5-4-4M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
  bash: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
  shell: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
  sh: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
  zsh: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
  mermaid: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#ff3670" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>',
  php: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#8892bf" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 6.5h15a3 3 0 013 3v5a3 3 0 01-3 3h-15a3 3 0 01-3-3v-5a3 3 0 013-3z"/></svg>',
  ruby: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#cc342d" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 9l3 12h14l3-12-10-7zm0 2.5l7.5 5.5-2.2 9H6.7L4.5 10 12 4.5z"/></svg>',
  swift: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#f05138" xmlns="http://www.w3.org/2000/svg"><path d="M21.5 18.5C18.2 21.8 12.5 22 8 19c6.5-1.5 9-6 9-6s-4.5 3-9.5 2c6-3.5 7.5-8 7.5-8s-5 4-11 2.5C6.5 16 11 20 16 21c-5.5 2-12-1-14-6C4 20 11 23 17 21c3-1 4.5-2.5 4.5-2.5z"/></svg>',
  kotlin: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#7f52ff" xmlns="http://www.w3.org/2000/svg"><path d="M2 2h20L12 12 22 22H2z"/></svg>',
  dart: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#0175c2" xmlns="http://www.w3.org/2000/svg"><path d="M4.1 2.4L2.4 4.1l6.9 6.9-6.9 6.9 1.7 1.7 8.6-8.6-8.6-8.6zm7.2 0L9.6 4.1l6.9 6.9-6.9 6.9 1.7 1.7 8.6-8.6-8.6-8.6z"/></svg>',
  dockerfile: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#2496ed" xmlns="http://www.w3.org/2000/svg"><path d="M22.5 10.5c-.3-.2-1.5-.3-2.3.2-.2-.8-.7-1.5-1.5-2l-.6-.3-.3.6c-.4.8-.4 1.7-.1 2.5-.6.4-1.6.5-2.6.5H2c-.6 0-1 .4-1 1 0 4.4 3.6 8 8 8 5.2 0 9.7-3.8 10.4-9 .6-.1 1.9-.3 2.6-1.2.3-.3.5-.7.5-.9 0 0-.6-.2-.7.2zM4 11h2v2H4zm3 0h2v2H7zm3 0h2v2h-2zm3 0h2v2h-2zm-6-3h2v2H7zm3 0h2v2h-2zm3 0h2v2h-2zm0-3h2v2h-2z"/></svg>',
}

const FALLBACK_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>'
const CHEVRON_ICON = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
const COPY_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'
const CHECK_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'

/* ─── Languages Catalog ─────────────────────────────────────────────────── */

interface LanguageItem {
  id: string
  name: string
  popular?: boolean
}

const LANGUAGE_LIST: LanguageItem[] = [
  { id: 'typescript', name: 'TypeScript', popular: true },
  { id: 'javascript', name: 'JavaScript', popular: true },
  { id: 'python', name: 'Python', popular: true },
  { id: 'rust', name: 'Rust', popular: true },
  { id: 'go', name: 'Go', popular: true },
  { id: 'html', name: 'HTML', popular: true },
  { id: 'css', name: 'CSS', popular: true },
  { id: 'json', name: 'JSON', popular: true },
  { id: 'sql', name: 'SQL', popular: true },
  { id: 'bash', name: 'Bash / Shell', popular: true },
  { id: 'markdown', name: 'Markdown', popular: true },
  { id: 'mermaid', name: 'Mermaid Diagram', popular: true },
  { id: 'cpp', name: 'C++', popular: true },
  { id: 'c', name: 'C', popular: true },
  { id: 'java', name: 'Java', popular: true },
  { id: 'yaml', name: 'YAML', popular: true },
  { id: 'php', name: 'PHP' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'swift', name: 'Swift' },
  { id: 'kotlin', name: 'Kotlin' },
  { id: 'dart', name: 'Dart' },
  { id: 'dockerfile', name: 'Dockerfile' },
  { id: 'xml', name: 'XML' },
  { id: 'lua', name: 'Lua' },
  { id: 'r', name: 'R' },
  { id: 'scala', name: 'Scala' },
  { id: 'haskell', name: 'Haskell' },
  { id: 'elixir', name: 'Elixir' },
  { id: 'clojure', name: 'Clojure' },
  { id: 'diff', name: 'Diff' },
  { id: 'toml', name: 'TOML' },
  { id: 'latex', name: 'LaTeX' },
  { id: 'powershell', name: 'PowerShell' },
]

/* ─── Global Language Dropdown Manager ──────────────────────────────────── */

let activeDropdownCleanup: (() => void) | null = null

function closeActiveDropdown() {
  if (activeDropdownCleanup) {
    activeDropdownCleanup()
    activeDropdownCleanup = null
  }
}

/* ─── Header Widget ──────────────────────────────────────────────────────── */

class CodeBlockHeaderWidget extends WidgetType {
  constructor(
    readonly lang: string,
    readonly meta: string,
    readonly codeContent: string,
    readonly langFrom: number,
    readonly langTo: number
  ) {
    super()
  }

  eq(other: CodeBlockHeaderWidget) {
    return (
      this.lang === other.lang &&
      this.meta === other.meta &&
      this.codeContent === other.codeContent &&
      this.langFrom === other.langFrom &&
      this.langTo === other.langTo
    )
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('div')
    wrap.className = 'cm-codeblock-header'

    const left = document.createElement('div')
    left.className = 'cm-codeblock-header-left'

    // Language selector button (with icon + label + chevron)
    const langBtn = document.createElement('button')
    langBtn.type = 'button'
    langBtn.className = 'cm-codeblock-lang-btn'
    langBtn.title = 'Click to switch language'

    const iconSpan = document.createElement('span')
    iconSpan.className = 'cm-codeblock-icon'
    const langKey = this.lang.toLowerCase()
    iconSpan.innerHTML = ICONS[langKey] ?? FALLBACK_ICON

    const labelSpan = document.createElement('span')
    labelSpan.className = 'cm-codeblock-lang-text'
    labelSpan.textContent = this.lang ? this.lang.toUpperCase() : 'PLAIN TEXT'

    const chevronSpan = document.createElement('span')
    chevronSpan.className = 'cm-codeblock-chevron'
    chevronSpan.innerHTML = CHEVRON_ICON

    langBtn.appendChild(iconSpan)
    langBtn.appendChild(labelSpan)
    langBtn.appendChild(chevronSpan)

    // Language dropdown menu logic
    langBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()

      // Toggle dropdown
      if (wrap.querySelector('.cm-codeblock-dropdown')) {
        closeActiveDropdown()
        return
      }

      closeActiveDropdown()
      this.openLanguageDropdown(wrap, view, langBtn)
    })

    left.appendChild(langBtn)

    if (this.meta) {
      const metaLabel = document.createElement('span')
      metaLabel.className = 'cm-codeblock-meta'
      metaLabel.textContent = this.meta
      left.appendChild(metaLabel)
    }

    // Copy Button with animated feedback
    const copyBtn = document.createElement('button')
    copyBtn.type = 'button'
    copyBtn.className = 'cm-code-copy-btn'
    copyBtn.title = 'Copy code'

    const copyIconSpan = document.createElement('span')
    copyIconSpan.className = 'cm-copy-icon'
    copyIconSpan.innerHTML = COPY_ICON

    const copyTextSpan = document.createElement('span')
    copyTextSpan.textContent = 'Copy'

    copyBtn.appendChild(copyIconSpan)
    copyBtn.appendChild(copyTextSpan)

    let copyTimer: number | null = null
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()

      navigator.clipboard.writeText(this.codeContent).catch(() => {})

      copyIconSpan.innerHTML = CHECK_ICON
      copyTextSpan.textContent = 'Copied!'
      copyBtn.classList.add('cm-code-copy-btn--ok')

      if (copyTimer !== null) clearTimeout(copyTimer)
      copyTimer = window.setTimeout(() => {
        copyIconSpan.innerHTML = COPY_ICON
        copyTextSpan.textContent = 'Copy'
        copyBtn.classList.remove('cm-code-copy-btn--ok')
        copyTimer = null
      }, 2000)
    })

    wrap.appendChild(left)
    wrap.appendChild(copyBtn)
    return wrap
  }

  private openLanguageDropdown(container: HTMLElement, view: EditorView, triggerBtn: HTMLElement) {
    const dropdown = document.createElement('div')
    dropdown.className = 'cm-codeblock-dropdown'

    // 1. Search Input
    const searchWrap = document.createElement('div')
    searchWrap.className = 'cm-codeblock-dropdown-search'

    const searchInput = document.createElement('input')
    searchInput.type = 'text'
    searchInput.placeholder = 'Search language...'
    searchInput.className = 'cm-codeblock-dropdown-input'
    searchInput.spellcheck = false
    searchInput.autocomplete = 'off'

    searchWrap.appendChild(searchInput)
    dropdown.appendChild(searchWrap)

    // 2. Options List
    const list = document.createElement('div')
    list.className = 'cm-codeblock-dropdown-list'
    dropdown.appendChild(list)

    let filtered = [...LANGUAGE_LIST]
    let selectedIndex = 0

    const selectLanguage = (item: LanguageItem) => {
      closeActiveDropdown()
      view.dispatch({
        changes: {
          from: this.langFrom,
          to: this.langTo,
          insert: item.id
        },
        scrollIntoView: false
      })
      view.focus()
    }

    const renderList = () => {
      list.innerHTML = ''
      if (filtered.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'cm-codeblock-dropdown-empty'
        empty.textContent = 'No matching language'
        list.appendChild(empty)
        return
      }

      filtered.forEach((item, index) => {
        const row = document.createElement('div')
        row.className = `cm-codeblock-dropdown-item ${index === selectedIndex ? 'is-selected' : ''}`
        
        const rowIcon = document.createElement('span')
        rowIcon.className = 'cm-codeblock-dropdown-icon'
        rowIcon.innerHTML = ICONS[item.id] ?? FALLBACK_ICON

        const rowName = document.createElement('span')
        rowName.className = 'cm-codeblock-dropdown-name'
        rowName.textContent = item.name

        const rowId = document.createElement('span')
        rowId.className = 'cm-codeblock-dropdown-id'
        rowId.textContent = item.id

        row.appendChild(rowIcon)
        row.appendChild(rowName)
        row.appendChild(rowId)

        row.addEventListener('mouseenter', () => {
          selectedIndex = index
          updateSelectedClass()
        })

        row.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          selectLanguage(item)
        })

        list.appendChild(row)
      })

      // Scroll active item into view
      const activeEl = list.children[selectedIndex] as HTMLElement | undefined
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }

    const updateSelectedClass = () => {
      Array.from(list.children).forEach((child, i) => {
        if (i === selectedIndex) child.classList.add('is-selected')
        else child.classList.remove('is-selected')
      })
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase()
      if (!q) {
        filtered = [...LANGUAGE_LIST]
      } else {
        filtered = LANGUAGE_LIST.filter(
          (l) => l.id.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
        )
      }
      selectedIndex = 0
      renderList()
    })

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        selectedIndex = (selectedIndex + 1) % Math.max(1, filtered.length)
        updateSelectedClass()
        const activeEl = list.children[selectedIndex] as HTMLElement | undefined
        activeEl?.scrollIntoView({ block: 'nearest' })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        selectedIndex = (selectedIndex - 1 + filtered.length) % Math.max(1, filtered.length)
        updateSelectedClass()
        const activeEl = list.children[selectedIndex] as HTMLElement | undefined
        activeEl?.scrollIntoView({ block: 'nearest' })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          selectLanguage(filtered[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        closeActiveDropdown()
        view.focus()
      }
    })

    renderList()
    container.appendChild(dropdown)

    // Focus input on next frame
    requestAnimationFrame(() => {
      searchInput.focus()
    })

    // Outside click listener
    const onDocClick = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node) && !triggerBtn.contains(e.target as Node)) {
        closeActiveDropdown()
      }
    }

    document.addEventListener('mousedown', onDocClick, { capture: true })

    activeDropdownCleanup = () => {
      document.removeEventListener('mousedown', onDocClick, { capture: true })
      if (dropdown.parentNode) {
        dropdown.parentNode.removeChild(dropdown)
      }
    }
  }

  ignoreEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null
    if (!target) return false
    return Boolean(
      target.closest('button') ||
      target.closest('input') ||
      target.closest('.cm-codeblock-dropdown') ||
      target.closest('.cm-codeblock-lang-btn') ||
      target.closest('.cm-code-copy-btn')
    )
  }
}

/* ─── Parser Helper ──────────────────────────────────────────────────────── */

interface FenceInfo {
  openLineTo: number
  startLine: number
  endLine: number
  lang: string
  langFrom: number
  langTo: number
  meta: string
  code: string
}

function parseFence(view: EditorView, nodeFrom: number, nodeTo: number): FenceInfo | null {
  try {
    const doc = view.state.doc
    const totalLines = doc.lines
    const startLine = doc.lineAt(Math.min(nodeFrom, doc.length)).number
    const endLine = doc.lineAt(Math.min(nodeTo, doc.length)).number
    if (startLine < 1 || startLine > totalLines || endLine < startLine) return null

    const openLine = doc.line(startLine)
    const m = openLine.text.match(/^(\s*`{3,})\s*([^\s`]*)?\s*(.*)$/)
    const lang = m?.[2] ?? ''
    const meta = (m?.[3] ?? '').trim()
    const opening = m?.[1] ?? '```'
    const spaces = openLine.text.slice(opening.length).match(/^\s*/)?.[0] ?? ''
    const langFrom = openLine.from + opening.length + spaces.length
    const langTo = langFrom + lang.length

    let code = ''
    if (endLine > startLine + 1) {
      const cFrom = doc.line(Math.min(startLine + 1, totalLines)).from
      const cTo = doc.line(Math.min(endLine - 1, totalLines)).to
      if (cFrom <= cTo) code = view.state.sliceDoc(cFrom, cTo)
    }

    return { openLineTo: openLine.to, startLine, endLine, lang, langFrom, langTo, meta, code }
  } catch {
    return null
  }
}

/* ─── Plugin 1: Header Widget Plugin ─────────────────────────────────────── */

const codeBlockHeaderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.build(view)
    }

    update(update: ViewUpdate) {
      // Rebuild ONLY on doc/viewport change — NEVER on selectionSet
      // This prevents destroying the DOM while the user is actively selecting text!
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.build(update.view)
      }
    }

    build(view: EditorView): DecorationSet {
      const ranges: Range<Decoration>[] = []
      const seen = new Set<number>()

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from,
          to,
          enter: (node) => {
            if (node.name !== 'FencedCode') return
            if (seen.has(node.from)) return
            seen.add(node.from)

            const info = parseFence(view, node.from, node.to)
            if (!info) return

            ranges.push(
              Decoration.widget({
                widget: new CodeBlockHeaderWidget(
                  info.lang,
                  info.meta,
                  info.code,
                  info.langFrom,
                  info.langTo
                ),
                side: 1,
                block: false
              }).range(info.openLineTo)
            )
          }
        })
      }

      return Decoration.set(ranges, true)
    }
  },
  { decorations: (v) => v.decorations }
)

/* ─── Plugin 2: Line Styling Plugin ──────────────────────────────────────── */

const lineDecoFirst = Decoration.line({ attributes: { class: 'cm-codeblock-line cm-codeblock-line-first' } })
const lineDecoMiddle = Decoration.line({ attributes: { class: 'cm-codeblock-line' } })
const lineDecoLast = Decoration.line({ attributes: { class: 'cm-codeblock-line cm-codeblock-line-last' } })
const lineDecoSingle = Decoration.line({ attributes: { class: 'cm-codeblock-line cm-codeblock-line-first cm-codeblock-line-last' } })

const codeBlockLinePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.build(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.build(update.view)
      }
    }

    build(view: EditorView): DecorationSet {
      const ranges: Range<Decoration>[] = []
      const seen = new Set<number>()

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from,
          to,
          enter: (node) => {
            if (node.name !== 'FencedCode' && node.name !== 'CodeBlock') return
            if (seen.has(node.from)) return
            seen.add(node.from)

            const info = parseFence(view, node.from, node.to)
            if (!info) return

            const { startLine, endLine } = info
            const doc = view.state.doc

            for (let i = startLine; i <= endLine; i++) {
              try {
                const line = doc.line(i)
                const deco =
                  startLine === endLine
                    ? lineDecoSingle
                    : i === startLine
                    ? lineDecoFirst
                    : i === endLine
                    ? lineDecoLast
                    : lineDecoMiddle
                ranges.push(deco.range(line.from))
              } catch {
                // skip during fast typing
              }
            }
          }
        })
      }

      return Decoration.set(ranges, true)
    }
  },
  { decorations: (v) => v.decorations }
)

/* ─── Theme ──────────────────────────────────────────────────────────────── */

const codeBlockTheme = EditorView.baseTheme({
  '.cm-codeblock-line': {
    backgroundColor: 'rgba(120, 120, 120, 0.045)',
    borderLeft: '1px solid var(--obsidian-border)',
    borderRight: '1px solid var(--obsidian-border)',
    lineHeight: '1.65',
    paddingLeft: '10px !important',
    paddingRight: '10px !important',
  },
  '&dark .cm-codeblock-line': {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  '.cm-codeblock-line-first': {
    position: 'relative',
    borderTop: '1px solid var(--obsidian-border)',
    borderTopLeftRadius: '7px',
    borderTopRightRadius: '7px',
    paddingTop: '28px !important',
  },
  '.cm-codeblock-line-last': {
    borderBottom: '1px solid var(--obsidian-border)',
    borderBottomLeftRadius: '7px',
    borderBottomRightRadius: '7px',
    paddingBottom: '4px !important',
  },

  /* Header Bar */
  '.cm-codeblock-header': {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
    fontSize: '11px',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
    borderBottom: '1px solid var(--obsidian-border)',
    backgroundColor: 'var(--obsidian-pane)',
    color: 'var(--obsidian-text-muted)',
    boxSizing: 'border-box',
    zIndex: '4',
    userSelect: 'none',
  },
  '.cm-codeblock-header-left': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    position: 'relative',
  },
  '.cm-codeblock-icon': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
  },
  '.cm-codeblock-lang-btn': {
    appearance: 'none',
    border: 'none',
    background: 'transparent',
    color: 'var(--obsidian-text)',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontWeight: '600',
    fontSize: '10px',
    letterSpacing: '.06em',
    transition: 'background-color 120ms ease, color 120ms ease',
  },
  '.cm-codeblock-lang-btn:hover': {
    backgroundColor: 'var(--obsidian-hover)',
    color: 'var(--obsidian-text)',
  },
  '.cm-codeblock-chevron': {
    display: 'inline-flex',
    alignItems: 'center',
    opacity: '0.6',
    transition: 'transform 120ms ease',
  },
  '.cm-codeblock-lang-btn:hover .cm-codeblock-chevron': {
    opacity: '1',
  },
  '.cm-codeblock-meta': {
    fontFamily: 'monospace',
    fontSize: '10px',
    opacity: '.6',
    color: 'var(--obsidian-text-muted)',
    maxWidth: '160px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /* Copy Button */
  '.cm-code-copy-btn': {
    appearance: 'none',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    padding: '2px 7px',
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '.04em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    opacity: '0',
    borderRadius: '4px',
    color: 'var(--obsidian-text-muted)',
    transition: 'opacity 150ms ease, background-color 150ms ease, color 150ms ease',
    pointerEvents: 'auto',
    flexShrink: '0',
  },
  '.cm-copy-icon': {
    display: 'inline-flex',
    alignItems: 'center',
  },
  '.cm-codeblock-header:hover .cm-code-copy-btn, .cm-code-copy-btn--ok': {
    opacity: '1 !important',
  },
  '.cm-code-copy-btn:hover': {
    backgroundColor: 'var(--obsidian-hover)',
    color: 'var(--obsidian-text)',
  },
  '.cm-code-copy-btn--ok': {
    color: '#22c55e !important',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },

  /* Dropdown Popover */
  '.cm-codeblock-dropdown': {
    position: 'absolute',
    top: '28px',
    left: '0',
    width: '240px',
    backgroundColor: 'var(--obsidian-surface)',
    border: '1px solid var(--obsidian-border)',
    borderRadius: '8px',
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.28)',
    zIndex: '100',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    animation: 'cm-codeblock-pop .15s ease-out',
  },
  '@keyframes cm-codeblock-pop': {
    from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
    to: { opacity: '1', transform: 'translateY(0) scale(1)' },
  },
  '.cm-codeblock-dropdown-search': {
    padding: '6px',
    borderBottom: '1px solid var(--obsidian-border-soft)',
    backgroundColor: 'var(--obsidian-workspace)',
  },
  '.cm-codeblock-dropdown-input': {
    width: '100%',
    padding: '5px 8px',
    fontSize: '12px',
    borderRadius: '5px',
    border: '1px solid var(--obsidian-border)',
    backgroundColor: 'var(--obsidian-pane)',
    color: 'var(--obsidian-text)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  '.cm-codeblock-dropdown-input:focus': {
    borderColor: 'var(--obsidian-accent)',
    boxShadow: '0 0 0 2px var(--obsidian-accent-dim)',
  },
  '.cm-codeblock-dropdown-list': {
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '4px',
  },
  '.cm-codeblock-dropdown-item': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 8px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'var(--obsidian-text)',
    transition: 'background-color 80ms ease',
  },
  '.cm-codeblock-dropdown-item.is-selected, .cm-codeblock-dropdown-item:hover': {
    backgroundColor: 'var(--obsidian-hover)',
  },
  '.cm-codeblock-dropdown-icon': {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: '0',
  },
  '.cm-codeblock-dropdown-name': {
    flex: '1',
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.cm-codeblock-dropdown-id': {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: 'var(--obsidian-text-muted)',
    opacity: '0.7',
  },
  '.cm-codeblock-dropdown-empty': {
    padding: '12px',
    fontSize: '11px',
    color: 'var(--obsidian-text-muted)',
    textAlign: 'center',
  },
})

/* ─── Export ─────────────────────────────────────────────────────────────── */

export const codeBlockEnhancements = [
  codeBlockHeaderPlugin,
  codeBlockLinePlugin,
  codeBlockTheme,
]
