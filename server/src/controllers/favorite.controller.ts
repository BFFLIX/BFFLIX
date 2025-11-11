import { Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import Favorite from "../models/WatchlistFavorite/Favorites"; // RIGHT: this is the Mongoose model
import { AuthedRequest } from "../middleware/auth";

// Validation schemas
const addToFavoritesSchema = z.object({
  type: z.enum(["movie", "tv"]),
  tmdbId: z.string().min(1).max(40).trim(),
  title: z.string().trim().optional(),
  posterPath: z.string().trim().optional(),
  releaseDate: z.string().trim().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  type: z.enum(["movie", "tv"]).optional(),
});

class FavoritesController {
  // GET /api/favorites - Get user's favorites with pagination
  async getFavorites(req: AuthedRequest, res: Response) {
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
      const total = await Favorite.countDocuments(query);
      
      // Get paginated results
      const items = await Favorite
        .find(query)
        .sort({ favoritedAt: -1 })
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
      console.error("Error fetching favorites:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch favorites",
      });
    }
  }

  // POST /api/favorites - Add item to favorites
  async addToFavorites(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const parsed = addToFavoritesSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.format() 
        });
      }

      const { type, tmdbId, title, posterPath, releaseDate } = parsed.data;

      // Check if already favorited
      const existing = await Favorite.findOne({ userId, tmdbId, type });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Item already in favorites",
        });
      }

      // Create new favorite item
      const favoriteItem = await Favorite.create({
        userId,
        type,
        tmdbId,
        title,
        posterPath,
        releaseDate,
      });

      res.status(201).json({
        success: true,
        data: favoriteItem,
        message: "Added to favorites",
      });
    } catch (error) {
      console.error("Error adding to favorites:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add to favorites",
      });
    }
  }

  // DELETE /api/favorites/:tmdbId - Remove from favorites
  async removeFromFavorites(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { tmdbId } = req.params;
      const { type } = req.query as { type?: string };

      // Build deletion query
      const query: any = { userId, tmdbId };
      if (type && (type === "movie" || type === "tv")) {
        query.type = type;
      }

      const result = await Favorite.findOneAndDelete(query);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Item not found in favorites",
        });
      }

      res.json({
        success: true,
        message: "Removed from favorites",
        data: result,
      });
    } catch (error) {
      console.error("Error removing from favorites:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove from favorites",
      });
    }
  }

  // GET /api/favorites/check/:tmdbId - Check if item is favorited
  async checkFavorites(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { tmdbId } = req.params;
      const { type } = req.query as { type?: string };

      // Build query
      const query: any = { userId, tmdbId };
      if (type && (type === "movie" || type === "tv")) {
        query.type = type;
      }

      const exists = await Favorite.exists(query);

      res.json({
        success: true,
        data: {
          isFavorited: !!exists,
          tmdbId,
          type,
        },
      });
    } catch (error) {
      console.error("Error checking favorites:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check favorites",
      });
    }
  }
}

export default new FavoritesController();