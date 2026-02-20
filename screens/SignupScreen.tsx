import InputField from "@/components/common/InputField";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { useAuthStore } from "@/store/authStore";
import colors from "@/utils/colors";
import theme from "@/utils/theme";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SignupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Signup">;

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const { signup } = useAuthStore();
  const navigation = useNavigation<SignupScreenNavigationProp>();

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !rePassword) {
      setFeedback({ title: "Error", message: "Please fill all fields" });
      return;
    }

    if (!email.includes("@")) {
      setFeedback({ title: "Error", message: "Please enter a valid email" });
      return;
    }

    if (password !== rePassword) {
      setFeedback({ title: "Error", message: "Passwords do not match" });
      return;
    }

    if (password.length < 6) {
      setFeedback({ title: "Error", message: "Password must be at least 6 characters" });
      return;
    }

    try {
      setLoading(true);
      await signup(name.trim(), email.trim(), password);
      navigation.replace("AppTabs", { screen: "HomeTab" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setFeedback({ title: "Error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        <InputField label="Name" placeholder="Enter name" value={name} onChangeText={setName} />

        <InputField
          label="Email"
          placeholder="Enter email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <InputField
          label="Password"
          placeholder="Enter password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <InputField
          label="Confirm Password"
          placeholder="Re-enter password"
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
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!feedback}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedback(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{feedback?.title}</Text>
            <Text style={styles.modalMessage}>{feedback?.message}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setFeedback(null)}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 34,
  },
  title: {
    fontSize: theme.typography.h1,
    color: colors.white,
    marginBottom: theme.spacing.lg,
    fontWeight: "700",
  },
  button: {
    marginTop: theme.spacing.lg,
    height: theme.controls.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontSize: theme.typography.body,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  modalTitle: {
    color: colors.white,
    fontSize: theme.typography.h3,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalMessage: {
    color: colors.light,
    fontSize: theme.typography.small,
    marginBottom: 12,
  },
  modalBtn: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalBtnText: {
    color: colors.white,
    fontWeight: "700",
  },
});
