
// client/src/components/CreateCircleModal.tsx
import { useState } from "react";
import { apiPost } from "../lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCircleModal({ isOpen, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleCreate() {
    setError("");
    setLoading(true);

    try {
      await apiPost("/circles", {
        name,
        description,
        visibility,
      });

      setLoading(false);
      onCreated();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || "Something went wrong");
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2 className="modal-title">Create a Circle</h2>

        <label className="modal-label">Circle Name</label>
        <input
          className="modal-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter circle name..."
        />

        <label className="modal-label">Description</label>
        <textarea
          className="modal-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your circle..."
        />

        <label className="modal-label">Visibility</label>
        <div className="visibility-toggle">
          <button
            className={visibility === "public" ? "vis-btn active" : "vis-btn"}
            onClick={() => setVisibility("public")}
          >
            Public
          </button>
          <button
            className={visibility === "private" ? "vis-btn active" : "vis-btn"}
            onClick={() => setVisibility("private")}
          >
            Private
          </button>
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="post-btn" onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Circle"}
          </button>
        </div>
      </div>
    </div>
  );
}
