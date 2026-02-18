import CalendarView from "@/components/common/CalendarView";
import DailyTransactions from "@/components/common/DailyTransaction";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import colors from "@/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatCurrency(value: number | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const displayName = user?.username || user?.name || "User";

  const {
    fetchTransactions,
    fetchTransactionsByMonth,
    transactions,
    calendarTransactions,
    getTransactionMetrics,
    transactionMetrics,
  } = useTransactionStore();

  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const loadTransactions = async () => {
      await Promise.all([
        fetchTransactions(selectedDate),
        fetchTransactionsByMonth(selectedDate),
        getTransactionMetrics(),
      ]);
    };

    loadTransactions();
  }, [selectedDate]);

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
          <Text style={styles.title}>{`Welcome, ${displayName}`}</Text>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate("Profile")}>
            <Ionicons name="person-circle-outline" size={30} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("Income", { date: selectedDate.toISOString() })}
          >
            <Text style={styles.buttonText}>+ Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("Expense", { date: selectedDate.toISOString() })}
          >
            <Text style={styles.buttonText}>+ Expense</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.analyticsButton, { backgroundColor: colors.highlight }]}
          onPress={() => navigation.navigate("Analytics")}
        >
          <Text style={styles.buttonText}>View Analytics</Text>
        </TouchableOpacity>

        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <Text style={styles.sectionTitle}>Calendar</Text>
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
            <Text style={[styles.totalValue, styles.incomeValue]}>+${formatCurrency(transactionMetrics?.monthlyIncome)}</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Monthly Expense</Text>
            <Text style={[styles.totalValue, styles.expenseValue]}>-${formatCurrency(transactionMetrics?.monthlyExpense)}</Text>
          </View>
        </View>

        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <DailyTransactions transactions={transactions} />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    color: colors.white,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  actionButton: {
    flex: 0.48,
    height: 55,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { color: colors.white, fontSize: 18, fontWeight: "bold" },
  analyticsButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  calendarContainer: { marginBottom: 10 },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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
  transactionsContainer: { marginBottom: 20 },
});
