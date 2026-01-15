// mobile/app/(app)/circles/[id]/settings.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { feedColors } from "../../../../src/styles/feedStyles";
import { AppBar } from "../../../../src/components/feed/AppBar";
import {
  fetchCircleDetails,
  updateCircle,
  deleteCircle,
} from "../../../../src/lib/feed";
import type { Circle } from "../../../../src/types/feed";

export default function CircleSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCircle();
    }, [id])
  );

  const loadCircle = async () => {
    try {
      setLoading(true);
      const data = await fetchCircleDetails(id);
      setCircle(data);
      setName(data.name);
      setDescription(data.description || "");
      setVisibility(data.visibility);
    } catch (err: any) {
      console.error("Failed to load circle:", err);
      Alert.alert("Error", err.message || "Failed to load circle");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateCircle(id, {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });
      Alert.alert("Success", "Circle settings updated");
      router.back();
    } catch (err: any) {
      console.error("Failed to update:", err);
      Alert.alert("Error", err.message || "Failed to update circle");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Circle",
      `Are you sure you want to delete "${circle?.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCircle(id);
              Alert.alert("Success", "Circle deleted");
              router.replace("/circles");
            } catch (err: any) {
              console.error("Failed to delete:", err);
              Alert.alert("Error", err.message || "Failed to delete circle");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={feedColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppBar />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Circle Settings</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Circle Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Circle name"
            placeholderTextColor={feedColors.textTertiary}
            maxLength={80}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Circle description"
            placeholderTextColor={feedColors.textTertiary}
            multiline
            maxLength={240}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Visibility</Text>
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setVisibility("private")}
              style={[
                styles.toggleButton,
                visibility === "private" && styles.toggleButtonActive,
              ]}
            >
              <Ionicons
                name="lock-closed"
                size={18}
                color={visibility === "private" ? "#fff" : feedColors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleButtonText,
                  visibility === "private" && styles.toggleButtonTextActive,
                ]}
              >
                Private
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVisibility("public")}
              style={[
                styles.toggleButton,
                visibility === "public" && styles.toggleButtonActive,
              ]}
            >
              <Ionicons
                name="globe"
                size={18}
                color={visibility === "public" ? "#fff" : feedColors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleButtonText,
                  visibility === "public" && styles.toggleButtonTextActive,
                ]}
              >
                Public
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </Pressable>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Delete Circle</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: feedColors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: feedColors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: feedColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: feedColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: feedColors.text,
  },
  textArea: {
    backgroundColor: feedColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: feedColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: feedColors.text,
    minHeight: 100,
    textAlignVertical: "top",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: feedColors.backgroundSecondary,
    borderWidth: 2,
    borderColor: feedColors.border,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: feedColors.primary,
    borderColor: feedColors.primary,
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.textSecondary,
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  saveButton: {
    backgroundColor: feedColors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  dangerZone: {
    marginTop: 32,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: feedColors.border,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: feedColors.error,
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: feedColors.error,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
