# EduPlatform — Website (Landing Page)

Marketing landing page for IT learning centers — EduPlatform clients. Included as a bonus with the platform. Students submit applications that automatically appear in the CRM as leads.

## Stack

| Technology | Version | Purpose |
|------------|--------|------------|
| [Next.js](https://nextjs.org/) | 14.2 | Framework (App Router, SSG + SSR) |
| [React](https://react.dev/) | 18 | UI |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Styling |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Animations (scroll-reveal, transitions) |
| [Radix UI Select](https://www.radix-ui.com/primitives/docs/components/select) | 2.2 | Custom Select |
| [date-fns](https://date-fns.org/) | 4.1 | Dates (DatePicker, locales) |
| [Lucide React](https://lucide.dev/) | 1.11 | Icons |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5 | State (i18n locale persist) |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) + [clsx](https://github.com/lukeed/clsx) | — | Class utilities |

## Quick Start

```bash
# Local
cd website
npm install
npm run dev          # http://localhost:3003

# Docker (together with the entire project)
docker compose up -d --build website   # http://localhost:3003
```

**Environment Variables:**

| Variable | Default | Description |
|------------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend URL for submitting applications |

## Project Structure

```
website/
├── public/
│   └── favicon.svg              # Tab icon (mint/cyan gradient)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (Inter font, metadata, favicon)
│   │   ├── page.tsx             # Main page (section composition)
│   │   ├── globals.css          # Global styles, CSS utilities
│   │   └── form/
│   │       └── [api_key]/
│   │           └── page.tsx     # Dynamic form (for CRM landing sources)
│   ├── components/
│   │   ├── Header.tsx           # Header (sticky, nav, language, CTA)
│   │   ├── Hero.tsx             # Hero section (heading, stats, CTA)
│   │   ├── Courses.tsx          # 10 training directions
│   │   ├── Advantages.tsx       # 6 advantages
│   │   ├── Platform.tsx         # Platform (phone mockup + features)
│   │   ├── HowItWorks.tsx       # 4 learning steps
│   │   ├── Testimonials.tsx     # Testimonials carousel
│   │   ├── FAQ.tsx              # FAQ accordion
│   │   ├── ApplicationForm.tsx  # Application form (→ POST /public/website-lead)
│   │   ├── Footer.tsx           # Footer (contacts, navigation, courses)
│   │   ├── AnimatedSection.tsx  # Framer Motion wrapper (scroll-reveal)
│   │   └── ui/
│   │       ├── select.tsx       # Custom Select (Radix, dark theme)
│   │       └── date-picker.tsx  # Custom DatePicker (3 levels, i18n)
│   └── lib/
│       ├── utils.ts             # cn() — clsx + tailwind-merge
│       └── i18n/
│           ├── types.ts         # Translation types
│           ├── index.ts         # Zustand store + useT() hook
│           ├── ru.ts            # Russian
│           ├── en.ts            # English
│           └── uz.ts            # Uzbek
├── tailwind.config.ts           # Dark theme, accent colors, animations
├── next.config.mjs              # output: "standalone"
├── Dockerfile                   # Multi-stage build (deps → build → run)
└── package.json
```

## Pages

### `/` — Main Page (Landing)

10 sections from top to bottom:

| # | Section | Description |
|---|--------|----------|
| 1 | **Header** | Sticky, glass effect on scroll, navigation, RU/UZ/EN language switcher, CTA |
| 2 | **Hero** | Gradient heading, "Enrollment Open" badge, 3 stat cards, 2 CTAs |
| 3 | **Courses** | 10 directions (Python, JS, Java, Mobile, DevOps, DS, Cyber, UI/UX, English, Robotics) |
| 4 | **Advantages** | 6 blocks: instructors, curriculum, small groups, hands-on practice, certificate, job placement |
| 5 | **Platform** | Phone mockup (schedule, stars/diamonds/GPA) + 6 platform features |
| 6 | **HowItWorks** | 4 steps: consultation → start → practice → result |
| 7 | **Testimonials** | Carousel with 5 reviews, arrow + dot navigation |
| 8 | **FAQ** | 7 questions, accordion with Framer Motion animation |
| 9 | **ApplicationForm** | Name, phone, email, direction (Radix Select), comment |
| 10 | **Footer** | 4 columns: brand, navigation, courses, contacts |

### `/form/[api_key]` — Dynamic Form

Public form page for CRM landing sources. Automatically generated for each landing source.

**How it works:**
1. Frontend calls `GET /api/v1/public/forms/{api_key}` → receives configuration: source name, funnel, field list
2. Renders the form with base fields (full name, phone, email) + custom funnel fields
3. On submission: `POST /api/v1/public/forms/{api_key}/submit`
4. The lead appears in CRM with the correct source and custom fields

**Supported field types:**

| Type | Component |
|-----|-----------|
| `text` | `<input type="text">` |
| `number` | `<input type="number">` |
| `date` | Custom `<DatePicker>` (3-level, i18n) |
| `select` | Custom `<Select>` (Radix UI) |
| `multiselect` | Toggle buttons (multiple selection) |
| `checkbox` | Custom checkbox (SVG checkmark) |

## Design System

### Color Theme

| Token | Value | Usage |
|-------|----------|---------------|
| `dark-900` | `#0A0E17` | Page background |
| `dark-800` | `#0F1623` | Contrasting section background |
| `dark-700` | `#151D2E` | Card and input background |
| `accent` | `#00D4AA` | Primary accent (buttons, links, highlights) |
| `accent-light` | `#00F0C0` | Accent hover state |
| `cyan-400` | `#22D3EE` | Secondary accent (gradients) |

### CSS Utilities (globals.css)

| Class | Description |
|-------|----------|
| `.glass` | Frosted glass: `rgba(15,22,35,0.6)` + `blur(12px)` + subtle border |
| `.glass-light` | Light glass: `rgba(15,22,35,0.4)` + `blur(8px)` |
| `.gradient-text` | Gradient text: accent → cyan → accent |
| `.gradient-border` | Pseudo-element border with gradient |

### Animations (Tailwind config)

| Animation | Description |
|----------|----------|
| `fade-in` | Fade in with opacity 0 → 1 |
| `slide-up` | Slide up appearance (translateY 30px → 0) |
| `float` | Floating animation (6s cycle) |
| `glow` | Accent shadow flicker |
| `pulse-slow` | Slow pulse (3s) |

### Responsiveness

Mobile-first approach. All components are adapted for 320px–375px:

- Sections: `py-12 sm:py-16 lg:py-24`
- Headings: `text-2xl sm:text-4xl lg:text-5xl`
- Subheadings: `text-base sm:text-lg`
- CTA buttons: `px-6 py-3.5 sm:px-8 sm:py-4`
- Cards: `p-5 sm:p-6`
- Platform mockup: `w-full max-w-[280px] sm:max-w-[320px]`
- Mobile menu: `max-h-[80vh] overflow-y-auto`

## Internationalization (i18n)

3 languages: **Russian** (default), **English**, **Uzbek** (Latin script).

**Architecture:**
- `Zustand` store with `persist` → language is saved in `localStorage`
- `useT()` hook → returns a typed `Translations` object
- Switcher in the header (desktop: dropdown, mobile: RU/UZ/EN pills)

**Coverage:**
- All 10 landing sections
- DatePicker (weekdays, months, "Today")
- Dynamic form (loading, error, success states)
- ~200 keys per language

## Backend Integration

### Main Form (ApplicationForm)

```
POST /api/v1/public/website-lead
{
  "fullName": "Name",
  "phone": "+998901234567",
  "email": "test@mail.com",      // optional
  "direction": "Python",          // → customFields
  "comment": "Text"               // → customFields
}
```

- Automatically creates a "Website Applications" funnel + stages + source on first call
- Direction and comment are saved in the lead's `customFields` (with UUID keys)
- Manager is assigned automatically (round-robin)

### Dynamic Form (/form/[api_key])

```
GET  /api/v1/public/forms/{api_key}        → form configuration
POST /api/v1/public/forms/{api_key}/submit  → submit application
{
  "fullName": "...",
  "phone": "...",
  "email": "...",
  "customFields": {
    "<uuid>": "value",
    "<uuid>": ["multi", "select"],
    "<uuid>": true
  }
}
```

## UI Components

### Select (`components/ui/select.tsx`)

Wrapper around Radix UI Select for the dark theme:
- Trigger: `bg-dark-700/60`, accent focus ring
- Content: `bg-dark-700`, `backdrop-blur-xl`, `zoom-in-95` animation
- Items: hover `bg-accent/10 text-accent`

**Exports:** `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`

### DatePicker (`components/ui/date-picker.tsx`)

Fully custom calendar (no third-party libraries):
- 3-level navigation: days → months (click heading) → years
- i18n: weekdays and months from translations
- `date-fns` locale per language (ru, en, uz)
- Props: `value`, `onChange`, `placeholder`, `disabled`, `error`, `minDate`, `maxDate`
- Dark theme: `bg-dark-700`, accent for selected

### AnimatedSection (`components/AnimatedSection.tsx`)

Framer Motion wrapper for scroll-reveal:
- `initial={{ opacity: 0, y: 40 }}` → `whileInView={{ opacity: 1, y: 0 }}`
- `viewport={{ once: true, margin: "-80px" }}`
- Props: `children`, `className`, `delay`

## Docker

```dockerfile
# Multi-stage build
FROM node:20-alpine AS deps      # npm ci
FROM node:20-alpine AS builder   # next build (standalone)
FROM node:20-alpine AS runner    # node server.js

EXPOSE 3000
```

```yaml
# docker-compose.yml
website:
  build:
    context: ./website
    args:
      NEXT_PUBLIC_API_URL: http://localhost:8000/api/v1
  ports:
    - "3003:3000"
```

## Favicon

SVG icon: academic cap on a mint-cyan gradient (`#00D4AA → #06B6D4`). Defined in `layout.tsx` via `metadata.icons`.
