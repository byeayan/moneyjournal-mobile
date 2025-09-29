import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import IndexScreen from '@/screens/IndexScreen';
import LoginScreen from '@/screens/LoginScreen';
import SignupScreen from '@/screens/SignupScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import IncomeScreen from '@/screens/IncomeScreen';
import ExpenseScreen from '@/screens/ExpenseScreen';
import DailyTransactionScreen from '@/screens/DailyTransactionScreen';
import FullCalendarScreen from '@/screens/FullCalendarScreen'; // <-- new screen

import type { Transaction } from '@/screens/DashboardScreen';

export type RootStackParamList = {
  Index: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Income: undefined;
  Expense: undefined;
  DailyTransaction: { date: string; transactions: Transaction[] };
  FullCalendar: { transactions: Transaction[] }; // <-- added
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Index">
      {/* Landing screen */}
      <Stack.Screen
        name="Index"
        component={IndexScreen}
        options={{ headerShown: false }}
      />

      {/* Auth screens */}
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

      {/* Main App screens */}
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
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

      {/* Daily Transaction screen */}
      <Stack.Screen
        name="DailyTransaction"
        component={DailyTransactionScreen}
        options={{ headerShown: false }}
      />

      {/* Full Calendar screen */}
      <Stack.Screen
        name="FullCalendar"
        component={FullCalendarScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
