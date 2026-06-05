/**
 * Cocoon A11y — The free, open-source accessibility widget.
 * One line of code. Zero dependencies. No tracking.
 *
 * @version 1.0.0
 * @license MIT
 * @author Cocoon (https://mycocoon.life)
 * @see https://github.com/cocoon-labs/cocoon-a11y
 *
 * Copyright (c) 2026 Cocoon
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */

(function () {
  "use strict";

  // ── Prevent double-init ──────────────────────────────────────────────
  if (window.__cocoonA11yLoaded) return;
  window.__cocoonA11yLoaded = true;

  // ── Configuration from script tag ────────────────────────────────────
  var scriptEl =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (/a11y(\.min)?\.js/.test(scripts[i].src)) return scripts[i];
      }
      return null;
    })();

  var CFG = {
    position: (scriptEl && scriptEl.getAttribute("data-position")) || "bottom-right",
    color: (scriptEl && scriptEl.getAttribute("data-color")) || "#1dda63",
    persist: (scriptEl && scriptEl.getAttribute("data-persist")) === "true",
    buttonSize: (scriptEl && scriptEl.getAttribute("data-button-size")) || "md",
    labels: null,
  };

  // Parse custom labels if provided
  try {
    var labelsAttr = scriptEl && scriptEl.getAttribute("data-labels");
    if (labelsAttr) CFG.labels = JSON.parse(labelsAttr);
  } catch (e) {
    /* ignore parse errors */
  }

  // ── Constants ────────────────────────────────────────────────────────
  var PREFIX = "ca11y";
  var STORAGE_KEY = "cocoon-a11y-state";
  var BTN_SIZES = { sm: 48, md: 56, lg: 64 };
  var btnSize = BTN_SIZES[CFG.buttonSize] || 56;

  // ── Default labels (English) ─────────────────────────────────────────
  var LABELS = Object.assign(
    {
      title: "Accessibility",
      reset: "Reset All",
      close: "Close",
      // Read Aloud
      sectionRead: "Read Aloud",
      readPage: "Read Entire Page",
      readSelected: "Read Selected Text",
      stopReading: "Stop Reading",
      pauseReading: "Pause",
      resumeReading: "Resume",
      speed: "Speed",
      // Vision
      sectionVision: "Vision",
      highContrast: "High Contrast",
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
      desaturate: "Desaturate",
      protanopia: "Protanopia Filter",
      deuteranopia: "Deuteranopia Filter",
      tritanopia: "Tritanopia Filter",
      bigCursor: "Big Cursor",
      hideImages: "Hide Images",
      // Reading
      sectionReading: "Reading",
      biggerText: "Bigger Text (120%)",
      largestText: "Largest Text (150%)",
      textSpacing: "Text Spacing",
      lineHeight: "Line Height",
      dyslexiaFont: "Dyslexia Font",
      highlightLinks: "Highlight Links",
      wordSpacing: "Word Spacing",
      monoFont: "Monospace Font",
      // Navigation
      sectionNav: "Navigation",
      readingGuide: "Reading Guide",
      focusHighlight: "Focus Highlight",
      stopAnimations: "Stop Animations",
      skipToContent: "Skip to Content",
      pageStructure: "Page Structure",
      tabIndicator: "Tab Navigator",
      // Page Info
      sectionInfo: "Page Info",
      showStructure: "Heading Tree",
      showLandmarks: "ARIA Landmarks",
    },
    CFG.labels || {}
  );

  // ── State ────────────────────────────────────────────────────────────
  var state = loadState();
  var panelOpen = false;
  var speechQueue = [];
  var speechIndex = 0;
  var speechPaused = false;
  var speechKeepAlive = null;
  var speechRate = state.speechRate || 1;
  var readingGuideEl = null;
  var skipLinkEl = null;
  var structurePanel = null;
  var tabIndicatorEl = null;

  // ── Utility helpers ──────────────────────────────────────────────────

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") node.className = attrs[k];
        else if (k === "textContent") node.textContent = attrs[k];
        else if (k === "innerHTML") node.innerHTML = attrs[k];
        else if (k.indexOf("on") === 0)
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      children.forEach(function (c) {
        if (typeof c === "string") node.appendChild(document.createTextNode(c));
        else if (c) node.appendChild(c);
      });
    }
    return node;
  }

  function loadState() {
    if (!CFG.persist) return {};
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveState() {
    if (!CFG.persist) return;
    try {
      var s = Object.assign({}, state);
      s.speechRate = speechRate;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {
      /* quota exceeded, etc */
    }
  }

  function isRTL() {
    return (
      document.documentElement.getAttribute("dir") === "rtl" ||
      getComputedStyle(document.documentElement).direction === "rtl"
    );
  }

  // ── SVG filter definitions for color blindness ───────────────────────
  function ensureSVGFilters() {
    if ($("#" + PREFIX + "-svg-filters")) return;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", PREFIX + "-svg-filters");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
    svg.innerHTML = [
      '<defs>',
      // Protanopia
      '<filter id="' + PREFIX + '-protanopia">',
      '<feColorMatrix type="matrix" values="',
      "0.567 0.433 0     0 0 ",
      "0.558 0.442 0     0 0 ",
      "0     0.242 0.758 0 0 ",
      "0     0     0     1 0",
      '"/>',
      "</filter>",
      // Deuteranopia
      '<filter id="' + PREFIX + '-deuteranopia">',
      '<feColorMatrix type="matrix" values="',
      "0.625 0.375 0     0 0 ",
      "0.7   0.3   0     0 0 ",
      "0     0.3   0.7   0 0 ",
      "0     0     0     1 0",
      '"/>',
      "</filter>",
      // Tritanopia
      '<filter id="' + PREFIX + '-tritanopia">',
      '<feColorMatrix type="matrix" values="',
      "0.95 0.05  0     0 0 ",
      "0    0.433 0.567 0 0 ",
      "0    0.475 0.525 0 0 ",
      "0    0     0     1 0",
      '"/>',
      "</filter>",
      "</defs>",
    ].join("");
    document.body.appendChild(svg);
  }

  // ── CSS injection ────────────────────────────────────────────────────
  function injectStyles() {
    var accent = CFG.color;
    var css = [
      // Scope everything under our prefix
      "/* Cocoon A11y Widget Styles */",

      // Widget isolation — never affected by page accessibility modes
      "#" + PREFIX + "-wrap, #" + PREFIX + "-wrap * {",
      "  all: revert !important;",
      "  box-sizing: border-box !important;",
      "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;",
      "  line-height: 1.4 !important;",
      "  letter-spacing: normal !important;",
      "  word-spacing: normal !important;",
      "}",

      // Widget wrapper
      "#" + PREFIX + "-wrap {",
      "  position: fixed !important;",
      "  z-index: 2147483647 !important;",
      "  filter: none !important;",
      "  transform: none !important;",
      "  opacity: 1 !important;",
      "  pointer-events: auto !important;",
      "}",

      // Remove ALL outlines inside the widget
      "#" + PREFIX + "-wrap *:focus,",
      "#" + PREFIX + "-wrap *:active,",
      "#" + PREFIX + "-wrap *:focus-visible {",
      "  outline: none !important;",
      "  box-shadow: none !important;",
      "}",

      // Toggle button
      "#" + PREFIX + "-btn {",
      "  width: " + btnSize + "px !important;",
      "  height: " + btnSize + "px !important;",
      "  border-radius: 50% !important;",
      "  background: " + accent + " !important;",
      "  border: none !important;",
      "  cursor: pointer !important;",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  justify-content: center !important;",
      "  box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;",
      "  transition: transform 0.2s ease, box-shadow 0.2s ease !important;",
      "  padding: 0 !important;",
      "  outline: none !important;",
      "}",
      "#" + PREFIX + "-btn:hover {",
      "  transform: scale(1.08) !important;",
      "  box-shadow: 0 6px 24px rgba(0,0,0,0.4) !important;",
      "}",
      "#" + PREFIX + "-btn svg {",
      "  width: 28px !important;",
      "  height: 28px !important;",
      "  fill: #fff !important;",
      "}",

      // Panel
      "#" + PREFIX + "-panel {",
      "  position: fixed !important;",
      "  width: 380px !important;",
      "  max-height: 80vh !important;",
      "  background: #1a1a2e !important;",
      "  border-radius: 16px !important;",
      "  box-shadow: 0 12px 48px rgba(0,0,0,0.5) !important;",
      "  overflow: hidden !important;",
      "  display: flex !important;",
      "  flex-direction: column !important;",
      "  transition: opacity 0.25s ease, transform 0.25s ease !important;",
      "  z-index: 2147483647 !important;",
      "  filter: none !important;",
      "  color: #e0e0e0 !important;",
      "  font-size: 14px !important;",
      "}",
      "#" + PREFIX + "-panel[aria-hidden='true'] {",
      "  opacity: 0 !important;",
      "  transform: scale(0.95) translateY(8px) !important;",
      "  pointer-events: none !important;",
      "}",
      "#" + PREFIX + "-panel[aria-hidden='false'] {",
      "  opacity: 1 !important;",
      "  transform: scale(1) translateY(0) !important;",
      "}",

      // Panel header
      "." + PREFIX + "-header {",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  justify-content: space-between !important;",
      "  padding: 16px 20px !important;",
      "  background: #16162a !important;",
      "  border-bottom: 1px solid #2a2a4a !important;",
      "}",
      "." + PREFIX + "-header h2 {",
      "  margin: 0 !important;",
      "  font-size: 18px !important;",
      "  font-weight: 700 !important;",
      "  color: #fff !important;",
      "}",
      "." + PREFIX + "-header-actions {",
      "  display: flex !important;",
      "  gap: 8px !important;",
      "  align-items: center !important;",
      "}",
      "." + PREFIX + "-header-btn {",
      "  background: #2a2a4a !important;",
      "  border: none !important;",
      "  color: #ccc !important;",
      "  padding: 6px 12px !important;",
      "  border-radius: 8px !important;",
      "  cursor: pointer !important;",
      "  font-size: 12px !important;",
      "  font-weight: 600 !important;",
      "  transition: background 0.15s !important;",
      "  outline: none !important;",
      "}",
      "." + PREFIX + "-header-btn:hover {",
      "  background: #3a3a5a !important;",
      "}",
      "." + PREFIX + "-close-btn {",
      "  background: transparent !important;",
      "  border: none !important;",
      "  color: #888 !important;",
      "  font-size: 22px !important;",
      "  cursor: pointer !important;",
      "  padding: 4px 8px !important;",
      "  line-height: 1 !important;",
      "  border-radius: 6px !important;",
      "  transition: color 0.15s, background 0.15s !important;",
      "  outline: none !important;",
      "}",
      "." + PREFIX + "-close-btn:hover {",
      "  color: #fff !important;",
      "  background: rgba(255,255,255,0.1) !important;",
      "}",

      // Panel body
      "." + PREFIX + "-body {",
      "  overflow-y: auto !important;",
      "  flex: 1 !important;",
      "  padding: 12px 16px 20px !important;",
      "  scrollbar-width: thin !important;",
      "  scrollbar-color: #3a3a5a transparent !important;",
      "}",
      "." + PREFIX + "-body::-webkit-scrollbar { width: 6px !important; }",
      "." + PREFIX + "-body::-webkit-scrollbar-track { background: transparent !important; }",
      "." + PREFIX + "-body::-webkit-scrollbar-thumb { background: #3a3a5a !important; border-radius: 3px !important; }",

      // Section
      "." + PREFIX + "-section {",
      "  margin-bottom: 16px !important;",
      "}",
      "." + PREFIX + "-section-title {",
      "  font-size: 11px !important;",
      "  font-weight: 700 !important;",
      "  text-transform: uppercase !important;",
      "  letter-spacing: 1.2px !important;",
      "  color: " + accent + " !important;",
      "  margin: 0 0 10px 0 !important;",
      "  padding: 0 4px !important;",
      "}",

      // Feature grid
      "." + PREFIX + "-grid {",
      "  display: grid !important;",
      "  grid-template-columns: 1fr 1fr !important;",
      "  gap: 8px !important;",
      "}",

      // Feature button
      "." + PREFIX + "-feat {",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  gap: 8px !important;",
      "  padding: 10px 12px !important;",
      "  border-radius: 10px !important;",
      "  border: 1px solid #2a2a4a !important;",
      "  background: #20203a !important;",
      "  color: #ccc !important;",
      "  cursor: pointer !important;",
      "  font-size: 12px !important;",
      "  font-weight: 500 !important;",
      "  transition: background 0.15s, border-color 0.15s, color 0.15s !important;",
      "  text-align: left !important;",
      "  outline: none !important;",
      "  line-height: 1.3 !important;",
      "}",
      "." + PREFIX + "-feat:hover {",
      "  background: #2a2a50 !important;",
      "  border-color: #3a3a6a !important;",
      "}",
      "." + PREFIX + "-feat.active {",
      "  background: " + accent + "22 !important;",
      "  border-color: " + accent + " !important;",
      "  color: " + accent + " !important;",
      "}",
      "." + PREFIX + "-feat-icon {",
      "  font-size: 16px !important;",
      "  flex-shrink: 0 !important;",
      "  width: 20px !important;",
      "  text-align: center !important;",
      "}",
      "." + PREFIX + "-feat-full {",
      "  grid-column: 1 / -1 !important;",
      "}",

      // Speed slider row
      "." + PREFIX + "-slider-row {",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  gap: 10px !important;",
      "  padding: 8px 12px !important;",
      "  background: #20203a !important;",
      "  border-radius: 10px !important;",
      "  border: 1px solid #2a2a4a !important;",
      "  grid-column: 1 / -1 !important;",
      "}",
      "." + PREFIX + "-slider-row label {",
      "  font-size: 12px !important;",
      "  color: #888 !important;",
      "  white-space: nowrap !important;",
      "}",
      "." + PREFIX + "-slider-row input[type='range'] {",
      "  flex: 1 !important;",
      "  accent-color: " + accent + " !important;",
      "  height: 4px !important;",
      "  cursor: pointer !important;",
      "}",
      "." + PREFIX + "-slider-row .val {",
      "  font-size: 12px !important;",
      "  color: " + accent + " !important;",
      "  font-weight: 700 !important;",
      "  min-width: 32px !important;",
      "  text-align: right !important;",
      "}",

      // Structure/headings panel overlay
      "." + PREFIX + "-overlay {",
      "  position: absolute !important;",
      "  top: 0 !important;",
      "  left: 0 !important;",
      "  right: 0 !important;",
      "  bottom: 0 !important;",
      "  background: #1a1a2e !important;",
      "  z-index: 10 !important;",
      "  display: flex !important;",
      "  flex-direction: column !important;",
      "}",
      "." + PREFIX + "-overlay-header {",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  justify-content: space-between !important;",
      "  padding: 14px 18px !important;",
      "  border-bottom: 1px solid #2a2a4a !important;",
      "}",
      "." + PREFIX + "-overlay-header h3 {",
      "  margin: 0 !important;",
      "  font-size: 15px !important;",
      "  font-weight: 700 !important;",
      "  color: #fff !important;",
      "}",
      "." + PREFIX + "-overlay-body {",
      "  flex: 1 !important;",
      "  overflow-y: auto !important;",
      "  padding: 12px 16px !important;",
      "}",
      "." + PREFIX + "-heading-item {",
      "  display: block !important;",
      "  padding: 8px 10px !important;",
      "  margin: 2px 0 !important;",
      "  border-radius: 6px !important;",
      "  color: #ccc !important;",
      "  text-decoration: none !important;",
      "  cursor: pointer !important;",
      "  font-size: 13px !important;",
      "  border: none !important;",
      "  background: transparent !important;",
      "  text-align: left !important;",
      "  width: 100% !important;",
      "  transition: background 0.12s !important;",
      "  outline: none !important;",
      "}",
      "." + PREFIX + "-heading-item:hover {",
      "  background: #2a2a4a !important;",
      "}",
      "." + PREFIX + "-h-tag {",
      "  display: inline-block !important;",
      "  background: " + accent + "33 !important;",
      "  color: " + accent + " !important;",
      "  font-size: 10px !important;",
      "  font-weight: 700 !important;",
      "  padding: 2px 6px !important;",
      "  border-radius: 4px !important;",
      "  margin-right: 8px !important;",
      "}",

      // Reading guide
      "#" + PREFIX + "-reading-guide {",
      "  position: fixed !important;",
      "  left: 0 !important;",
      "  width: 100% !important;",
      "  height: 12px !important;",
      "  background: " + accent + "44 !important;",
      "  border-top: 2px solid " + accent + " !important;",
      "  border-bottom: 2px solid " + accent + " !important;",
      "  pointer-events: none !important;",
      "  z-index: 2147483640 !important;",
      "  transition: top 0.05s linear !important;",
      "}",

      // Skip to content link
      "#" + PREFIX + "-skip-link {",
      "  position: fixed !important;",
      "  top: -100px !important;",
      "  left: 50% !important;",
      "  transform: translateX(-50%) !important;",
      "  background: " + accent + " !important;",
      "  color: #000 !important;",
      "  padding: 12px 24px !important;",
      "  border-radius: 0 0 10px 10px !important;",
      "  font-size: 14px !important;",
      "  font-weight: 700 !important;",
      "  z-index: 2147483646 !important;",
      "  text-decoration: none !important;",
      "  transition: top 0.2s ease !important;",
      "  outline: none !important;",
      "}",
      "#" + PREFIX + "-skip-link:focus {",
      "  top: 0 !important;",
      "}",

      // Tab indicator
      "#" + PREFIX + "-tab-indicator {",
      "  position: fixed !important;",
      "  pointer-events: none !important;",
      "  border: 3px solid " + accent + " !important;",
      "  border-radius: 4px !important;",
      "  z-index: 2147483640 !important;",
      "  transition: top 0.1s, left 0.1s, width 0.1s, height 0.1s !important;",
      "  box-shadow: 0 0 0 3px " + accent + "44 !important;",
      "  display: none !important;",
      "}",

      // Big cursor
      "." + PREFIX + "-big-cursor, ." + PREFIX + "-big-cursor * {",
      "  cursor: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%2300ff5580' stroke='%231dda63' stroke-width='3'/%3E%3Ccircle cx='16' cy='16' r='3' fill='%231dda63'/%3E%3C/svg%3E\") 16 16, auto !important;",
      "}",

      // Page-level accessibility mode styles (injected/removed dynamically)
      // These are added as separate style blocks

      // Footer
      "." + PREFIX + "-footer {",
      "  padding: 10px 16px !important;",
      "  text-align: center !important;",
      "  font-size: 10px !important;",
      "  color: #555 !important;",
      "  border-top: 1px solid #2a2a4a !important;",
      "}",
      "." + PREFIX + "-footer a {",
      "  color: " + accent + " !important;",
      "  text-decoration: none !important;",
      "}",

      // Mobile responsive
      "@media (max-width: 480px) {",
      "  #" + PREFIX + "-panel {",
      "    width: calc(100vw - 24px) !important;",
      "    max-height: 85vh !important;",
      "    left: 12px !important;",
      "    right: 12px !important;",
      "    bottom: " + (btnSize + 20) + "px !important;",
      "    border-radius: 14px !important;",
      "  }",
      "}",
    ].join("\n");

    var style = el("style", { id: PREFIX + "-styles", textContent: css });
    document.head.appendChild(style);
  }

  // ── Dynamic page-level styles ────────────────────────────────────────
  // These are toggled on/off as users activate features. Each injects or
  // removes a <style> block with an id.

  function setPageStyle(id, cssText, active) {
    var existing = $("#" + PREFIX + "-ps-" + id);
    if (active) {
      if (!existing) {
        var s = el("style", {
          id: PREFIX + "-ps-" + id,
          textContent: cssText,
        });
        document.head.appendChild(s);
      }
    } else {
      if (existing) existing.remove();
    }
  }

  // ── Feature implementations ──────────────────────────────────────────

  var features = {
    // ── Vision ──
    highContrast: {
      apply: function (on) {
        setPageStyle(
          "highcontrast",
          "html { filter: contrast(1.5) !important; } " +
            "#" + PREFIX + "-wrap { filter: none !important; }",
          on
        );
      },
    },
    darkMode: {
      apply: function (on) {
        // Apply invert to all direct children of body EXCEPT the widget
        setPageStyle(
          "darkmode",
          "body > *:not(#" + PREFIX + "-wrap):not(#" + PREFIX + "-svg-filters) { " +
            "filter: invert(1) hue-rotate(180deg) !important; } " +
            "body > *:not(#" + PREFIX + "-wrap) img, " +
            "body > *:not(#" + PREFIX + "-wrap) video, " +
            "body > *:not(#" + PREFIX + "-wrap) svg:not(#" + PREFIX + "-svg-filters), " +
            "body > *:not(#" + PREFIX + "-wrap) [style*='background-image'] { " +
            "filter: invert(1) hue-rotate(180deg) !important; }",
          on
        );
      },
    },
    lightMode: {
      apply: function (on) {
        setPageStyle(
          "lightmode",
          "body > *:not(#" + PREFIX + "-wrap):not(#" + PREFIX + "-svg-filters) { " +
            "background-color: #fff !important; color: #111 !important; } " +
            "body { background-color: #fff !important; }",
          on
        );
      },
    },
    desaturate: {
      apply: function (on) {
        setPageStyle(
          "desaturate",
          "html { filter: grayscale(1) !important; } " +
            "#" + PREFIX + "-wrap { filter: none !important; }",
          on
        );
      },
    },
    protanopia: {
      apply: function (on) {
        ensureSVGFilters();
        setPageStyle(
          "protanopia",
          "html { filter: url(#" + PREFIX + "-protanopia) !important; } " +
            "#" + PREFIX + "-wrap { filter: none !important; }",
          on
        );
      },
    },
    deuteranopia: {
      apply: function (on) {
        ensureSVGFilters();
        setPageStyle(
          "deuteranopia",
          "html { filter: url(#" + PREFIX + "-deuteranopia) !important; } " +
            "#" + PREFIX + "-wrap { filter: none !important; }",
          on
        );
      },
    },
    tritanopia: {
      apply: function (on) {
        ensureSVGFilters();
        setPageStyle(
          "tritanopia",
          "html { filter: url(#" + PREFIX + "-tritanopia) !important; } " +
            "#" + PREFIX + "-wrap { filter: none !important; }",
          on
        );
      },
    },
    bigCursor: {
      apply: function (on) {
        document.documentElement.classList.toggle(PREFIX + "-big-cursor", on);
      },
    },
    hideImages: {
      apply: function (on) {
        setPageStyle(
          "hideimages",
          "img, svg:not(#" + PREFIX + "-svg-filters):not(#" + PREFIX + "-wrap svg), " +
            "video, picture, [style*='background-image'] { " +
            "opacity: 0.05 !important; }",
          on
        );
      },
    },

    // ── Reading ──
    biggerText: {
      apply: function (on) {
        setPageStyle(
          "biggertext",
          "body > *:not(#" + PREFIX + "-wrap) { font-size: 120% !important; }",
          on
        );
      },
    },
    largestText: {
      apply: function (on) {
        setPageStyle(
          "largesttext",
          "body > *:not(#" + PREFIX + "-wrap) { font-size: 150% !important; }",
          on
        );
      },
    },
    textSpacing: {
      apply: function (on) {
        setPageStyle(
          "textspacing",
          "body > *:not(#" + PREFIX + "-wrap) * { " +
            "letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }",
          on
        );
      },
    },
    lineHeight: {
      apply: function (on) {
        setPageStyle(
          "lineheight",
          "body > *:not(#" + PREFIX + "-wrap) * { line-height: 2.0 !important; }",
          on
        );
      },
    },
    dyslexiaFont: {
      apply: function (on) {
        if (on) {
          // Load OpenDyslexic font
          if (!$("#" + PREFIX + "-dyslexia-font")) {
            var link = el("link", {
              id: PREFIX + "-dyslexia-font",
              rel: "stylesheet",
              href: "https://fonts.cdnfonts.com/css/opendyslexic",
            });
            document.head.appendChild(link);
          }
        }
        setPageStyle(
          "dyslexiafont",
          "body > *:not(#" + PREFIX + "-wrap) * { " +
            "font-family: 'OpenDyslexic', 'Comic Sans MS', 'Comic Sans', cursive !important; }",
          on
        );
      },
    },
    highlightLinks: {
      apply: function (on) {
        setPageStyle(
          "highlightlinks",
          "a:not(#" + PREFIX + "-wrap a) { " +
            "outline: 2px solid " + CFG.color + " !important; " +
            "outline-offset: 2px !important; " +
            "text-decoration: underline !important; }",
          on
        );
      },
    },
    wordSpacing: {
      apply: function (on) {
        setPageStyle(
          "wordspacing",
          "body > *:not(#" + PREFIX + "-wrap) * { word-spacing: 0.25em !important; }",
          on
        );
      },
    },
    monoFont: {
      apply: function (on) {
        setPageStyle(
          "monofont",
          "body > *:not(#" + PREFIX + "-wrap) * { " +
            "font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, " +
            "'Liberation Mono', Menlo, monospace !important; }",
          on
        );
      },
    },

    // ── Navigation ──
    readingGuide: {
      apply: function (on) {
        if (on) {
          if (!readingGuideEl) {
            readingGuideEl = el("div", { id: PREFIX + "-reading-guide" });
            document.body.appendChild(readingGuideEl);
          }
          readingGuideEl.style.display = "block";
          document.addEventListener("mousemove", moveReadingGuide);
        } else {
          if (readingGuideEl) readingGuideEl.style.display = "none";
          document.removeEventListener("mousemove", moveReadingGuide);
        }
      },
    },
    focusHighlight: {
      apply: function (on) {
        setPageStyle(
          "focushighlight",
          "*:not(#" + PREFIX + "-wrap *):focus { " +
            "outline: 3px solid " + CFG.color + " !important; " +
            "outline-offset: 3px !important; " +
            "box-shadow: 0 0 0 6px " + CFG.color + "33 !important; }",
          on
        );
      },
    },
    stopAnimations: {
      apply: function (on) {
        setPageStyle(
          "stopanimations",
          "*, *::before, *::after { " +
            "animation-duration: 0s !important; " +
            "animation-delay: 0s !important; " +
            "transition-duration: 0s !important; " +
            "transition-delay: 0s !important; " +
            "scroll-behavior: auto !important; } " +
            "/* Keep widget animations */ " +
            "#" + PREFIX + "-wrap, #" + PREFIX + "-wrap * { " +
            "transition-duration: 0.15s !important; }",
          on
        );
      },
    },
    skipToContent: {
      apply: function (on) {
        if (on) {
          if (!skipLinkEl) {
            var mainContent =
              $("main") || $("[role='main']") || $("#content") || $(".content") || $("article");
            var targetId = "";
            if (mainContent) {
              if (!mainContent.id) mainContent.id = PREFIX + "-main-content";
              targetId = "#" + mainContent.id;
            }
            skipLinkEl = el("a", {
              id: PREFIX + "-skip-link",
              href: targetId || "#",
              textContent: "Skip to Content",
              onClick: function (e) {
                if (mainContent) {
                  e.preventDefault();
                  mainContent.setAttribute("tabindex", "-1");
                  mainContent.focus();
                  mainContent.scrollIntoView({ behavior: "smooth" });
                }
              },
            });
            document.body.insertBefore(skipLinkEl, document.body.firstChild);
          }
          skipLinkEl.style.cssText = "";
        } else {
          if (skipLinkEl) {
            skipLinkEl.remove();
            skipLinkEl = null;
          }
        }
      },
    },
    tabIndicator: {
      apply: function (on) {
        if (on) {
          if (!tabIndicatorEl) {
            tabIndicatorEl = el("div", { id: PREFIX + "-tab-indicator" });
            document.body.appendChild(tabIndicatorEl);
          }
          document.addEventListener("focusin", updateTabIndicator);
          document.addEventListener("focusout", hideTabIndicator);
        } else {
          if (tabIndicatorEl) {
            tabIndicatorEl.style.display = "none";
          }
          document.removeEventListener("focusin", updateTabIndicator);
          document.removeEventListener("focusout", hideTabIndicator);
        }
      },
    },
  };

  // ── Reading guide handler ────────────────────────────────────────────
  function moveReadingGuide(e) {
    if (readingGuideEl) {
      readingGuideEl.style.top = e.clientY - 6 + "px";
    }
  }

  // ── Tab indicator handlers ───────────────────────────────────────────
  function updateTabIndicator(e) {
    if (!tabIndicatorEl) return;
    var target = e.target;
    // Don't highlight widget elements
    if (target.closest && target.closest("#" + PREFIX + "-wrap")) return;
    var rect = target.getBoundingClientRect();
    tabIndicatorEl.style.cssText =
      "display: block !important; " +
      "top: " + (rect.top - 4) + "px !important; " +
      "left: " + (rect.left - 4) + "px !important; " +
      "width: " + (rect.width + 8) + "px !important; " +
      "height: " + (rect.height + 8) + "px !important;";
  }

  function hideTabIndicator() {
    if (tabIndicatorEl) {
      tabIndicatorEl.style.display = "none !important";
    }
  }

  // ── Text-to-Speech (chunked, with Chrome keep-alive) ─────────────────

  function getPageText() {
    var main =
      $("main") || $("[role='main']") || $("article") || $(".content") || document.body;
    var walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        // Skip hidden elements and the widget itself
        if (parent.closest("#" + PREFIX + "-wrap")) return NodeFilter.FILTER_REJECT;
        var style = getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden")
          return NodeFilter.FILTER_REJECT;
        if (
          parent.tagName === "SCRIPT" ||
          parent.tagName === "STYLE" ||
          parent.tagName === "NOSCRIPT"
        )
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var text = "";
    while (walker.nextNode()) {
      text += walker.currentNode.textContent + " ";
    }
    return text.replace(/\s+/g, " ").trim();
  }

  function getSelectedText() {
    var sel = window.getSelection();
    return sel ? sel.toString().trim() : "";
  }

  // Split text into sentence-based chunks of ~200 chars
  function chunkText(text) {
    var sentences = text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [text];
    var chunks = [];
    var current = "";
    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i].trim();
      if (!s) continue;
      if (current.length + s.length > 200 && current.length > 0) {
        chunks.push(current.trim());
        current = s;
      } else {
        current += (current ? " " : "") + s;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  function stopSpeech() {
    window.speechSynthesis.cancel();
    speechQueue = [];
    speechIndex = 0;
    speechPaused = false;
    clearInterval(speechKeepAlive);
    speechKeepAlive = null;
    updateSpeechButtons();
  }

  function pauseSpeech() {
    window.speechSynthesis.pause();
    speechPaused = true;
    updateSpeechButtons();
  }

  function resumeSpeech() {
    window.speechSynthesis.resume();
    speechPaused = false;
    updateSpeechButtons();
  }

  function speakChunk() {
    if (speechIndex >= speechQueue.length) {
      stopSpeech();
      return;
    }
    var utt = new SpeechSynthesisUtterance(speechQueue[speechIndex]);
    utt.rate = speechRate;
    utt.onend = function () {
      speechIndex++;
      speakChunk();
    };
    utt.onerror = function (e) {
      if (e.error !== "interrupted" && e.error !== "canceled") {
        speechIndex++;
        speakChunk();
      }
    };
    window.speechSynthesis.speak(utt);
  }

  function startSpeech(text) {
    if (!text || !window.speechSynthesis) return;
    stopSpeech();
    speechQueue = chunkText(text);
    speechIndex = 0;
    speakChunk();

    // Chrome keep-alive: pause/resume every 8s to prevent auto-stop
    var isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
    if (isChrome) {
      speechKeepAlive = setInterval(function () {
        if (window.speechSynthesis.speaking && !speechPaused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 8000);
    }
    updateSpeechButtons();
  }

  function updateSpeechButtons() {
    var reading = window.speechSynthesis && window.speechSynthesis.speaking;
    var pauseBtn = $("#" + PREFIX + "-pause-btn");
    var stopBtn = $("#" + PREFIX + "-stop-btn");
    if (pauseBtn) {
      pauseBtn.textContent = speechPaused ? "▶ " + LABELS.resumeReading : "⏸ " + LABELS.pauseReading;
      pauseBtn.style.display = reading || speechPaused ? "flex" : "none";
    }
    if (stopBtn) {
      stopBtn.style.display = reading || speechPaused ? "flex" : "none";
    }
  }

  // ── Build the Widget DOM ─────────────────────────────────────────────

  function buildWidget() {
    var wrap = el("div", { id: PREFIX + "-wrap", "aria-label": "Accessibility Widget" });

    // Position the wrapper
    var posStyle = "position:fixed!important;z-index:2147483647!important;";
    var pos = CFG.position;
    var rtl = isRTL();
    // Flip left/right for RTL
    if (rtl) {
      if (pos.indexOf("right") !== -1) pos = pos.replace("right", "left");
      else if (pos.indexOf("left") !== -1) pos = pos.replace("left", "right");
    }
    if (pos.indexOf("bottom") !== -1) posStyle += "bottom:20px!important;";
    else posStyle += "top:20px!important;";
    if (pos.indexOf("right") !== -1) posStyle += "right:20px!important;";
    else posStyle += "left:20px!important;";
    wrap.style.cssText = posStyle;

    // ── Toggle button ──
    var toggleBtn = el("button", {
      id: PREFIX + "-btn",
      "aria-label": "Open accessibility menu",
      title: "Accessibility (Alt+A)",
      innerHTML:
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="12" cy="4.5" r="2.5"/>' +
        '<path d="M12 8c-4 0-7 1-7 1v2.5h4v10h2v-6h2v6h2v-10h4V9s-3-1-7-1z"/>' +
        "</svg>",
    });
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      togglePanel();
    });

    // ── Panel ──
    var panel = el("div", {
      id: PREFIX + "-panel",
      role: "dialog",
      "aria-label": LABELS.title,
      "aria-hidden": "true",
    });

    // Position panel relative to button
    var panelPos = "";
    if (pos.indexOf("bottom") !== -1)
      panelPos += "bottom:" + (btnSize + 16) + "px!important;";
    else panelPos += "top:" + (btnSize + 16) + "px!important;";
    if (pos.indexOf("right") !== -1) panelPos += "right:20px!important;";
    else panelPos += "left:20px!important;";
    panel.style.cssText = panelPos;

    // Header
    var header = el("div", { className: PREFIX + "-header" }, [
      el("h2", { textContent: "♿ " + LABELS.title }),
      el("div", { className: PREFIX + "-header-actions" }, [
        el("button", {
          className: PREFIX + "-header-btn",
          textContent: LABELS.reset,
          "aria-label": LABELS.reset,
          onClick: resetAll,
        }),
        el("button", {
          className: PREFIX + "-close-btn",
          textContent: "✕",
          "aria-label": LABELS.close,
          onClick: function () {
            closePanel();
          },
        }),
      ]),
    ]);

    // Body
    var body = el("div", { className: PREFIX + "-body" });

    // ── Build sections ──

    // Read Aloud section
    body.appendChild(buildSection(LABELS.sectionRead, "read-aloud", [
      featBtn("🔊", LABELS.readPage, function () {
        startSpeech(getPageText());
      }),
      featBtn("🔈", LABELS.readSelected, function () {
        var sel = getSelectedText();
        if (sel) startSpeech(sel);
      }),
      el("button", {
        id: PREFIX + "-pause-btn",
        className: PREFIX + "-feat " + PREFIX + "-feat-full",
        style: "display:none!important",
        onClick: function () {
          if (speechPaused) resumeSpeech();
          else pauseSpeech();
        },
      }),
      el("button", {
        id: PREFIX + "-stop-btn",
        className: PREFIX + "-feat " + PREFIX + "-feat-full",
        textContent: "⏹ " + LABELS.stopReading,
        style: "display:none!important",
        onClick: stopSpeech,
      }),
      buildSpeedSlider(),
    ]));

    // Vision section
    var visionMutualGroup = ["darkMode", "lightMode"];
    body.appendChild(
      buildSection(LABELS.sectionVision, "vision", [
        toggleBtn2("🔆", LABELS.highContrast, "highContrast"),
        toggleBtn2("🌙", LABELS.darkMode, "darkMode", visionMutualGroup),
        toggleBtn2("☀️", LABELS.lightMode, "lightMode", visionMutualGroup),
        toggleBtn2("🩶", LABELS.desaturate, "desaturate"),
        toggleBtn2("🔴", LABELS.protanopia, "protanopia", [
          "protanopia",
          "deuteranopia",
          "tritanopia",
        ]),
        toggleBtn2("🟢", LABELS.deuteranopia, "deuteranopia", [
          "protanopia",
          "deuteranopia",
          "tritanopia",
        ]),
        toggleBtn2("🔵", LABELS.tritanopia, "tritanopia", [
          "protanopia",
          "deuteranopia",
          "tritanopia",
        ]),
        toggleBtn2("🖱️", LABELS.bigCursor, "bigCursor"),
        toggleBtn2("🖼️", LABELS.hideImages, "hideImages"),
      ])
    );

    // Reading section
    var fontMutualGroup = ["dyslexiaFont", "monoFont"];
    var sizeMutualGroup = ["biggerText", "largestText"];
    body.appendChild(
      buildSection(LABELS.sectionReading, "reading", [
        toggleBtn2("🔤", LABELS.biggerText, "biggerText", sizeMutualGroup),
        toggleBtn2("🔠", LABELS.largestText, "largestText", sizeMutualGroup),
        toggleBtn2("↔️", LABELS.textSpacing, "textSpacing"),
        toggleBtn2("↕️", LABELS.lineHeight, "lineHeight"),
        toggleBtn2("📖", LABELS.dyslexiaFont, "dyslexiaFont", fontMutualGroup),
        toggleBtn2("🔗", LABELS.highlightLinks, "highlightLinks"),
        toggleBtn2("⬜", LABELS.wordSpacing, "wordSpacing"),
        toggleBtn2("💻", LABELS.monoFont, "monoFont", fontMutualGroup),
      ])
    );

    // Navigation section
    body.appendChild(
      buildSection(LABELS.sectionNav, "navigation", [
        toggleBtn2("📏", LABELS.readingGuide, "readingGuide"),
        toggleBtn2("🎯", LABELS.focusHighlight, "focusHighlight"),
        toggleBtn2("⏸️", LABELS.stopAnimations, "stopAnimations"),
        toggleBtn2("⏭️", LABELS.skipToContent, "skipToContent"),
        featBtn("📑", LABELS.pageStructure, function () {
          showStructureOverlay("headings");
        }),
        toggleBtn2("⌨️", LABELS.tabIndicator, "tabIndicator"),
      ])
    );

    // Page Info section
    body.appendChild(
      buildSection(LABELS.sectionInfo, "info", [
        featBtn("🌳", LABELS.showStructure, function () {
          showStructureOverlay("headings");
        }),
        featBtn("🏷️", LABELS.showLandmarks, function () {
          showStructureOverlay("landmarks");
        }),
      ])
    );

    // Footer
    var footer = el("div", {
      className: PREFIX + "-footer",
      innerHTML:
        'Cocoon A11y &mdash; <a href="https://mycocoon.life" target="_blank" rel="noopener">mycocoon.life</a>',
    });

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    wrap.appendChild(toggleBtn);
    wrap.appendChild(panel);
    document.body.appendChild(wrap);

    // Restore persisted state
    if (CFG.persist) restoreState();

    // ── Keyboard shortcuts ──
    document.addEventListener("keydown", function (e) {
      // Alt+A: toggle panel
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        togglePanel();
      }
      // Escape: close panel
      if (e.key === "Escape" && panelOpen) {
        closePanel();
      }
    });

    // Close on outside click
    document.addEventListener("click", function (e) {
      if (panelOpen && !e.target.closest("#" + PREFIX + "-wrap")) {
        closePanel();
      }
    });
  }

  // ── Section builder ──────────────────────────────────────────────────
  function buildSection(title, id, children) {
    var section = el("div", {
      className: PREFIX + "-section",
      id: PREFIX + "-section-" + id,
    });
    section.appendChild(
      el("div", { className: PREFIX + "-section-title", textContent: title })
    );
    var grid = el("div", { className: PREFIX + "-grid" });
    children.forEach(function (child) {
      if (child) grid.appendChild(child);
    });
    section.appendChild(grid);
    return section;
  }

  // ── Simple action button ─────────────────────────────────────────────
  function featBtn(icon, label, onClick) {
    return el("button", {
      className: PREFIX + "-feat",
      onClick: onClick,
      "aria-label": label,
    }, [
      el("span", { className: PREFIX + "-feat-icon", textContent: icon }),
      el("span", { textContent: label }),
    ]);
  }

  // ── Toggle feature button with state tracking ────────────────────────
  function toggleBtn2(icon, label, key, mutualGroup) {
    var btn = el("button", {
      className: PREFIX + "-feat" + (state[key] ? " active" : ""),
      "data-feature": key,
      "aria-label": label,
      "aria-pressed": state[key] ? "true" : "false",
      onClick: function () {
        var newVal = !state[key];

        // Turn off mutual group members first
        if (newVal && mutualGroup) {
          mutualGroup.forEach(function (k) {
            if (k !== key && state[k]) {
              state[k] = false;
              if (features[k]) features[k].apply(false);
              var otherBtn = $('[data-feature="' + k + '"]', $("#" + PREFIX + "-wrap"));
              if (otherBtn) {
                otherBtn.classList.remove("active");
                otherBtn.setAttribute("aria-pressed", "false");
              }
            }
          });
        }

        state[key] = newVal;
        btn.classList.toggle("active", newVal);
        btn.setAttribute("aria-pressed", newVal ? "true" : "false");
        if (features[key]) features[key].apply(newVal);
        saveState();
      },
    }, [
      el("span", { className: PREFIX + "-feat-icon", textContent: icon }),
      el("span", { textContent: label }),
    ]);
    return btn;
  }

  // ── Speed slider ─────────────────────────────────────────────────────
  function buildSpeedSlider() {
    var valSpan = el("span", {
      className: "val",
      textContent: speechRate + "x",
    });
    var slider = el("input", {
      type: "range",
      min: "0.5",
      max: "2",
      step: "0.25",
      value: String(speechRate),
      "aria-label": LABELS.speed,
    });
    slider.addEventListener("input", function () {
      speechRate = parseFloat(slider.value);
      valSpan.textContent = speechRate + "x";
      state.speechRate = speechRate;
      saveState();
    });

    return el("div", { className: PREFIX + "-slider-row" }, [
      el("label", { textContent: "🏎️ " + LABELS.speed }),
      slider,
      valSpan,
    ]);
  }

  // ── Structure overlay (headings / landmarks) ─────────────────────────
  function showStructureOverlay(type) {
    // Remove existing overlay
    var existing = $("." + PREFIX + "-overlay", $("#" + PREFIX + "-panel"));
    if (existing) existing.remove();

    var panel = $("#" + PREFIX + "-panel");
    var overlay = el("div", { className: PREFIX + "-overlay" });

    var title = type === "headings" ? LABELS.showStructure : LABELS.showLandmarks;
    var overlayHeader = el("div", { className: PREFIX + "-overlay-header" }, [
      el("h3", { textContent: title }),
      el("button", {
        className: PREFIX + "-close-btn",
        textContent: "← Back",
        onClick: function () {
          overlay.remove();
        },
      }),
    ]);

    var overlayBody = el("div", { className: PREFIX + "-overlay-body" });

    if (type === "headings") {
      var headings = $$("h1, h2, h3, h4, h5, h6").filter(function (h) {
        return !h.closest("#" + PREFIX + "-wrap");
      });
      if (headings.length === 0) {
        overlayBody.appendChild(
          el("p", {
            textContent: "No headings found on this page.",
            style: "color:#888!important;padding:8px!important;",
          })
        );
      } else {
        headings.forEach(function (h) {
          var level = parseInt(h.tagName.charAt(1));
          var item = el("button", {
            className: PREFIX + "-heading-item",
            style: "padding-left:" + (8 + (level - 1) * 16) + "px!important;",
            onClick: function () {
              h.scrollIntoView({ behavior: "smooth", block: "center" });
              h.style.transition = "background 0.3s";
              h.style.background = CFG.color + "44";
              setTimeout(function () {
                h.style.background = "";
              }, 2000);
            },
          }, [
            el("span", { className: PREFIX + "-h-tag", textContent: h.tagName }),
            el("span", {
              textContent: h.textContent.trim().substring(0, 60) +
                (h.textContent.trim().length > 60 ? "..." : ""),
            }),
          ]);
          overlayBody.appendChild(item);
        });
      }
    } else {
      // Landmarks
      var landmarkSelectors = [
        { sel: "header, [role='banner']", name: "Banner" },
        { sel: "nav, [role='navigation']", name: "Navigation" },
        { sel: "main, [role='main']", name: "Main" },
        { sel: "aside, [role='complementary']", name: "Complementary" },
        { sel: "footer, [role='contentinfo']", name: "Content Info" },
        { sel: "[role='search']", name: "Search" },
        { sel: "[role='form']", name: "Form" },
        { sel: "section[aria-label], section[aria-labelledby], [role='region'][aria-label]", name: "Region" },
      ];
      var found = false;
      landmarkSelectors.forEach(function (lm) {
        var elements = $$(lm.sel).filter(function (e) {
          return !e.closest("#" + PREFIX + "-wrap");
        });
        elements.forEach(function (elem) {
          found = true;
          var label =
            elem.getAttribute("aria-label") ||
            elem.getAttribute("aria-labelledby") ||
            elem.tagName.toLowerCase();
          var item = el("button", {
            className: PREFIX + "-heading-item",
            onClick: function () {
              elem.scrollIntoView({ behavior: "smooth", block: "center" });
              elem.style.transition = "outline 0.3s";
              elem.style.outline = "3px solid " + CFG.color;
              setTimeout(function () {
                elem.style.outline = "";
              }, 2000);
            },
          }, [
            el("span", {
              className: PREFIX + "-h-tag",
              textContent: lm.name,
            }),
            el("span", { textContent: label }),
          ]);
          overlayBody.appendChild(item);
        });
      });
      if (!found) {
        overlayBody.appendChild(
          el("p", {
            textContent: "No ARIA landmarks found on this page.",
            style: "color:#888!important;padding:8px!important;",
          })
        );
      }
    }

    overlay.appendChild(overlayHeader);
    overlay.appendChild(overlayBody);
    panel.appendChild(overlay);
  }

  // ── Panel toggle ─────────────────────────────────────────────────────
  function togglePanel() {
    if (panelOpen) closePanel();
    else openPanel();
  }

  function openPanel() {
    var panel = $("#" + PREFIX + "-panel");
    if (panel) {
      panel.setAttribute("aria-hidden", "false");
      panelOpen = true;
    }
  }

  function closePanel() {
    var panel = $("#" + PREFIX + "-panel");
    if (panel) {
      // Remove any overlay first
      var overlay = $("." + PREFIX + "-overlay", panel);
      if (overlay) overlay.remove();
      panel.setAttribute("aria-hidden", "true");
      panelOpen = false;
    }
  }

  // ── Reset all ────────────────────────────────────────────────────────
  function resetAll() {
    // Stop speech
    stopSpeech();

    // Turn off all features
    Object.keys(features).forEach(function (key) {
      if (state[key]) {
        state[key] = false;
        features[key].apply(false);
      }
    });

    // Reset speed
    speechRate = 1;

    // Update all buttons
    $$("[data-feature]", $("#" + PREFIX + "-wrap")).forEach(function (btn) {
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    });

    // Reset speed slider
    var slider = $("input[type='range']", $("#" + PREFIX + "-wrap"));
    if (slider) {
      slider.value = "1";
      var valSpan = $(".val", slider.parentElement);
      if (valSpan) valSpan.textContent = "1x";
    }

    // Clear persisted state
    state = {};
    if (CFG.persist) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* ignore */
      }
    }

    // Remove big cursor class
    document.documentElement.classList.remove(PREFIX + "-big-cursor");
  }

  // ── Restore persisted state ──────────────────────────────────────────
  function restoreState() {
    if (state.speechRate) speechRate = state.speechRate;
    Object.keys(features).forEach(function (key) {
      if (state[key]) {
        features[key].apply(true);
        // The button will be marked active in toggleBtn2 creation
      }
    });
  }

  // ── Feature detection (graceful degradation) ─────────────────────────
  function checkSupport() {
    // Hide speech section if not supported
    if (!window.speechSynthesis) {
      var readSection = $("#" + PREFIX + "-section-read-aloud");
      if (readSection) readSection.style.display = "none";
    }
  }

  // ── Initialize ───────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildWidget();
    checkSupport();
  }

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
