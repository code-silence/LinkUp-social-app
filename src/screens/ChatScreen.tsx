
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Image,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    useWindowDimensions,
} from 'react-native';
import { User } from 'firebase/auth';
import { Search, MessageCircle } from 'lucide-react-native';

import { UserProfile, getUserProfile } from '../services/user';
import { Chat, subscribeToChats } from '../services/chat';
import { Colors, Fonts, Radius, Spacing } from '../theme';

interface ChatScreenProps {
    user: User;
    onOpenConversation: (
        chatId: string,
        otherUser: UserProfile,
    ) => void;
}

interface ChatListItem {
    chat: Chat;
    otherUser: UserProfile;
}

export default function ChatScreen({
    user,
    onOpenConversation,
}: ChatScreenProps) {
    const { width } = useWindowDimensions();
    const isMobile = width < 700;

    const [chats, setChats] = useState<Chat[]>([]);
    const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const profileCache = useRef<Record<string, UserProfile>>({});
    const pendingProfiles = useRef<Map<string, Promise<UserProfile | null>>>(
        new Map(),
    );

    useEffect(() => {
        let active = true;

        const unsubscribe = subscribeToChats(
            user.uid,
            async (chatList) => {
                if (!active) return;

                setChats(chatList);
                setError('');
                setLoading(false);

                const otherUserIds = chatList
                    .map(chat => chat.participants.find(id => id !== user.uid))
                    .filter((id): id is string => Boolean(id));

                const missingIds = otherUserIds.filter(
                    id => !profileCache.current[id],
                );

                await Promise.all(
                    missingIds.map(async (uid) => {
                        if (!pendingProfiles.current.has(uid)) {
                            const request = getUserProfile(uid);
                            pendingProfiles.current.set(uid, request);
                        }

                        try {
                            const profile = await pendingProfiles.current.get(uid);

                            if (profile) {
                                profileCache.current[uid] = profile;
                            }
                        } catch (err) {
                            console.error('Could not load chat profile:', err);
                        } finally {
                            pendingProfiles.current.delete(uid);
                        }
                    }),
                );

                if (active) {
                    setProfiles({ ...profileCache.current });
                }
            },
            (err) => {
                console.error('Chat subscription error:', err);

                if (active) {
                    setError('Could not load conversations. Please try again.');
                    setLoading(false);
                }
            },
        );

        return () => {
            active = false;
            unsubscribe();
        };
    }, [user.uid]);

    const getDisplayName = (profile: UserProfile) => {
        return (
            profile.name ||
            profile.username ||
            profile.email?.split('@')[0] ||
            'Unknown User'
        );
    };

    const formatMessageTime = (timestamp: Chat['lastMessageAt']) => {
        if (!timestamp) return '';

        const date = timestamp.toDate();
        const now = new Date();

        const isToday = date.toDateString() === now.toDateString();

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
        }

        if (isYesterday) return 'Yesterday';

        return date.toLocaleDateString([], {
            day: 'numeric',
            month: 'short',
        });
    };

    const conversationItems = useMemo(() => {
        return chats
            .map(chat => {
                const otherUserId = chat.participants.find(
                    id => id !== user.uid,
                );

                if (!otherUserId) return null;

                const otherUser = profiles[otherUserId];

                if (!otherUser) return null;

                return {
                    chat,
                    otherUser,
                };
            })
            .filter((item): item is ChatListItem => item !== null)
            .filter(({ otherUser, chat }) => {
                const search = searchQuery.trim().toLowerCase();

                if (!search) return true;

                const name = getDisplayName(otherUser).toLowerCase();
                const username = (otherUser.username || '').toLowerCase();

                return (
                    name.includes(search) ||
                    username.includes(search) ||
                    chat.lastMessage.toLowerCase().includes(search)
                );
            });
    }, [chats, profiles, searchQuery, user.uid]);

    const renderAvatar = (profile: UserProfile) => {
        const name = getDisplayName(profile);

        if (profile.photoURL) {
            return (
                <Image
                    source={{ uri: profile.photoURL }}
                    style={styles.avatar}
                />
            );
        }

        return (
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                    {name.substring(0, 2).toUpperCase()}
                </Text>
            </View>
        );
    };

    const renderConversation = ({ item }: { item: ChatListItem }) => {
        const { chat, otherUser } = item;

        const unreadCount = chat.unreadCounts?.[user.uid] || 0;

        const lastMessage = chat.lastMessage
            ? chat.lastMessageSenderId === user.uid
                ? `You: ${chat.lastMessage}`
                : chat.lastMessage
            : 'Start a conversation';

        return (
            <Pressable
                style={({ hovered }: any) => [
                    styles.conversationItem,
                    hovered && styles.conversationItemHovered,
                ]}
                onPress={() => onOpenConversation(chat.id, otherUser)}
            >
                {renderAvatar(otherUser)}

                <View style={styles.conversationDetails}>
                    <View style={styles.conversationTop}>
                        <Text
                            style={styles.userName}
                            numberOfLines={1}
                        >
                            {getDisplayName(otherUser)}
                        </Text>

                        <Text style={styles.messageTime}>
                            {formatMessageTime(chat.lastMessageAt)}
                        </Text>
                    </View>

                    <View style={styles.conversationBottom}>
                        <Text
                            style={[
                                styles.lastMessage,
                                unreadCount > 0 && styles.unreadMessage,
                            ]}
                            numberOfLines={1}
                        >
                            {lastMessage}
                        </Text>

                        {unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.content,
                    isMobile && styles.contentMobile,
                ]}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.heading}>Messages</Text>
                        <Text style={styles.subtitle}>
                            Your conversations in one place.
                        </Text>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <Search
                        size={19}
                        color={Colors.textSecondary}
                    />

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search conversations..."
                        placeholderTextColor={Colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator
                            size="large"
                            color={Colors.primary}
                        />
                        <Text style={styles.infoText}>
                            Loading conversations...
                        </Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : conversationItems.length > 0 ? (
                    <FlatList
                        data={conversationItems}
                        keyExtractor={item => item.chat.id}
                        renderItem={renderConversation}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <MessageCircle
                                size={32}
                                color={Colors.primary}
                            />
                        </View>

                        <Text style={styles.emptyTitle}>
                            No conversations yet
                        </Text>

                        <Text style={styles.emptyDescription}>
                            {searchQuery
                                ? 'No conversations match your search.'
                                : 'Start chatting with your friends to see your conversations here.'}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    content: {
        width: '100%',
        maxWidth: 950,
        alignSelf: 'center',
        flex: 1,
        padding: Spacing.xl,
    },

    contentMobile: {
        padding: Spacing.md,
    },

    header: {
        marginBottom: Spacing.lg,
    },

    heading: {
        fontFamily: Fonts.black,
        fontSize: 26,
        color: Colors.text,
    },

    subtitle: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.medium,
        paddingHorizontal: Spacing.md,
        height: 48,
        marginBottom: Spacing.lg,
        gap: Spacing.sm,
    },

    searchInput: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.text,
        outlineStyle: 'none',
    } as any,

    listContent: {
        paddingBottom: Spacing.xl,
    },

    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: Radius.medium,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
        gap: Spacing.md,
    },

    conversationItemHovered: {
        borderColor: Colors.secondary,
        backgroundColor: Colors.background,
    },

    avatar: {
        width: 54,
        height: 54,
        borderRadius: Radius.round,
        backgroundColor: Colors.accent,
    },

    avatarPlaceholder: {
        width: 54,
        height: 54,
        borderRadius: Radius.round,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatarInitial: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: Colors.primary,
    },

    conversationDetails: {
        flex: 1,
        minWidth: 0,
    },

    conversationTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },

    userName: {
        flex: 1,
        minWidth: 0,
        fontFamily: Fonts.bold,
        fontSize: 15,
        color: Colors.text,
    },

    messageTime: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
    },

    conversationBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },

    lastMessage: {
        flex: 1,
        minWidth: 0,
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
    },

    unreadMessage: {
        fontFamily: Fonts.bold,
        color: Colors.text,
    },

    unreadBadge: {
        minWidth: 21,
        height: 21,
        paddingHorizontal: 5,
        borderRadius: Radius.round,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    unreadBadgeText: {
        fontFamily: Fonts.bold,
        fontSize: 10,
        color: Colors.surface,
    },

    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },

    infoText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
    },

    errorText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.danger,
        textAlign: 'center',
    },

    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },

    emptyIcon: {
        width: 70,
        height: 70,
        borderRadius: Radius.round,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },

    emptyTitle: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },

    emptyDescription: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        maxWidth: 320,
        lineHeight: 21,
    },
});
