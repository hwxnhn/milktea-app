---
name: Brew & Steep
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#51443a'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#837469'
  outline-variant: '#d5c3b6'
  surface-tint: '#835425'
  primary: '#6f4315'
  on-primary: '#ffffff'
  primary-container: '#8b5a2b'
  on-primary-container: '#ffddc2'
  inverse-primary: '#f9ba82'
  secondary: '#126e0c'
  on-secondary: '#ffffff'
  secondary-container: '#9bf585'
  on-secondary-container: '#197211'
  tertiary: '#773e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#9a5200'
  on-tertiary-container: '#ffdcc3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc1'
  primary-fixed-dim: '#f9ba82'
  on-primary-fixed: '#2e1500'
  on-primary-fixed-variant: '#683d0f'
  secondary-fixed: '#9df888'
  secondary-fixed-dim: '#82db6f'
  on-secondary-fixed: '#002200'
  on-secondary-fixed-variant: '#005300'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-mobile: 16px
  gutter: 12px
  touch-target-min: 48px
  bottom-nav-height: 56px
  thumb-zone-padding: 24px
---

## Brand & Style
The design system focuses on a clean, professional, and minimalist aesthetic tailored for a high-frequency mobile ordering experience. The brand personality is grounded and refreshing, reflecting the natural qualities of tea and the creamy comfort of milk. 

The visual direction prioritizes clarity and efficiency, utilizing high-quality whitespace and a structured layout to reduce cognitive load during the selection process. By blending professional precision with a warm, organic color palette, the UI evokes a sense of reliability and modern convenience.

## Colors
The color palette is derived from the product's core ingredients. **Milk Tea Brown** serves as the primary structural color, used for headers, primary buttons, and key branding elements. **Tea Green** acts as a secondary accent for health-conscious callouts, ingredient highlights, and secondary actions.

**Warm Orange** is reserved exclusively for high-urgency conversion points—specifically the final "Order Now" and "Checkout" actions—to ensure they stand out against the earthy base tones. Backgrounds remain off-white or light gray to maintain a professional, clean canvas, while red is used strictly for error states in form validation.

## Typography
This design system utilizes the system's native sans-serif fonts (San Francisco on iOS, Roboto on Android) to ensure a familiar, high-performance experience. 

- **Body Text:** Standardized at 14sp for secondary info and 16sp for primary reading to ensure legibility.
- **Headlines:** Semi-bold weights are used to create a clear information hierarchy in the menu.
- **Labels:** All-caps or medium weights are used for category tabs and small UI metadata.

## Layout & Spacing
The layout follows a mobile-first, thumb-zone optimized philosophy. Key interactive elements, such as "Add to Cart" and "Proceed to Payment," are anchored to the bottom 40% of the screen.

- **Grid:** A 4-column fluid grid for mobile with 16px side margins.
- **Touch Targets:** A strict minimum of 48x48dp for all interactive elements to prevent mis-taps.
- **Navigation:** A fixed bottom navigation bar provides instant access to the four primary app pillars. Sub-pages utilize a top app bar with a clear back-navigation affordance.

## Elevation & Depth
To maintain a minimalist and professional look, this design system uses **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Level 0 (Base):** The main background surface (#F5F5F5).
- **Level 1 (Cards):** White surfaces with a subtle 1px border or a very soft, high-diffusion shadow (4% opacity) to separate menu items.
- **Level 2 (Sheets):** Bottom sheets for item customizations emerge from the bottom with a 16px backdrop blur to dim the background content, focusing the user's attention on the modifiers (ice level, sugar level, toppings).

## Shapes
The shape language is "Rounded," balancing the professional tone with the friendly nature of a beverage app. 

- **Containers:** Cards and input fields use an 8px (0.5rem) corner radius.
- **Buttons:** Main action buttons use a 12px or fully rounded pill-shape to distinguish them from informational cards.
- **Selection UI:** Checkboxes and radio buttons for toppings use standard circular/rounded-square geometry for instant recognition.

## Components

### Buttons
- **Primary:** Milk Tea Brown background, white text. Min height 48dp.
- **Urgent (CTA):** Warm Orange background, white text. Used for "Checkout" and "Order Now."
- **Secondary:** Tea Green outline or text-only for less critical actions like "Add More Items."

### Input Fields & Selection
- **Inputs:** Clean, outlined boxes with 8px radius. Error states change the border and helper text to Red.
- **Bottom Sheets:** Triggered for drink customization. Options are presented in vertical lists with clear radio buttons for exclusive choices (Sugar Level) and checkboxes for additive choices (Toppings).

### Navigation & Lists
- **Bottom Navigation:** 4-icon layout (Menu, Cart, Orders, Account). Active state uses Primary Brown.
- **Category Tabs:** Horizontal scrolling list at the top of the menu, using subtle background chips to indicate the active category.
- **Menu Items:** Vertical scrolling cards with a thumbnail image, price, and a quick "plus" icon for adding to the cart.

### Feedback
- **Toasts/Snackbars:** Appear at the bottom (above the nav bar) to confirm "Added to Cart" or "Network Error."
- **Empty States:** Minimalist illustrations using neutral tones to guide users back to the menu.