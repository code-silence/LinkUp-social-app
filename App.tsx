import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { onAuthStateChanged, User } from 'firebase/auth';

import { auth } from './src/services/firebase';
import { logoutUser } from './src/services/auth';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';

import { Colors } from './src/theme';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) {
    return showSignup ? (
      <SignupScreen onNavigateLogin={() => setShowSignup(false)} />
    ) : (
      <LoginScreen onNavigateSignup={() => setShowSignup(true)} />
    );
  }

  return (
    <View style={styles.home}>
      <Text style={styles.logo}>LinkUp</Text>

      <Text style={styles.heading}>
        Welcome, {user.displayName || 'Friend'}!
      </Text>

      <Text style={styles.email}>{user.email}</Text>

      <Pressable style={styles.logout} onPress={logoutUser}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  home: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    backgroundColor: Colors.background,
  },

  logo: {
    fontFamily: 'Lato',
    fontWeight: '900',
    fontSize: 36,
    color: Colors.primary,
  },

  heading: {
    fontFamily: 'Lato',
    fontWeight: '700',
    fontSize: 25,
    color: Colors.text,
    marginTop: 20,
  },

  email: {
    fontFamily: 'Lato',
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
  },

  logout: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 35,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 30,
  },

  logoutText: {
    fontFamily: 'Lato',
    fontWeight: '700',
    color: '#FFFFFF',
  },
});