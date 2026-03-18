import colors from "@/utils/colors";
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

type InputFieldProps = TextInputProps & {
  label: string;
};

export default function InputField({ label, style, ...props }: InputFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.light}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 12,
  },
  label: {
    color: colors.light,
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.white,
    fontSize: 16,
  },
});
