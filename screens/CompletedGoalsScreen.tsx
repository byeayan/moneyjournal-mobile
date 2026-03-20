import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useGoalsStore } from '@/store/goalsStore';
import type { SavingsGoal } from '@/types/goal';
import colors from '@/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CompletedGoalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { goals, updateGoal, deleteGoal, initializeGoals } = useGoalsStore();
  const completedGoals = useMemo(() => goals.filter((goal) => goal.status === 'completed'), [goals]);
  const [refreshing, setRefreshing] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editSaved, setEditSaved] = useState('');
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });
  const [confirmState, setConfirmState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: null | (() => Promise<void> | void);
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const openEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditTarget(String(goal.targetAmount));
    setEditSaved(String(goal.savedAmount));
    setEditModalVisible(true);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await initializeGoals();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh completed goals.';
      Alert.alert('Error', message);
    } finally {
      setRefreshing(false);
    }
  }, [initializeGoals]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Completed Goals</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.highlight} />}
      >
        {completedGoals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No completed goals yet.</Text>
          </View>
        ) : (
          completedGoals.map((goal) => (
            <View key={goal.id} style={styles.goalCard}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalAmount}>Saved: Rs {formatCurrency(goal.savedAmount)}</Text>
              <Text style={styles.goalMeta}>Target: Rs {formatCurrency(goal.targetAmount)}</Text>
              <Text style={styles.goalMeta}>Set Date: {formatDate(goal.createdAt)}</Text>
              <Text style={styles.goalMeta}>Completed Date: {formatDate(goal.completedAt)}</Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEdit(goal)}
                >
                  <Ionicons name="create-outline" size={14} color={colors.white} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    setConfirmState({
                      visible: true,
                      title: 'Delete Goal',
                      message: `Are you sure you want to delete "${goal.title}"?`,
                      onConfirm: async () => {
                        await deleteGoal(goal.id);
                        setFeedback({
                          visible: true,
                          title: 'Deleted',
                          message: `"${goal.title}" was deleted successfully.`,
                        });
                      },
                    });
                  }}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.white} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Completed Goal</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
              placeholderTextColor={colors.light}
            />
            <TextInput
              style={styles.input}
              value={editTarget}
              onChangeText={setEditTarget}
              placeholder="Target amount"
              placeholderTextColor={colors.light}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              value={editSaved}
              onChangeText={setEditSaved}
              placeholder="Saved amount"
              placeholderTextColor={colors.light}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={async () => {
                if (!editingGoal) return;
                const target = Number(editTarget);
                const saved = Number(editSaved);
                if (!editTitle.trim()) {
                  setFeedback({ visible: true, title: 'Validation', message: 'Title is required.' });
                  return;
                }
                if (!Number.isFinite(target) || target <= 0) {
                  setFeedback({ visible: true, title: 'Validation', message: 'Target amount must be greater than 0.' });
                  return;
                }
                if (!Number.isFinite(saved) || saved < 0) {
                  setFeedback({ visible: true, title: 'Validation', message: 'Saved amount cannot be negative.' });
                  return;
                }
                try {
                  await updateGoal(editingGoal.id, {
                    title: editTitle.trim(),
                    targetAmount: target,
                    savedAmount: saved,
                  });
                  setEditModalVisible(false);
                  setFeedback({
                    visible: true,
                    title: 'Updated',
                    message: `"${editTitle.trim()}" was updated successfully.`,
                  });
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Could not update goal.';
                  setFeedback({
                    visible: true,
                    title: 'Error',
                    message,
                  });
                }
              }}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmState.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmState((prev) => ({ ...prev, visible: false, onConfirm: null }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{confirmState.title}</Text>
            <Text style={styles.confirmMessage}>{confirmState.message}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmState((prev) => ({ ...prev, visible: false, onConfirm: null }))}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={async () => {
                  const action = confirmState.onConfirm;
                  setConfirmState((prev) => ({ ...prev, visible: false, onConfirm: null }));
                  if (!action) return;
                  try {
                    await action();
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Action failed.';
                    setFeedback({ visible: true, title: 'Error', message });
                  }
                }}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={feedback.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>{feedback.title}</Text>
            <Text style={styles.feedbackMessage}>{feedback.message}</Text>
            <TouchableOpacity
              style={styles.feedbackBtn}
              onPress={() => setFeedback((prev) => ({ ...prev, visible: false }))}
            >
              <Text style={styles.feedbackBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 90 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPlaceholder: { width: 34, height: 34 },
  title: { color: colors.white, fontSize: 21, fontWeight: '800' },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.highlight,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  emptyText: { color: colors.light, fontSize: 14, fontWeight: '600' },
  goalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.highlight,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  goalTitle: { color: colors.white, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  goalAmount: { color: '#80F2CC', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  goalMeta: { color: colors.light, fontSize: 12, marginBottom: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.highlight,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    flexDirection: 'row',
    gap: 6,
  },
  editBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    flex: 1,
    borderRadius: 8,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b1e2f',
    flexDirection: 'row',
    gap: 6,
  },
  deleteBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 12,
    padding: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { color: colors.white, fontSize: 17, fontWeight: '800' },
  modalClose: { color: colors.light, fontSize: 13, fontWeight: '700' },
  input: {
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.highlight,
    color: colors.white,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  saveBtn: {
    marginTop: 4,
    height: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  saveBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  feedbackCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 12,
    padding: 14,
  },
  feedbackTitle: { color: colors.white, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  feedbackMessage: { color: colors.light, fontSize: 14, marginBottom: 12 },
  feedbackBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  feedbackBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  confirmMessage: { color: colors.light, fontSize: 13, marginTop: 8, marginBottom: 12 },
  confirmActions: { flexDirection: 'row', gap: 8 },
  confirmCancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: { color: colors.light, fontSize: 13, fontWeight: '700' },
  confirmDeleteBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#8b1e2f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: { color: colors.white, fontSize: 13, fontWeight: '700' },
});
