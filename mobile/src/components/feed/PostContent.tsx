// mobile/src/components/feed/PostContent.tsx

import React from "react";
import { View, Text, Image } from "react-native";
import { feedStyles } from "../../styles/feedStyles";
import { RatingStars } from "./RatingStars";
import { ServiceTags } from "./ServiceTags";
import type { FeedPost } from "../../types/feed";

type PostContentProps = {
  post: FeedPost;
};

export function PostContent({ post }: PostContentProps) {
  const { imageUrl, title, year, type, rating, body, services } = post;

  return (
    <View style={feedStyles.postContent}>
      {/* Media Row: Poster + Info */}
      <View style={feedStyles.mediaRow}>
        {/* Poster Image */}
        {imageUrl ? (
          <View style={feedStyles.posterContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={feedStyles.poster}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Media Info */}
        <View style={feedStyles.mediaInfo}>
          {/* Title + Year */}
          <View style={feedStyles.titleRow}>
            <Text style={feedStyles.titleText} numberOfLines={2}>
              {title}
            </Text>
            {year ? (
              <View style={feedStyles.yearBadge}>
                <Text style={feedStyles.yearText}>{year}</Text>
              </View>
            ) : null}
          </View>

          {/* Type Badge */}
          <View style={feedStyles.typeBadge}>
            <Text style={feedStyles.typeText}>{type}</Text>
          </View>

          {/* Rating Stars */}
          {rating > 0 ? (
            <View style={feedStyles.ratingRow}>
              <RatingStars value={rating} readonly size={18} />
            </View>
          ) : null}
        </View>
      </View>

      {/* Review Text */}
      {body && body.trim() ? (
        <Text style={feedStyles.reviewText}>{body}</Text>
      ) : null}

      {/* Service Tags */}
      {services && services.length > 0 ? (
        <ServiceTags services={services} />
      ) : null}
    </View>
  );
}
