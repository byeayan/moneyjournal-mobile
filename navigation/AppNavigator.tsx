import AnalyticsScreen from '@/screens/AnalyticsScreen';
import DailyTransactionScreen from '@/screens/DailyTransactionScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import ExpenseScreen from '@/screens/ExpenseScreen';
import FullCalendarScreen from '@/screens/FullCalendarScreen';
import IncomeScreen from '@/screens/IncomeScreen';
import IndexScreen from '@/screens/IndexScreen';
import LoginScreen from '@/screens/LoginScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SignupScreen from '@/screens/SignupScreen';
import { useAuthStore } from '@/store/authStore';
import type { Transaction } from '@/types/transaction';
import colors from '@/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AppTabParamList = {
  HomeTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Index: undefined;
  Login: undefined;
  Signup: undefined;
  AppTabs: NavigatorScreenParams<AppTabParamList>;
  Dashboard: undefined;
  Profile: undefined;
  Income: { date?: string } | undefined;
  Expense: { date?: string } | undefined;
  Analytics: undefined;
  DailyTransaction: {
    date: string;
    transactions: Transaction[];
    showAll?: boolean;
    title?: string;
  };
  FullCalendar: { transactions: Transaction[]; selectedDate?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.highlight,
          borderTopWidth: 1,
          height: 54 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.light,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size, focused }) => {
          const iconName =
            route.name === 'HomeTab'
              ? focused
                ? 'home'
                : 'home-outline'
              : focused
                ? 'person'
                : 'person-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isHydrated, isLoggedIn } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={isLoggedIn ? 'AppTabs' : 'Index'}>
      <Stack.Screen name="Index" component={IndexScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AppTabs" component={MainTabs} options={{ headerShown: false }} />

      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Income" component={IncomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Expense" component={ExpenseScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DailyTransaction" component={DailyTransactionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FullCalendar" component={FullCalendarScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
