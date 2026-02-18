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
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { Transaction } from '@/types/transaction';

export type RootStackParamList = {
  Index: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
  Income: { date?: string } | undefined;
  Expense: { date?: string } | undefined;
  Analytics: undefined;
  DailyTransaction: { date: string; transactions: Transaction[] };
  FullCalendar: { transactions: Transaction[]; selectedDate?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Index">
      <Stack.Screen
        name="Index"
        component={IndexScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Income"
        component={IncomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Expense"
        component={ExpenseScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="DailyTransaction"
        component={DailyTransactionScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="FullCalendar"
        component={FullCalendarScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
