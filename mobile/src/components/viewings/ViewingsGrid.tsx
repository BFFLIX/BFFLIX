// mobile/src/components/viewings/ViewingsGrid.tsx

import React from "react";
import { View, Text, FlatList, Dimensions } from "react-native";
import { viewingsStyles } from "../../styles/viewingsStyles";
import { ViewingCard } from "./ViewingCard";
import type { Viewing } from "../../types/viewings";

type ViewingsGridProps = {
  viewings: Viewing[];
  onOpenDetails: (viewing: Viewing) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
};

const { width } = Dimensions.get("window");
const isTablet = width >= 768;
const numColumns = isTablet ? 2 : 1;

export function ViewingsGrid({
  viewings,
  onOpenDetails,
  onDelete,
  deletingId,
}: ViewingsGridProps) {
  if (viewings.length === 0) {
    return (
      <View style={viewingsStyles.emptyContainer}>
        <Text style={viewingsStyles.emptyText}>No viewings yet</Text>
        <Text style={[viewingsStyles.emptyText, { fontSize: 14, marginTop: 8 }]}>
          Track your first movie or show to get started!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={viewings}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      renderItem={({ item }) => (
        <ViewingCard
          viewing={item}
          onOpenDetails={onOpenDetails}
          onDelete={onDelete}
          isDeleting={deletingId === item.id}
        />
      )}
      contentContainerStyle={viewingsStyles.gridContent}
      columnWrapperStyle={numColumns > 1 ? { gap: 8 } : undefined}
    />
  );
}
