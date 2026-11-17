---
name: Biga
description: The menu of a Le Pouliguen pizzeria, printed in one ink colour on a shelf of kraft pizza boxes.
colors:
  kraft: "#D6BF98"
  sheet: "#E4D3B4"
  box-kraft: "#C8A672"
  ink: "#17130F"
  muted-ink: "#5E5141"
  cobalt: "#1A36A0"
  cream-print: "#F4EBDB"
  sauce-vermilion: "#C8402A"
  basil-green: "#6F8A3C"
  mozzarella-cream: "#F2E7CF"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(44px, 5.4vw, 84px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontVariation: "'opsz' 72"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "31px"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.01em"
    fontVariation: "'opsz' 48"
  body:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'opsz' 16"
  label:
    fontFamily: "Inter Tight, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.09em"
  stamp:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "36px"
    fontWeight: 900
    lineHeight: 0.82
    letterSpacing: "0.05em"
  script:
    fontFamily: "Caveat Brush, cursive"
    fontWeight: 400
    letterSpacing: "0em"
rounded:
  face: "2px"
  plate: "4px"
  round: "50%"
spacing:
  gutter-mobile: "16px"
  gutter: "32px"
  label-x: "8px"
  stack: "18px"
  bar-mobile: "64px"
  bar: "84px"
components:
  label-box:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0 8px"
    height: "21px"
  label-box-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.kraft}"
  tab:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0 11px"
    height: "23px"
  tab-active:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.cream-print}"
  button-call:
    textColor: "{colors.cobalt}"
    typography: "{typography.label}"
    padding: "0 20px"
    height: "44px"
  button-call-hover:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.cream-print}"
  ring-view:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.cobalt}"
    rounded: "{rounded.round}"
    size: "42px"
---

# Design System: Biga

## Overview

**Creative North Star: "The Flexo-Printed Pizza Box"**

Everything on Biga is printed, not rendered. The page is a sheet of kraft cardboard; the only colours that touch it are the ones a one-colour flexo press and a cheap screen print would lay down: a near-black ink, a cobalt stamp ink, and, inside the lid illustrations only, sauce vermilion, mozzarella cream and basil green. Fibre grain sits over every surface (a fixed SVG turbulence layer in multiply), so even the open sheet reads as paper, never as a screen.

Density is low and the composition is fixed to the viewport: a thin bar of boxed labels at the top and bottom, the shelf of boxes across the middle, a caption beneath it. Hierarchy comes from material (spine, lid, sheet) and from three typographic voices, not from colour fills or cards. Motion is physical: boxes slide on the shelf, the active one turns out and tilts, the lid opens into a full sheet with an ink-blot reveal.

**Key Characteristics:**
- Kraft ground with a permanent grain layer; no flat white anywhere.
- One printing ink per job: ink for information, cobalt for the brand and the call to order.
- Boxed catalogue labels (1px ink rule, uppercase Inter Tight) as the only chrome.
- Serif names and ingredient prose, condensed stamp lettering on the boxes.
- Illustrations as offset screen prints: flat colour fills with the ink line knocked slightly out of register.

## Colors

A cardboard-and-ink palette: two kraft tones and a darker box board, one black ink, one cobalt stamp ink, and three food inks that live only inside illustrations.

### Primary
- **Cobalt Stamp Ink** (cobalt): the printed brand. The BIGA logo, spine lettering, lid frame and lettering, the active base tab, the ingredient line in the caption, the "Appeler pour commander" button, the focus ring and text selection. Darkened from the brief's #1F3FB0 for contrast: 5.7:1 on kraft, 6.9:1 on sheet, 4.8:1 on the spine board (used there only at stamp sizes).

### Tertiary (illustration inks)
- **Sauce Vermilion** (sauce-vermilion): tomato base fill and the tomato-base dot on spines.
- **Basil Green** (basil-green): pesto and spinach base fill and its spine dot.
- **Mozzarella Cream** (mozzarella-cream): cream base fill and its spine dot.
These three are print inks for the lid art and the base-coding dots. They never colour text, buttons or backgrounds.

