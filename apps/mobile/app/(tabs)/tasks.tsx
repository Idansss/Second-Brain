import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { colors, priorityColor } from "@/lib/theme";

type Priority = "low" | "medium" | "high" | "urgent";

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "🔴 Urgent",
  high: "🟠 High",
  medium: "🟣 Medium",
  low: "⚫ Low",
};

const STATUS_FILTERS = ["todo", "in_progress", "done"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function formatDueDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const isOverdue = d < now;
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return isOverdue ? `⚠️ ${label}` : `📅 ${label}`;
}

// ── Add Task Modal ────────────────────────────────────────────────────────────

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, priority: Priority) => void;
  saving: boolean;
}

function AddTaskModal({ visible, onClose, onSave, saving }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  function handleSave() {
    if (!title.trim()) return;
    onSave(title.trim(), priority);
    setTitle("");
    setPriority("medium");
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>New Task</Text>

          <TextInput
            style={modalStyles.input}
            placeholder="Task title…"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <Text style={modalStyles.label}>Priority</Text>
          <View style={modalStyles.priorityRow}>
            {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  modalStyles.priorityBtn,
                  priority === p && { borderColor: priorityColor[p], backgroundColor: `${priorityColor[p]}22` },
                ]}
                onPress={() => setPriority(p)}
              >
                <Text style={[modalStyles.priorityBtnText, { color: priorityColor[p] }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.saveBtn, (!title.trim() || saving) && modalStyles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!title.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.saveText}>Add Task</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.text,
    fontSize: 15,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  priorityBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priorityBtnText: { fontSize: 13, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelText: { color: colors.textMuted, fontWeight: "600" },
  saveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: "#fff", fontWeight: "600" },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todo");
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const utils = trpc.useUtils();

  const tasks = trpc.tasks.list.useQuery(
    { status: statusFilter },
    { refetchOnWindowFocus: false }
  );

  const updateStatus = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => utils.tasks.list.invalidate(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      setShowAdd(false);
      utils.tasks.list.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  async function handleRefresh() {
    setRefreshing(true);
    await tasks.refetch();
    setRefreshing(false);
  }

  function toggleDone(id: string, currentStatus: string) {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    updateStatus.mutate({ id, status: newStatus });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>☑️  Tasks</Text>
            <Text style={styles.headerSub}>
              {tasks.data ? `${tasks.data.length} task${tasks.data.length !== 1 ? "s" : ""}` : "Loading…"}
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Status filter tabs */}
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterTab, statusFilter === s && styles.filterTabActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text
                style={[styles.filterTabText, statusFilter === s && styles.filterTabTextActive]}
              >
                {s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tasks.isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <FlatList
            data={tasks.data ?? []}
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
                <Text style={styles.emptyEmoji}>
                  {statusFilter === "done" ? "🎉" : "📋"}
                </Text>
                <Text style={styles.emptyText}>
                  {statusFilter === "done"
                    ? "No completed tasks yet."
                    : "No tasks. Tap + Add to create one."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isDone = item.status === "done";
              const dueLabel = formatDueDate(item.dueDate);
              const pColor = priorityColor[item.priority as Priority] ?? colors.textMuted;

              return (
                <View style={[styles.card, isDone && styles.cardDone]}>
                  <View style={styles.cardRow}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      style={[styles.checkbox, isDone && styles.checkboxDone]}
                      onPress={() => toggleDone(item.id, item.status)}
                    >
                      {isDone && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>

                    {/* Content */}
                    <View style={styles.cardContent}>
                      <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                        {item.title}
                      </Text>

                      {item.context ? (
                        <Text style={styles.contextText} numberOfLines={1}>
                          {item.context}
                        </Text>
                      ) : null}

                      <View style={styles.badgeRow}>
                        <View style={[styles.priorityBadge, { borderColor: pColor }]}>
                          <Text style={[styles.priorityBadgeText, { color: pColor }]}>
                            {PRIORITY_LABEL[item.priority as Priority] ?? item.priority}
                          </Text>
                        </View>

                        {dueLabel ? (
                          <Text style={styles.dueText}>{dueLabel}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      <AddTaskModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={(title, priority) => createTask.mutate({ title, priority })}
        saving={createTask.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: colors.text },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  addBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterTabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterTabText: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  filterTabTextActive: { color: "#fff", fontWeight: "600" },

  loader: { marginTop: 40 },
  listContent: { paddingBottom: 20 },

  emptyContainer: { alignItems: "center", marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: "center" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  cardDone: { opacity: 0.6 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "700" },

  cardContent: { flex: 1 },
  taskTitle: { fontSize: 15, color: colors.text, fontWeight: "500", lineHeight: 22 },
  taskTitleDone: { textDecorationLine: "line-through", color: colors.textMuted },
  contextText: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  priorityBadgeText: { fontSize: 11, fontWeight: "600" },
  dueText: { color: colors.textMuted, fontSize: 11 },
});
