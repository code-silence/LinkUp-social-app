
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TextInput,
    Pressable,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    useWindowDimensions,
    Animated,
    Easing,
} from 'react-native';

import { Colors, Radius } from '../theme';
import { loginUser, resetPassword } from '../services/auth';

import logo from '../assets/logo.png';

// LETTER-BY-LETTER ANIMATION

interface AnimatedLettersProps {
    text: string;
    style: any;
    duration?: number;
    stagger?: number;
    delay?: number;
    loop?: boolean;
    pop?: boolean;
}

function AnimatedLetters({
    text,
    style,
    duration = 300,
    stagger = 80,
    delay = 0,
    loop = false,
    pop = false,
}: AnimatedLettersProps) {
    const letters = Array.from(text);

    const animations = useRef(
        letters.map(() => new Animated.Value(0))
    ).current;

    const scale = useRef(
        new Animated.Value(pop ? 0.5 : 1)
    ).current;

    useEffect(() => {
        const reveal = () =>
            Animated.stagger(
                stagger,
                animations.map(value =>
                    Animated.timing(value, {
                        toValue: 1,
                        duration,
                        useNativeDriver: true,
                    })
                )
            );

        const initialAnimation = Animated.sequence([
            Animated.delay(delay),

            ...(pop
                ? [
                    Animated.spring(scale, {
                        toValue: 1,
                        speed: 12,
                        bounciness: 14,
                        useNativeDriver: true,
                    }),
                ]
                : []),

            reveal(),
        ]);

        let repeatAnimation: Animated.CompositeAnimation | undefined;

        initialAnimation.start(({ finished }) => {
            if (finished && loop) {
                repeatAnimation = Animated.loop(
                    Animated.sequence([
                        Animated.delay(5000),

                        Animated.parallel(
                            animations.map(value =>
                                Animated.timing(value, {
                                    toValue: 0,
                                    duration: 1,
                                    useNativeDriver: true,
                                })
                            )
                        ),

                        reveal(),
                    ])
                );

                repeatAnimation.start();
            }
        });

        return () => {
            initialAnimation.stop();
            repeatAnimation?.stop();
        };
    }, []);

    return (
        <Animated.View
            style={{
                transform: [{ scale }],
            }}
        >
            <Animated.Text style={style}>
                {letters.map((letter, index) => (
                    <Animated.Text
                        key={index}
                        style={{ opacity: animations[index] }}
                    >
                        {letter === ' ' ? '\u00A0' : letter}
                    </Animated.Text>
                ))}
            </Animated.Text>
        </Animated.View>
    );
}

// SIMPLE FADE-IN ANIMATION

function AnimatedFadeIn({
    children,
    delay = 0,
}: {
    children: React.ReactNode;
    delay?: number;
}) {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.sequence([
            Animated.delay(delay),

            Animated.timing(opacity, {
                toValue: 1,
                duration: 1200,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]);

        animation.start();

        return () => animation.stop();
    }, []);

    return (
        <Animated.View style={{ opacity }}>
            {children}
        </Animated.View>
    );
}

// LOGIN SCREEN

interface LoginScreenProps {
    onNavigateSignup?: () => void;
}

