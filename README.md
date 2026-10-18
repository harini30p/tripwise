# TripWise — Smart Travel Planner

TripWise is a modern full-stack travel planning application designed to help travelers discover places of interest, explore attractions, and organize personalized itineraries.

Users can search for any destination or major city worldwide, filter attractions by categories, sort results, view detailed location information (including addresses, geographical coordinates, and direct OpenStreetMap links), and build a custom travel plan saved securely to a PostgreSQL database.

**GitHub Repository:** [https://github.com/harini30p/tripwise](https://github.com/harini30p/tripwise)

---

## Chosen Track

- **Track:** Track 1: Frontend Development

> *Note:* While built under Track 1: Frontend Development, TripWise incorporates a full-stack architecture featuring a dedicated Node.js/Express REST backend connected to a serverless Neon PostgreSQL database for persistent multi-device itinerary storage.

---

## Technologies Used

### Frontend
- **Framework:** React 19 (`react`, `react-dom`)
- **Build Tool & Dev Server:** Vite 8
- **Language:** JavaScript (ES Modules)
- **Styling:** Vanilla CSS with custom design tokens, responsive grid/flexbox layouts, and glassmorphism accents
- **Linter:** Oxlint

### Backend
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js 4
- **Database Driver:** `pg` (node-postgres) with connection pooling and SSL
- **Cross-Origin Resource Sharing:** `cors`
- **Configuration:** `dotenv`

### Database
- **Database:** PostgreSQL (Neon Serverless PostgreSQL)

### External APIs & Data Sources
- **Geoapify Geocoding API (`/v1/geocode/search`):** Resolves city/region queries to geographical coordinates and bounding boxes.
- **Geoapify Places API (`/v2/places`):** Queries real-time tourist attractions, natural landmarks, cultural spots, and entertainment venues.
- **OpenStreetMap (OSM):** Map data attribution and external map links for destinations.

---

## Features

- **Live Destination Exploration:** Search cities and regions globally using real-time Geoapify Geocoding and Places API integrations.
- **Category Filtering & Dynamic Search:** Filter attractions across categories (Beach, Mountains, City Breaks, Cultural Heritage, Adventure) with independent search querying.
- **Destination Sorting:** Sort explored destinations by default recommendation, name (A–Z / Z–A), or rating (highest first).
- **Destination Details Modal:** Dedicated dialog displaying detailed address metadata, category badges, high-resolution imagery, geographical coordinates (latitude & longitude), and a direct link to view the location on OpenStreetMap.
- **Interactive Itinerary Management:** Add, view, and remove saved destinations from an interactive "My Trip" itinerary tab with real-time counter badges.
- **PostgreSQL-Backed Persistence:** Persistent itinerary storage backed by Neon PostgreSQL via Express REST endpoints, using persistent anonymous browser client IDs (`tripwise_client_id`).
- **Comprehensive UI States:** Graceful handling for loading skeletons, empty search results, network failures, transient API action alerts, and automatic fallback to curated sample destinations when an external API key is not configured.
- **Fully Responsive Interface:** Tailored for mobile, tablet, and desktop viewports with accessible keyboard navigation and modal escape/focus management.

---

## API Details

### External API: Geoapify
- **Geocoding API:** `GET https://api.geoapify.com/v1/geocode/search`
  - Resolves text queries (e.g., "Paris", "Tokyo") into latitude/longitude coordinates and place IDs.
- **Places API:** `GET https://api.geoapify.com/v2/places`
  - Fetches category-specific points of interest within the resolved location using `categories`, `filter`, `limit`, and `lang=en`.

### Backend REST Endpoints

The Express server exposes the following REST endpoints:

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | None | Returns server health, uptime, and PostgreSQL connectivity status (`connected`, `unconfigured`, or `disconnected`). Responds with `200 OK` or `503 Service Unavailable`. |
| `/api/itinerary` | `GET` | Query: `clientId` (string, required) | Retrieves all saved itinerary items for the specified client ID, ordered chronologically by creation timestamp (`created_at ASC`). |
| `/api/itinerary` | `POST` | Body: `{ clientId: string, destination: object }` | Upserts a destination item into the database (`ON CONFLICT (client_id, place_id) DO UPDATE`). Returns `201 Created` with the saved record. |
| `/api/itinerary/:placeId` | `DELETE` | Path: `placeId` (string, required)<br>Query: `clientId` (string, required) | Removes a destination from the client's saved itinerary. Returns `200 OK` on success or `404 Not Found` if the item does not exist. |

---

## Database Configuration

TripWise utilizes **Neon Serverless PostgreSQL** for cloud-hosted database persistence.

### Automatic Schema Initialization
When the backend service starts, it automatically executes non-blocking table and index initialization queries:

```sql
CREATE TABLE IF NOT EXISTS itinerary_items (
  client_id VARCHAR(128) NOT NULL,
  place_id VARCHAR(255) NOT NULL,
  destination JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_client_created 
  ON itinerary_items (client_id, created_at ASC);
```

- **Composite Primary Key (`client_id`, `place_id`):** Prevents duplicate additions of the same destination for any individual client.
- **`destination JSONB`:** Stores structured destination metadata (title, category, country, coordinates, description, fallback images) flexibly.
- **Connection Pooling & SSL:** The backend initializes a `pg.Pool` configured with connection pooling (`max: 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`). SSL (`rejectUnauthorized: false`) is automatically enforced for remote/cloud hosts like Neon.

---

## Environment Variables

### 1. Frontend Configuration (`.env.local`)
Create a `.env.local` file in the project root:

| Variable | Required | Description | Safe Example |
| :--- | :--- | :--- | :--- |
| `VITE_GEOAPIFY_API_KEY` | Optional | Geoapify API key for live place searching. If omitted, TripWise runs in curated sample fallback mode. | `your_geoapify_api_key_here` |
| `VITE_API_BASE_URL` | Optional | Base URL of the backend Express server. Defaults to `http://localhost:5000` if not set. | `http://localhost:5000` |

### 2. Backend Configuration (`server/.env`)
Create a `.env` file in the `server/` directory:

| Variable | Required | Description | Safe Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | Port for the Express server to listen on. Defaults to `5000`. | `5000` |
| `CLIENT_ORIGIN` | Optional | Comma-separated list of allowed frontend origins for CORS. In development (`NODE_ENV !== 'production'`), `http://localhost:5173` and `http://localhost:5174` are permitted automatically. | `http://localhost:5173` |
| `DATABASE_URL` | Required for DB | Neon PostgreSQL connection string with SSL mode enabled. | `postgresql://username:password@ep-sample-123456.us-east-2.aws.neon.tech/tripwise?sslmode=require` |

> **Security Note:** Never commit `.env` or `.env.local` files containing actual secrets to version control. Both are excluded via `.gitignore`.

---

## Setup and Run Instructions

Follow these step-by-step instructions in **Windows PowerShell**:

### 1. Clone the Repository
```powershell
git clone https://github.com/harini30p/tripwise.git
cd tripwise
```

### 2. Install Dependencies
Install dependencies for both the frontend root and the backend server:

```powershell
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Configure Environment Variables

**Frontend (`.env.local` in project root):**
```powershell
Copy-Item .env.example .env.local
```
Edit `.env.local` and add your Geoapify API key:
```env
VITE_GEOAPIFY_API_KEY=your_geoapify_api_key_here
VITE_API_BASE_URL=http://localhost:5000
```

**Backend (`server/.env`):**
```powershell
Copy-Item server/.env.example server/.env
```
Edit `server/.env` and configure your database credentials:
```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://username:password@ep-sample-123456.us-east-2.aws.neon.tech/tripwise?sslmode=require
```

### 4. Start the Application

Open two separate Windows PowerShell terminals:

**Terminal 1 — Backend Server:**
```powershell
npm run server:dev
```
*The server will start at `http://localhost:5000` and initialize the database schema.*

**Terminal 2 — Frontend Application:**
```powershell
npm run dev
```
*Vite will start the client application (typically at `http://localhost:5173`).*

### 5. Production Build
To create an optimized production build of the frontend:
```powershell
npm run build
```
The compiled assets will be generated in the `dist/` directory. You can preview the production bundle locally with:
```powershell
npm run preview
```

---

## Deployment

### Frontend on Vercel
1. Import the `tripwise` repository into Vercel.
2. Configure project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Set Environment Variables in Vercel:
   - `VITE_GEOAPIFY_API_KEY`: Your production Geoapify API key.
   - `VITE_API_BASE_URL`: The deployed URL of your Render backend service (e.g., `https://tripwise-api.onrender.com`).
4. Deploy the project.

### Backend on Render
1. Create a new **Web Service** on Render and connect the `tripwise` repository.
2. Configure service settings:
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Set Environment Variables in Render:
   - `PORT`: `5000` (or leave default assigned by Render)
   - `CLIENT_ORIGIN`: Your deployed Vercel frontend URL (e.g., `https://tripwise.vercel.app`)
   - `DATABASE_URL`: Your Neon PostgreSQL connection string with `?sslmode=require`
4. Deploy the web service.

---

## Project Structure

```text
tripwise/
├── public/                       # Static public assets and SVG fallbacks
│   ├── favicon.svg
│   ├── icons.svg
│   ├── placeholder-beach.svg
│   ├── placeholder-city.svg
│   ├── placeholder-culture.svg
│   ├── placeholder-generic.svg
│   └── placeholder-nature.svg
├── server/                       # Node.js + Express backend service
│   ├── src/
│   │   ├── routes/
│   │   │   └── itinerary.js      # REST API route handlers (/api/itinerary)
│   │   ├── db.js                 # PostgreSQL connection pool and migration init
│   │   └── index.js              # Express server setup, CORS, health route
│   ├── .env.example              # Server environment variable templates
│   ├── package.json              # Server dependencies and scripts
│   └── README.md                 # Server-specific documentation
├── src/                          # React client application source
│   ├── assets/                   # React SVG assets
│   ├── components/               # React UI components
│   │   ├── DestinationDetailModal.css
│   │   ├── DestinationDetailModal.jsx
│   │   ├── DestinationGrid.css
│   │   ├── DestinationGrid.jsx
│   │   ├── HeroSection.css
│   │   ├── HeroSection.jsx
│   │   ├── MyTripSection.css
│   │   ├── MyTripSection.jsx
│   │   ├── Navbar.css
│   │   └── Navbar.jsx
│   ├── data/
│   │   └── destinations.js       # Curated fallback sample destinations
│   ├── services/
│   │   ├── geoapifyService.js    # Geoapify Geocoding and Places API client
│   │   └── itineraryApi.js       # Backend REST API client
│   ├── utils/
│   │   ├── imageFallbacks.js     # Image error handlers and category placeholders
│   │   └── itineraryStorage.js   # Client ID and item sanitization helpers
│   ├── App.css                   # Global layout and footer styles
│   ├── App.jsx                   # Main application state and view router
│   ├── index.css                 # Base theme variables and CSS reset
│   └── main.jsx                  # Application entry point
├── .env.example                  # Frontend environment variable templates
├── .gitignore                    # Git ignored directories and files
├── .oxlintrc.json                # Oxlint linter configuration
├── index.html                    # Single-page HTML shell
├── package.json                  # Root dependencies and scripts
├── README.md                     # Project documentation
└── vite.config.js                # Vite build and plugin configuration
```
