// mobile/src/components/feed/ServiceTags.tsx

import React from "react";
import { View, Text } from "react-native";
import { feedStyles, feedColors } from "../../styles/feedStyles";

type ServiceTagsProps = {
  services: string[];
};

const SERVICE_COLORS: Record<string, { bg: string; text: string }> = {
  Netflix: { bg: feedColors.netflix, text: "#fff" },
  Hulu: { bg: feedColors.hulu, text: "#000" },
  "Prime Video": { bg: feedColors.prime, text: "#fff" },
  "Disney+": { bg: feedColors.disney, text: "#fff" },
  Max: { bg: feedColors.max, text: "#fff" },
  "Apple TV+": { bg: feedColors.appleTv, text: "#fff" },
};

export function ServiceTags({ services }: ServiceTagsProps) {
  if (!services || services.length === 0) {
    return null;
  }

  return (
    <View style={feedStyles.servicesRow}>
      {services.map((service, index) => {
        const colors = SERVICE_COLORS[service] || {
          bg: feedColors.borderLight,
          text: feedColors.text,
        };

        return (
          <View
            key={`${service}-${index}`}
            style={[
              feedStyles.serviceBadge,
              {
                backgroundColor: colors.bg,
                borderColor: colors.bg,
              },
            ]}
          >
            <Text
              style={[
                feedStyles.serviceText,
                { color: colors.text },
              ]}
            >
              {service}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
