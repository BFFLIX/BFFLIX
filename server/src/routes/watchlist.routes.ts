import { Router } from "express";
import watchlistController from "../controllers/watchlist.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(requireAuth);


// ---------- LIST WATCHLIST ----------
router.get("/", watchlistController.getWatchlist);

// ---------- Add to Watchlist ----------
router.post("/", watchlistController.addToWatchlist);

// ---------- Remove from Watchlist ----------
router.delete("/:tmdbId", watchlistController.removeFromWatchlist);

// ---------- Search/Check in watchlist ----------
router.get("/check/:tmdbId", watchlistController.checkWatchlist);

// ---------- Bulk Import to watchlist ----------
router.post("/import", watchlistController.bulkImport);

export default router;