// mobile/src/styles/feedStyles.ts

import { StyleSheet } from "react-native";

export const feedColors = {
  // Backgrounds
  background: "#05010f",
  backgroundSecondary: "#070211",
  cardBackground: "#070211",

  // Borders & Dividers
  border: "rgba(255, 255, 255, 0.08)",
  borderLight: "rgba(255, 255, 255, 0.05)",

  // Text
  text: "#f1f5f9",
  textSecondary: "#8E8E93",
  textTertiary: "#636366",

  // Primary Colors
  primary: "#ec4899",      // pink-500
  primaryDark: "#db2777",  // pink-600
  primaryLight: "#f472b6", // pink-400

  // Accent Colors
  accent: "#ef4444",       // red-500
  likeActive: "#ef4444",   // red for thumbs up
  commentActive: "#3b82f6", // blue for comment
  gold: "#facc15",         // yellow-400 for stars

  // Service Colors (streaming services)
  netflix: "#E50914",
  hulu: "#1CE783",
  prime: "#00A8E1",
  disney: "#113CCF",
  max: "#002BE7",
  appleTv: "#000000",

  // Status Colors
  success: "#10b981",      // green-500
  error: "#ef4444",        // red-500
  warning: "#f59e0b",      // amber-500
};

export const feedStyles = StyleSheet.create({
  // ============================================================
  // CONTAINER STYLES
  // ============================================================

  container: {
    flex: 1,
    backgroundColor: feedColors.background,
  },

  scrollContent: {
    flexGrow: 1,
  },

  listContent: {
    paddingBottom: 80, // Space for FAB
  },

  // ============================================================
  // LOADING & EMPTY STATES
  // ============================================================

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: feedColors.background,
    padding: 24,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: feedColors.background,
    padding: 32,
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
  // POST CARD
  // ============================================================

  postCard: {
    backgroundColor: feedColors.cardBackground,
    borderBottomWidth: 8,
    borderBottomColor: feedColors.background,
    marginBottom: 0,
  },

  postCardInner: {
    padding: 12,
  },

  // ============================================================
  // POST HEADER
  // ============================================================

  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: feedColors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  postHeaderText: {
    flex: 1,
  },

  authorName: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 2,
  },

  circlesText: {
    fontSize: 13,
    color: feedColors.textSecondary,
    marginBottom: 2,
  },

  timeText: {
    fontSize: 12,
    color: feedColors.textTertiary,
  },

  // ============================================================
  // POST CONTENT
  // ============================================================

  postContent: {
    marginBottom: 12,
  },

  mediaRow: {
    flexDirection: "row",
    marginBottom: 12,
  },

  posterContainer: {
    marginRight: 12,
  },

  poster: {
    width: 80,
    height: 120,
    borderRadius: 6,
    backgroundColor: feedColors.borderLight,
  },

  mediaInfo: {
    flex: 1,
    justifyContent: "flex-start",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },

  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: feedColors.text,
    flex: 1,
  },

  yearBadge: {
    backgroundColor: feedColors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },

  yearText: {
    fontSize: 12,
    color: feedColors.textSecondary,
  },

  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: feedColors.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },

  typeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  reviewText: {
    fontSize: 15,
    lineHeight: 21,
    color: feedColors.text,
    marginBottom: 12,
  },

  servicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  serviceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },

  serviceText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // ============================================================
  // POST ACTIONS
  // ============================================================

  postActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: feedColors.border,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 16,
    borderRadius: 4,
  },

  actionButtonActive: {
    backgroundColor: feedColors.borderLight,
  },

  actionIcon: {
    marginRight: 6,
  },

  actionText: {
    fontSize: 14,
    fontWeight: "500",
    color: feedColors.textSecondary,
  },

  actionTextActive: {
    color: feedColors.text,
  },

  // ============================================================
  // COMMENTS SECTION
  // ============================================================

  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: feedColors.border,
    paddingTop: 12,
    marginTop: 8,
  },

  commentsList: {
    marginBottom: 12,
  },

  commentItem: {
    marginBottom: 12,
    paddingLeft: 8,
  },

  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  commentUserId: {
    fontSize: 13,
    fontWeight: "600",
    color: feedColors.text,
    flex: 1,
  },

  commentTime: {
    fontSize: 12,
    color: feedColors.textTertiary,
    marginLeft: 8,
  },

  commentText: {
    fontSize: 14,
    lineHeight: 19,
    color: feedColors.text,
  },

  commentInput: {
    backgroundColor: feedColors.background,
    borderWidth: 1,
    borderColor: feedColors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: feedColors.text,
    minHeight: 80,
    textAlignVertical: "top",
  },

  commentActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },

  // ============================================================
  // BUTTONS
  // ============================================================

  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonPrimary: {
    backgroundColor: feedColors.primary,
  },

  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: feedColors.border,
  },

  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.text,
  },

  buttonTextPrimary: {
    color: "#fff",
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  // ============================================================
  // FLOATING ACTION BUTTON
  // ============================================================

  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: feedColors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  fabIcon: {
    fontSize: 28,
    color: "#fff",
  },

  // ============================================================
  // RATING STARS
  // ============================================================

  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  star: {
    fontSize: 16,
  },

  starFilled: {
    color: feedColors.gold,
  },

  starEmpty: {
    color: feedColors.textTertiary,
  },
});
