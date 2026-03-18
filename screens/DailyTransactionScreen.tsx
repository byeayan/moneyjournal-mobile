import DropdownField from '@/components/common/DropdownField';
import { useTransactionStore } from '@/store/transactionStore';
import type { Transaction } from '@/types/transaction';
import { expenseCategories, incomeCategories } from '@/utils/categories';
import colors from '@/utils/colors';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DailyTransactionScreenProps {
  route: {
    params: {
      date: string;
      transactions: Transaction[];
      showAll?: boolean;
      title?: string;
    };
  };
}

export default function DailyTransactionScreen({ route }: DailyTransactionScreenProps) {
  const navigation = useNavigation<any>();
  const { updateTransaction, deleteTransaction } = useTransactionStore();
  const { date: dateString, transactions, showAll = false, title } = route.params;
  const date = new Date(dateString);

  const [items, setItems] = useState<Transaction[]>(transactions);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [pendingDeleteTx, setPendingDeleteTx] = useState<Transaction | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [items]
  );
  const editCategoryOptions = editingTx?.type === 'income' ? incomeCategories : expenseCategories;

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setAmount(String(tx.amount));
    setCategory(tx.category ?? '');
    setNote(tx.note ?? '');
    setDescription(tx.description ?? '');
  };

  const closeEdit = () => {
    setEditingTx(null);
    setAmount('');
    setCategory('');
    setNote('');
    setDescription('');
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Validation', 'Amount must be a valid number greater than 0.');
      return;
    }
    if (!category.trim()) {
      Alert.alert('Validation', 'Category is required.');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateTransaction(editingTx.id, {
        amount: parsed,
        category: category.trim(),
        note: note.trim(),
        description: description.trim(),
      });

      setItems((prev) => prev.map((t) => (t.id === editingTx.id ? { ...t, ...updated } : t)));
      closeEdit();
      setSuccessMessage('Transaction updated successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update transaction';
      Alert.alert('Error', message);
      setSaving(false);
    }
  };

  const handleDelete = (tx: Transaction) => {
    setPendingDeleteTx(tx);
  };

  const cancelDelete = () => {
    if (deleting) return;
    setPendingDeleteTx(null);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteTx) return;
    try {
      setDeleting(true);
      await deleteTransaction(pendingDeleteTx.id);
      setItems((prev) => prev.filter((t) => t.id !== pendingDeleteTx.id));
      setPendingDeleteTx(null);
      setSuccessMessage('Transaction deleted successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete transaction';
      Alert.alert('Error', message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.dateTitle}>{showAll ? (title || 'All Transactions') : date.toDateString()}</Text>

      <FlatList
        data={sortedItems}
        contentContainerStyle={{ paddingBottom: 28 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.transactionCard}>
            <View style={styles.rowTop}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={[styles.amount, { color: item.type === 'income' ? colors.income : colors.expense }]}>
                {item.type === 'income' ? '+' : '-'}${item.amount}
              </Text>
            </View>

            <Text style={styles.metaText}>Note: {item.note?.trim() || '-'}</Text>
            {showAll ? <Text style={styles.metaText}>Date: {new Date(item.date).toDateString()}</Text> : null}
            <Text style={styles.metaText}>Description: {item.description?.trim() || '-'}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {showAll ? 'No transactions found.' : 'No transactions for this day.'}
          </Text>
        }
      />

      <Modal visible={!!editingTx} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Transaction</Text>
              <TouchableOpacity onPress={closeEdit} disabled={saving}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubTitle}>Update amount, category and details.</Text>

            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor={colors.light}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <DropdownField
              label="Category"
              value={category}
              options={editCategoryOptions}
              onSelect={setCategory}
            />
            <Text style={styles.inputLabel}>Note</Text>
            <TextInput
              style={styles.input}
              placeholder="Note"
              placeholderTextColor={colors.light}
              value={note}
              onChangeText={setNote}
            />
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Description"
              placeholderTextColor={colors.light}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!pendingDeleteTx} transparent animationType="fade" onRequestClose={cancelDelete}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Delete Transaction</Text>
              <TouchableOpacity onPress={cancelDelete} disabled={deleting}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubTitle}>
              This action cannot be undone. Are you sure you want to delete{' '}
              <Text style={styles.modalEmphasis}>{pendingDeleteTx?.category}</Text>?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelDelete} disabled={deleting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDelete} disabled={deleting}>
                <Text style={styles.deleteConfirmBtnText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!successMessage} transparent animationType="fade" onRequestClose={() => setSuccessMessage('')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Success</Text>
            <Text style={styles.successText}>{successMessage}</Text>
            <TouchableOpacity style={styles.successBtn} onPress={() => setSuccessMessage('')}>
              <Text style={styles.successBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.background },
  backButton: {
    marginBottom: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 5,
  },
  backButtonText: { color: colors.white, fontWeight: 'bold' },
  dateTitle: { fontSize: 22, fontWeight: 'bold', color: colors.white, marginBottom: 20 },
  transactionCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: { color: colors.white, fontSize: 16, fontWeight: '700' },
  amount: { fontSize: 16, fontWeight: '700' },
  metaText: { color: colors.light, fontSize: 13, marginBottom: 2 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  editBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { color: colors.white, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: '#8b1e2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtnText: { color: colors.white, fontWeight: '700' },
  emptyText: { color: colors.white, fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalCloseText: {
    color: colors.light,
    fontSize: 13,
    fontWeight: '700',
  },
  modalSubTitle: {
    color: colors.light,
    fontSize: 13,
    marginBottom: 12,
  },
  modalEmphasis: {
    color: colors.white,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 8,
    color: colors.white,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 10,
  },
  inputLabel: {
    color: colors.light,
    marginBottom: 4,
    fontSize: 14,
  },
  multiline: {
    minHeight: 70,
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: { color: colors.light, fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBtnText: { color: colors.white, fontWeight: '700' },
  deleteConfirmBtn: {
    backgroundColor: '#8b1e2f',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteConfirmBtnText: {
    color: colors.white,
    fontWeight: '700',
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.income,
  },
  successTitle: {
    color: colors.income,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  successText: {
    color: colors.white,
    fontSize: 14,
    marginBottom: 12,
  },
  successBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.income,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  successBtnText: {
    color: colors.background,
    fontWeight: '700',
  },
});
