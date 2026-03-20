import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useBudgetStore } from '@/store/budgetStore';
import type { MonthlyReport } from '@/types/report';
import colors from '@/utils/colors';
import { generateMonthlyReport, parseMonthKey } from '@/utils/report';
import { buildReportHtml } from '@/utils/reportPdf';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ReportRouteProp = RouteProp<RootStackParamList, 'ReportPreview'>;
type ReportPreviewNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReportPreview'>;

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

type MetricCardProps = {
  title: string;
  value: string;
  accent?: string;
};

function MetricCard({ title, value, accent }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, accent ? { color: accent } : undefined]}>{value}</Text>
    </View>
  );
}

function BudgetRow({ item }: { item: MonthlyReport['budget']['items'][number] }) {
  const statusColor =
    item.status === 'over' ? '#F87171' : item.status === 'under' ? '#34D399' : '#FBBF24';
  const statusLabel = item.status === 'over' ? 'Over' : item.status === 'under' ? 'Within' : 'Unplanned';
  return (
    <View style={styles.listRow}>
      <View style={styles.listLeft}>
        <Text style={styles.listTitle}>{item.category}</Text>
        <Text style={styles.listSubText}>
          Spent Rs {formatCurrency(item.spent)} / Planned Rs {formatCurrency(item.planned)}
        </Text>
      </View>
      <View style={[styles.badge, { borderColor: statusColor }]}>
        <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

export default function ReportPreviewScreen() {
  const navigation = useNavigation<ReportPreviewNavigationProp>();
  const route = useRoute<ReportRouteProp>();
  const transactions = route.params.transactions;
  const initialMonth = useMemo(() => parseMonthKey(route.params.selectedMonthKey), [route.params.selectedMonthKey]);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const budgets = useBudgetStore((state) => state.budgets);
  const monthlyTotals = useBudgetStore((state) => state.monthlyTotals);
  const initializeBudgets = useBudgetStore((state) => state.initializeBudgets);
  const isBudgetHydrated = useBudgetStore((state) => state.isHydrated);
  const now = useMemo(() => new Date(), []);
  const currentMonthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const [lastPdfUri, setLastPdfUri] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    title: string;
    message: string;
    tone: 'success' | 'error' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    tone: 'info',
  });

  const showFeedback = (title: string, message: string, tone: 'success' | 'error' | 'info') => {
    setFeedback({
      visible: true,
      title,
      message,
      tone,
    });
  };

  useEffect(() => {
    if (!isBudgetHydrated) {
      void initializeBudgets();
    }
  }, [initializeBudgets, isBudgetHydrated]);

  useEffect(() => {
    if (!feedback.visible || feedback.tone !== 'success') return;
    const timer = setTimeout(() => {
      setFeedback((prev) => ({ ...prev, visible: false }));
    }, 2000);
    return () => clearTimeout(timer);
  }, [feedback.visible, feedback.tone]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await initializeBudgets();
    } finally {
      setRefreshing(false);
    }
  }, [initializeBudgets]);

  const report: MonthlyReport = useMemo(
    () =>
      generateMonthlyReport({
        transactions,
        budgets,
        monthlyTotals,
        selectedMonth,
      }),
    [transactions, budgets, monthlyTotals, selectedMonth]
  );
  const canGoNextMonth = selectedMonth < currentMonthStart;
  const selectedMonthLabel = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleShiftMonth = (delta: number) => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };
  const buildReportFileName = () => `MoneyJournal-${report.monthKey}.pdf`;

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const html = buildReportHtml(report);
      const generated = await Print.printToFileAsync({ html });
      const fileName = buildReportFileName();

      if (Platform.OS === 'android') {
        const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
        const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
        if (!permission.granted) {
          throw new Error('Downloads permission was not granted.');
        }

        const targetFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          fileName.replace(/\.pdf$/i, ''),
          'application/pdf'
        );
        const base64Pdf = await FileSystem.readAsStringAsync(generated.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.writeAsStringAsync(targetFileUri, base64Pdf, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setLastPdfUri(generated.uri);
        showFeedback('Saved', `Report downloaded to Downloads as "${fileName}".`, 'success');
      } else {
        if (!FileSystem.documentDirectory) {
          throw new Error('Local document directory is not available on this device.');
        }
        const destinationDir = `${FileSystem.documentDirectory}reports`;
        const dirInfo = await FileSystem.getInfoAsync(destinationDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(destinationDir, { intermediates: true });
        }

        const destinationUri = `${destinationDir}/${fileName}`;
        await FileSystem.copyAsync({ from: generated.uri, to: destinationUri });
        setLastPdfUri(destinationUri);
        showFeedback('Saved', `Report saved to app files as "${fileName}".`, 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download PDF.';
      showFeedback('Download Failed', message, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSharePdf = async () => {
    try {
      setIsSharing(true);
      let uriToShare = lastPdfUri;
      if (!uriToShare) {
        const html = buildReportHtml(report);
        const generated = await Print.printToFileAsync({ html });
        uriToShare = generated.uri;
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showFeedback('Sharing Unavailable', 'Share is not available on this device.', 'info');
        return;
      }

      await Sharing.shareAsync(uriToShare, {
        mimeType: 'application/pdf',
        dialogTitle: buildReportFileName(),
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to share PDF.';
      showFeedback('Share Failed', message, 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const netColor = report.summary.netSavings >= 0 ? '#22C55E' : '#F87171';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={16} color={colors.white} />
          <Text style={styles.headerButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Preview</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.highlight} />}
      >
        <View style={styles.monthBanner}>
          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.monthButton} onPress={() => handleShiftMonth(-1)}>
              <Text style={styles.monthButtonText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{selectedMonthLabel}</Text>
            <TouchableOpacity
              style={[styles.monthButton, !canGoNextMonth && styles.monthButtonDisabled]}
              onPress={() => handleShiftMonth(1)}
              disabled={!canGoNextMonth}
            >
              <Text style={styles.monthButtonText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.monthMeta}>
            Generated {new Date(report.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
        </View>

        <View style={styles.grid}>
          <MetricCard title="Income" value={`Rs ${formatCurrency(report.summary.income)}`} />
          <MetricCard title="Expense" value={`Rs ${formatCurrency(report.summary.expense)}`} />
          <MetricCard title="Net Savings" value={`Rs ${formatCurrency(report.summary.netSavings)}`} accent={netColor} />
          <MetricCard title="Savings Rate" value={`${report.summary.savingsRate.toFixed(1)}%`} accent={netColor} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Spending Categories</Text>
          {report.topCategories.length === 0 ? (
            <Text style={styles.emptyText}>No expense data for this month.</Text>
          ) : (
            report.topCategories.map((item) => (
              <View style={styles.listRow} key={item.category}>
                <Text style={styles.listTitle}>{item.category}</Text>
                <Text style={styles.listValue}>Rs {formatCurrency(item.amount)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comparison vs Previous Month</Text>
          <View style={styles.listRow}>
            <Text style={styles.listTitle}>Income Change</Text>
            <Text style={[styles.listValue, report.comparison.incomeDelta >= 0 ? styles.good : styles.bad]}>
              {report.comparison.incomeDelta >= 0 ? '+' : '-'}Rs {formatCurrency(Math.abs(report.comparison.incomeDelta))}
            </Text>
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listTitle}>Expense Change</Text>
            <Text style={[styles.listValue, report.comparison.expenseDelta <= 0 ? styles.good : styles.bad]}>
              {report.comparison.expenseDelta >= 0 ? '+' : '-'}Rs {formatCurrency(Math.abs(report.comparison.expenseDelta))}
            </Text>
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listTitle}>Net Change</Text>
            <Text style={[styles.listValue, report.comparison.netDelta >= 0 ? styles.good : styles.bad]}>
              {report.comparison.netDelta >= 0 ? '+' : '-'}Rs {formatCurrency(Math.abs(report.comparison.netDelta))}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Budget Performance</Text>
          <Text style={styles.budgetMeta}>
            Total Budget Rs {formatCurrency(report.budget.totalBudget)} | Spent Rs {formatCurrency(report.budget.totalSpent)} | Used{' '}
            {report.budget.utilizationRate.toFixed(1)}%
          </Text>
          {report.budget.items.length === 0 ? (
            <Text style={styles.emptyText}>No category budget entries for this month.</Text>
          ) : (
            report.budget.items.map((item) => <BudgetRow key={item.category} item={item} />)
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights</Text>
          {report.insights.map((insight) => (
            <Text key={insight} style={styles.insightText}>
              - {insight}
            </Text>
          ))}
        </View>

        <TouchableOpacity style={styles.downloadButton} activeOpacity={0.85} onPress={() => void handleDownloadPdf()} disabled={isDownloading}>
          <Ionicons name="download-outline" size={16} color={colors.white} />
          <Text style={styles.downloadButtonText}>{isDownloading ? 'Generating PDF...' : 'Download PDF'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.downloadButton, styles.shareButton]}
          activeOpacity={0.85}
          onPress={() => void handleSharePdf()}
          disabled={isSharing}
        >
          <Ionicons name="share-social-outline" size={16} color={colors.white} />
          <Text style={styles.downloadButtonText}>{isSharing ? 'Preparing Share...' : 'Share PDF'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={feedback.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              feedback.tone === 'success' && styles.modalCardSuccess,
              feedback.tone === 'error' && styles.modalCardError,
            ]}
          >
            <Text style={styles.modalTitle}>{feedback.title}</Text>
            <Text style={styles.modalMessage}>{feedback.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setFeedback((prev) => ({ ...prev, visible: false }))}
            >
              <Text style={styles.modalButtonText}>OK</Text>
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
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButtonText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: '700' },
  monthBanner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 12,
    padding: 12,
  },
  monthTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  monthMeta: { color: colors.light, fontSize: 12, marginTop: 4 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  monthButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  monthButtonDisabled: {
    opacity: 0.35,
  },
  monthButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 12,
    padding: 10,
  },
  metricTitle: { color: colors.light, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  metricValue: { color: colors.white, fontSize: 18, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 8 },
  listLeft: { flex: 1 },
  listTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  listSubText: { color: colors.light, fontSize: 12, marginTop: 2 },
  listValue: { color: colors.white, fontSize: 14, fontWeight: '700' },
  emptyText: { color: colors.light, fontSize: 13 },
  budgetMeta: { color: colors.light, fontSize: 12, marginBottom: 6 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  insightText: { color: colors.light, fontSize: 13, marginBottom: 6 },
  good: { color: '#34D399' },
  bad: { color: '#F87171' },
  downloadButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
  },
  shareButton: {
    backgroundColor: '#2D5B9E',
  },
  downloadButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 16,
  },
  modalCardSuccess: {
    borderColor: '#22C55E',
  },
  modalCardError: {
    borderColor: '#F87171',
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalMessage: {
    color: colors.light,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
