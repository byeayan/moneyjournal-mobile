import DailyTransactionScreen from '@/screens/DailyTransactionScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import ExpenseScreen from '@/screens/ExpenseScreen';
import FullCalendarScreen from '@/screens/FullCalendarScreen'; // <-- new screen
import IncomeScreen from '@/screens/IncomeScreen';
import IndexScreen from '@/screens/IndexScreen';
import LoginScreen from '@/screens/LoginScreen';
import SignupScreen from '@/screens/SignupScreen';
import colors from '@/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';

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
        options={({ navigation }) => ({
          title: 'Dashboard',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 28 },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                console.log('Logout button pressed');
                Alert.alert(
                  "Confirm Logout",
                  "Are you sure you want to log out?",
                  [
                    { text: "No", style: "cancel" },
                    { 
                      text: "Yes", 
                      onPress: () => navigation.reset({
                        index: 0,
                        routes: [{ name: 'Index' }],
                      })
                    },
                  ],
                  { cancelable: true }
                );
              }}
              style={{ padding: 8 }}
            >
              <Ionicons name="log-out-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          ),
        })}
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
