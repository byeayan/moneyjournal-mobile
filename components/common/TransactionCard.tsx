import type { Transaction } from "@/types/transaction";
import colors from "@/utils/colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type TransactionCardProps = {
  transaction: Transaction;
};

function formatAmount(amount: number, type: Transaction["type"]) {
  const prefix = type === "income" ? "+" : "-";
  const value = Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${prefix}$${value}`;
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const typeColor = transaction.type === "income" ? colors.income : colors.expense;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.category}>{transaction.category || "Other"}</Text>
        <Text style={[styles.amount, { color: typeColor }]}>
          {formatAmount(transaction.amount, transaction.type)}
        </Text>
      </View>

      <Text style={styles.meta}>Note: {transaction.note?.trim() || "-"}</Text>
      <Text style={styles.meta}>Description: {transaction.description?.trim() || "-"}</Text>
      <Text style={styles.meta}>
        Date: {new Date(transaction.date).toLocaleDateString("en-US")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  category: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  amount: {
    fontWeight: "700",
    fontSize: 16,
  },
  meta: {
    color: colors.light,
    fontSize: 13,
    marginBottom: 2,
  },
});
