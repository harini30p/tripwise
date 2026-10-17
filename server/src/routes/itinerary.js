import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

/**
 * Middleware: Verify database pool availability
 */
function requireDatabase(req, res, next) {
  if (!pool) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database connection is not configured on the server. Please set DATABASE_URL.',
    });
  }
  next();
}

/**
 * GET /api/itinerary?clientId=...
 * Returns all saved destinations for the given client_id, ordered by creation time.
 */
router.get('/', requireDatabase, async (req, res, next) => {
  try {
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query parameter "clientId" is required.',
      });
    }

    const selectQuery = `
      SELECT place_id, destination, created_at
      FROM itinerary_items
      WHERE client_id = $1
      ORDER BY created_at ASC
    `;

    const { rows } = await pool.query(selectQuery, [clientId.trim()]);

    // Extract the stored JSONB destination object and attach server metadata
    const items = rows.map((row) => ({
      ...row.destination,
      id: row.place_id,
      savedAt: row.created_at,
    }));

    return res.status(200).json({
      clientId: clientId.trim(),
      count: items.length,
      items,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/itinerary
 * Body: { clientId: string, destination: object }
 * Saves or updates a destination for the client using an upsert (ON CONFLICT DO UPDATE).
 */
router.post('/', requireDatabase, async (req, res, next) => {
  try {
    const { clientId, destination } = req.body;

    // Validate clientId
    if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Field "clientId" is required and must be a non-empty string.',
      });
    }

    // Validate destination
    if (!destination || typeof destination !== 'object' || Array.isArray(destination)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Field "destination" is required and must be a valid destination object.',
      });
    }

    // Stable place_id resolution
    const placeId =
      destination.id ||
      destination.place_id ||
      `trip-${(destination.title || 'place').toLowerCase().replace(/\s+/g, '-')}-${(destination.country || '').toLowerCase().replace(/\s+/g, '-')}`;

    if (!placeId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Destination must include a valid "id" or "title".',
      });
    }

    // Sanitize destination object to store clean, well-formed JSONB
    const sanitizedDestination = {
      id: String(placeId),
      title: destination.title || 'Saved Destination',
      country: destination.country || '',
      category: destination.category || 'Tourism',
      description: destination.description || '',
      estimatedCost: destination.estimatedCost || 'Attraction / Sight',
      image: destination.image || '',
      localFallbackImage: destination.localFallbackImage || '',
      rating: destination.rating ?? null,
      coordinates: destination.coordinates || null,
    };

    // Parameterized upsert query using composite primary key (client_id, place_id)
    const upsertQuery = `
      INSERT INTO itinerary_items (client_id, place_id, destination)
      VALUES ($1, $2, $3)
      ON CONFLICT (client_id, place_id)
      DO UPDATE SET destination = EXCLUDED.destination
      RETURNING place_id, destination, created_at;
    `;

    const values = [clientId.trim(), String(placeId), JSON.stringify(sanitizedDestination)];
    const { rows } = await pool.query(upsertQuery, values);

    const savedRow = rows[0];

    return res.status(201).json({
      message: 'Destination saved to itinerary successfully',
      item: {
        ...savedRow.destination,
        id: savedRow.place_id,
        savedAt: savedRow.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/itinerary/:placeId?clientId=...
 * Removes the destination from the client's itinerary.
 */
router.delete('/:placeId', requireDatabase, async (req, res, next) => {
  try {
    const { placeId } = req.params;
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query parameter "clientId" is required to delete an itinerary item.',
      });
    }

    if (!placeId || !placeId.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Path parameter "placeId" is required.',
      });
    }

    const deleteQuery = `
      DELETE FROM itinerary_items
      WHERE client_id = $1 AND place_id = $2
      RETURNING place_id;
    `;

    const { rowCount } = await pool.query(deleteQuery, [clientId.trim(), placeId.trim()]);

    if (rowCount === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Destination with ID "${placeId}" was not found in the itinerary for this client.`,
      });
    }

    return res.status(200).json({
      message: 'Destination removed from itinerary successfully',
      removedPlaceId: placeId.trim(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
