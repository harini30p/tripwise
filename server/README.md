# TripWise Backend Service

Full-stack Node.js + Express backend foundation and PostgreSQL REST API for **TripWise — Smart Travel Planner**.

---

## Architecture Overview

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon Serverless PostgreSQL recommended)
- **Driver:** `pg` (node-postgres) with connection pooling and SSL
- **CORS:** Whitelists local React frontend (`http://localhost:5173`)

---

## Database Schema

The table is created automatically on server startup:

```sql
CREATE TABLE IF NOT EXISTS itinerary_items (
  client_id VARCHAR(128) NOT NULL,
  place_id VARCHAR(255) NOT NULL,
  destination JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id, place_id)
);
```

- **Composite Primary Key `(client_id, place_id)`**: Guarantees that a client/browser cannot add duplicate entries for the exact same destination.
- **`destination JSONB`**: Stores structured destination metadata (title, category, country, coordinates, description, fallback images) flexibly without losing data attributes.

---

## Environment Setup

1. In the `server/` folder, create a `.env` file (copied from `.env.example`):
   ```bash
   cp .env.example .env
   ```
2. Configure your Neon PostgreSQL connection string in `server/.env`:
   ```env
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173
   DATABASE_URL=postgresql://username:password@ep-sample-123456.us-east-2.aws.neon.tech/tripwise?sslmode=require
   ```
   > **Note:** Never commit `server/.env` to Git. `.gitignore` ensures all `.env` files remain strictly local.

---

## Running the Server

From the project root:
```bash
# Start backend in development mode with automatic restart
npm run server:dev

# Or start in standard production mode
npm run server
```

Or directly from inside `server/`:
```bash
cd server
npm install
npm run dev
```

---

## API Endpoints

### 1. Health & Readiness Check
- **`GET /api/health`**
- Returns server status, uptime, and database readiness:
  ```json
  {
    "status": "ok",
    "service": "tripwise-backend",
    "uptime": 24,
    "database": "connected",
    "timestamp": "2026-10-17T14:00:00.000Z"
  }
  ```

### 2. Get Saved Itinerary
- **`GET /api/itinerary?clientId=browser-client-id-123`**
- Returns saved destinations array for the client:
  ```json
  {
    "clientId": "browser-client-id-123",
    "count": 1,
    "items": [
      {
        "id": "dest-1",
        "title": "Kyoto Ancient Temples",
        "country": "Japan",
        "category": "Cultural Heritage",
        "savedAt": "2026-10-17T14:00:00.000Z"
      }
    ]
  }
  ```

### 3. Save Destination to Itinerary
- **`POST /api/itinerary`**
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "clientId": "browser-client-id-123",
    "destination": {
      "id": "dest-1",
      "title": "Kyoto Ancient Temples",
      "country": "Japan",
      "category": "Cultural Heritage",
      "description": "Historic gardens and shrines",
      "estimatedCost": "Attraction / Sight",
      "image": "https://..."
    }
  }
  ```
- **Response:** `201 Created` with saved destination payload.

### 4. Remove Destination from Itinerary
- **`DELETE /api/itinerary/:placeId?clientId=browser-client-id-123`**
- **Response:** `200 OK` on success, or `404 Not Found` if the item was not in the client's itinerary.
