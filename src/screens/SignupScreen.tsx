import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
    View,
    Text,
    Image,
    TextInput,
    Pressable,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';

import { Colors, Radius, Spacing } from '../theme';
import { registerUser } from '../services/auth';
import logo from '../assets/logo.png';

interface Props {
    onNavigateLogin?: () => void;
}

export default function SignupScreen({ onNavigateLogin }: Props) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { width } = useWindowDimensions();
    const isDesktop = width >= 800;

    const handleSignup = async () => {
        setError('');

        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            setError('Please fill in all fields.');
            return;
        }

        if (password.length < 6) {
            setError('Password must contain at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            setLoading(true);

            await registerUser(name, email, password);

        } catch (err: any) {
            const messages: Record<string, string> = {
                'auth/email-already-in-use': 'This email is already registered.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/weak-password': 'Please choose a stronger password.',
                'auth/network-request-failed': 'Check your internet connection.',
            };

            setError(
                messages[err.code] || 'Registration failed. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView
            contentContainerStyle={[
                styles.container,
                isDesktop && styles.desktopContainer,
            ]}
            keyboardShouldPersistTaps="handled"
        >
            <View
                style={[
                    styles.brandPanel,
                    isDesktop && styles.desktopBrandPanel,
                ]}
            >
                <View style={styles.logoContainer}>
                    <Image
                        source={logo}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </View>

                <Text style={styles.brandName}>LinkUp</Text>

                <Text style={styles.brandTitle}>
                    Your people.{'\n'}Your moments.
                </Text>

                <Text style={styles.brandDescription}>
                    Start building connections and sharing your world.
                </Text>
            </View>

            <View
                style={[
                    styles.formPanel,
                    isDesktop && styles.desktopFormPanel,
                ]}
            >
                <View style={styles.formContent}>
                    <Text style={styles.welcomeLabel}>JOIN LINKUP</Text>

                    <Text style={styles.heading}>Create account</Text>

                    <Text style={styles.subheading}>
                        Your next connection starts here.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full name</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Your name"
                            placeholderTextColor="#A59BA7"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email address</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor="#A59BA7"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="At least 6 characters"
                            placeholderTextColor="#A59BA7"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.passwordHeader}>
                            <Text style={styles.label}>Confirm password</Text>

                            <Pressable
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.showText}>
                                    {showPassword ? 'Hide passwords' : 'Show passwords'}
                                </Text>
                            </Pressable>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Enter password again"
                            placeholderTextColor="#A59BA7"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                            onSubmitEditing={handleSignup}
                        />
                    </View>

                    {error !== '' && (
                        <Text style={styles.error}>{error}</Text>
                    )}

                    <Pressable
                        onPress={handleSignup}
                        disabled={loading}
                        style={({ pressed }) => [
                            styles.signupButton,
                            pressed && styles.pressed,
                            loading && styles.disabled,
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.signupButtonText}>
                                Create account
                            </Text>
                        )}
                    </Pressable>

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>
                            Already have an account?
                        </Text>

                        <Pressable onPress={onNavigateLogin}>
                            <Text style={styles.loginLink}> Sign in</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.bottomText}>
                        Made for connections that matter.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );

}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: Colors.background,
    },

    brandPanel: {
        backgroundColor: Colors.primaryDark,
        padding: 32,
        minHeight: 230,
        justifyContent: 'center',
    },

    logoContainer: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },

    logo: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 27,
        color: Colors.primaryDark,
    },

    brandName: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 21,
        color: '#FFFFFF',
        marginTop: 10,
    },

    brandTitle: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 30,
        lineHeight: 36,
        color: '#FFFFFF',
        marginTop: 15,
    },

    brandDescription: {
        fontFamily: 'Lato',
        fontSize: 14,
        color: Colors.accent,
        marginTop: 10,
    },

    formPanel: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 40,
    },

    formContent: {
        width: '100%',
        maxWidth: 420,
    },

    welcomeLabel: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 2,
        color: Colors.secondary,
    },

    heading: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 34,
        color: Colors.text,
        marginTop: 10,
    },

    subheading: {
        fontFamily: 'Lato',
        fontSize: 15,
        color: Colors.textSecondary,
        marginTop: 8,
        marginBottom: 30,
    },

    inputGroup: {
        marginBottom: 20,
    },

    label: {
        fontFamily: 'Lato',
        fontWeight: '700',
        fontSize: 14,
        color: Colors.text,
        marginBottom: 9,
    },

    input: {
        height: 52,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.medium,
        backgroundColor: Colors.surface,
        paddingHorizontal: 15,
        fontFamily: 'Lato',
        fontSize: 15,
        color: Colors.text,
        outlineStyle: 'none',
    } as any,

    passwordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    showText: {
        fontFamily: 'Lato',
        fontWeight: '700',
        fontSize: 12,
        color: Colors.primary,
        marginBottom: 9,
    },

    error: {
        fontFamily: 'Lato',
        fontSize: 13,
        color: Colors.danger,
        marginBottom: 15,
    },

    signupButton: {
        height: 54,
        borderRadius: Radius.medium,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },

    signupButtonText: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 16,
        color: '#FFFFFF',
    },

    pressed: {
        opacity: 0.85,
    },

    disabled: {
        opacity: 0.7,
    },

    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 28,
    },

    loginText: {
        fontFamily: 'Lato',
        fontSize: 14,
        color: Colors.textSecondary,
    },

    loginLink: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 14,
        color: Colors.primary,
    },

    bottomText: {
        fontFamily: 'Lato',
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 45,
    },

    logoImage: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    desktopContainer: {
        flexDirection: 'row',
        minHeight: '100%',
    },

    desktopBrandPanel: {
        flex: 1,
        minHeight: '100%',
        paddingHorizontal: 55,
    },

    desktopFormPanel: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 50,
        paddingVertical: 50,
    },
});