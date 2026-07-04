---
name: Academic Flux
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464555'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width: 1280px
---

## Brand & Style

The design system is engineered for the "College Smart Attendance System," targeting a demographic of students and faculty who require high-velocity information processing. The brand personality is **Academic Modernist**: precise, reliable, and frictionless.

The visual style follows **Modern Minimalism** with a focus on functional clarity. It leverages high-quality whitespace to reduce cognitive load in dense data environments. While the interface is professional and grounded, it utilizes subtle Indigo-to-Blue gradients to signify modern technology and "smart" automation. The emotional response is one of calm control and institutional trust, ensuring that the transition from physical classrooms to digital logs feels seamless.

## Colors

The palette is anchored by a sophisticated **Indigo Primary (#4F46E5)** that transitions into a **Vibrant Blue (#6366F1)** via linear gradients for primary actions and brand moments. 

- **Primary & Secondary:** Used for high-emphasis buttons, active navigation states, and progress indicators.
- **Tertiary:** A success-oriented Green (#10B981) specifically reserved for "Present" status and positive attendance trends.
- **Neutral:** A range of cool grays (Slate) provides the structural scaffolding.
- **Dark Mode:** The system is "Dark Mode Ready," utilizing a deep navy-slate (#0F172A) for backgrounds rather than pure black, maintaining soft contrast and readability under low-light classroom conditions.

## Typography

This design system utilizes a dual-font strategy. **Geist** is employed for headlines and labels to provide a technical, precise, and contemporary feel. **Inter** is used for body copy and data entry to ensure maximum legibility and familiar comfort during long reading sessions.

Typography scales are optimized for a mobile-first experience. Display and Large Headline sizes feature negative letter-spacing to maintain a "tight" professional look, while small labels use increased tracking for clarity in data tables and status badges.

## Layout & Spacing

The layout follows a **Fluid Grid** philosophy with a specific emphasis on a 4px baseline rhythm. 

- **Mobile (Default):** A single-column stack with 16px side margins. Elements utilize full-width cards to maximize tap targets.
- **Tablet:** A 2-column masonry grid for dashboard widgets. Sidebars are introduced as collapsible overlays.
- **Desktop:** A fixed-width layout (max 1280px) with a 12-column grid. The sidebar remains persistent at 280px width.

Margins and gutters are strictly enforced at 16px (md) for mobile and 24px (lg) for desktop to ensure clear visual separation between distinct data modules.

## Elevation & Depth

Visual hierarchy is established using **Tonal Layers** combined with **Ambient Shadows**. 

1. **Base Layer:** The canvas (#F8FAFC in light, #0F172A in dark).
2. **Surface Layer (Cards/Inputs):** Pure white or dark slate with a subtle 1px border (#E2E8F0).
3. **Elevated State:** Applied to active cards and hover states using a "Soft Bloom" shadow: `0 10px 15px -3px rgba(0, 0, 0, 0.05)`.

Shadows should be tinted with the primary color (Indigo) at extremely low opacities (2-3%) to prevent them from looking "dirty" on the clean background.

## Shapes

The design system utilizes a **2xl Rounded** aesthetic to soften the professional tone and make the application feel accessible. 

- **Cards:** Use a generous 24px (1.5rem) radius to create a distinct containerized feel.
- **Interactive Elements:** Buttons and input fields use a 12px (0.75rem) radius for a modern, "squircle-adjacent" appearance.
- **Status Chips:** Fully rounded (Pill) to differentiate them from functional buttons.

## Components

### Cards & Containers
Cards are the primary organizational unit. They must feature a white background (or dark slate), 24px rounded corners, and a 1px soft border. No heavy shadows unless the card is being actively dragged or hovered.

### Buttons
- **Primary:** Linear gradient (#4F46E5 to #6366F1) with white text. High-radius corners.
- **Secondary:** Ghost style with an indigo border and transparent background.
- **Destructive:** Solid Red-500 with soft shadows.

### Forms & Inputs
Inputs should have a height of 48px for mobile accessibility. Labels sit above the field in **Geist SemiBold**. Active states must use a 2px indigo border glow.

### Tables & Lists
For mobile, tables reflow into "List Cards." On desktop, tables use a flat design with subtle row separators (#F1F5F9) and no vertical borders. The header row is pinned and uses a light gray background.

### Sidebars
A persistent 280px navigation drawer. Icons are line-art style (24px). The active navigation item is marked by a vertical indigo pill on the left edge and a subtle background tint.

### Status Indicators
- **Present:** Pill-shaped badge, Green background (10% opacity) with Green text.
- **Absent:** Pill-shaped badge, Red background (10% opacity) with Red text.
- **Late:** Pill-shaped badge, Amber background (10% opacity) with Amber text.