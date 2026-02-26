import { useAuthStore } from "@/store/authStore";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import colors from "@/utils/colors";
import { subscribeTabDoublePress } from "@/utils/tabDoublePressBus";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
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
type CalendarHeaderArg = {
  month: { getMonth: () => number; getFullYear: () => number };
  addMonth: (count: number) => void;
};

const genderLabel: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer Not",
};
const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MIN_DOB_YEAR = 1900;

function toDateInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Profile">>();
  const { user, fetchCurrentUser, updateCurrentUser, deleteCurrentUser, logout } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender>("prefer_not_to_say");
  const [loading, setLoading] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dobPickerMonth, setDobPickerMonth] = useState("");
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: "",
    message: "",
  });
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const showFeedback = (title: string, message: string) => {
    setFeedbackModal({ visible: true, title, message });
  };

  const resetToAuth = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.reset({ index: 0, routes: [{ name: "Index" }] });
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: "Index" }] });
  };

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      await fetchCurrentUser();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load profile";
      showFeedback("Error", message);
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    const unsubscribe = subscribeTabDoublePress("ProfileTab", () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return unsubscribe;
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
    setShowGenderPicker(true);
  };

  const openDobPicker = () => {
    const baseDate = dob ? new Date(`${dob}T00:00:00`) : new Date();
    const pickerDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const monthStart = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), 1);
    setDobPickerMonth(monthStart.toISOString().split("T")[0]);
    setShowMonthMenu(false);
    setShowYearMenu(false);
    setShowDobPicker(true);
  };

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - MIN_DOB_YEAR + 1 }, (_, index) => currentYear - index);
  }, []);

  const onSave = async () => {
    if (!username.trim()) {
      showFeedback("Validation", "Username is required.");
      return;
    }

    if (phone && phone.length !== 10) {
      showFeedback("Validation", "Phone number must be exactly 10 digits.");
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
      showFeedback("Success", "Profile updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      showFeedback("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const onDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.highlight} />}
      >
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
        <TouchableOpacity style={styles.inputLike} onPress={openDobPicker}>
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
                current={dobPickerMonth || dob || undefined}
                customHeader={({ month, addMonth }: CalendarHeaderArg) => {
                  const visibleMonth = month.getMonth();
                  const visibleYear = month.getFullYear();

                  return (
                    <View>
                      <View style={styles.dobHeaderRow}>
                        <TouchableOpacity
                          style={styles.dobArrowBtn}
                          onPress={() => {
                            addMonth(-1);
                            setShowMonthMenu(false);
                            setShowYearMenu(false);
                          }}
                        >
                          <Text style={styles.dobArrowText}>{"<"}</Text>
                        </TouchableOpacity>

                        <View style={styles.dobHeaderCenter}>
                          <TouchableOpacity
                            style={styles.dobHeaderChip}
                            onPress={() => {
                              setShowMonthMenu((prev) => !prev);
                              setShowYearMenu(false);
                            }}
                          >
                            <Text style={styles.dobHeaderChipText}>{MONTH_LABELS[visibleMonth]}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.dobHeaderChip}
                            onPress={() => {
                              setShowYearMenu((prev) => !prev);
                              setShowMonthMenu(false);
                            }}
                          >
                            <Text style={styles.dobHeaderChipText}>{visibleYear}</Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={styles.dobArrowBtn}
                          onPress={() => {
                            addMonth(1);
                            setShowMonthMenu(false);
                            setShowYearMenu(false);
                          }}
                        >
                          <Text style={styles.dobArrowText}>{">"}</Text>
                        </TouchableOpacity>
                      </View>

                      {showMonthMenu && (
                        <View style={styles.dobMonthGrid}>
                          {MONTH_LABELS.map((monthName, index) => (
                            <TouchableOpacity
                              key={monthName}
                              style={[styles.dobMonthCell, index === visibleMonth && styles.dobMonthCellActive]}
                              onPress={() => {
                                addMonth(index - visibleMonth);
                                setShowMonthMenu(false);
                              }}
                            >
                              <Text style={styles.dobMonthCellText}>{monthName.slice(0, 3)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {showYearMenu && (
                        <ScrollView style={styles.dobYearList} nestedScrollEnabled>
                          {availableYears.map((year) => (
                            <TouchableOpacity
                              key={year}
                              style={[styles.dobYearRow, year === visibleYear && styles.dobYearRowActive]}
                              onPress={() => {
                                addMonth((year - visibleYear) * 12);
                                setShowYearMenu(false);
                              }}
                            >
                              <Text style={styles.dobYearText}>{year}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  );
                }}
                onDayPress={(day: DateData) => {
                  setDob(day.dateString);
                  setShowDobPicker(false);
                  setShowMonthMenu(false);
                  setShowYearMenu(false);
                }}
                maxDate={new Date().toISOString().split("T")[0]}
                markedDates={
                  dob
                    ? {
                        [dob]: {
                          selected: true,
                          selectedColor: colors.primary,
                        },
                      }
                    : undefined
                }
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

        <Modal visible={showGenderPicker} transparent animationType="fade" onRequestClose={() => setShowGenderPicker(false)}>
          <View style={styles.centerBackdrop}>
            <View style={styles.centerModalCard}>
              <Text style={styles.centerModalTitle}>Select Gender</Text>

              <TouchableOpacity style={styles.optionRow} onPress={() => { setGender("male"); setShowGenderPicker(false); }}>
                <Text style={styles.optionText}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionRow} onPress={() => { setGender("female"); setShowGenderPicker(false); }}>
                <Text style={styles.optionText}>Female</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionRow} onPress={() => { setGender("other"); setShowGenderPicker(false); }}>
                <Text style={styles.optionText}>Other</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionRow} onPress={() => { setGender("prefer_not_to_say"); setShowGenderPicker(false); }}>
                <Text style={styles.optionText}>Prefer Not</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowGenderPicker(false)}>
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
          <View style={styles.centerBackdrop}>
            <View style={styles.centerModalCard}>
              <Text style={styles.centerModalTitle}>Delete Account</Text>
              <Text style={styles.centerModalMessage}>
                This will permanently delete your account and all transactions. Continue?
              </Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowDeleteConfirm(false)}>
                  <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDangerBtn}
                  onPress={async () => {
                    try {
                      setShowDeleteConfirm(false);
                      setLoading(true);
                      await deleteCurrentUser();
                      resetToAuth();
                    } catch (error) {
                      const message = error instanceof Error ? error.message : "Delete failed";
                      showFeedback("Error", message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <Text style={styles.modalDangerBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={feedbackModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setFeedbackModal((prev) => ({ ...prev, visible: false }))}
        >
          <View style={styles.centerBackdrop}>
            <View style={styles.centerModalCard}>
              <Text style={styles.centerModalTitle}>{feedbackModal.title}</Text>
              <Text style={styles.centerModalMessage}>{feedbackModal.message}</Text>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setFeedbackModal((prev) => ({ ...prev, visible: false }))}
              >
                <Text style={styles.modalPrimaryBtnText}>OK</Text>
              </TouchableOpacity>
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
  dobHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dobArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.highlight,
    alignItems: "center",
    justifyContent: "center",
  },
  dobArrowText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  dobHeaderCenter: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dobHeaderChip: {
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dobHeaderChipText: {
    color: colors.white,
    fontWeight: "700",
  },
  dobMonthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  dobMonthCell: {
    width: "22%",
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  dobMonthCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dobMonthCellText: {
    color: colors.white,
    fontWeight: "600",
  },
  dobYearList: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 8,
    marginBottom: 8,
  },
  dobYearRow: {
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  dobYearRowActive: {
    backgroundColor: colors.primary,
  },
  dobYearText: {
    color: colors.white,
    fontWeight: "600",
  },
  centerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  centerModalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 12,
    padding: 14,
  },
  centerModalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  centerModalMessage: {
    color: colors.light,
    fontSize: 14,
    marginBottom: 12,
  },
  optionRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  optionText: {
    color: colors.white,
    fontSize: 15,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
  },
  modalPrimaryBtn: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalPrimaryBtnText: {
    color: colors.white,
    fontWeight: "700",
  },
  modalSecondaryBtn: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: colors.light,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
  },
  modalSecondaryBtnText: {
    color: colors.light,
    fontWeight: "700",
  },
  modalDangerBtn: {
    backgroundColor: "#8b1e2f",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalDangerBtnText: {
    color: colors.white,
    fontWeight: "700",
  },
});
