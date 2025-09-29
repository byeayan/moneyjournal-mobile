import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import colors from '@/utils/colors';

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
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
    width: 200,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
