import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import colors from '@/utils/colors';
import theme from '@/utils/theme';

type Props = {
  title: string;
  onPress: () => void;
};

export default function CustomButton({ title, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    height: theme.controls.buttonHeight,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    width: '100%',
  },
  text: {
    color: colors.white,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
});
