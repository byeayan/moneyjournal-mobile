import { useAuthStore } from '@/store/authStore';
import colors from '@/utils/colors';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<any>(); // navigation hook
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields ❌');
      return;
    }
    try {
      await login(email, password);
      Alert.alert('Success', 'logged in! 🎉');
      navigation.replace('Dashboard');
    } catch (err) {
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
