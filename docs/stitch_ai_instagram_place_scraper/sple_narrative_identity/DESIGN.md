---
name: Sple Narrative Identity
colors:
  surface: '#1c1010'
  surface-dim: '#1c1010'
  surface-bright: '#453635'
  surface-container-lowest: '#160b0b'
  surface-container-low: '#251818'
  surface-container: '#291c1c'
  surface-container-high: '#352726'
  surface-container-highest: '#403130'
  on-surface: '#f5dddb'
  on-surface-variant: '#e0bfbd'
  inverse-surface: '#f5dddb'
  inverse-on-surface: '#3b2d2c'
  outline: '#a78a88'
  outline-variant: '#584140'
  surface-tint: '#ffb3b0'
  primary: '#ffb3b0'
  on-primary: '#68000f'
  primary-container: '#ff6b6b'
  on-primary-container: '#6d0010'
  inverse-primary: '#ae2f34'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#52dea2'
  on-tertiary: '#003824'
  tertiary-container: '#00b179'
  on-tertiary-container: '#003b26'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b0'
  on-primary-fixed: '#410006'
  on-primary-fixed-variant: '#8c1520'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#72fbbc'
  tertiary-fixed-dim: '#52dea2'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#1c1010'
  on-background: '#f5dddb'
  surface-variant: '#403130'
typography:
  display:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h1:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h2:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 20px
  gutter: 12px
---

## Brand & Style

The design system is engineered to evoke a sense of high-end exploration and immediate responsiveness. It targets a tech-savvy audience that values efficiency and aesthetic polish within the context of social discovery. By utilizing a "Zero-Loading" philosophy, the system prioritizes perceived performance, ensuring the interface feels alive even during data fetching.

The visual style is a refined iteration of **Glassmorphism**, emphasizing depth through translucent layers, background blurs, and hyper-thin structural borders. The brand identity is anchored by the 'Concept A' symbol—a minimalist fusion of a geometric 'S' and a map pin in Vibrant Coral Red—representing the intersection of social connectivity and physical location.

## Colors

The palette is anchored in a deep, cinematic dark mode. **Black (#000000)** provides the infinite canvas, while **Deep Navy (#0F172A)** serves as the primary surface color for cards and containers. 

**Vibrant Coral Red (#FF6B6B)** is the singular action color, reserved for the brand mark, primary calls-to-action, and active map pins. For content hierarchy, **White (#FFFFFF)** is used exclusively for titles to ensure maximum legibility, while **Light Slate (#94A3B8)** softens secondary information and metadata. Surfaces utilize a **1px border (#1E293B)** to define boundaries without heavy visual weight.

## Typography

This design system uses **Epilogue** (substituting for Montserrat for a more contemporary geometric feel) for all headings to establish a bold, authoritative presence. **Be Vietnam Pro** (substituting for Urbanist) is utilized for all body text and labels to maintain a friendly, approachable, yet highly readable atmosphere suitable for social mapping.

High-contrast white is applied to all heading levels to draw the eye. Body text primarily uses Light Slate to reduce visual fatigue, switching to white only when high emphasis is required.

## Layout & Spacing

The layout follows a fluid 8pt grid system designed for mobile-first map interactions. Content containers and bottom sheets employ a generous **24px margin** from the screen edges to maintain a floating, airy feel. 

Map-centric views utilize a "No Grid" philosophy for the map canvas itself, with floating glassmorphic controls positioned with a 16px safety inset from the edges. Bottom sheets are designed with a 24px corner radius to soften the transition from the map to information panels.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and tonal layering rather than traditional heavy shadows.

- **Level 0 (Base):** Pure Black (#000000) representing the map or core background.
- **Level 1 (Surfaces):** Deep Navy (#0F172A) with 80% opacity and a 20px background blur.
- **Level 2 (Floating Controls):** Translucent Navy with 60% opacity, 30px blur, and a 1px solid border (#1E293B).
- **Shadows:** Soft, highly diffused shadows (0px 8px 24px rgba(0,0,0,0.5)) are used exclusively on floating action buttons and active cards to separate them from the map layer.

## Shapes

The design system adopts a **Rounded** shape language to feel modern and accessible. 

- **Standard Components:** Cards and buttons use a 0.5rem (8px) to 1rem (16px) radius.
- **Primary Containers:** Bottom sheets and large modal overlays use a distinct **24px radius** on top corners to create a "cradle" effect for content.
- **Interactive Elements:** Pill-shaped rounding is reserved for tags and map category chips to distinguish them from structural UI components.

## Components

### Skeleton UI (Zero-Loading)
Every data-driven component (list items, map cards, profile headers) must have a corresponding skeleton state. Skeletons should use a subtle gradient shimmer from Deep Navy (#0F172A) to #1E293B.

### Buttons & Chips
- **Primary Button:** Solid Vibrant Coral Red with white text. No shadow.
- **Secondary/Glass Button:** Translucent Navy background, 1px border, white text.
- **Filter Chips:** Pill-shaped, semi-transparent backgrounds that turn solid Coral Red when active.

### Floating Controls
Map controls (Zoom, Center-to-Location, Search) are housed in circular or soft-square containers with a background blur of 20px and 1px border.

### Bottom Sheets
Always feature a 40px wide "grabber" bar at the top, centered, with 20% white opacity. Surfaces are translucent to allow hint of the map colors to bleed through.

### Iconography
Linear, 2px stroke weight, 24px bounding box. Icons should be minimalist and use Light Slate, turning Coral Red for active states.