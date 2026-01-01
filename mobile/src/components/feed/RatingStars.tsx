// mobile/src/components/feed/RatingStars.tsx

import React from "react";
import { View, Text, Pressable } from "react-native";
import { feedStyles, feedColors } from "../../styles/feedStyles";

type RatingStarsProps = {
  value: number; // 0-5
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
};

export function RatingStars({
  value,
  onChange,
  readonly = false,
  size = 16,
}: RatingStarsProps) {
  const stars = [1, 2, 3, 4, 5];

  const handlePress = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  return (
    <View style={feedStyles.starsRow}>
      {stars.map((star) => {
        const isFilled = star <= value;

        if (readonly) {
          return (
            <Text
              key={star}
              style={[
                feedStyles.star,
                isFilled ? feedStyles.starFilled : feedStyles.starEmpty,
                { fontSize: size },
              ]}
            >
              {isFilled ? "⭐" : "☆"}
            </Text>
          );
        }

        return (
          <Pressable
            key={star}
            onPress={() => handlePress(star)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text
              style={[
                feedStyles.star,
                isFilled ? feedStyles.starFilled : feedStyles.starEmpty,
                { fontSize: size },
              ]}
            >
              {isFilled ? "⭐" : "☆"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
