// mobile/src/styles/viewingsStyles.ts

import { StyleSheet, Dimensions } from "react-native";
import { feedColors } from "./feedStyles";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

export const viewingsStyles = StyleSheet.create({
  // ============================================================
  // CONTAINER STYLES
  // ============================================================

  container: {
    flex: 1,
    backgroundColor: feedColors.background,
  },

  contentContainer: {
    paddingBottom: 100, // Space for FAB
  },

  // ============================================================
  // STATS CARDS
  // ============================================================

  statsContainer: {
    padding: 16,
    gap: 12,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  statCard: {
    flex: 1,
    minWidth: isTablet ? 150 : "45%",
    backgroundColor: feedColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: feedColors.border,
  },

  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },

  statLabel: {
    fontSize: 12,
    color: feedColors.textSecondary,
    marginBottom: 4,
    fontWeight: "500",
  },

  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: feedColors.text,
  },

  statDescription: {
    fontSize: 11,
    color: feedColors.textTertiary,
    marginTop: 2,
  },

  // ============================================================
  // FILTER CONTROLS
  // ============================================================

  filterContainer: {
    backgroundColor: feedColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  filterPills: {
    flexDirection: "row",
    gap: 8,
  },

  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: feedColors.border,
    backgroundColor: "transparent",
  },

  filterPillActive: {
    backgroundColor: feedColors.primary,
    borderColor: feedColors.primary,
  },

  filterPillText: {
    fontSize: 14,
    fontWeight: "500",
    color: feedColors.textSecondary,
  },

  filterPillTextActive: {
    color: "#fff",
    fontWeight: "600",
  },

  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sortLabel: {
    fontSize: 13,
    color: feedColors.textSecondary,
  },

  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: feedColors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: feedColors.border,
  },

  sortButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: feedColors.text,
  },

  // ============================================================
  // VIEWING CARD
  // ============================================================

  cardContainer: {
    flex: 1,
    margin: 8,
    backgroundColor: feedColors.cardBackground,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: feedColors.border,
  },

  posterContainer: {
    width: "100%",
    height: 300,
    backgroundColor: feedColors.borderLight,
    position: "relative",
  },

  poster: {
    width: "100%",
    height: "100%",
  },

  posterPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: feedColors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },

  posterOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
  },

  titleOverlay: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },

  cardContent: {
    padding: 12,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  typeBadge: {
    backgroundColor: feedColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },

  watchedDate: {
    fontSize: 12,
    color: feedColors.textSecondary,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
    lineHeight: 20,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  ratingContainer: {
    marginBottom: 8,
  },

  commentPreview: {
    fontSize: 14,
    lineHeight: 19,
    color: feedColors.text,
    marginBottom: 12,
  },

  cardActions: {
    flexDirection: "row",
    gap: 8,
  },

  cardButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },

  detailsButton: {
    backgroundColor: feedColors.borderLight,
    borderColor: feedColors.border,
  },

  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "#ef4444",
  },

  cardButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },

  detailsButtonText: {
    color: feedColors.text,
  },

  deleteButtonText: {
    color: "#ef4444",
  },

  // ============================================================
  // HORIZONTAL CARD (Netflix-style carousel)
  // ============================================================

  horizontalCard: {
    marginRight: 8,
  },

  horizontalPosterContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: feedColors.borderLight,
    position: "relative",
  },

  horizontalPoster: {
    width: "100%",
    height: "100%",
  },

  horizontalPosterPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: feedColors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },

  horizontalOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },

  horizontalTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: feedColors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },

  horizontalTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },

  horizontalTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: feedColors.text,
    marginTop: 6,
    lineHeight: 17,
  },

  // ============================================================
  // VIEWINGS GRID
  // ============================================================

  gridContainer: {
    padding: 8,
  },

  gridContent: {
    paddingBottom: 20,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    minHeight: 300,
  },

  emptyText: {
    fontSize: 16,
    color: feedColors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },

  loadMoreButton: {
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: feedColors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: feedColors.border,
    alignItems: "center",
  },

  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.primary,
  },

  // ============================================================
  // BOTTOM SHEET
  // ============================================================

  bottomSheet: {
    flex: 1,
    backgroundColor: feedColors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },

  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: feedColors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },

  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },

  bottomSheetPoster: {
    width: "100%",
    height: 400,
    borderRadius: 12,
    backgroundColor: feedColors.borderLight,
    marginBottom: 16,
  },

  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: feedColors.text,
    marginBottom: 8,
  },

  bottomSheetMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  bottomSheetMetaText: {
    fontSize: 14,
    color: feedColors.textSecondary,
  },

  bottomSheetRating: {
    marginBottom: 16,
  },

  bottomSheetComment: {
    fontSize: 15,
    lineHeight: 22,
    color: feedColors.text,
    marginBottom: 20,
  },

  bottomSheetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },

  bottomSheetDeleteButton: {
    backgroundColor: "#ef4444",
  },

  bottomSheetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
