import AnalyticsScreen from '@/screens/AnalyticsScreen';
import BudgetScreen from '@/screens/BudgetScreen';
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
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AppTabParamList = {
  HomeTab: undefined;
  BudgetTab: undefined;
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

function getTabIcon(
  routeName: keyof AppTabParamList,
  focused: boolean
): keyof typeof Ionicons.glyphMap {
  if (routeName === 'HomeTab') return focused ? 'home' : 'home-outline';
  if (routeName === 'BudgetTab') return focused ? 'wallet' : 'wallet-outline';
  return focused ? 'person' : 'person-outline';
}

type AnimatedTabButtonProps = {
  focused: boolean;
  routeName: keyof AppTabParamList;
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
};

function AnimatedTabButton({
  focused,
  routeName,
  label,
  onPress,
  onLongPress,
}: AnimatedTabButtonProps) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [focused, progress]);

  const labelWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 46],
  });

  return (
    <TouchableOpacity
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      activeOpacity={0.9}
      style={styles.tabButtonWrap}
    >
      <View style={[styles.tabPill, focused && styles.tabPillFocused]}>
        <Ionicons
          name={getTabIcon(routeName, focused)}
          size={19}
          color={focused ? colors.white : colors.light}
        />
        <Animated.View style={[styles.tabLabelWrap, { width: labelWidth, opacity: progress }]}>
          <Text style={styles.tabLabel} numberOfLines={1}>
            {label}
          </Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: bottomInset }]}>
      <View style={[styles.tabBarContainer, { height: 56 }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = route.name === 'HomeTab' ? 'Home' : route.name === 'BudgetTab' ? 'Budget' : 'Profile';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <AnimatedTabButton
            key={route.key}
            focused={focused}
            routeName={route.name as keyof AppTabParamList}
            label={label}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
      </View>
    </View>
  );
}

function MainTabs() {
  useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      backBehavior="initialRoute"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
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
        name="BudgetTab"
        component={BudgetScreen}
        options={{
          title: 'Budget',
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

const styles = StyleSheet.create({
  tabBarOuter: {
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    overflow: 'visible',
  },
  tabPill: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  tabPillFocused: {
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  tabLabelWrap: {
    overflow: 'hidden',
  },
  tabLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});

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
