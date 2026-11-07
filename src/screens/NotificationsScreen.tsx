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
    markNotificationAsRead,
    deleteNotification 
} from '../services/notifications';

interface NotificationsScreenProps {
    user: User;
    onViewProfile: (userId: string) => void;
    onViewPost: (postId: string) => void;
}

/**
 * Format Firestore timestamp into a relative time string (e.g. "5m ago", "2h ago", "3d ago")
 */
const formatNotificationTime = (value: unknown) => {
    if (!value) return '';

    try {
        const date =
            typeof (value as any).toDate === 'function'
                ? (value as any).toDate()
                : new Date(value as string);

        if (Number.isNaN(date.getTime())) return '';

        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        const years = Math.floor(months / 12);
        return `${years}y ago`;
    } catch {
        return '';
    }
};

export default function NotificationsScreen({ 
    user, 
    onViewProfile, 
    onViewPost 
}: NotificationsScreenProps) {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

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

    // Handle clicking a notification card
    const handlePressNotification = async (item: AppNotification) => {
        setActiveMenuId(null);
        if (!item.read) {
            await markNotificationAsRead(user.uid, item.id);
        }

        if (item.postId) {
            onViewPost(item.postId);
        } else if (item.senderId) {
            onViewProfile(item.senderId);
        }
    };

    // Handle marking a notification as read
    const handleMarkAsRead = async (notificationId: string, event: any) => {
        event.stopPropagation();
        setActiveMenuId(null);
        try {
            await markNotificationAsRead(user.uid, notificationId);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    // Handle deleting a notification
    const handleDelete = async (notificationId: string, event: any) => {
        event.stopPropagation();
        setActiveMenuId(null);
        try {
            await deleteNotification(user.uid, notificationId);
        } catch (error) {
            console.error('Error deleting notification:', error);
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
                    {notifications.map((item, index) => {
                        const senderName = item.senderName || 'User';
                        const timeAgo = formatNotificationTime(item.createdAt);
                        const isMenuOpen = activeMenuId === item.id;

                        // Give higher zIndex to items appearing earlier in the list so their dropdowns sit above subsequent cards
                        const dynamicZIndex = notifications.length - index;

                        return (
                            <Pressable
                                key={item.id}
                                style={[
                                    styles.notificationCard, 
                                    !item.read && styles.unreadCard,
                                    { zIndex: isMenuOpen ? 9999 : dynamicZIndex }
                                ]}
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

                                    {!!timeAgo && (
                                        <Text style={styles.timeText}>{timeAgo}</Text>
                                    )}
                                </View>

                                {!item.read && <View style={styles.unreadDot} />}

                                {/* Three Dots Options Button & Dropdown Menu */}
                                <View style={styles.menuContainer}>
                                    <Pressable
                                        style={styles.dotsButton}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(isMenuOpen ? null : item.id);
                                        }}
                                    >
                                        <Text style={styles.dotsText}>⋮</Text>
                                    </Pressable>

                                    {isMenuOpen && (
                                        <View style={styles.dropdownMenu}>
                                            <Pressable
                                                style={styles.dropdownItem}
                                                onPress={(e) => handleMarkAsRead(item.id, e)}
                                            >
                                                <Text style={styles.dropdownText}>
                                                    {item.read ? 'Mark as read' : 'Mark as read'}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                style={styles.dropdownItem}
                                                onPress={(e) => handleDelete(item.id, e)}
                                            >
                                                <Text style={[styles.dropdownText, styles.deleteText]}>Delete</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
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
        gap: Spacing.md,
        paddingBottom: 100, // Extra padding at the bottom so dropdown menus are fully visible
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
        overflow: 'visible', // Allows dropdown menu to overflow outside card bounds cleanly
        position: 'relative',
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
    timeText: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: Radius.round,
        backgroundColor: Colors.primary,
    },
    menuContainer: {
        position: 'relative',
        zIndex: 100,
    },
    dotsButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.round,
    },
    dotsText: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: Colors.textSecondary,
    },
    dropdownMenu: {
        position: 'absolute',
        right: 0,
        top: 36, // Opens downwards right below the 3-dot button
        backgroundColor: Colors.surface,
        borderRadius: Radius.medium,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.text,
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 10,
        minWidth: 135,
        zIndex: 1000,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    dropdownText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.text,
    },
    deleteText: {
        color: Colors.danger,
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