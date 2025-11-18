
// client/src/pages/CreateViewingPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateViewingPage() {
  const navigate = useNavigate();

  const [type, setType] = useState("movie");
  const [tmdbId, setTmdbId] = useState("");
  const [rating, setRating] = useState<number | undefined>();
  const [comment, setComment] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/viewings`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        tmdbId,
        rating,
        comment,
        watchedAt: new Date(),
      }),
    });

    if (res.ok) {
      navigate("/viewings");
    } else {
      alert("Failed to create viewing");
    }
  }

  return (
    <div className="create-viewing-page">
      <h2>Add Viewing</h2>

      <form onSubmit={handleSubmit}>
        <label>Type:</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="movie">Movie</option>
          <option value="tv">TV Show</option>
        </select>

        <label>TMDB ID:</label>
        <input
          type="text"
          value={tmdbId}
          onChange={(e) => setTmdbId(e.target.value)}
          placeholder="Enter TMDB ID"
        />

        <label>Rating (1–5):</label>
        <input
          type="number"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          min={1}
          max={5}
        />

        <label>Comment:</label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} />

        <button type="submit">Create</button>
      </form>
    </div>
  );
}