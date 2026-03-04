# Closet Canvas

A virtual wardrobe and outfit stylist web app. Your personal AI-powered wardrobe assistant.

## Features

- **Wardrobe Management** — Upload and organize all your clothes by category, color, season, occasion, and brand
- **Style Lab** — Mix and match items digitally, generate random outfit combinations, select mood and weather
- **Outfit Studio** — 2D SVG mannequin with live body proportion sliders (height, shoulders, chest, waist, hips); tap wardrobe items to dress the model; save as outfit
- **Outfit of the Day (OOTD)** — AI-powered daily outfit suggestions based on mood and occasion
- **Calendar Planning** — Schedule outfits for specific days with a month-view calendar
- **Packing Assistant** — Smart trip packing list generated from your wardrobe, with occasion filters and checkboxes
- **Shopping Wishlist** — Track items to buy with priority levels and purchase status
- **Favorites** — Save and browse favorite outfits
- **Couple Mode** — Connect with a partner, create outfit comparison sessions, vote on looks
- **Style Insights** — Capsule wardrobe building via shopping wishlist

## Pages

| Route | Description |
|-------|-------------|
| `/` | Wardrobe – browse and manage all clothing items |
| `/style` | Style Lab – mood/weather-based outfit generation |
| `/outfit-studio` | 2D mannequin outfit builder with body sliders |
| `/ootd` | Outfit of the Day – AI daily suggestions |
| `/favorites` | Saved favorite outfits |
| `/plan` | Calendar – plan outfits by date |
| `/packing` | Packing Assistant – smart trip packing list |
| `/shopping` | Shopping Wishlist |
| `/me` | Profile, stats, couple mode access |
| `/couple` | Couple mode – connect & compare outfits |
| `/couple/session/:id` | Outfit comparison voting session |

## Tech Stack

### Frontend (`/webapp`)
- React 18 + TypeScript + Vite (port 8000)
- TailwindCSS with Cormorant Garamond (serif) + Outfit (sans-serif) typography
- shadcn/ui components
- React Query for server state
- Framer Motion for animations
- React Three Fiber + Three.js + Drei for 3D backgrounds (Welcome page scene, ambient layout background)
- Glassmorphism UI elements (frosted nav bar, translucent cards)

### Backend (`/backend`)
- Hono + Bun (port 3000)
- Prisma + SQLite database
- Zod validation

## API Endpoints

All responses use `{ data: T }` envelope.

- `GET/POST/PUT/DELETE /api/wardrobe` — Clothing items
- `POST /api/wardrobe/:id/wear` — Increment wear count
- `GET/POST/PUT/DELETE /api/outfits` — Saved outfits
- `GET /api/outfits/suggest` — Random outfit suggestion
- `GET/POST/PUT/DELETE /api/calendar` — Calendar entries
- `GET/POST/PUT/DELETE /api/shopping` — Shopping wishlist
- `GET /api/stats` — Wardrobe statistics
