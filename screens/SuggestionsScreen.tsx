import { API_BASE_URL } from '@/config/api';
import { useAuthStore } from '@/store/authStore';
import colors from '@/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SuggestionsScreen() {
  const { requireValidToken } = useAuthStore();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      setError(null);
      const token = await requireValidToken();
      const response = await fetch(`${API_BASE_URL}/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      const data = await response.json();
      setSuggestions(data.suggestions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }, [requireValidToken]);

  useEffect(() => {
    setLoading(true);
    fetchSuggestions().finally(() => setLoading(false));
  }, [fetchSuggestions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSuggestions();
    setRefreshing(false);
  }, [fetchSuggestions]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.highlight} />
        }
      >
        <View style={styles.topHeader}>
          <Text style={styles.welcomeLabel}>Powered by AI</Text>
          <Text style={styles.title}>Suggestions</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.card}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.expense} style={styles.cardIcon} />
            <Text style={styles.cardText}>{error}</Text>
          </View>
        ) : suggestions.length === 0 ? (
          <View style={styles.card}>
            <Ionicons name="bulb-outline" size={22} color={colors.light} style={styles.cardIcon} />
            <Text style={styles.cardText}>No suggestions yet. Start tracking your transactions!</Text>
          </View>
        ) : (
          suggestions.map((suggestion, index) => (
            <View key={index} style={styles.card}>
              <Ionicons name="sparkles-outline" size={20} color="#FFD700" style={styles.cardIcon} />
              <Text style={styles.cardText}>{suggestion}</Text>
            </View>
          ))
        )}
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
    paddingHorizontal: 20,
  },
  content: {
    paddingTop: 10,
    paddingBottom: 50,
  },
  topHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  welcomeLabel: {
    color: colors.light,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  title: {
    fontSize: 30,
    color: colors.white,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcon: {
    marginTop: 2,
  },
  cardText: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
});
