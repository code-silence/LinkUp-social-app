
import React, { useEffect, useRef } from 'react';

import {
    Animated,
    Platform,
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

import { Colors } from '../theme';

interface ShineButtonProps {
    children: React.ReactNode;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    accessibilityLabel?: string;
}

const shineBands = [
    0.025,
    0.045,
    0.075,
    0.12,
    0.20,
    0.32,
    0.48,
    0.62,
    0.48,
    0.32,
    0.20,
    0.12,
    0.075,
    0.045,
    0.025,
];

export default function ShineButton({
    children,
    onPress,
    style,
    disabled = false,
    accessibilityLabel,
}: ShineButtonProps) {
    const shineAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.delay(4200),
                Animated.timing(shineAnimation, {
                    toValue: 1,
                    duration: 1100,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(shineAnimation, {
                    toValue: 0,
                    duration: 1,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]),
        );

        animation.start();

        return () => animation.stop();
    }, [shineAnimation]);

    const translateX = shineAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [-220, 520],
    });

    const shineOpacity = shineAnimation.interpolate({
        inputRange: [0, 0.12, 0.5, 0.88, 1],
        outputRange: [0, 1, 1, 1, 0],
    });

    return (
        <Pressable
            style={[styles.button, style]}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
        >
            <View style={styles.content}>
                {children}
            </View>

            {!disabled && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.shine,
                        {
                            opacity: shineOpacity,
                            transform: [
                                { translateX },
                                { skewX: '-22deg' },
                            ],
                        },
                    ]}
                >
                    {shineBands.map((opacity, index) => (
                        <View
                            key={index}
                            style={[
                                styles.shineBand,
                                { opacity },
                            ]}
                        />
                    ))}
                </Animated.View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        overflow: 'hidden',
    },

    content: {
        zIndex: 2,
    },

    shine: {
        position: 'absolute',
        top: -25,
        bottom: -25,
        left: 0,
        width: '55%',
        flexDirection: 'row',
        zIndex: 1,
    },

    shineBand: {
        flex: 1,
        height: '100%',
        backgroundColor: Colors.surface,
    },
});
