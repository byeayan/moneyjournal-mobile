import { useAuthStore } from "@/store/authStore";
import colors from "@/utils/colors";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";

type Gender = "male" | "female" | "other" | "prefer_not_to_say";

const genderLabel: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer Not",
};

function toDateInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, fetchCurrentUser, updateCurrentUser, deleteCurrentUser, logout } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender>("prefer_not_to_say");
  const [loading, setLoading] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);

  const resetToAuth = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.reset({ index: 0, routes: [{ name: "Index" }] });
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: "Index" }] });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await fetchCurrentUser();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load profile";
        Alert.alert("Error", message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    setUsername(user?.username || "");
    setEmail(user?.email || "");
    setPhone((user?.phone || "").replace(/\D/g, "").slice(0, 10));
    setGender((user?.gender as Gender) || "prefer_not_to_say");
    setDob(toDateInput(user?.dob));
  }, [user]);

  const initial = useMemo(
    () => ({
      username: (user?.username || "").trim(),
      dob: toDateInput(user?.dob),
      phone: (user?.phone || "").replace(/\D/g, "").slice(0, 10),
      gender: ((user?.gender as Gender) || "prefer_not_to_say") as Gender,
    }),
    [user]
  );

  const hasChanges = useMemo(() => {
    return (
      username.trim() !== initial.username ||
      dob.trim() !== initial.dob ||
      phone.trim() !== initial.phone ||
      gender !== initial.gender
    );
  }, [username, dob, phone, gender, initial]);

  const selectGender = () => {
    Alert.alert("Select Gender", "Choose one", [
      { text: "Male", onPress: () => setGender("male") },
      { text: "Female", onPress: () => setGender("female") },
      { text: "Other", onPress: () => setGender("other") },
      { text: "Prefer Not", onPress: () => setGender("prefer_not_to_say") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const onSave = async () => {
    if (!username.trim()) {
      Alert.alert("Validation", "Username is required.");
      return;
    }

    if (phone && phone.length !== 10) {
      Alert.alert("Validation", "Phone number must be exactly 10 digits.");
      return;
    }

    try {
      setLoading(true);
      await updateCurrentUser({
        username: username.trim(),
        phone: phone.trim(),
        gender,
        dob: dob.trim(),
      });
      Alert.alert("Success", "Profile updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const onDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all transactions. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteCurrentUser();
              resetToAuth();
            } catch (error) {
              const message = error instanceof Error ? error.message : "Delete failed";
              Alert.alert("Error", message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginBottom: 14 }} />}

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          placeholderTextColor={colors.light}
        />

        <Text style={styles.label}>Email (read-only)</Text>
        <TextInput style={[styles.input, styles.readOnlyInput]} value={email} editable={false} selectTextOnFocus={false} />

        <Text style={styles.label}>DOB</Text>
        <TouchableOpacity style={styles.inputLike} onPress={() => setShowDobPicker(true)}>
          <Text style={[styles.inputLikeText, !dob && styles.placeholderText]}>{dob || "Select date of birth"}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))}
          placeholder="10 digit phone"
          keyboardType="number-pad"
          maxLength={10}
          placeholderTextColor={colors.light}
        />

        <Text style={styles.label}>Gender</Text>
        <TouchableOpacity style={styles.inputLike} onPress={selectGender}>
          <Text style={styles.inputLikeText}>{genderLabel[gender]}</Text>
        </TouchableOpacity>

        {hasChanges && (
          <TouchableOpacity style={styles.primaryBtn} onPress={onSave} disabled={loading}>
            <Text style={styles.primaryBtnText}>Save Changes</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => {
            logout();
            resetToAuth();
          }}
          disabled={loading}
        >
          <Text style={styles.secondaryBtnText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerBtn} onPress={onDeleteAccount} disabled={loading}>
          <Text style={styles.dangerBtnText}>Delete Account</Text>
        </TouchableOpacity>

        <Modal visible={showDobPicker} transparent animationType="slide" onRequestClose={() => setShowDobPicker(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select DOB</Text>
                <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>

              <Calendar
                current={dob || undefined}
                onDayPress={(day: DateData) => {
                  setDob(day.dateString);
                  setShowDobPicker(false);
                }}
                maxDate={new Date().toISOString().split("T")[0]}
                theme={{
                  todayTextColor: colors.highlight,
                  arrowColor: colors.primary,
                  monthTextColor: colors.white,
                  textDayFontSize: 16,
                  textMonthFontSize: 20,
                  textDayHeaderFontSize: 14,
                  calendarBackground: colors.surface,
                  dayTextColor: colors.white,
                  textSectionTitleColor: colors.light,
                }}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
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
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  back: {
    color: colors.white,
    fontSize: 20,
    width: 24,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
  },
  label: {
    color: colors.light,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.white,
    marginBottom: 8,
  },
  inputLike: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginBottom: 8,
  },
  inputLikeText: {
    color: colors.white,
    fontSize: 16,
  },
  placeholderText: {
    color: colors.light,
  },
  readOnlyInput: {
    backgroundColor: colors.surface,
    opacity: 0.8,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.light,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  dangerBtn: {
    marginTop: 12,
    backgroundColor: "#8b1e2f",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  modalClose: {
    color: colors.primary,
    fontWeight: "700",
  },
});
