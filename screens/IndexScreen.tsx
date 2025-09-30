import colors from '@/utils/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Index'>;

export default function IndexScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      {/* Middle content always centered */}
      <View style={styles.centerContent}>
        <Text style={styles.title}>MoneyJournal</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.outlinedButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.outlinedText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlinedButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.outlinedText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom image with gradient */}
      <View style={styles.imageWrapper}>
        <Image
          source={require('../assets/images/87b9a94f-7ef0-479d-9645-6219eed69c51.png')}
          style={styles.bottomImage}
          resizeMode="cover"
        />

        {/* Gradient fade at the top of image */}
        <LinearGradient
          colors={[colors.background, 'transparent']}
          style={styles.gradientOverlay}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center', // centers vertically
    alignItems: 'center', // centers horizontally
  },
  title: {
    fontSize: 32,
    marginBottom: 50,
    fontWeight: '700',
    color: colors.primary,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  outlinedButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    width: 200,
  },
  outlinedText: {
    color: colors.light,
    fontSize: 16,
    fontWeight: '600',
  },
  imageWrapper: {
    width: '100%',
    height: 200, // fixed height for bottom strip
    overflow: 'hidden',
    position: 'relative',
  },
  bottomImage: {
    width: '100%',
    height: '150%', // makes image taller than wrapper
    position: 'absolute',
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60, // height of fade
  },
});
