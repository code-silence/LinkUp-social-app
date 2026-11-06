import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    ActivityIndicator,
    StyleSheet,
    useWindowDimensions,
} from 'react-native';

import { User } from 'firebase/auth';
import { Colors, Fonts, Radius, Spacing } from '../theme';
import { 
    AppNotification, 
    subscribeToNotifications, 
    markNotificationAsRead 
} from '../services/notifications';

interface NotificationsScreenProps {
    user: User;
    onViewProfile: (userId: string) => void;
    onViewPost: (postId: string) => void;
}

export default function NotificationsScreen({ 
    user, 
    onViewProfile, 
    onViewPost 
}: NotificationsScreenProps) {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    // Subscribe to real-time notifications from Firestore
    useEffect(() => {
        const unsubscribe = subscribeToNotifications(
            user.uid,
            data => {
                setNotifications(data);
                setLoading(false);
            },
            error => {
                console.error('Error fetching notifications:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user.uid]);

    // Handle clicking a notification
    const handlePressNotification = async (item: AppNotification) => {
        if (!item.read) {
            await markNotificationAsRead(user.uid, item.id);
        }

        if (item.postId) {
            onViewPost(item.postId);
        } else if (item.senderId) {
            onViewProfile(item.senderId);
        }
    };

    const renderAvatar = (url?: string, name?: string) => {
        if (url) {
            return <Image source={{ uri: url }} style={styles.avatarImage} />;
        }
        return (
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                    {(name || 'U').substring(0, 2).toUpperCase()}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                <Text style={styles.headerSubtitle}>Stay updated with your community activities.</Text>
            </View>

            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.stateText}>Loading notifications...</Text>
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconWrapper}>
                        <Text style={styles.emptyIcon}>🔔</Text>
                    </View>
                    <Text style={styles.emptyTitle}>No notifications yet</Text>
                    <Text style={styles.emptyDescription}>
                        When someone likes or comments on your posts, you'll see it here.
                    </Text>
                </View>
            ) : (
                <ScrollView 
                    style={styles.scrollList} 
                    contentContainerStyle={[styles.listContent, isMobile && styles.listContentMobile]}
                    showsVerticalScrollIndicator={false}
                >
                    {notifications.map(item => {
                        const senderName = item.senderName || 'User';

                        return (
                            <Pressable
                                key={item.id}
                                style={[styles.notificationCard, !item.read && styles.unreadCard]}
                                onPress={() => handlePressNotification(item)}
                            >
                                <Pressable onPress={() => onViewProfile(item.senderId)}>
                                    <View style={styles.avatarWrapper}>
                                        {renderAvatar(item.senderPhotoURL, senderName)}
                                    </View>
                                </Pressable>

                                <View style={styles.notificationInfo}>
                                    <Text style={styles.notificationMessage} numberOfLines={2}>
                                        <Text style={styles.boldText}>{senderName} </Text>
                                        {item.message}
                                    </Text>
                                </View>

                               {!item.read && <View style={styles.unreadDot} />}
                            </Pressable>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: Spacing.xl,
    },
    header: {
        marginBottom: Spacing.xl,
    },
    headerTitle: {
        fontFamily: Fonts.black,
        fontSize: 24,
        color: Colors.text,
    },
    headerSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    scrollList: {
        flex: 1,
    },
    listContent: {
        maxWidth: 700,
        gap: Spacing.sm,
    },
    listContentMobile: {
        maxWidth: '100%',
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        gap: Spacing.md,
    },
    unreadCard: {
        backgroundColor: Colors.accent + '25',
        borderColor: Colors.primary + '40',
    },
    avatarWrapper: {
        width: 48,
        height: 48,
        borderRadius: Radius.round,
        overflow: 'hidden',
        backgroundColor: Colors.background,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontFamily: Fonts.black,
        fontSize: 16,
        color: Colors.primary,
    },
    notificationInfo: {
        flex: 1,
    },
    notificationMessage: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    boldText: {
        fontFamily: Fonts.bold,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: Radius.round,
        backgroundColor: Colors.primary,
    },
    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stateText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: Radius.round,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    emptyIcon: {
        fontSize: 28,
    },
    emptyTitle: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: Colors.text,
    },
    emptyDescription: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        maxWidth: 280,
    },
});