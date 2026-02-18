import DropdownField from "@/components/common/DropdownField";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useTransactionStore } from "@/store/transactionStore";
import { expenseCategories } from "@/utils/categories";
import colors from "@/utils/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

type ExpenseScreenProps = NativeStackScreenProps<RootStackParamList, "Expense">;

function clampToNow(date: Date) {
  const now = new Date();
  return date > now ? now : date;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export default function ExpenseScreen({ navigation, route }: ExpenseScreenProps) {
  const { addTransaction } = useTransactionStore();

  const initialDate = clampToNow(route.params?.date ? new Date(route.params.date) : new Date());
  const [entryDate, setEntryDate] = useState<Date>(initialDate);
  const [dateStr, setDateStr] = useState<string>("");
  const [timeStr, setTimeStr] = useState<string>("");
  const [manualTime, setManualTime] = useState(false);

  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [keypadVisible, setKeypadVisible] = useState(false);

  useEffect(() => {
    const day = String(entryDate.getDate()).padStart(2, "0");
    const month = String(entryDate.getMonth() + 1).padStart(2, "0");
    const year = String(entryDate.getFullYear()).slice(2);
    setDateStr(
      `${day}/${month}/${year} (${entryDate.toLocaleString("en-US", {
        weekday: "short",
      })})`
    );

    const hours = entryDate.getHours();
    const minutes = String(entryDate.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    const hour12 = ((hours + 11) % 12) + 1;
    setTimeStr(`${hour12}:${minutes} ${ampm}`);
  }, [entryDate]);

  const shiftDate = (days: number) => {
    setEntryDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return clampToNow(next);
    });
  };

  const shiftTime = (minutes: number) => {
    setManualTime(true);
    setEntryDate((prev) => {
      const next = new Date(prev);
      next.setMinutes(next.getMinutes() + minutes);
      return clampToNow(next);
    });
  };

  const setTimeToNow = () => {
    setManualTime(false);
    setEntryDate((prev) => {
      const now = new Date();
      const next = new Date(prev);
      next.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      return clampToNow(next);
    });
  };

  const canMoveToNextDay = !isSameDay(entryDate, new Date());

  function onKeyPress(key: string) {
    if (key === "del") {
      setAmount((a) => (a.length ? a.slice(0, -1) : a));
    } else if (key === "done") {
      setKeypadVisible(false);
    } else {
      setAmount((a) => {
        if (key === "." && a.includes(".")) return a;
        if (a === "0" && key !== ".") return key;
        return a + key;
      });
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Expense</Text>
        <View style={{ width: 28 }} />
      </View>

      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          setKeypadVisible(false);
        }}
      >
        <View style={{ flex: 1 }}>
          <KeyboardAwareScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: keypadVisible ? 260 : 40 }}
            enableOnAndroid
            extraScrollHeight={80}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.row}>
              <Text style={styles.label}>Date</Text>
              <View style={styles.rowRight}>
                <TouchableOpacity style={styles.dateShiftButton} onPress={() => shiftDate(-1)}>
                  <Text style={styles.dateShiftText}>{"<"}</Text>
                </TouchableOpacity>
                <Text style={styles.value}>{dateStr}</Text>
                <TouchableOpacity
                  style={[styles.dateShiftButton, !canMoveToNextDay && styles.disabledButton]}
                  onPress={() => shiftDate(1)}
                  disabled={!canMoveToNextDay}
                >
                  <Text style={styles.dateShiftText}>{">"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Time</Text>
              <View style={styles.rowRight}>
                <TouchableOpacity style={styles.timeButton} onPress={() => shiftTime(-15)}>
                  <Text style={styles.timeButtonText}>-15m</Text>
                </TouchableOpacity>
                <Text style={styles.value}>{timeStr}</Text>
                <TouchableOpacity style={styles.timeButton} onPress={() => shiftTime(15)}>
                  <Text style={styles.timeButtonText}>+15m</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timeButton} onPress={setTimeToNow}>
                  <Text style={styles.timeButtonText}>Now</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.hr} />

            <View style={styles.field}>
              <Text style={styles.label}>Amount</Text>
              <TouchableOpacity
                style={styles.inputBox}
                onPress={() => {
                  Keyboard.dismiss();
                  setKeypadVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.inputText}>{amount ? amount : "Tap to enter"}</Text>
              </TouchableOpacity>
            </View>

            <DropdownField
              label="Category"
              value={category}
              options={expenseCategories}
              onSelect={setCategory}
            />

            <View style={styles.field}>
              <Text style={styles.label}>Note</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter note"
                placeholderTextColor={colors.light}
                value={note}
                onChangeText={setNote}
                returnKeyType="done"
                onFocus={() => setKeypadVisible(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                placeholder="Enter description"
                placeholderTextColor={colors.light}
                value={description}
                onChangeText={setDescription}
                multiline
                onFocus={() => setKeypadVisible(false)}
              />
            </View>

            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={async () => {
                  if (!amount || !category) return;

                  const now = new Date();
                  const txDate = new Date(entryDate);

                  if (!manualTime) {
                    txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                  }

                  if (txDate > now) {
                    Alert.alert("Invalid time", "Future date/time transactions are not allowed.");
                    return;
                  }

                  await addTransaction({
                    amount: parseFloat(amount),
                    note: note.trim(),
                    description: description.trim(),
                    category,
                    type: "expense",
                    date: txDate.toISOString(),
                  });
                  navigation.goBack();
                }}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.continueButton} onPress={() => navigation.goBack()}>
                <Text style={styles.continueText}>Back</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>

          {keypadVisible && (
            <View style={styles.keypadContainer}>
              <View style={styles.keypadTopBar}>
                <Text style={styles.keypadLabel}>Amount</Text>
                <TouchableOpacity onPress={() => setKeypadVisible(false)}>
                  <Text style={styles.keypadLabel}>X</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.keypadGrid}>
                {[
                  ["1", "2", "3", "del"],
                  ["4", "5", "6", "-"],
                  ["7", "8", "9", "calc"],
                  ["0", ".", " ", "done"],
                ].map((row, rIdx) => (
                  <View style={styles.keypadRow} key={rIdx}>
                    {row.map((k) => (
                      <TouchableOpacity
                        key={k}
                        style={[styles.keyCell, k === "done" ? styles.doneCell : null]}
                        onPress={() => {
                          if (k === "del") onKeyPress("del");
                          else if (k === "done") onKeyPress("done");
                          else if (k === "-" || k === "calc" || k === " ") return;
                          else onKeyPress(k);
                        }}
                      >
                        <Text style={[styles.keyText, k === "done" ? styles.doneText : null]}>
                          {k === "del" ? "DEL" : k === "calc" ? "CALC" : k === " " ? "" : k}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "android" ? 12 : 0,
    justifyContent: "space-between",
  },
  back: { color: colors.light, fontSize: 20 },
  title: { color: colors.white, fontSize: 20, fontWeight: "600" },

  container: { paddingHorizontal: 18 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  rowRight: { flexDirection: "row", alignItems: "center" },
  label: { color: colors.light, marginBottom: 4, fontSize: 14 },
  value: { color: colors.white, fontSize: 14 },
  dateShiftButton: {
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 8,
  },
  disabledButton: { opacity: 0.4 },
  dateShiftText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  timeButton: {
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  timeButtonText: { color: colors.white, fontSize: 12, fontWeight: "600" },

  hr: { height: 1, backgroundColor: colors.surface, marginVertical: 8 },

  field: { marginTop: 12 },
  inputBox: {
    borderBottomWidth: 1,
    borderColor: colors.surface,
    height: 44,
    justifyContent: "center",
  },
  inputText: { color: colors.white, fontSize: 16 },

  textInput: {
    borderBottomWidth: 1,
    borderColor: colors.surface,
    height: 44,
    fontSize: 16,
    color: colors.white,
  },

  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    alignItems: "center",
  },
  saveButton: {
    flex: 1,
    marginRight: 12,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  continueButton: {
    width: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueText: { color: colors.white, fontSize: 16 },

  keypadContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.highlight,
  },
  keypadTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  keypadLabel: { color: colors.light, fontSize: 16 },

  keypadGrid: { padding: 6 },
  keypadRow: { flexDirection: "row" },
  keyCell: {
    flex: 1,
    margin: 6,
    minHeight: 50,
    borderRadius: 6,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  doneCell: { backgroundColor: colors.primary, flex: 1.1 },
  keyText: { color: colors.white, fontSize: 20 },
  doneText: { color: colors.white, fontWeight: "700" },
});
