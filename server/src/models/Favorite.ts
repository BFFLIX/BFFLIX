
import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  addedAt: Date;
}

const favoriteSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tmdbId: {
    type: Number,
    required: true,
  },
  mediaType: {
    type: String,
    enum: ['movie', 'tv'],
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to prevent duplicate entries
favoriteSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });

export default mongoose.model<IFavorite>('Favorite', favoriteSchema);