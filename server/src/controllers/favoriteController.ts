import { Response } from 'express';
import Favorite from '../models/Favorite';
import { AuthedRequest } from '../middleware/auth';
import tmdb from '../Services/tmdb.service';

class FavoritesController {
  // POST /api/favorites - Add item to favorites
  async addToFavorites(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { tmdbId, mediaType } = req.body;

      // Validation
      if (!tmdbId || !mediaType) {
        return res.status(400).json({
          success: false,
          message: 'tmdbId and mediaType are required',
        });
      }

      if (!['movie', 'tv'].includes(mediaType)) {
        return res.status(400).json({
          success: false,
          message: 'mediaType must be either "movie" or "tv"',
        });
      }

      // Create favorite item
      const favoriteItem = new Favorite({
        userId,
        tmdbId: Number(tmdbId),
        mediaType,
      });

      try {
        await favoriteItem.save();
        res.status(201).json({
          success: true,
          message: 'Added to favorites',
          data: favoriteItem,
        });
      } catch (error: any) {
        // Handle duplicate entry (E11000)
        if (error.code === 11000) {
          return res.status(200).json({
            success: true,
            message: 'Item already in favorites',
            data: await Favorite.findOne({ userId, tmdbId, mediaType }).lean(),
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add to favorites',
      });
    }
  }

  // GET /api/favorites - Get user's favorites with TMDB data
  async getFavorites(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const favoriteItems = await Favorite.find({ userId })
        .sort({ addedAt: -1 })
        .lean();

      // Enrich with TMDB data
      const enrichedItems = await Promise.all(
        favoriteItems.map(async (item) => {
          try {
            const tmdbData =
              item.mediaType === 'movie'
                ? await tmdb.getMovieDetails(item.tmdbId)
                : await tmdb.getTVDetails(item.tmdbId);

            return {
              ...item,
              title: tmdbData.title || tmdbData.name,
              overview: tmdbData.overview,
              posterPath: tmdbData.poster_path,
              posterUrl: tmdb.getPosterURL(tmdbData.poster_path, 'w500'),
              releaseDate: tmdbData.release_date || tmdbData.first_air_date,
              voteAverage: tmdbData.vote_average,
              popularity: tmdbData.popularity,
            };
          } catch (error) {
            console.error(`Failed to fetch TMDB data for ${item.tmdbId}:`, error);
            // Return basic item if TMDB fetch fails
            return {
              ...item,
              title: null,
              overview: null,
              posterPath: null,
              posterUrl: null,
            };
          }
        })
      );

      res.json({
        success: true,
        data: enrichedItems,
        count: enrichedItems.length,
      });
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch favorites',
      });
    }
  }

  // DELETE /api/favorites/:tmdbId - Remove item from favorites
  async removeFromFavorites(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { tmdbId } = req.params;
      const { mediaType } = req.query;

      if (!mediaType || !['movie', 'tv'].includes(String(mediaType))) {
        return res.status(400).json({
          success: false,
          message: 'Valid mediaType query parameter is required (movie or tv)',
        });
      }

      const result = await Favorite.deleteOne({
        userId,
        tmdbId: Number(tmdbId),
        mediaType: String(mediaType),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in favorites',
        });
      }

      res.json({
        success: true,
        message: 'Removed from favorites',
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove from favorites',
      });
    }
  }

  // POST /api/favorites/bulk - Bulk import to favorites
  async bulkAddToFavorites(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'items array is required and must not be empty',
        });
      }

      // Validate all items
      for (const item of items) {
        if (!item.tmdbId || !item.mediaType) {
          return res.status(400).json({
            success: false,
            message: 'Each item must have tmdbId and mediaType',
          });
        }
        if (!['movie', 'tv'].includes(item.mediaType)) {
          return res.status(400).json({
            success: false,
            message: 'mediaType must be either "movie" or "tv"',
          });
        }
      }

      // Prepare documents for bulk insert
      const documents = items.map((item) => ({
        userId,
        tmdbId: Number(item.tmdbId),
        mediaType: item.mediaType,
        addedAt: new Date(),
      }));

      // Use insertMany with ordered:false to skip duplicates
      const result = await Favorite.insertMany(documents, { ordered: false }).catch(
        (error) => {
          // If all inserts fail due to duplicates, that's okay
          if (error.code === 11000) {
            return { insertedCount: 0 };
          }
          throw error;
        }
      );

      const insertedCount = Array.isArray(result) ? result.length : 0;

      res.status(201).json({
        success: true,
        message: `Added ${insertedCount} items to favorites`,
        insertedCount,
        totalAttempted: items.length,
      });
    } catch (error) {
      console.error('Error bulk adding to favorites:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk add to favorites',
      });
    }
  }

  // GET /api/favorites/check/:tmdbId - Check if item is in favorites
  async checkInFavorites(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { tmdbId } = req.params;
      const { mediaType } = req.query;

      if (!mediaType || !['movie', 'tv'].includes(String(mediaType))) {
        return res.status(400).json({
          success: false,
          message: 'Valid mediaType query parameter is required (movie or tv)',
        });
      }

      const exists = await Favorite.exists({
        userId,
        tmdbId: Number(tmdbId),
        mediaType: String(mediaType),
      });

      res.json({
        success: true,
        inFavorites: !!exists,
      });
    } catch (error) {
      console.error('Error checking favorites:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check favorites',
      });
    }
  }
}

export default new FavoritesController();