# Founder Pitch HTML Contract

## Story and Identity

- Present a Founder speaking to investors, not a student reporting homework.
- Keep the fixed order: problem, solution, value, Demo, next step.
- Put the product name or literal offer in the first viewport.
- Give each page one primary message.

## Fixed Canvas

- Use a fixed `1600 × 900` logical canvas for every page.
- Scale with `min(window.innerWidth / 1600, window.innerHeight / 900)`.
- Show exactly one complete page at a time.
- Disable document scrolling; never reveal part of an adjacent page.
- Keep `scrollWidth <= 1600` and `scrollHeight <= 900` on every page.
- Use dark letterboxing when the browser is not 16:9. Never stretch the canvas.

## Navigation

- `ArrowRight`, `PageDown`, or space: next page.
- `ArrowLeft` or `PageUp`: previous page.
- Right-click on noninteractive blank space: next page.
- Keep previous, page count, and next controls at bottom right.
- Do not let input, button, select, textarea, link, or Demo interactions trigger navigation.

## Layout and Readability

- Use large projection-safe type and no negative letter spacing.
- Keep titles to one or two complete lines.
- Let primary content occupy approximately 70%–85% of the canvas height.
- Distribute title, main visual/evidence, and conclusion vertically.
- Do not pack content into the upper half and leave a large meaningless area below.
- Prefer a stronger grid, larger explanatory visual, or evidence strip over blindly enlarging text.
- Keep all text and images inside the canvas without clipping.
- Use images and diagrams to explain the problem, flow, evidence, or Demo, not as decoration.

## Product Truth

- Keep all evidence labels visible.
- Use a real project Demo when available.
- Label a screenshot fallback clearly.
- Never invent a feature or hide an incomplete path with visual polish.

## Implementation

- Produce one self-contained HTML file.
- Use no CDN, remote font, tracker, or required network request.
- Use project-relative paths for local media.
- Preserve meaningful semantic HTML and accessible contrast.
- Avoid decorative gradient blobs, excessive rounded cards, complex animation, and background music.

## Required Checks

Check all pages at `1280 × 720`, `1600 × 900`, and `1920 × 1080`. Verify canvas size, no overflow, page navigation, control disabled states, Demo interaction isolation, local media loading, content density, and final page visibility.

