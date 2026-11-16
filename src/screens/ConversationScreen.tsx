
import React, { useEffect, useRef, useState } from 'react';
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
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { User } from 'firebase/auth';
import { ArrowLeft, Send } from 'lucide-react-native';

import { UserProfile } from '../services/user';
import {
    ChatMessage,
    subscribeToMessages,
    sendMessage,
    markMessagesSeen,
} from '../services/chat';
import { Colors, Fonts, Radius, Spacing } from '../theme';

interface ConversationScreenProps {
    user: User;
    chatId: string;
    otherUser: UserProfile;
    onBack: () => void;
}

export default function ConversationScreen({
    user,
    chatId,
    otherUser,
    onBack,
}: ConversationScreenProps) {
    const { width } = useWindowDimensions();
    const isMobile = width < 700;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const flatListRef = useRef<FlatList<ChatMessage>>(null);

    const displayName =
        otherUser.name ||
        otherUser.username ||
        otherUser.email?.split('@')[0] ||
        'Unknown User';

    // Subscribe to real-time messages.
    useEffect(() => {
        let active = true;

        setLoading(true);
        setError('');

        const unsubscribe = subscribeToMessages(
            chatId,
            (messageList) => {
                if (!active) return;

                setMessages(messageList);
                setLoading(false);

                // Opening a conversation marks incoming messages as seen.
                markMessagesSeen(chatId, user.uid).catch((err) => {
                    console.error('Could not mark messages as seen:', err);
                });
            },
            (err) => {
                console.error('Message subscription error:', err);

                if (active) {
                    setError('Could not load messages. Please try again.');
                    setLoading(false);
                }
            },
        );

        return () => {
            active = false;
            unsubscribe();
        };
    }, [chatId, user.uid]);

    // Scroll to the latest message.
    useEffect(() => {
        if (!loading && messages.length > 0) {
            const timeout = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

            return () => clearTimeout(timeout);
        }
    }, [messages, loading]);

    const formatMessageTime = (timestamp: ChatMessage['createdAt']) => {
        if (!timestamp) return '';

        return timestamp.toDate().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleSend = async () => {
        const text = messageText.trim();

        if (!text || sending) return;

        setSending(true);
        setError('');
        setMessageText('');

        try {
            await sendMessage(chatId, user.uid, text);
        } catch (err) {
            console.error('Message sending failed:', err);

            setMessageText(text);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not send your message.',
            );
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isMine = item.senderId === user.uid;

        let status = '';

        if (isMine) {
            if (item.seenAt) {
                status = 'Seen';
            } else if (item.deliveredAt) {
                status = 'Delivered';
            } else {
                status = 'Sent';
            }
        }

        return (
            <View
                style={[
                    styles.messageRow,
                    isMine && styles.myMessageRow,
                ]}
            >
                <View
                    style={[
                        styles.messageBubble,
                        isMine
                            ? styles.myMessageBubble
                            : styles.theirMessageBubble,
                    ]}
                >
                    <Text
                        style={[
                            styles.messageText,
                            isMine && styles.myMessageText,
                        ]}
                    >
                        {item.text}
                    </Text>

                    <View style={styles.messageFooter}>
                        <Text
                            style={[
                                styles.messageTimestamp,
                                isMine && styles.myMessageTimestamp,
                            ]}
                        >
                            {formatMessageTime(item.createdAt)}
                        </Text>

                        {isMine && (
                            <Text style={styles.messageStatus}>
                                {status}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const renderAvatar = () => {
        if (otherUser.photoURL) {
            return (
                <Image
                    source={{ uri: otherUser.photoURL }}
                    style={styles.headerAvatar}
                />
            );
        }

        return (
            <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                    {displayName.substring(0, 2).toUpperCase()}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={[
                styles.content,
                isMobile && styles.contentMobile,
            ]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        onPress={onBack}
                        style={styles.backButton}
                    >
                        <ArrowLeft
                            size={21}
                            color={Colors.text}
                        />
                    </Pressable>

                    {renderAvatar()}

                    <View style={styles.headerInfo}>
                        <Text
                            style={styles.headerName}
                            numberOfLines={1}
                        >
                            {displayName}
                        </Text>

                        <Text style={styles.headerUsername}>
                            {otherUser.username
                                ? `@${otherUser.username}`
                                : 'Conversation'}
                        </Text>
                    </View>
                </View>

                {/* Messages */}
                <View style={styles.messagesContainer}>
                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator
                                size="large"
                                color={Colors.primary}
                            />
                            <Text style={styles.infoText}>
                                Loading messages...
                            </Text>
                        </View>
                    ) : error && messages.length === 0 ? (
                        <View style={styles.centerContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id}
                            renderItem={renderMessage}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={[
                                styles.messageList,
                                messages.length === 0 &&
                                    styles.emptyMessageList,
                            ]}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyTitle}>
                                        Start a conversation
                                    </Text>
                                    <Text style={styles.emptyDescription}>
                                        Send your first message to {displayName}.
                                    </Text>
                                </View>
                            }
                            onContentSizeChange={() => {
                                flatListRef.current?.scrollToEnd({
                                    animated: true,
                                });
                            }}
                        />
                    )}
                </View>

                {/* Error */}
                {!!error && messages.length > 0 && (
                    <Text style={styles.sendError}>{error}</Text>
                )}

                {/* Message input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.messageInput}
                        placeholder="Write a message..."
                        placeholderTextColor={Colors.textSecondary}
                        value={messageText}
                        onChangeText={setMessageText}
                        multiline
                        maxLength={5000}
                        editable={!sending}
                        onSubmitEditing={handleSend}
                        blurOnSubmit={false}
                    />

                    <Pressable
                        onPress={handleSend}
                        disabled={!messageText.trim() || sending}
                        style={[
                            styles.sendButton,
                            (!messageText.trim() || sending) &&
                                styles.sendButtonDisabled,
                        ]}
                    >
                        {sending ? (
                            <ActivityIndicator
                                size="small"
                                color={Colors.surface}
                            />
                        ) : (
                            <Send
                                size={19}
                                color={Colors.surface}
                            />
                        )}
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    content: {
        flex: 1,
        width: '100%',
        maxWidth: 950,
        alignSelf: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
    },

    contentMobile: {
        paddingHorizontal: Spacing.md,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: Spacing.md,
    },

    backButton: {
        width: 38,
        height: 38,
        borderRadius: Radius.round,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
    },

    headerAvatar: {
        width: 43,
        height: 43,
        borderRadius: Radius.round,
        backgroundColor: Colors.accent,
    },

    headerAvatarPlaceholder: {
        width: 43,
        height: 43,
        borderRadius: Radius.round,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatarInitial: {
        fontFamily: Fonts.bold,
        fontSize: 15,
        color: Colors.primary,
    },

    headerInfo: {
        flex: 1,
        minWidth: 0,
    },

    headerName: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: Colors.text,
    },

    headerUsername: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },

    messagesContainer: {
        flex: 1,
        minHeight: 0,
    },

    messageList: {
        paddingVertical: Spacing.md,
        paddingHorizontal: 2,
    },

    emptyMessageList: {
        flexGrow: 1,
        justifyContent: 'center',
    },

    messageRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: Spacing.sm,
    },

    myMessageRow: {
        justifyContent: 'flex-end',
    },

    messageBubble: {
        maxWidth: '78%',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.large,
    },

    myMessageBubble: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 4,
    },

    theirMessageBubble: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderBottomLeftRadius: 4,
    },

    messageText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        lineHeight: 21,
        color: Colors.text,
    },

    myMessageText: {
        color: Colors.surface,
    },

    messageFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: 4,
    },

    messageTimestamp: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        color: Colors.textSecondary,
    },

    myMessageTimestamp: {
        color: Colors.accent,
    },

    messageStatus: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        color: Colors.accent,
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

    sendError: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.danger,
        marginBottom: Spacing.xs,
    },

    emptyContainer: {
        alignItems: 'center',
        padding: Spacing.xl,
    },

    emptyTitle: {
        fontFamily: Fonts.bold,
        fontSize: 17,
        color: Colors.text,
        marginBottom: Spacing.xs,
    },

    emptyDescription: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
        padding: Spacing.sm,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.large,
    },

    messageInput: {
        flex: 1,
        minHeight: 42,
        maxHeight: 110,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 10,
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.text,
        outlineStyle: 'none',
    } as any,

    sendButton: {
        width: 42,
        height: 42,
        borderRadius: Radius.round,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    sendButtonDisabled: {
        opacity: 0.45,
    },
});
