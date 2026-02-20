import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/utils/colors";
import theme from "@/utils/theme";

type Props = {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
};

export default function DropdownField({ label, value, options, onSelect }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.inputBox}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.inputText}>{value ? value : `Select ${label.toLowerCase()}`}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.light} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose {label}</Text>
            <ScrollView>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.modalItem}
                  onPress={() => {
                    onSelect(opt);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
  label: {
    color: colors.light,
    marginBottom: 4,
    fontSize: theme.typography.small,
    fontWeight: "600",
  },
  inputBox: {
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: theme.radius.md,
    minHeight: theme.controls.inputHeight,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
  },
  inputText: {
    color: colors.white,
    fontSize: theme.typography.body,
    flex: 1,
    paddingRight: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  modalTitle: {
    color: colors.white,
    fontSize: theme.typography.h3,
    marginBottom: 12,
    fontWeight: "700",
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.highlight,
  },
  modalItemText: { color: colors.light, fontSize: theme.typography.body },
  modalClose: { marginTop: 12, alignItems: "center" },
  modalCloseText: { color: colors.primary, fontWeight: "700" },
});
