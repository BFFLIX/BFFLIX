import { Router } from 'express';
import watchlistController from '../controllers/watchlistController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/watchlist - Add item to watchlist
router.post('/', watchlistController.addToWatchlist);

// GET /api/watchlist - Get user's watchlist
router.get('/', watchlistController.getWatchlist);

// DELETE /api/watchlist/:tmdbId - Remove item from watchlist
router.delete('/:tmdbId', watchlistController.removeFromWatchlist);

// POST /api/watchlist/bulk - Bulk import to watchlist
router.post('/bulk', watchlistController.bulkAddToWatchlist);

// GET /api/watchlist/check/:tmdbId - Check if item is in watchlist
router.get('/check/:tmdbId', watchlistController.checkInWatchlist);

export default router;