### Neutral
- **Kraft Ground** (kraft): the page background and `theme-color`; also the reversed text on ink hover.
- **Open Sheet** (sheet): the full-screen detail sheet, a paler kraft; the view ring's 80% fill.
- **Box Board** (box-kraft): the cardboard of the boxes; spines and lids are drawn as gradients around it (spine #A9844F to #CFAE79, lid radial #D6B887 to #B89260).
- **Printer's Ink** (ink): all body text, label rules (at 90% alpha), hover fills, the custom cursor, illustration line work (#1A1410 in the art).
- **Faded Ink** (muted-ink): secondary text on the open sheet only (meta line, supplements note, list detail, photo note). 5.2:1 on sheet.
- **Cream Print** (cream-print): reversed text on cobalt or ink (active tab, call button hover, cursor "OUVRIR LA BOÎTE").

### Named Rules
**The One Press Rule.** Interface text and chrome use only ink and cobalt on kraft. Cobalt marks the brand and the act of ordering; ink carries everything else.

**The Ink Stays in the Lid Rule.** Vermilion, basil and cream are illustration inks. They appear inside lid art and as the small base dot on a spine, and nowhere in the interface.

**The Sheet Owns the Faded Ink Rule.** Faded ink sits on the sheet (5.2:1), not on the kraft ground, where it drops to 4.3:1.

## Typography

**Display Font:** Newsreader (with Georgia, serif), optical-size axis
**Body Font:** Newsreader for prose; Inter Tight (with system-ui) for labels
**Stamp Font:** Big Shoulders Display 800/900 (with Arial Narrow)
**Script:** Caveat Brush, for the menu's "Best pizza in town" only

**Character:** A catalogue pairing. Newsreader speaks like the menu's printed names and descriptions; Inter Tight in small tracked capitals is the shop's filing label; Big Shoulders is the lettering a box printer would stamp on cardboard.

### Hierarchy
- **Display** (Newsreader 400, clamp(44px, 5.4vw, 84px), 1.0, opsz 72): the pizza name on the open sheet; 42px on phones.
- **Headline** (Newsreader 400, 31px, 1.12, opsz 48): the pizza name in the shelf caption; 24px on phones.
- **Body** (Newsreader 400, 17px, 1.5, opsz 16, max 42ch): the ingredient list on the sheet. Supplements note in italic 15px, faded ink. Infos list at 15.5px.
- **Label** (Inter Tight 600, 11px, 0.09em, uppercase): every boxed control, tab, hours, address, meta line, caption ingredients. Price in the caption at 13px, 0.08em.
- **Stamp** (Big Shoulders 900, uppercase, letter-spacing 0.02 to 0.08em): the BIGA logo (36px, 28px on phones), spine names set vertically, spine prices (800), lid header and footer. Sizes on boxes scale with the box (fractions of spine width or lid depth).
- **Script** (Caveat Brush 400): "Best pizza in town" on the lid header, mixed case.

### Named Rules
**The Three Voices Rule.** Serif for what a pizza is, tracked sans for how to find and reach it, stamp lettering for what is printed on cardboard. Do not swap them.

**The Tagline Only Rule.** Caveat Brush sets the menu's own "Best pizza in town" and nothing else.

## Layout

A fixed, single-viewport stage (`body` does not scroll). A three-column top bar (call left, logo centre, hours right) at 84px high with 32px side gutters; base tabs centred above the shelf; the shelf spans the full width at mid-height, its box height `--H` = min(46vh, 31vw); caption centred under the shelf (width min(92vw, 760px)); arrows at the shelf's outer edges; footer pinned 26px from the bottom with the address left and boxed links right.

Box geometry is proportional: spine width 0.14 × H, depth = H, so a whole shelf rescales from one variable.

Below 768px: bar 64px with 16px gutters, hours drop to a centred line beneath the bar, `--H` becomes min(60vw, 40svh), tab labels shorten ("tomate", "crème"), the footer stacks and gains the phone number. The open sheet goes from two columns (text left, lid right, 4vw gap) to one scrolling column with the image first. Coarse pointers get a 12px invisible hit extension above and below every label box and tab.

## Elevation & Depth

Depth is physical 3D, not shadow tokens. The shelf is a CSS 3D stage (perspective 2200px); each box is two faces, spine and lid, rotated in space and darkened with a black overlay as they turn away from the viewer. The active box swings out and tilts -4.5°. The only cast shadow is under the lid face, a soft board shadow; interface chrome is flat. The open sheet is a separate full-screen plane with its own grain layer, not a floating card.

### Shadow Vocabulary
- **Board shadow** (`box-shadow: 0 30px 60px -28px rgba(30,18,6,.6)`): under a box lid only.

### Named Rules
**The Flat Chrome Rule.** Labels, tabs, buttons and the sheet carry no shadow. Only cardboard objects in the 3D shelf cast one.

## Shapes

Square-cornered printing. Label boxes, tabs, the call button and the lid frame are 1px rules with 0 radius. Box faces take a 2px corner (die-cut board), the sheet's image plate 4px. Circles are reserved for small round marks: the base dot on a spine, the view ring and the cursor. Spines carry a row of scalloped perforations top and bottom (radial-gradient), the board's corrugated edge.

## Components

### Label Box (buttons, links)
Printed catalogue label: tactile and plain.
- **Shape:** square, 1px ink rule at 90%, 21px high, 8px side padding.
- **Text:** label style in ink.
- **Hover:** fills ink, text turns kraft (0.3s, ease `cubic-bezier(.2,.8,.2,1)`).
- **Focus:** 2px cobalt outline, 3px offset (global).
- Used for Appeler, Instagram, Le midi & infos, Fermer.

### Base Tabs
- **Style:** joined label boxes (23px, 11px padding, borders collapsed by -1px margin).
- **Active:** a cobalt indicator slides under the active tab (0.6s width and translate), text turns cream print.

### Call to Order
- **Style:** 44px cobalt-ruled box, cobalt label text, 20px padding; on the open sheet.
- **Hover:** fills cobalt, cream print text.

### Shelf Box (signature)
The pizza box standing on edge. **Spine:** board gradient, scalloped edges, price stamp at top, name stamped vertically in cobalt, base dot, a small boxed "BIGA" stamp at the foot. **Lid:** radial board, cobalt frame at 4.5% inset, "BIGA" and the script tagline in the header, name and price stamped at the foot, the pizza drawn as a screen print in the centre (multiply). Drag, wheel, arrows and tabs move the shelf; the active box turns out with springy follow (reduced motion: no easing, instant).

### View Ring and Cursor
On fine pointers the system cursor is replaced by a 58px ink ring with a dot. Over a spine it shrinks to 0.72; over a button to 0.55; over the active lid it grows (1.75), fills cobalt and shows "OUVRIR / LA BOÎTE" in cream print. The 42px cobalt "+" ring marks the active lid on any pointer.

### Open Sheet (dialog)
Full-screen sheet in the sheet colour with its own grain. Opens from the lid with a clip-path expansion and un-rotation (1050ms, `cubic-bezier(.76,0,.18,1)`), then an ink-blot mask reveals the illustration (displaced circles, staggered 75ms). Closes in 850ms. Text column: display name, meta label, ingredients, supplements in italic, call button. Reduced motion collapses every duration to 1ms.

### Caption Ticker
Name, cobalt ingredient line and price under the shelf. On change each line slides out vertically and the new one slides in (650ms, standard ease); reduced motion swaps text in place.

## Do's and Don'ts

### Do:
- **Do** keep every surface on kraft or sheet with the grain layer over it.
- **Do** set interface text in ink or cobalt only, and reserve cobalt for the brand mark, the active state, the ingredient line and calling to order.
- **Do** draw controls as 1px-ruled square label boxes in Inter Tight 600 11px uppercase at 0.09em.
- **Do** set pizza names and ingredient prose in Newsreader with the optical-size axis matched to size.
- **Do** keep illustration inks (vermilion, basil, cream) inside lid art and spine base dots.
- **Do** honour `prefers-reduced-motion` by collapsing durations to 1ms and dropping ticker slides.
- **Do** keep a 44px target (or a 12px coarse-pointer hit extension) on every control.

### Don't:
- **Don't** introduce white, grey or a second accent hue in the interface; the press has ink and cobalt.
- **Don't** put faded ink (muted-ink) text on the kraft ground.
- **Don't** add shadows, rounded corners or filled cards to chrome; only shelf boxes cast a shadow.
- **Don't** use Caveat Brush for anything but "Best pizza in town".
- **Don't** use Big Shoulders for prose or labels; it is box lettering.
