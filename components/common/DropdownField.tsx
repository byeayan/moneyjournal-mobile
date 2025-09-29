import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import colors from "@/utils/colors";

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
        <Text style={styles.inputText}>
          {value ? value : `Select ${label.toLowerCase()}`}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
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
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 12 },
  label: { color: colors.light, marginBottom: 4, fontSize: 14 },
  inputBox: {
    borderBottomWidth: 1,
    borderColor: colors.surface,
    height: 44,
    justifyContent: "center",
  },
  inputText: { color: colors.white, fontSize: 16 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: { color: colors.white, fontSize: 18, marginBottom: 12 },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.highlight,
  },
  modalItemText: { color: colors.light },
  modalClose: { marginTop: 12, alignItems: "center" },
  modalCloseText: { color: colors.primary },
});
