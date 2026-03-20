import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { colors, noteTypeEmoji } from "@/lib/theme";

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NotesScreen() {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const notes = trpc.notes.list.useQuery(
    { limit: 100, offset: 0 },
    { refetchOnWindowFocus: false }
  );

  const filtered = useMemo(() => {
    const list = notes.data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (n) =>
        n.content?.toLowerCase().includes(q) ||
        n.sourceTitle?.toLowerCase().includes(q) ||
        n.sourceUrl?.toLowerCase().includes(q)
    );
  }, [notes.data, search]);

  async function handleRefresh() {
    setRefreshing(true);
    await notes.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📒  Notes</Text>
          <Text style={styles.headerSub}>
            {notes.data ? `${notes.data.length} notes` : "Loading…"}
          </Text>
        </View>

        {/* Search input */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Filter notes…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {notes.isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyText}>
                  {search ? "No notes match your filter." : "No notes yet."}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                      {noteTypeEmoji[item.type] ?? "📝"} {item.type}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>

                {item.sourceTitle ? (
                  <Text style={styles.sourceTitle} numberOfLines={1}>
                    {item.sourceTitle}
                  </Text>
                ) : null}

                <Text style={styles.contentPreview} numberOfLines={3}>
                  {item.content || item.sourceUrl || "—"}
                </Text>

                {item.sourceUrl ? (
                  <Text style={styles.urlText} numberOfLines={1}>
                    🔗 {item.sourceUrl}
                  </Text>
                ) : null}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: colors.text },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 14,
    height: 44,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  clearBtn: { color: colors.textMuted, fontSize: 14, paddingLeft: 8 },

  loader: { marginTop: 40 },
  listContent: { paddingBottom: 20 },

  emptyContainer: { alignItems: "center", marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  dateText: { color: colors.textMuted, fontSize: 11 },
  sourceTitle: {
    color: colors.accentLight,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  contentPreview: { color: colors.text, fontSize: 14, lineHeight: 20 },
  urlText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
});
