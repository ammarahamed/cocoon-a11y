# Cocoon A11y ♿

**The free, open-source accessibility widget for any website. One line of code. Zero dependencies. No tracking.**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-green.svg)](#)
[![GDPR Compliant](https://img.shields.io/badge/GDPR-Compliant-green.svg)](#)
[![WCAG 2.2](https://img.shields.io/badge/WCAG-2.2-green.svg)](#)
[![~18KB](https://img.shields.io/badge/Size-~18KB-blue.svg)](#)

---

## Quick Start

Add one line to your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/cocoon-a11y/a11y.min.js"></script>
```

That's it. A floating accessibility button appears on your site with 25+ features.

---

## Features

### 🔊 Read Aloud
| Feature | Description |
|---------|-------------|
| Read Entire Page | Text-to-speech for all visible page content |
| Read Selected Text | Speak only highlighted text |
| Pause / Resume | Full playback control |
| Speed Control | 0.5x to 2x speed slider |
| Chunked Speech | Splits text into ~200-char sentences to fix Chrome's 15-second bug |
| Chrome Keep-Alive | Pause/resume every 8s to prevent Chrome auto-stop |

### 👁 Vision
| Feature | Description |
|---------|-------------|
| High Contrast | Increases page contrast by 1.5x |
| Dark Mode | Inverts colors (excludes images and the widget) |
| Light Mode | Forces white background with dark text |
| Desaturate | Full grayscale mode |
| Protanopia Filter | Red-blind color simulation |
| Deuteranopia Filter | Green-blind color simulation |
| Tritanopia Filter | Blue-blind color simulation |
| Big Cursor | Large green dot cursor for visibility |
| Hide Images | Fades out all images for focus |

### 📖 Reading
| Feature | Description |
|---------|-------------|
| Bigger Text (120%) | Moderate text enlargement |
| Largest Text (150%) | Maximum text enlargement |
| Text Spacing | Increased letter and word spacing |
| Line Height | Sets line height to 2.0 |
| Dyslexia Font | OpenDyslexic / Comic Sans fallback |
| Highlight Links | Green outlines on all links |
| Word Spacing | Increased word spacing only |
| Monospace Font | Switches to monospace font stack |

### 🧭 Navigation
| Feature | Description |
|---------|-------------|
| Reading Guide | Horizontal ruler follows your cursor |
| Focus Highlight | Enhanced focus outlines for keyboard navigation |
| Stop Animations | Pauses all CSS animations and transitions |
| Skip to Content | Adds a skip link (visible on Tab) |
| Page Structure | Lists all headings as a navigable menu |
| Tab Navigator | Visual indicator around focused element |

### 📊 Page Info
| Feature | Description |
|---------|-------------|
| Heading Tree | View all h1-h6 headings with click-to-scroll |
| ARIA Landmarks | View all landmark regions on the page |

---

## Configuration

All configuration is done via `data-` attributes on the script tag:

```html
<!-- All options -->
<script
  src="a11y.js"
  data-position="bottom-right"
  data-color="#1dda63"
  data-persist="true"
  data-button-size="md"
  data-labels='{"title":"Accessibilité","reset":"Réinitialiser"}'
></script>
```

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `data-position` | `bottom-right`, `bottom-left`, `top-right`, `top-left` | `bottom-right` | Widget button position |
| `data-color` | Any hex color | `#1dda63` | Accent color for the widget |
| `data-persist` | `true`, `false` | `false` | Save user preferences to localStorage |
| `data-button-size` | `sm` (48px), `md` (56px), `lg` (64px) | `md` | Toggle button size |
| `data-labels` | JSON string | English | Override any UI text for i18n |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + A` | Toggle the accessibility panel |
| `Escape` | Close the panel |
| Click outside | Close the panel |

---

## Comparison

| Feature | Cocoon A11y | Other Tools |
|---------|:-----------:|:-----------:|
| **Price** | **Free** | $49/mo–$490/yr+ |
| **Open Source** | **Yes (MIT)** | Proprietary |
| **Dependencies** | **0** | Usually many |
| **Text-to-Speech** | ✅ | Sometimes |
| **Color Blind Filters** | ✅ (3) | Sometimes |
| **Dyslexia Font** | ✅ | Sometimes |
| **Reading Guide** | ✅ | Rarely |
| **Page Structure** | ✅ | Rarely |
| **No Tracking** | ✅ | Often tracks usage |
| **GDPR by Design** | ✅ | Partial |
| **No Region Blocking** | ✅ | Some regions blocked |
| **Size** | ~18KB | ~120–200KB+ |

---

## Browser Support

- Chrome 80+
- Firefox 78+
- Safari 14+
- Edge 80+
- Mobile browsers (responsive panel)

Features requiring specific APIs (Web Speech) gracefully degrade — sections hide automatically if unsupported.

---

## Technical Details

- **Pure vanilla JavaScript** — zero runtime dependencies
- **Scoped CSS** — all styles use the `ca11y` prefix, won't conflict with your site
- **Widget isolation** — the widget is never affected by its own accessibility modes (dark mode, invert, contrast, etc.)
- **RTL support** — widget position auto-flips for right-to-left languages
- **100% client-side** — no external requests, no cookies, no tracking
- **GDPR compliant** — by architecture, not by policy

---

## Why This Exists

Some accessibility tools are blocked in Sri Lanka and other regions. Others cost hundreds per year. Most free alternatives are limited or abandoned.

**Accessibility shouldn't be paywalled.** Every website deserves to be accessible, regardless of budget or geography.

---

## npm

```bash
npm install cocoon-a11y
```

```html
<script src="node_modules/cocoon-a11y/a11y.min.js"></script>
```

Or use a CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/cocoon-a11y/a11y.min.js"></script>
<script src="https://unpkg.com/cocoon-a11y/a11y.min.js"></script>
```

---

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please follow the existing code style and add comments for new features.

---

MIT License. See [LICENSE](LICENSE) for details.

Free and open source — use it anywhere, including commercially. A credit to [Cocoon](https://mycocoon.life) is appreciated but not required.

---

## Credits

Built by [Cocoon](https://mycocoon.life) — making the web accessible for everyone.
