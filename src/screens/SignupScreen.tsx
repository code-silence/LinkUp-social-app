
import React, { useState, useEffect, useRef } from 'react';
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
    Animated,
    Easing,
} from 'react-native';

import { Colors, Radius } from '../theme';
import { registerUser } from '../services/auth';
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

// FADE-IN ANIMATION

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

// SIGNUP SCREEN

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

    // ANIMATION VALUES

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

    // SIGNUP FUNCTION - UNCHANGED

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
            contentContainerStyle={[
                styles.container,
                isDesktop && styles.desktopContainer,
            ]}
            keyboardShouldPersistTaps="handled"
        >
            {/* BRANDING SECTION */}

            <View
                style={[
                    styles.brandPanel,
                    isDesktop && styles.desktopBrandPanel,
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
                        text={'Your people.\nYour moments.'}
                        style={styles.brandTitle}
                        duration={450}
                        stagger={75}
                        delay={2000}
                    />

                    {/* DESCRIPTION */}

                    <AnimatedFadeIn delay={4800}>
                        <Text style={styles.brandDescription}>
                            Start building connections and sharing your world.
                        </Text>
                    </AnimatedFadeIn>

                    {/* FOOTER */}

                    {isDesktop && (
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

            {/* SIGNUP SECTION */}

            <View
                style={[
                    styles.formPanel,
                    isDesktop && styles.desktopFormPanel,
                ]}
            >
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
                        JOIN LINKUP
                    </Text>

                    <Text style={styles.heading}>
                        Create account
                    </Text>

                    <Text style={styles.subheading}>
                        Your next connection starts here.
                    </Text>

                    {/* NAME */}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Full name
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Your name"
                            placeholderTextColor="#A59BA7"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* EMAIL */}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
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
                        <Text style={styles.label}>
                            Password
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="At least 6 characters"
                            placeholderTextColor="#A59BA7"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>

                    {/* CONFIRM PASSWORD */}

                    <View style={styles.inputGroup}>
                        <View style={styles.passwordHeader}>
                            <Text style={styles.label}>
                                Confirm password
                            </Text>

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

                    {/* ERROR */}

                    {error !== '' && (
                        <Text style={styles.error}>
                            {error}
                        </Text>
                    )}

                    {/* SIGNUP BUTTON */}

                    <Pressable
                        onPress={handleSignup}
                        onPressIn={() => animateButton(true)}
                        onPressOut={() => animateButton(false)}
                        disabled={loading}
                    >
                        <Animated.View
                            style={[
                                styles.signupButton,
                                {
                                    transform: [{ scale: buttonScale }],
                                },
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
                        </Animated.View>
                    </Pressable>

                    {/* LOGIN LINK */}

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>
                            Already have an account?
                        </Text>

                        <Pressable onPress={onNavigateLogin}>
                            <Text style={styles.loginLink}>
                                {' '}Sign in
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
        backgroundColor: Colors.background,
    },

    desktopContainer: {
        flexDirection: 'row',
        minHeight: '100%',
    },

    // BRANDING

    brandPanel: {
        backgroundColor: Colors.primaryDark,
        padding: 32,
        minHeight: 230,
        justifyContent: 'center',
        overflow: 'hidden',
    },

    desktopBrandPanel: {
        flex: 1,
        minHeight: '100%',
        paddingHorizontal: 55,
    },

    brandContent: {
        zIndex: 2,
        maxWidth: 480,
    },

    logoContainer: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },

    logoImage: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },

    brandName: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 21,
        color: '#FFFFFF',
        marginTop: 0,
        marginBottom: 15,
    },

    brandTitle: {
        fontFamily: 'Lato',
        fontWeight: '900',
        fontSize: 30,
        lineHeight: 36,
        color: '#FFFFFF',
        marginTop: 0,
        marginBottom: 10,
    },

    brandDescription: {
        fontFamily: 'Lato',
        fontSize: 14,
        lineHeight: 22,
        color: Colors.accent,
        marginTop: 0,
    },

    brandFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 55,
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
        color: Colors.accent,
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
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 40,
        backgroundColor: Colors.background,
    },

    desktopFormPanel: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 50,
        paddingVertical: 50,
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

    // BUTTON

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

    disabled: {
        opacity: 0.7,
    },

    // LOGIN LINK

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
});
