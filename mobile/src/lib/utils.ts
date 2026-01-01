// mobile/src/lib/utils.ts

/**
 * Formats an ISO timestamp into a human-readable "time ago" string
 * Examples: "Just now", "2h ago", "3d ago", "5w ago"
 */
export function formatTimeAgo(isoString: string): string {
  const now = Date.now();
  const timestamp = new Date(isoString).getTime();
  const diffMs = now - timestamp;

  // Convert to different time units
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  }

  // For older posts, show the actual date
  const date = new Date(isoString);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();

  if (year === currentYear) {
    return `${month} ${day}`;
  }

  return `${month} ${day}, ${year}`;
}

/**
 * Generates initials from a name (for avatar fallback)
 * Examples: "John Doe" → "JD", "Alice" → "A"
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) {
    return "?";
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

/**
 * Truncates text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Formats a rating number to display with star emoji
 * Examples: 4.5 → "⭐ 4.5", 3 → "⭐ 3"
 */
export function formatRating(rating: number): string {
  if (rating === 0) {
    return "Not rated";
  }

  return `⭐ ${rating.toFixed(1)}`;
}
