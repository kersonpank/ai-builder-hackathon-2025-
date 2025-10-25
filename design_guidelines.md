# Omni.AI Design Guidelines (Compacted)

## Design System & Principles

**System:** Material Design 3 (optimized for B2B SaaS data-dense interfaces)

**Core Principles:**
1. Clarity over decoration - functional elements only
2. Progressive disclosure - show complexity when needed
3. Empathetic interactions - human-centered language
4. Responsive efficiency - desktop dashboards + mobile chat

---

## Typography

**Fonts:**
- Primary UI: Inter | Headings: Manrope | Code: JetBrains Mono

**Scale:**
- H1: `text-5xl font-bold` | H2: `text-3xl font-semibold` | H3: `text-xl font-semibold` | H4: `text-lg font-medium`
- Body: `text-base` (primary), `text-sm` (secondary), `text-xs` (captions)
- Buttons: `text-sm font-medium uppercase tracking-wide`
- Chat Messages: `text-base leading-relaxed`

---

## Layout & Spacing

**Spacing Scale:** `2-3` (micro) | `4-6-8` (standard) | `12-16-20` (sections) | `24-32` (pages)

**Grids:**
- **Admin/User Panels:** Sidebar 64px (collapsed)/240px (expanded), main content `max-w-7xl`, metrics `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **ChatWeb:** `max-w-4xl` centered, messages `max-w-md`, products `grid-cols-1 sm:grid-cols-2`
- **Onboarding:** `max-w-2xl` centered, single-column forms

**Breakpoints:** Mobile <640px | Tablet 640-1024px | Desktop >1024px

---

## Color & Visual System

**Surfaces:**
- Cards: `rounded-xl` with elevation shadows
- Modals: `rounded-2xl`, `backdrop-blur-sm` overlay
- Inputs: `rounded-lg`, focus `ring-2 ring-offset-2`

**States:**
- Active navigation: subtle background + `border-l-4` accent
- Hover: smooth 200ms transitions
- Error: `border-2` red + message below
- Disabled: `opacity-50 cursor-not-allowed`

**Icons:** Heroicons (solid/outline via CDN)

---

## Core Components

### Navigation

**Sidebar (Admin/User):**
- Fixed left, collapsible mobile (hamburger)
- Icon + label, active state with left border
- Bottom-aligned: User profile, Help, Logout

**Top Bar:**
- `h-16` fixed, logo + breadcrumbs left, search + notifications + avatar right

**Wizard Progress:**
- Horizontal stepper: Empresa → Agente → Catálogo → Canais
- States: completed (checkmark), current (emphasized), upcoming (subdued)

### Forms & Inputs

**Fields:**
- Height `h-12`, labels `text-sm font-medium mb-2`, helper text `text-xs mt-1`
- Error: border-2 red + accessible error message
- File upload: `border-dashed h-32` drag-drop, CSV shows column mapping

**Selectors:**
- Dropdowns: searchable, multi-select with chips
- Tone of Voice: `grid-cols-3` radio cards (icon + label + description)

### Data Display

**Metrics Cards:**
- `rounded-xl p-6`, icon + `text-3xl font-bold` value + trend (↑/↓ %)
- Grid: 4 per row desktop

**Tables:**
- Sticky header `text-xs uppercase`, row `h-14`, zebra striping
- Hover actions (3-dot menu), sortable columns, centered pagination

**Product Cards:**
- 1:1 image, `p-4`, name (`text-lg font-semibold`) + price (`text-xl`) + category tag
- Hover overlay: Edit, Delete, Duplicate
- Grid: `grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6`

**Orders:**
- Timeline with status badges (`rounded-full px-3 py-1 text-xs`)
- Expandable cards showing line items

### Chat Interface

**Structure:**
- Full viewport flex column: header (`h-16` sticky) + messages (scrollable) + input (`p-4 shadow-lg` sticky bottom)

**Messages:**
- User: `ml-auto rounded-2xl rounded-br-sm p-4 max-w-md`
- Agent: `mr-auto rounded-2xl rounded-bl-sm p-4 max-w-md`
- Timestamp: `text-xs mt-1 opacity-70`, typing indicator (animated dots)

**Product Cards in Chat:**
- Horizontal: `w-24 h-24` image + details + price (`text-lg font-bold`) + CTA buttons
- Buttons: "Adicionar" + "Comprar Agora" stacked

**Checkout (in-chat):**
- Stepper: Produtos → Dados → Confirmação
- Inline forms, summary card, QR code with copy link

### Buttons

**Primary:** `h-12 px-6 rounded-lg`  
**Secondary:** Outline `border-2`, same dimensions  
**Icon:** `w-10 h-10 rounded-full`  
**FAB (ChatWeb):** `w-14 h-14 rounded-full shadow-2xl` fixed bottom-right

### Overlays

**Modals:** `max-w-2xl rounded-2xl p-8`, header `text-2xl font-bold mb-6`, footer buttons right-aligned  
**Dropdowns:** `shadow-xl rounded-lg`, items `h-10 px-4`  
**Toasts:** Fixed top-right `max-w-sm p-4 rounded-lg`, auto-dismiss 5s

---

## Onboarding Wizard Steps

**Step 1 - Empresa:** Name, Segmento (select), CNPJ, inline validation + preview  
**Step 2 - Agente:** Name, tone selector (3 cards), instructions (500 char max) + sample preview  
**Step 3 - Catálogo:** CSV upload (with mapping) OR manual form, AI description generator (animated typing)  
**Step 4 - Canais:** Channel toggles (ChatWeb locked on, WhatsApp, Instagram), link/QR generation

---

## Images & Illustrations

**ChatWeb Landing Hero:**
- 50% viewport height, full-width gradient overlay
- Illustration: Friendly AI agent + floating products
- Overlay: Logo + tagline + CTA (`backdrop-blur-md`)

**Product Images:**
- Catalog: square thumbnails, `object-fit: cover`
- Chat: 96x96px landscape minimum
- Detail: up to 400x400px

**Empty States:** Friendly line illustrations `max-w-xs` centered (No products, orders, conversations)

**Onboarding:** 64x64px step icons, chat mockup previews

---

## Accessibility (WCAG AA)

- Focus: `ring-2` on all interactive elements, logical tab order
- ARIA labels: all icons and image-only buttons
- Form errors: announced to screen readers
- Touch targets: minimum 44x44px mobile
- Contrast: meet AA standards throughout

---

## Animation Guidelines (Minimal)

- Page transitions: 150ms fade
- Loading: skeleton screens or spinner
- Hover: 200ms smooth transitions
- Toasts: slide-in from top-right only
- **NO:** scroll animations, parallax effects

---

## Platform-Specific Elements

**Admin Panel:** Company status badges, plan tier progress bars, sparkline charts, bulk action toolbar  
**User Panel:** Quick actions dashboard (Teste o Agente, Adicionar Produto, Compartilhar), activity timeline, team avatars with roles  
**ChatWeb:** Minimal header (logo + name only), persistent input, instant add-to-cart, sticky checkout summary, order confirmation with tracking

---

## Implementation Notes

- Maintain consistency across patterns (spacing, typography, components)
- **Density:** Admin/User panels = information-dense with tight spacing | ChatWeb = conversational with generous whitespace
- All interactive elements must follow focus, hover, and disabled state patterns
- Use Heroicons CDN for all icons (solid/outline variants)