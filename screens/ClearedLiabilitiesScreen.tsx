import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useGoalsStore } from '@/store/goalsStore';
import colors from '@/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function toMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function ClearedLiabilitiesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const liabilities = useGoalsStore((state) => state.liabilities);
  const liabilityPayments = useGoalsStore((state) => state.liabilityPayments);
  const deleteLiability = useGoalsStore((state) => state.deleteLiability);
  const initializeGoals = useGoalsStore((state) => state.initializeGoals);
  const getRentDueForMonth = useGoalsStore((state) => state.getRentDueForMonth);
  const monthKey = useMemo(() => toMonthKey(), []);
  const [detailsId, setDetailsId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const clearedLiabilities = useMemo(
    () =>
      liabilities.filter((item) =>
        item.type === 'rent' ? getRentDueForMonth(item.id, monthKey) <= 0 : item.remainingAmount <= 0
      ),
    [getRentDueForMonth, liabilities, monthKey]
  );
  const selectedDetails = useMemo(
    () => clearedLiabilities.find((item) => item.id === detailsId) ?? null,
    [clearedLiabilities, detailsId]
  );
  const selectedPaymentRows = useMemo(() => {
    if (!detailsId) return [];
    return liabilityPayments
      .filter((entry) => entry.liabilityId === detailsId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [detailsId, liabilityPayments]);
  const selectedDeleteTarget = useMemo(
    () => clearedLiabilities.find((item) => item.id === confirmDeleteId) ?? null,
    [clearedLiabilities, confirmDeleteId]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await initializeGoals();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh liabilities.';
      Alert.alert('Error', message);
    } finally {
      setRefreshing(false);
    }
  }, [initializeGoals]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Cleared Liabilities</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.highlight} />}
      >
        {clearedLiabilities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No cleared liabilities right now.</Text>
          </View>
        ) : (
          clearedLiabilities.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.badgeWrap}>
                <Text style={styles.typeBadgeText}>{item.type.toUpperCase()}</Text>
                <Text style={styles.completedBadgeText}>COMPLETED</Text>
              </View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMeta}>Type: {item.type.toUpperCase()}</Text>
              {item.type === 'rent' ? (
                <Text style={styles.itemValue}>This month paid</Text>
              ) : (
                <Text style={styles.itemValue}>Remaining: Rs {formatCurrency(item.remainingAmount)}</Text>
              )}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.detailBtn} onPress={() => setDetailsId(item.id)}>
                  <Text style={styles.detailBtnText}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => setConfirmDeleteId(item.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!detailsId} transparent animationType="fade" onRequestClose={() => setDetailsId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDetails?.title || 'Liability'} Details</Text>
              <TouchableOpacity onPress={() => setDetailsId(null)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.itemMeta}>Payment history</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {selectedPaymentRows.length === 0 ? (
                <Text style={styles.emptyText}>No payment records found.</Text>
              ) : (
                selectedPaymentRows.map((row) => (
                  <View key={row.id} style={styles.paymentRow}>
                    <Text style={styles.paymentDate}>
                      {new Date(row.createdAt).toLocaleDateString('en-IN')} ({row.monthKey})
                    </Text>
                    <Text style={styles.paymentAmount}>Rs {formatCurrency(row.amount)}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmDeleteId} transparent animationType="fade" onRequestClose={() => setConfirmDeleteId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Liability</Text>
            <Text style={styles.itemMeta}>
              Are you sure you want to delete "{selectedDeleteTarget?.title || 'this liability'}"?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.detailBtn} onPress={() => setConfirmDeleteId(null)}>
                <Text style={styles.detailBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={async () => {
                  if (!confirmDeleteId) return;
                  await deleteLiability(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 80 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.white, fontSize: 20, fontWeight: '800' },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 12,
  },
  emptyText: { color: colors.light, fontSize: 13, fontWeight: '600' },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 12,
    marginBottom: 10,
    position: 'relative',
  },
  badgeWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'flex-end',
    gap: 4,
  },
  typeBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#3B768A',
    overflow: 'hidden',
  },
  completedBadgeText: {
    color: '#7FF2C6',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#7FF2C6',
    overflow: 'hidden',
  },
  itemTitle: { color: colors.white, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  itemMeta: { color: colors.light, fontSize: 12, marginBottom: 2 },
  itemValue: { color: '#7FF2C6', fontSize: 13, fontWeight: '700' },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  detailBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  detailBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b1e2f',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: { color: colors.white, fontSize: 17, fontWeight: '800' },
  modalClose: { color: colors.light, fontSize: 13, fontWeight: '700' },
  paymentRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  paymentDate: { color: colors.light, fontSize: 12, marginBottom: 2 },
  paymentAmount: { color: colors.white, fontSize: 13, fontWeight: '700' },
  confirmActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
});
