import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import colors from '@/utils/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<any>(); // navigation hook

  const handleLogin = () => {
    if (email === 'ayan@example.com' && password === '1234') {
      Alert.alert('Success', 'Logged in successfully! 🎉', [
        {
          text: 'OK',
          onPress: () => navigation.replace('Dashboard'), // redirect to Dashboard
        },
      ]);
    } else {
      Alert.alert('Error', 'Invalid email or password ❌');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.light}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.light}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'flex-start',
    alignItems: 'center', 
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  title: {
    fontSize: 32,
    color: colors.primary,
    marginBottom: 40,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  input: {
    width: '100%',
    height: 55,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
    color: colors.white,
    fontSize: 18,
    fontFamily: 'System',
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: colors.background,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});
