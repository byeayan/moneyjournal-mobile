import AnalyticsScreen from '@/screens/AnalyticsScreen';
import SuggestionsScreen from '@/screens/SuggestionsScreen';
import BudgetScreen from '@/screens/BudgetScreen';
import ClearedLiabilitiesScreen from '@/screens/ClearedLiabilitiesScreen';
import CompletedGoalsScreen from '@/screens/CompletedGoalsScreen';
import DailyTransactionScreen from '@/screens/DailyTransactionScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import ExpenseScreen from '@/screens/ExpenseScreen';
import FullCalendarScreen from '@/screens/FullCalendarScreen';
import GoalsScreen from '@/screens/GoalsScreen';
import IncomeScreen from '@/screens/IncomeScreen';
import IndexScreen from '@/screens/IndexScreen';
import LiabilitiesScreen from '@/screens/LiabilitiesScreen';
import LoginScreen from '@/screens/LoginScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import ReportPreviewScreen from '@/screens/ReportPreviewScreen';
import SignupScreen from '@/screens/SignupScreen';
import { useAuthStore } from '@/store/authStore';
import type { Transaction } from '@/types/transaction';
import { emitTabDoublePress } from '@/utils/tabDoublePressBus';
import colors from '@/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AppTabParamList = {
  HomeTab: undefined;
  GoalsTab: undefined;
  LiabilitiesTab: undefined;
  BudgetTab: undefined;
  SuggestionsTab: undefined;
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
  ReportPreview: { transactions: Transaction[]; selectedMonthKey: string };
  CompletedGoals: undefined;
  ClearedLiabilities: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();
const TAB_CONTAINER_HORIZONTAL_PADDING = 6;
const TAB_BUTTON_HORIZONTAL_PADDING = 3;

function getTabIcon(
  routeName: keyof AppTabParamList,
  focused: boolean
): keyof typeof Ionicons.glyphMap {
  if (routeName === 'HomeTab') return focused ? 'home' : 'home-outline';
  if (routeName === 'GoalsTab') return focused ? 'trophy' : 'trophy-outline';
  if (routeName === 'LiabilitiesTab') return focused ? 'card' : 'card-outline';
  if (routeName === 'BudgetTab') return focused ? 'wallet' : 'wallet-outline';
  if (routeName === 'SuggestionsTab') return focused ? 'sparkles' : 'sparkles-outline';
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
  return (
    <TouchableOpacity
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      activeOpacity={0.9}
      style={styles.tabButtonWrap}
    >
      <View style={styles.tabPill}>
        <Ionicons
          name={getTabIcon(routeName, focused)}
          size={17}
          color={focused ? colors.white : colors.light}
        />
        <Text style={[styles.tabLabel, focused ? styles.tabLabelFocused : styles.tabLabelMuted]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const bottomInset = Math.max(insets.bottom, 10);
  const lastTapByRoute = useRef<Record<string, number>>({});
  const activeX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const segmentWidth =
    containerWidth > TAB_CONTAINER_HORIZONTAL_PADDING * 2
      ? (containerWidth - TAB_CONTAINER_HORIZONTAL_PADDING * 2) / state.routes.length
      : 0;
  const indicatorWidth = Math.max(segmentWidth - TAB_BUTTON_HORIZONTAL_PADDING * 2, 0);

  useEffect(() => {
    if (!segmentWidth) return;
    const toValue =
      TAB_CONTAINER_HORIZONTAL_PADDING +
      state.index * segmentWidth +
      TAB_BUTTON_HORIZONTAL_PADDING;
    Animated.spring(activeX, {
      toValue,
      useNativeDriver: false,
      damping: 18,
      stiffness: 220,
      mass: 0.6,
    }).start();
  }, [activeX, segmentWidth, state.index]);

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: bottomInset }]}>
      <View
        style={[styles.tabBarContainer, { height: 56 }]}
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      >
      {indicatorWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabIndicator,
            {
              width: indicatorWidth,
              transform: [{ translateX: activeX }],
            },
          ]}
        />
      )}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label =
          route.name === 'HomeTab'
            ? 'Home'
            : route.name === 'GoalsTab'
              ? 'Goals'
              : route.name === 'LiabilitiesTab'
                ? 'Liabilities'
              : route.name === 'BudgetTab'
                ? 'Budget'
                : route.name === 'SuggestionsTab'
                  ? 'AI'
                  : 'Profile';

        const onPress = () => {
          const now = Date.now();
          const previousTap = lastTapByRoute.current[route.key] ?? 0;
          lastTapByRoute.current[route.key] = now;
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (focused && now - previousTap < 320) {
            emitTabDoublePress(route.name as keyof AppTabParamList);
            return;
          }

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
      screenOptions={() => ({
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
        name="GoalsTab"
        component={GoalsScreen}
        options={{
          title: 'Goals',
        }}
      />
      <Tab.Screen
        name="LiabilitiesTab"
        component={LiabilitiesScreen}
        options={{
          title: 'Liabilities',
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
        name="SuggestionsTab"
        component={SuggestionsScreen}
        options={{
          title: 'AI',
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
    borderRadius: 16,
    paddingHorizontal: TAB_CONTAINER_HORIZONTAL_PADDING,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute',
    top: 7,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tabButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TAB_BUTTON_HORIZONTAL_PADDING,
    overflow: 'visible',
  },
  tabPill: {
    width: '100%',
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabLabelFocused: {
    color: colors.white,
  },
  tabLabelMuted: {
    color: colors.light,
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
      <Stack.Screen name="ReportPreview" component={ReportPreviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CompletedGoals" component={CompletedGoalsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ClearedLiabilities" component={ClearedLiabilitiesScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
