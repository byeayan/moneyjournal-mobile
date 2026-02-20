import colors from "@/utils/colors";
import theme from "@/utils/theme";
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
    marginTop: theme.spacing.sm,
  },
  label: {
    color: colors.light,
    marginBottom: theme.spacing.xs,
    fontSize: theme.typography.small,
    fontWeight: "600",
  },
  input: {
    height: theme.controls.inputHeight,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    color: colors.white,
    fontSize: theme.typography.body,
    backgroundColor: colors.surface,
  },
});
