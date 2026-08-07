# 🌱 SmartFarm — Fuzzy Logic Farm Monitoring System

SmartFarm is a web-based decision support system for farmers. It lets users log soil moisture, temperature, and humidity readings and returns an instant status assessment and actionable recommendation, powered by a fuzzy-logic engine on the backend. All readings are stored per-user so farmers can track conditions over time.

---

## Features

- 🔐 **User authentication** — sign up, log in, log out, and password reset, powered by Supabase Auth
- 🧠 **Fuzzy logic engine** — classifies soil moisture, temperature, and humidity into levels (Very Low → Very High) and blends them into a human-readable status and recommendation
- 📊 **Monitoring dashboard** — enter live readings and get instant feedback
- 🕓 **History table** — every analysis is saved and displayed in a sortable history log
- 🏡 **One-time farm setup** — captures farm name, location, and size on first login
- ☁️ **Cloud-ready** — serves the frontend directly from the Express backend, so it deploys as a single service (e.g. on Render)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js, Express 5 |
| Auth & Database | Supabase (Postgres + Auth) |
| Hosting | Render (or any Node-compatible host) |

---

## Project Structure

```
.
├── server.js                  # Express server + fuzzy logic API
├── package.json
├── .env                        # Environment variables (not committed)
└── public/
    ├── index.html               # Landing page
    ├── auth.html                # Login / Register
    ├── forgot-password.html     # Request password reset email
    ├── reset-password.html      # Set a new password
    ├── setup.html                # One-time farm setup form
    ├── dashboard.html            # Main monitoring dashboard
    ├── app.js                    # Frontend auth, navigation guards, API calls
    ├── config.js                  # Supabase client init + auth helpers
    └── style.css                  # Global styles
```

---

## Getting Started

### 1. Prerequisites

- Node.js `>= 18`
- A [Supabase](https://supabase.com) project (URL + public/anon API key)

### 2. Clone and install

```bash
git clone <your-repo-url>
cd smart-farm-backend
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-or-anon-key
PORT=3000
```

Also update `public/config.js` with your Supabase project URL and **publishable/anon** key (this file is loaded in the browser, so never put a service-role key here):

```js
const SB_URL = "https://your-project.supabase.co";
const SB_KEY = "your-publishable-anon-key";
```

### 4. Set up the database

In your Supabase project, create the following tables:

**`farms`**
| Column | Type |
|---|---|
| id | uuid, primary key |
| user_id | uuid (references auth.users) |
| farm_name | text |
| location | text |
| land_size | text |

**`monitoring_records`**
| Column | Type |
|---|---|
| id | uuid, primary key |
| user_id | uuid (references auth.users) |
| soil_moisture | numeric |
| temperature | numeric |
| humidity | numeric |
| system_status | text |
| recommendation | text |
| created_at | timestamp, default `now()` |

Enable **Row Level Security (RLS)** on both tables and add policies so users can only read/write their own rows (`user_id = auth.uid()`).

### 5. Run the server

```bash
npm start
# or, with auto-reload during development:
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## How the Fuzzy Logic Works

Each input (moisture, temperature, humidity) is compared against overlapping ranges (e.g. *Low: 15–40*, *Medium: 30–65*), so a reading can fall into more than one band. When that happens, the engine picks the band whose midpoint is closest to the actual reading, breaking ties in favor of the more "critical" band. The three resulting classifications are then combined into a single, plain-language status message and recommendation, which is saved to the user's history.

---

## API

### `POST /api/analyze`

Analyzes a set of environmental readings and stores the result.

**Request body:**
```json
{
  "userId": "uuid",
  "moisture": 45,
  "temp": 28,
  "humidity": 60
}
```

**Response:**
```json
{
  "status": "Farm conditions are optimal.",
  "recommendation": "Maintain current environmental conditions and continue monitoring..."
}
```

### `GET /health`

Simple health check — returns `Server is ALIVE`.

---


