import CalendarView from "@/components/common/CalendarView";
import DailyTransactions from "@/components/common/DailyTransaction";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import colors from "@/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatCurrency(value: number | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const displayName = user?.username || user?.name || "User";

  const {
    fetchTransactions,
    fetchTransactionsByMonth,
    transactions,
    calendarTransactions,
  } = useTransactionStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAllRecent, setShowAllRecent] = useState(false);

  useEffect(() => {
    let active = true;

    const loadTransactions = async () => {
      try {
        await Promise.all([
          fetchTransactions(selectedDate),
          fetchTransactionsByMonth(selectedDate),
        ]);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Failed to load transactions.";
        Alert.alert("Error", message);
      }
    };

    loadTransactions();
    return () => {
      active = false;
    };
  }, [selectedDate]);

  const monthlyIncome = useMemo(
    () =>
      calendarTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [calendarTransactions]
  );

  const monthlyExpense = useMemo(
    () =>
      calendarTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [calendarTransactions]
  );

  const recentTransactions = useMemo(
    () =>
      [...calendarTransactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [calendarTransactions]
  );
  const netBalance = monthlyIncome - monthlyExpense;

  const handleMaximizeCalendar = () => {
    navigation.navigate("FullCalendar", {
      transactions: calendarTransactions,
      selectedDate: selectedDate.toISOString(),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 10, paddingBottom: 50 }}>
        <View style={styles.topHeader}>
          <Text style={styles.welcomeLabel}>Welcome,</Text>
          <Text style={styles.title}>{displayName}</Text>
        </View>

        <LinearGradient colors={[colors.primary, colors.highlight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryHero}>
          <Text style={styles.summaryHeroLabel}>This Month</Text>
          <Text style={styles.summaryHeroValue}>
            {netBalance >= 0 ? "+₹" : "-₹"}
            {formatCurrency(Math.abs(netBalance))}
          </Text>
          <View style={styles.summaryMetaRow}>
            <Text style={styles.summaryMetaText}>In: ₹{formatCurrency(monthlyIncome)}</Text>
            <Text style={styles.summaryMetaText}>Out: ₹{formatCurrency(monthlyExpense)}</Text>
          </View>
        </LinearGradient>

        <View style={styles.actionsPanel}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate("Income", { date: selectedDate.toISOString() })}
            >
              <Ionicons name="trending-up-outline" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate("Expense", { date: selectedDate.toISOString() })}
            >
              <Ionicons name="trending-down-outline" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>Expense</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.analyticsButton}
            onPress={() => navigation.navigate("Analytics")}
          >
            <Ionicons name="bar-chart-outline" size={16} color={colors.light} />
            <Text style={styles.analyticsButtonText}>View Analytics</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.light} />
              <Text style={styles.sectionTitle}>Calendar</Text>
            </View>
            <TouchableOpacity style={styles.iconCircle} onPress={handleMaximizeCalendar}>
              <Ionicons name="arrow-up-outline" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          <CalendarView
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            transactions={calendarTransactions}
            cellHeight={32}
            theme={{
              monthTextColor: colors.highlight,
              arrowColor: colors.primary,
              todayTextColor: colors.highlight,
              textDayFontSize: 16,
              textMonthFontSize: 20,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>

        <View style={styles.monthlyTotals}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Monthly Income</Text>
            <Text style={[styles.totalValue, styles.incomeValue]}>+₹{formatCurrency(monthlyIncome)}</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Monthly Expense</Text>
            <Text style={[styles.totalValue, styles.expenseValue]}>-₹{formatCurrency(monthlyExpense)}</Text>
          </View>
        </View>

        <View style={styles.transactionsContainer}>
          <View style={styles.transactionsHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="time-outline" size={18} color={colors.light} />
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllToggle}
              onPress={() => setShowAllRecent((prev) => !prev)}
            >
              <Text style={styles.viewDayText}>{showAllRecent ? "Hide" : "View All"}</Text>
              <Ionicons
                name={showAllRecent ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.highlight}
              />
            </TouchableOpacity>
          </View>
          <DailyTransactions
            transactions={recentTransactions}
            maxItems={showAllRecent ? undefined : 3}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  topHeader: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  welcomeLabel: {
    color: colors.light,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  title: {
    fontSize: 30,
    color: colors.white,
    fontWeight: "bold",
  },
  summaryHero: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  summaryHeroLabel: {
    color: colors.light,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  summaryHeroValue: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
  },
  summaryMetaRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryMetaText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  actionsPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  actionButton: {
    flex: 0.48,
    height: 55,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionButtonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  analyticsButton: {
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: colors.primary,
    backgroundColor: "#2b3559",
    flexDirection: "row",
    gap: 8,
    marginBottom: 0,
  },
  analyticsButtonText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  calendarContainer: {
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 14,
    padding: 10,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconCircle: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { color: colors.white, fontSize: 20, fontWeight: "bold" },
  monthlyTotals: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  totalCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  totalLabel: {
    color: colors.light,
    fontSize: 12,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  incomeValue: {
    color: "#58d68d",
  },
  expenseValue: {
    color: "#f1948a",
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  viewDayText: {
    color: colors.highlight,
    fontWeight: "700",
    fontSize: 14,
  },
  viewAllToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  transactionsContainer: { marginBottom: 20 },
});
