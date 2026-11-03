import React, { useEffect, useState } from 'react';

import {
    View,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';

import { onAuthStateChanged, User } from 'firebase/auth';

import { auth } from './src/services/firebase';
import { logoutUser } from './src/services/auth';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';

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
                <ActivityIndicator
                    size="large"
                    color={Colors.primary}
                />
            </View>
        );
    }

    if (!user) {
        return showSignup ? (
            <SignupScreen
                onNavigateLogin={() => setShowSignup(false)}
            />
        ) : (
            <LoginScreen
                onNavigateSignup={() => setShowSignup(true)}
            />
        );
    }

    return (
        <HomeScreen
            user={user}
            onLogout={logoutUser}
        />
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
});