
// src/hooks/useViewingDetails.ts
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export type ViewingDetails = {
  _id: string;
  title: string;
  rating: number;
  posterUrl?: string;
  watchedAt?: string;
  type?: "Movie" | "Show";
  circles?: string[] | { id: string; name: string }[];
  body?: string; // optional review text
};

export function useViewingDetails(viewingId: string | null) {
  const [data, setData] = useState<ViewingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiGet<ViewingDetails>(`/viewings/${id}`);
      setData(res);
    } catch (err) {
      console.error("Failed to fetch viewing details", err);
      setError("Failed to load viewing details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!viewingId) {
      setData(null);
      setError(null);
      return;
    }
    fetchDetails(viewingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingId]);

  return { data, isLoading, error, refetch: () => viewingId && fetchDetails(viewingId) };
}
