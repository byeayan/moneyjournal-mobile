import CalendarView from "@/components/common/CalendarView";
import DailyTransactions from "@/components/common/DailyTransaction";
import { useTransactionStore } from "@/store/transactionStore";
import colors from "@/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DashboardScreen() {
    const navigation = useNavigation<any>();
    const { fetchTransactions, transactions, getTransactionMetrics, transactionMetrics } = useTransactionStore();
    const [selectedDate, setSelectedDate] = useState(new Date());
    // const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        const loadTransactions = async () => {
            await fetchTransactions(selectedDate);
            await getTransactionMetrics();
            // const filtered = transactions;
            // setTransactions(filtered);
        };

        loadTransactions();
        console.log("transac:", transactions);
        console.log("metr", transactionMetrics)
    }, [selectedDate]);

    const handleMaximizeCalendar = () => {
        navigation.navigate("FullCalendar", { transactions: transactions });
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 50 }}
        >
            <Text style={styles.title}>My Dashboard</Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        { backgroundColor: colors.primary },
                    ]}
                    onPress={() => navigation.navigate("Income")}
                >
                    <Text style={styles.buttonText}>+ Income</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        { backgroundColor: colors.primary },
                    ]}
                    onPress={() => navigation.navigate("Expense")}
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

            {/* Calendar */}
            <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                    <Text style={styles.sectionTitle}>Calendar</Text>
                    <TouchableOpacity
                        style={styles.iconCircle}
                        onPress={handleMaximizeCalendar}
                    >
                        <Ionicons
                            name="arrow-up-outline"
                            size={20}
                            color={colors.white}
                        />
                    </TouchableOpacity>
                </View>

                <CalendarView
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    transactions={transactions}
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

            {/* Daily totals */}
            <View style={styles.dailyTotals}>
                <Text style={styles.dailyTotalText}>
                    Monthly Income: +${transactionMetrics?.monthlyIncome}
                </Text>
                <Text style={styles.dailyTotalText}>
                    Monthly Expense: -${transactionMetrics?.monthlyExpense}
                </Text>
            </View>

            {/* Daily Transactions */}
            <View style={styles.transactionsContainer}>
                <Text style={styles.sectionTitle}>Transactions</Text>
                <DailyTransactions transactions={transactions} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        color: colors.white,
        fontWeight: "bold",
        marginBottom: 30,
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
    dailyTotals: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    dailyTotalText: { color: colors.white, fontSize: 16, fontWeight: "600" },
    transactionsContainer: { marginBottom: 20 },
});
