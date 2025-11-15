// server/src/routes/favoritesRoutes.ts
import { Router } from 'express';
import favoritesController from '../controllers/favoriteController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/favorites - Add item to favorites
router.post('/', favoritesController.addToFavorites);

// GET /api/favorites - Get user's favorites
router.get('/', favoritesController.getFavorites);

// DELETE /api/favorites/:tmdbId - Remove item from favorites
router.delete('/:tmdbId', favoritesController.removeFromFavorites);

// POST /api/favorites/bulk - Bulk import to favorites
router.post('/bulk', favoritesController.bulkAddToFavorites);

// GET /api/favorites/check/:tmdbId - Check if item is in favorites
router.get('/check/:tmdbId', favoritesController.checkInFavorites);

export default router;