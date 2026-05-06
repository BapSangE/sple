# Design System Specification: The Fluid Cartographer

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Fluid Cartographer**. 

Moving away from the rigid, boxy constraints of traditional map applications, this system prioritizes a "living" interface that breathes. We achieve a premium, editorial feel by treating the UI as a series of sophisticated, layered overlays rather than a flat grid. The aesthetic is defined by **Dynamic Asymmetry**: intentionally using generous white space and overlapping components to guide the eye toward "hot spots" without clutter. This is not just a utility; it is a curated digital concierge that balances the warmth of human discovery with the precision of AI.

---

## 2. Colors: Tonal Depth & Vibrancy
Our palette is designed to pop against the complex visual data of a map. We use high-chroma accents to signify action and intelligence.

### Core Palette
*   **Primary (Coral - #FF5A5F):** The "Heat." Reserved for brand-critical moments and active map markers. High-vibrancy hex ensures visibility against map layers.
*   **Secondary (Smart Purple - #6B4EFF):** The "Brain." Used for AI-driven features, directions, and secondary actions. This color represents technical reliability.
*   **Tertiary (Guide Mint - #00D09E):** The "Guide." Exclusively for onboarding, tooltips, and new user "pings." It provides a calming, helpful contrast to the high-energy Coral.
*   **Neutral (Deep Charcoal - #1E1E1E):** The base for high-contrast text and grounding elements.

### Surface Architecture
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. To separate content, utilize background shifts. Let the change in value define the edge, not a stroke.
*   **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of fine paper. 
    *   `surface_container_lowest`: Use for the most elevated floating elements (active cards).
    *   `surface`: The base canvas for the application.
    *   `surface_container_highest`: Use for recessed areas like search bars or inactive background states.
*   **The "Glass & Gradient" Rule:** Floating action buttons and map overlays should utilize Glassmorphism. Apply background variants at 80% opacity with a 20px backdrop blur. For high-impact CTAs, use a subtle linear gradient from `primary` to a lighter container tint to add "soul" and depth.

---

## 3. Typography: Editorial Precision
We utilize **Manrope** for its geometric yet friendly structure and **Inter** for high-legibility micro-copy.

*   **Display & Headlines (Manrope):** Use `display-lg` and `headline-md` with tight letter-spacing (-0.02em) to create an authoritative, editorial look. Titles should feel like magazine headers.
*   **Body (Manrope):** `body-lg` is our workhorse. Ensure a line height of 1.5 to maintain "breathing room" in dense place descriptions.
*   **Labels (Inter):** `label-md` in Medium or Semi-bold weight. Inter is reserved for technical data: coordinates, timestamps, and UI meta-data, providing a subtle "high-tech" feel against the warmer Manrope.

---

## 4. Elevation & Depth: Tonal Layering
Depth is not a drop shadow; it is a relationship between light and surface.

*   **The Layering Principle:** Avoid shadows where possible. Achieve lift by placing elevated containers on a standard surface background.
*   **Ambient Shadows:** If a floating element requires a shadow (e.g., a primary Map Pin), use an ultra-diffused shadow tinted with the `on_surface` color—never use pure black.
*   **The "Ghost Border" Fallback:** For accessibility in low-contrast environments, use a "Ghost Border" at 15% opacity. It should be felt, not seen.

---

## 5. Components: Bespoke Elements

### Buttons & Action
*   **Primary (Coral):** Maximum corner radius (Pill-shaped/Roundedness: 3). Used for "Go" or "Check-in."
*   **AI Action (Purple):** Container background with high-contrast text. Used for "Smart Sort" or "AI Directions."
*   **Glass Buttons:** Semi-transparent containers with a 16px blur for map-overlay controls.

### Cards & Bottom Sheets
*   **Corner Radius:** Use maximum roundedness (Level 3) for bottom sheets to create a friendly, approachable "cradle" for content.
*   **No-Divider Rule:** Never use horizontal lines to separate list items. Use generous vertical padding (Spacing: 2) and a subtle surface shift for the alternate item background if necessary.

### Tooltips & Guidance
*   **Mint Bubbles:** Use tertiary accents. These should "float" with a gentle shadow to guide first-time users through the map interface.

### Input Fields
*   **Search:** Use recessed surface containers with no border. The focus state should be a subtle colored outline at 20% opacity.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins for headline elements to create a custom, editorial feel.
*   **Do** leverage "Smart Purple" gradients behind AI-generated recommendations to signify the "tech" layer.
*   **Do** allow the map to bleed behind the UI components using glassmorphism to maintain context.
*   **Do** utilize the maximum roundedness (Level 3) for a fluid, organic aesthetic.

### Don't
*   **Don't** use 1px dividers or "hairlines." They clutter the minimalist aesthetic.
*   **Don't** use pure black (#000000) for text. Always use deep neutral tones to maintain a soft, premium feel.
*   **Don't** use sharp or subtle corners. Our identity lives in the maximum "Pill-shaped" range.