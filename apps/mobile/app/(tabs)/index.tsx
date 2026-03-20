import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { colors, noteTypeEmoji } from "@/lib/theme";

function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export default function CaptureScreen() {
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [showUrlField, setShowUrlField] = useState(false);

  const utils = trpc.useUtils();

  const recentNotes = trpc.notes.list.useQuery(
    { limit: 5, offset: 0 },
    { refetchOnWindowFocus: false }
  );

  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      setContent("");
      setUrl("");
      setShowUrlField(false);
      utils.notes.list.invalidate();
    },
    onError: (err) => {
      Alert.alert("Error", err.message ?? "Failed to save note");
    },
  });

  function handleSave() {
    const trimmed = content.trim();
    const trimmedUrl = url.trim();
    if (!trimmed && !trimmedUrl) return;

    createNote.mutate({
      content: trimmed,
      ...(trimmedUrl ? { url: trimmedUrl, type: "link" } : { type: "text" }),
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>✏️  Capture</Text>
            <Text style={styles.headerSub}>What's on your mind?</Text>
          </View>

          {/* Input card */}
          <View style={styles.card}>
            <TextInput
              style={styles.mainInput}
              placeholder="Capture a thought, idea, or link…"
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus={false}
            />

            {showUrlField && (
              <TextInput
                style={styles.urlInput}
                placeholder="https://…"
                placeholderTextColor={colors.textMuted}
                value={url}
                onChangeText={setUrl}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.urlToggle}
                onPress={() => setShowUrlField((v) => !v)}
              >
                <Text style={styles.urlToggleText}>
                  {showUrlField ? "✕ Remove URL" : "🔗 Add URL"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!content.trim() && !url.trim()) && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={createNote.isPending || (!content.trim() && !url.trim())}
              >
                {createNote.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Note</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent notes */}
          <Text style={styles.sectionLabel}>Recent captures</Text>

          {recentNotes.isLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : (
            <FlatList
              data={recentNotes.data ?? []}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No notes yet — start capturing!</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.noteItem}>
                  <View style={styles.noteRow}>
                    <Text style={styles.noteEmoji}>
                      {noteTypeEmoji[item.type] ?? "📝"}
                    </Text>
                    <Text style={styles.noteContent} numberOfLines={2}>
                      {item.content || item.sourceTitle || item.sourceUrl || "—"}
                    </Text>
                  </View>
                  <Text style={styles.noteDate}>
                    {formatRelativeDate(item.createdAt)}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: colors.text },
  headerSub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 24,
  },
  mainInput: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 96,
    textAlignVertical: "top",
  },
  urlInput: {
    color: colors.text,
    fontSize: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  urlToggle: { paddingVertical: 6, paddingHorizontal: 4 },
  urlToggleText: { color: colors.textMuted, fontSize: 13 },
  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  loader: { marginTop: 20 },
  listContent: { paddingBottom: 20 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 16 },
  noteItem: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteEmoji: { fontSize: 16, marginTop: 1 },
  noteContent: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  noteDate: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
});
