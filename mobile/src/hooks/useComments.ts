// mobile/src/hooks/useComments.ts

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import type { FeedComment } from "../types/feed";
import { fetchComments, addComment, deleteComment } from "../lib/feed";

export function useComments(postId: string) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Toggle comments section (expand/collapse)
  const toggle = useCallback(async () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    // Lazy load comments on first expansion
    if (newExpandedState && !hasLoaded) {
      await fetch();
    }
  }, [isExpanded, hasLoaded]);

  // Fetch comments from API
  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedComments = await fetchComments(postId);
      setComments(fetchedComments);
      setHasLoaded(true);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      Alert.alert("Error", "Failed to load comments");
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  // Add a new comment
  const add = useCallback(
    async (text: string) => {
      try {
        setIsSubmitting(true);
        const newComment = await addComment(postId, text);

        // Add comment to the list (prepend or append based on preference)
        setComments((prev) => [...prev, newComment]);
      } catch (error) {
        console.error("Failed to add comment:", error);
        Alert.alert("Error", "Failed to post comment");
        throw error; // Re-throw so CommentInput can handle it
      } finally {
        setIsSubmitting(false);
      }
    },
    [postId]
  );

  // Delete a comment
  const remove = useCallback(
    async (commentId: string) => {
      try {
        // Optimistic update
        const originalComments = [...comments];
        setComments((prev) => prev.filter((c) => c.id !== commentId));

        await deleteComment(postId, commentId);
      } catch (error) {
        console.error("Failed to delete comment:", error);
        Alert.alert("Error", "Failed to delete comment");

        // Rollback on error
        setComments(comments);
      }
    },
    [postId, comments]
  );

  // Refresh comments (useful after external updates)
  const refresh = useCallback(async () => {
    if (isExpanded) {
      await fetch();
    }
  }, [isExpanded, fetch]);

  return {
    comments,
    isLoading,
    isExpanded,
    isSubmitting,
    toggle,
    add,
    remove,
    refresh,
  };
}
