import { Response } from 'express';
import Watchlist from '../models/Watchlist';
import { AuthedRequest } from '../middleware/auth';
import tmdb from '../Services/tmdb.service';

class WatchlistController {
  // POST /api/watchlist - Add item to watchlist
  async addToWatchlist(req: AuthedRequest, res: Response) {
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

      // Create watchlist item
      const watchlistItem = new Watchlist({
        userId,
        tmdbId: Number(tmdbId),
        mediaType,
      });

      try {
        await watchlistItem.save();
        res.status(201).json({
          success: true,
          message: 'Added to watchlist',
          data: watchlistItem,
        });
      } catch (error: any) {
        // Handle duplicate entry (E11000)
        if (error.code === 11000) {
          return res.status(200).json({
            success: true,
            message: 'Item already in watchlist',
            data: await Watchlist.findOne({ userId, tmdbId, mediaType }).lean(),
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add to watchlist',
      });
    }
  }

  // GET /api/watchlist - Get user's watchlist with TMDB data
  async getWatchlist(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const watchlistItems = await Watchlist.find({ userId })
        .sort({ addedAt: -1 })
        .lean();

      // Enrich with TMDB data
      const enrichedItems = await Promise.all(
        watchlistItems.map(async (item) => {
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
      console.error('Error fetching watchlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch watchlist',
      });
    }
  }

  // DELETE /api/watchlist/:tmdbId - Remove item from watchlist
  async removeFromWatchlist(req: AuthedRequest, res: Response) {
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

      const result = await Watchlist.deleteOne({
        userId,
        tmdbId: Number(tmdbId),
        mediaType: String(mediaType),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in watchlist',
        });
      }

      res.json({
        success: true,
        message: 'Removed from watchlist',
      });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove from watchlist',
      });
    }
  }

  // POST /api/watchlist/bulk - Bulk import to watchlist
  async bulkAddToWatchlist(req: AuthedRequest, res: Response) {
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
      const result = await Watchlist.insertMany(documents, { ordered: false }).catch(
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
        message: `Added ${insertedCount} items to watchlist`,
        insertedCount,
        totalAttempted: items.length,
      });
    } catch (error) {
      console.error('Error bulk adding to watchlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk add to watchlist',
      });
    }
  }

  // GET /api/watchlist/check/:tmdbId - Check if item is in watchlist
  async checkInWatchlist(req: AuthedRequest, res: Response) {
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

      const exists = await Watchlist.exists({
        userId,
        tmdbId: Number(tmdbId),
        mediaType: String(mediaType),
      });

      res.json({
        success: true,
        inWatchlist: !!exists,
      });
    } catch (error) {
      console.error('Error checking watchlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check watchlist',
      });
    }
  }
}

export default new WatchlistController();