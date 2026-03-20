import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { colors, noteTypeEmoji } from "@/lib/theme";

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100);
  return (
    <View style={scoreStyles.track}>
      <View style={[scoreStyles.fill, { width: `${pct}%` as `${number}%` }]} />
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  fill: {
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
});

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const results = trpc.notes.search.useQuery(
    { query: submitted, limit: 20 },
    {
      enabled: submitted.trim().length > 0,
      refetchOnWindowFocus: false,
    }
  );

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (q) setSubmitted(q);
  }, [query]);

  function handleClear() {
    setQuery("");
    setSubmitted("");
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🔍  Semantic Search</Text>
          <Text style={styles.headerSub}>Search by meaning, not just keywords</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchCard}>
          <TextInput
            style={styles.searchInput}
            placeholder="Ask your second brain…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.searchActions}>
            {query.length > 0 && (
              <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕ Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.searchBtn, !query.trim() && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={!query.trim()}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        {results.isFetching && (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        )}

        {results.data && !results.isFetching && (
          <Text style={styles.resultCount}>
            {results.data.length} result{results.data.length !== 1 ? "s" : ""} for &ldquo;{submitted}&rdquo;
          </Text>
        )}

        {results.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Search failed. Make sure you are connected to the API.
            </Text>
          </View>
        )}

        <FlatList
          data={results.data ?? []}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !results.isFetching && submitted ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🔭</Text>
                <Text style={styles.emptyText}>No results found.</Text>
              </View>
            ) : !submitted ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>💡</Text>
                <Text style={styles.emptyText}>
                  Type a query and press Search.{"\n"}
                  Try &ldquo;meeting with team&rdquo; or &ldquo;project ideas&rdquo;.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {noteTypeEmoji[item.type] ?? "📝"} {item.type}
                  </Text>
                </View>
                <Text style={styles.scoreText}>
                  {Math.round(item.score * 100)}% match
                </Text>
              </View>

              {item.source_title ? (
                <Text style={styles.sourceTitle} numberOfLines={1}>
                  {item.source_title}
                </Text>
              ) : null}

              <Text style={styles.contentText} numberOfLines={4}>
                {item.content}
              </Text>

              <ScoreBar score={item.score} />
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: colors.text },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  searchInput: {
    color: colors.text,
    fontSize: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  clearBtnText: { color: colors.textMuted, fontSize: 13 },
  searchBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  loader: { marginTop: 20 },
  resultCount: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: "#2d1010",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#f87171", fontSize: 13 },

  listContent: { paddingBottom: 20 },
  emptyContainer: { alignItems: "center", marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: "center", lineHeight: 22 },

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
  scoreText: { color: colors.accentLight, fontSize: 12, fontWeight: "600" },
  sourceTitle: {
    color: colors.accentLight,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  contentText: { color: colors.text, fontSize: 14, lineHeight: 20 },
});