export default function LoginScreen({
    onNavigateSignup,
}: LoginScreenProps) {
    const { width } = useWindowDimensions();
    const isWide = width >= 800;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'error' | 'success'>('error');

    // SCREEN ANIMATIONS

    const formAnim = useRef(new Animated.Value(0)).current;
    const circleAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(formAnim, {
            toValue: 1,
            duration: 1000,
            delay: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();

        const floatingAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(circleAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),

                Animated.timing(circleAnim, {
                    toValue: 0,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        floatingAnimation.start();

        return () => floatingAnimation.stop();
    }, []);

    const showMessage = (
        text: string,
        type: 'error' | 'success' = 'error'
    ) => {
        setMessage(text);
        setMessageType(type);
    };

    // LOGIN

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            showMessage('Please enter your email and password.');
            return;
        }

        try {
            setLoading(true);
            setMessage('');

            await loginUser(email, password);

            showMessage('Welcome back! Redirecting...', 'success');
        } catch (error: any) {
            const errorMessages: Record<string, string> = {
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/invalid-credential': 'Incorrect email or password.',
                'auth/user-disabled': 'This account has been disabled.',
                'auth/too-many-requests': 'Too many attempts. Try again later.',
                'auth/network-request-failed': 'Network error. Check your connection.',
            };

            showMessage(
                errorMessages[error.code] || 'Something went wrong. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    };

    // FORGOT PASSWORD

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            showMessage('Enter your email address first.');
            return;
        }

        try {
            await resetPassword(email);

            showMessage(
                'Password reset email sent. Check your inbox.',
                'success'
            );
        } catch (error: any) {
            const errorMessages: Record<string, string> = {
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/user-not-found': 'No account found with this email.',
                'auth/network-request-failed': 'Network error. Check your connection.',
            };

            showMessage(
                errorMessages[error.code] || 'Could not send reset email.',
            );
        }
    };

    // BUTTON ANIMATION

    const animateButton = (pressed: boolean) => {
        Animated.spring(buttonScale, {
            toValue: pressed ? 0.97 : 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 5,
        }).start();
    };

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
                styles.container,
                isWide && styles.desktopContainer,
            ]}
            keyboardShouldPersistTaps="handled"
        >
            {/* BRANDING SECTION */}

            <View
                style={[
                    styles.brandPanel,
                    isWide ? styles.desktopBrand : styles.mobileBrand,
                ]}
            >
                {/* FLOATING CIRCLES */}

                <Animated.View
                    style={[
                        styles.decorCircleOne,
                        {
                            transform: [
                                {
                                    translateY: circleAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, 25],
                                    }),
                                },
                                {
                                    scale: circleAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 1.08],
                                    }),
                                },
                            ],
                        },
                    ]}
                />

                <Animated.View
                    style={[
                        styles.decorCircleTwo,
                        {
                            transform: [
                                {
                                    translateY: circleAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -20],
                                    }),
                                },
                            ],
                        },
                    ]}
                />

                <View style={styles.brandContent}>

                    {/* LOGO */}

                    <AnimatedFadeIn delay={0}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={logo}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                    </AnimatedFadeIn>

                    {/* BRAND NAME */}

                    <AnimatedLetters
                        text="LinkUp!"
                        style={styles.brandName}
                        duration={300}
                        stagger={90}
                        delay={1200}
                        pop
                        loop
                    />

                    {/* MOTTO */}

                    <AnimatedLetters
                        text={'Your world,\ncloser together.'}
                        style={styles.brandTitle}
                        duration={450}
                        stagger={75}
                        delay={2000}
                    />

                    {/* DESCRIPTION */}

                    <AnimatedFadeIn delay={4800}>
                        <Text style={styles.brandDescription}>
                            A place to connect, share moments, and build meaningful
                            connections with people who matter.
                        </Text>
                    </AnimatedFadeIn>

                    {/* FOOTER */}

                    {isWide && (
                        <AnimatedFadeIn delay={5600}>
                            <View style={styles.brandFooter}>
                                <View style={styles.brandDot} />

                                <Text style={styles.brandFooterText}>
                                    Connect beyond boundaries.
                                </Text>
                            </View>
                        </AnimatedFadeIn>
                    )}

                </View>
            </View>

            {/* LOGIN SECTION */}

            <View style={styles.formPanel}>
                <Animated.View
                    style={[
                        styles.formContent,
                        {
                            opacity: formAnim,
                            transform: [
                                {
                                    translateY: formAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [35, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <Text style={styles.welcomeLabel}>
                        WELCOME BACK
                    </Text>

                    <Text style={styles.heading}>
                        Sign in
                    </Text>

                    <Text style={styles.subheading}>
                        Pick up where you left off.
                    </Text>

                    {/* EMAIL */}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                            Email address
                        </Text>

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

                    {/* PASSWORD */}

                    <View style={styles.inputGroup}>
                        <View style={styles.passwordHeader}>
                            <Text style={styles.inputLabel}>
                                Password
                            </Text>

                            <Pressable onPress={handleForgotPassword}>
                                <Text style={styles.forgotText}>
                                    Forgot password?
                                </Text>
                            </Pressable>
                        </View>

                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Enter your password"
                                placeholderTextColor="#A59BA7"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                onSubmitEditing={handleLogin}
                            />

                            <Pressable
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.showButton}
                            >
                                <Text style={styles.showText}>
                                    {showPassword ? 'Hide' : 'Show'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* MESSAGE */}

                    {message !== '' && (
                        <Text
                            style={[
                                styles.message,
                                messageType === 'success'
                                    ? styles.successMessage
                                    : styles.errorMessage,
                            ]}
                        >
                            {message}
                        </Text>
                    )}

                    {/* LOGIN BUTTON */}

                    <Pressable
                        onPress={handleLogin}
                        onPressIn={() => animateButton(true)}
                        onPressOut={() => animateButton(false)}
                        disabled={loading}
                    >
                        <Animated.View
                            style={[
                                styles.loginButton,
                                {
                                    transform: [{ scale: buttonScale }],
                                },
                                loading && styles.buttonDisabled,
                            ]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>
                                    Sign in
                                </Text>
                            )}
                        </Animated.View>
                    </Pressable>

                    {/* SIGNUP */}

                    <View style={styles.signupContainer}>
                        <Text style={styles.signupText}>
                            Don't have an account?
                        </Text>

                        <Pressable onPress={onNavigateSignup}>
                            <Text style={styles.signupLink}>
                                {' '}Create account
                            </Text>
                        </Pressable>
                    </View>

                    <Text style={styles.bottomText}>
                        Made for connections that matter.
                    </Text>
                </Animated.View>
            </View>
        </ScrollView>
    );
}

// STYLES

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        minHeight: '100vh',
        backgroundColor: Colors.background,
    },

    desktopContainer: {
        flexDirection: 'row',
        minHeight: '100vh',
    },

    // BRANDING

    brandPanel: {
        backgroundColor: Colors.primaryDark,
        overflow: 'hidden',
        justifyContent: 'center',
        padding: 40,
    },

    desktopBrand: {
        width: '45%',
        minHeight: '100%',
    },

    mobileBrand: {
        minHeight: 245,
        paddingHorizontal: 28,
        paddingVertical: 35,
    },

    brandContent: {
        zIndex: 2,
        maxWidth: 480,
    },

    logoContainer: {
        width: 48,
        height: 48,
        borderRadius: 15,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },

    logoImage: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },

    brandName: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 23,
        color: '#FFFFFF',
        marginBottom: 35,
    },

    brandTitle: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 42,
        lineHeight: 49,
        color: '#FFFFFF',
        marginBottom: 18,
    },

    brandDescription: {
        fontFamily: 'Lato',
        fontSize: 16,
        lineHeight: 26,
        color: '#D8C5E8',
        maxWidth: 390,
    },

    brandFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 65,
    },

    brandDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.accent,
        marginRight: 10,
    },

    brandFooterText: {
        fontFamily: 'Lato',
        fontSize: 13,
        color: '#D8C5E8',
    },

    decorCircleOne: {
        position: 'absolute',
        width: 350,
        height: 350,
        borderRadius: 175,
        borderWidth: 1,
        borderColor: 'rgba(216,197,232,0.12)',
        right: -150,
        top: -100,
    },

    decorCircleTwo: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        borderWidth: 1,
        borderColor: 'rgba(216,197,232,0.12)',
        right: -100,
        bottom: -100,
    },

    // FORM

    formPanel: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 55,
        backgroundColor: Colors.background,
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
        marginBottom: 12,
    },

    heading: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 38,
        color: Colors.text,
    },

    subheading: {
        fontFamily: 'Lato',
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 8,
        marginBottom: 38,
    },

    inputGroup: {
        marginBottom: 24,
    },

    inputLabel: {
        fontFamily: 'Lato',
        fontWeight: '700',
        fontSize: 14,
        color: Colors.text,
        marginBottom: 10,
    },

    input: {
        height: 54,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.medium,
        paddingHorizontal: 16,
        fontFamily: 'Lato',
        fontSize: 15,
        color: Colors.text,
        backgroundColor: Colors.surface,
        outlineStyle: 'none',
    } as any,

    passwordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    forgotText: {
        fontFamily: 'Lato',
        fontWeight: '700',
        fontSize: 13,
        color: Colors.primary,
        marginBottom: 10,
    },

    passwordContainer: {
        height: 54,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.medium,
        backgroundColor: Colors.surface,
        paddingHorizontal: 16,
    },

    passwordInput: {
        flex: 1,
        height: '100%',
        fontFamily: 'Lato',
        fontSize: 15,
        color: Colors.text,
        outlineStyle: 'none',
    } as any,

    showButton: {
        paddingLeft: 12,
        paddingVertical: 8,
    },

    showText: {
        fontFamily: 'Lato',
        fontWeight: '700',
        fontSize: 13,
        color: Colors.primary,
    },

    message: {
        fontFamily: 'Lato',
        fontSize: 13,
        marginBottom: 16,
        lineHeight: 20,
    },

    errorMessage: {
        color: Colors.danger,
    },

    successMessage: {
        color: Colors.success,
    },

    // BUTTON

    loginButton: {
        height: 54,
        backgroundColor: Colors.primary,
        borderRadius: Radius.medium,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
    },

    loginButtonText: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 16,
        color: '#FFFFFF',
    },

    buttonDisabled: {
        opacity: 0.7,
    },

    // SIGNUP

    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 30,
    },

    signupText: {
        fontFamily: 'Lato',
        fontSize: 14,
        color: Colors.textSecondary,
    },

    signupLink: {
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
        marginTop: 65,
    },
});
