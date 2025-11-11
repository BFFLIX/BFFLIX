import { Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import Watchlist from "../models/WatchlistFavorite/Watchlist";
import { AuthedRequest } from "../middleware/auth";

// Validation schemas
const addToWatchlistSchema = z.object({
  type: z.enum(["movie", "tv"]),
  tmdbId: z.string().min(1).max(40).trim(),
  title: z.string().trim().optional(),
  posterPath: z.string().trim().optional(),
  releaseDate: z.string().trim().optional(),
});

const checkWatchlistSchema = z.object({
  tmdbId: z.string().min(1).max(40).trim(),
  type: z.enum(["movie", "tv"]).optional(),
});

const bulkImportSchema = z.object({
  items: z.array(z.object({
    type: z.enum(["movie", "tv"]),
    tmdbId: z.string().min(1).max(40).trim(),
    title: z.string().trim().optional(),
    posterPath: z.string().trim().optional(),
    releaseDate: z.string().trim().optional(),
  })).min(1).max(100), // Limit bulk import to 100 items
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  type: z.enum(["movie", "tv"]).optional(),
});

class WatchlistController {
  // GET /api/watchlist - Get user's watchlist with pagination
  async getWatchlist(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const parsed = paginationSchema.safeParse(req.query);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.format() 
        });
      }

      const { page, limit, type } = parsed.data;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = { userId };
      if (type) query.type = type;

      // Get total count for pagination
      const total = await Watchlist.countDocuments(query);
      
      // Get paginated results
      const items = await Watchlist
        .find(query)
        .sort({ addedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: {
          items,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasMore: skip + items.length < total,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch watchlist",
      });
    }
  }

  // POST /api/watchlist - Add item to watchlist
  async addToWatchlist(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const parsed = addToWatchlistSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.format() 
        });
      }

      const { type, tmdbId, title, posterPath, releaseDate } = parsed.data;

      // Check if already in watchlist
      const existing = await Watchlist.findOne({ userId, tmdbId, type });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Item already in watchlist",
        });
      }

      // Create new watchlist item
      const watchlistItem = await Watchlist.create({
        userId,
        type,
        tmdbId,
        title,
        posterPath,
        releaseDate,
      });

      res.status(201).json({
        success: true,
        data: watchlistItem,
        message: "Added to watchlist",
      });
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add to watchlist",
      });
    }
  }

  // DELETE /api/watchlist/:tmdbId - Remove from watchlist
  async removeFromWatchlist(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { tmdbId } = req.params;
      const { type } = req.query as { type?: string };

      // Build deletion query
      const query: any = { userId, tmdbId };
      if (type && (type === "movie" || type === "tv")) {
        query.type = type;
      }

      const result = await Watchlist.findOneAndDelete(query);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Item not found in watchlist",
        });
      }

      res.json({
        success: true,
        message: "Removed from watchlist",
        data: result,
      });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove from watchlist",
      });
    }
  }

  // GET /api/watchlist/check/:tmdbId - Check if item is in watchlist
  async checkWatchlist(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { tmdbId } = req.params;
      const { type } = req.query as { type?: string };

      // Build query
      const query: any = { userId, tmdbId };
      if (type && (type === "movie" || type === "tv")) {
        query.type = type;
      }

      const exists = await Watchlist.exists(query);

      res.json({
        success: true,
        data: {
          inWatchlist: !!exists,
          tmdbId,
          type,
        },
      });
    } catch (error) {
      console.error("Error checking watchlist:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check watchlist",
      });
    }
  }

  // POST /api/watchlist/import - Bulk import from another service
  async bulkImport(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const parsed = bulkImportSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.format() 
        });
      }

      const { items } = parsed.data;
      const results = {
        added: [] as any[],
        skipped: [] as any[],
        errors: [] as any[],
      };

      // Process each item
      for (const item of items) {
        try {
          // Check if already exists
          const existing = await Watchlist.findOne({
            userId,
            tmdbId: item.tmdbId,
            type: item.type,
          });

          if (existing) {
            results.skipped.push({
              tmdbId: item.tmdbId,
              type: item.type,
              reason: "Already in watchlist",
            });
            continue;
          }

          // Add to watchlist
          const watchlistItem = await Watchlist.create({
            userId,
            ...item,
          });

          results.added.push(watchlistItem);
        } catch (error) {
          results.errors.push({
            tmdbId: item.tmdbId,
            type: item.type,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.json({
        success: true,
        data: results,
        summary: {
          total: items.length,
          added: results.added.length,
          skipped: results.skipped.length,
          errors: results.errors.length,
        },
      });
    } catch (error) {
      console.error("Error during bulk import:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import watchlist",
      });
    }
  }
}

export default new WatchlistController();