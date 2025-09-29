import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import colors from '@/utils/colors';
import { useAuthStore } from '@/store/authStore';
import { useNavigation } from '@react-navigation/native';

export default function SignupScreen() {
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore(); 
  const navigation = useNavigation();

  const handleSignup = async () => {
    if (!name || !email || !password || !rePassword) {
      Alert.alert('Error', 'Please fill all fields ❌');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email ❌');
      return;
    }

    if (password !== rePassword) {
      Alert.alert('Error', 'Passwords do not match ❌');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters ❌');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
       'http://192.168.0.111:5000/api/auth/signup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        }
      );

      console.log('Response status:', response.status);

      let data;
      try {
        data = await response.json();
      } catch (err) {
        console.error('JSON parse error:', err);
        Alert.alert('Error', 'Invalid server response ❌');
        return;
      }

      console.log('Response data:', data);

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Signup failed ❌');
        return;
      }

      // Save token + user in Zustand
      setAuth(data.token, data.user);

      Alert.alert('Success', 'Signed up and logged in! 🎉');

      // Navigate to Dashboard
      navigation.replace('Dashboard');

    } catch (err) {
      console.error('Fetch error:', err);
      Alert.alert('Error', 'Could not connect to server ❌');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup</Text>

      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor={colors.light}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.light}
        keyboardType="email-address"
        autoCapitalize="none"
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

      <TextInput
        style={styles.input}
        placeholder="Re-enter Password"
        placeholderTextColor={colors.light}
        secureTextEntry
        value={rePassword}
        onChangeText={setRePassword}
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <Text style={styles.buttonText}>Signup</Text>
        )}
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
