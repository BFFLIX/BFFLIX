import { Router } from "express";
import favoritesController from "../controllers/favorite.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ---------- List Favorites ----------
router.get("/", favoritesController.getFavorites);

// ---------- Add to favorites ----------
router.post("/", favoritesController.addToFavorites);

// ---------- Remove from Favorites ----------
router.delete("/:tmdbId", favoritesController.removeFromFavorites);

// ---------- Check if Favorited ----------
router.get("/check/:tmdbId", favoritesController.checkFavorites);

export default router;