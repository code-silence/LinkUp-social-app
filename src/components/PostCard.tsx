import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '../theme';
import {
    addPostComment,
    Post,
    PostAuthor,
    PostComment,
    ReactionType,
    setPostReaction,
    subscribeToPostComments,
    subscribeToUserReaction,
} from '../services/posts';

interface Props {
    post: Post;
    currentUser: PostAuthor;
    onViewProfile?: (userId: string) => void;
}

const reactions: {
    type: ReactionType;
    label: string;
    symbol: string;
}[] = [
    { type: 'love', label: 'Love', symbol: '💖' },
    { type: 'haha', label: 'Haha', symbol: '😂' },
    { type: 'angry', label: 'Angry', symbol: '😡' },
    { type: 'clap', label: 'Clap', symbol: '👏' },
    { type: 'sad', label: 'Sad', symbol: '😢' },
];

const showMessage = (message: string) => {
    if (typeof window !== 'undefined') {
        window.alert(message);
    } else {
        Alert.alert('LinkUp', message);
    }
};

const formatPostDate = (value: unknown) => {
    if (!value) return '';

    try {
        const date =
            typeof (value as any).toDate === 'function'
                ? (value as any).toDate()
                : new Date(value as string);

        if (Number.isNaN(date.getTime())) return '';

        return date.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return '';
    }
};

function Avatar({
    author,
    size = 42,
}: {
    author: PostAuthor;
    size?: number;
}) {
    const initials = author.name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <View
            style={[
                styles.avatar,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                },
            ]}
        >
            {author.photoURL ? (
                <Image
                    source={{ uri: author.photoURL }}
                    style={styles.avatarImage}
                />
            ) : (
                <Text style={styles.avatarText}>
                    {initials || 'U'}
                </Text>
            )}
        </View>
    );
}

export default function PostCard({
    post,
    currentUser,
    onViewProfile,
}: Props) {
    const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [submittingReaction, setSubmittingReaction] = useState(false);

    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageScale, setImageScale] = useState(1);
    const [imageRatio, setImageRatio] = useState(1);

    useEffect(() => {
        return subscribeToUserReaction(
            post.id,
            currentUser.uid,
            setMyReaction,
        );
    }, [post.id, currentUser.uid]);

    useEffect(() => {
        if (!showComments) return;

        return subscribeToPostComments(
            post.id,
            setComments,
            error => console.error('Comment subscription error:', error),
        );
    }, [post.id, showComments]);

    const handleReaction = async (type: ReactionType) => {
        if (submittingReaction) return;

        setSubmittingReaction(true);
        setShowReactionPicker(false);

        try {
            await setPostReaction(
                post.id,
                post.authorId,
                currentUser,
                type,
            );
        } catch (error) {
            console.error('Reaction error:', error);
            showMessage('Could not update your reaction. Please try again.');
        } finally {
            setSubmittingReaction(false);
        }
    };

    const handleComment = async () => {
        const trimmedText = commentText.trim();

        if (!trimmedText || submittingComment) return;

        setSubmittingComment(true);

        try {
            await addPostComment(
                post.id,
                currentUser,
                trimmedText,
            );

            setCommentText('');
        } catch (error) {
            console.error('Comment error:', error);
            showMessage('Could not publish your comment. Please try again.');
        } finally {
            setSubmittingComment(false);
        }
    };

    const totalReactions = Object.values(
        post.reactionCounts || {},
    ).reduce((total, count) => total + (Number(count) || 0), 0);

    const selectedReaction = reactions.find(
        item => item.type === myReaction,
    );

    const openImageViewer = () => {
        setImageScale(1);
        setImageViewerVisible(true);
    };

    const closeImageViewer = () => {
        setImageViewerVisible(false);
        setImageScale(1);
    };

    return (
        <View style={styles.card}>
            {/* Author */}
            <View style={styles.postHeader}>
                <Pressable
                    style={styles.authorSection}
                    onPress={() => onViewProfile?.(post.authorId)}
                >
                    <Avatar author={post.author} />

                    <View style={styles.authorInfo}>
                        <Text style={styles.authorName}>
                            {post.author.name || 'LinkUp User'}
                        </Text>

                        <Text style={styles.authorUsername}>
                            @{post.author.username || 'user'}
                        </Text>

                        <Text style={styles.postDate}>
                            {formatPostDate(post.createdAt)}
                        </Text>
                    </View>
                </Pressable>
            </View>

            {/* Caption */}
            {!!post.text && (
                <Text style={styles.postText}>
                    {post.text}
                </Text>
            )}

            {/* Post image */}
            {!!post.imageURL && (
                <Pressable
                    onPress={openImageViewer}
                    style={styles.postImageContainer}
                >
                    <Image
                        source={{ uri: post.imageURL }}
                        style={[
                            styles.postImage,
                            { aspectRatio: imageRatio },
                        ]}
                        resizeMode="contain"
                        onLoad={(event) => {
                            const { width, height } = event.nativeEvent.source;

                            if (width && height) {
                                setImageRatio(width / height);
                            }
                        }}
                    />

                    <Text style={styles.imageHint}>
                        Tap image to enlarge
                    </Text>
                </Pressable>
            )}

            {/* Reaction and comment counts */}
            <View style={styles.countRow}>
                <Text style={styles.countText}>
                    {totalReactions} reactions
                </Text>

                <Pressable onPress={() => setShowComments(value => !value)}>
                    <Text style={styles.countText}>
                        {post.commentCount || 0} comments
                    </Text>
                </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Actions */}
            <View style={styles.actions}>
                <View style={styles.reactionAction}>
                    <Pressable
                        onPress={() => {
                            if (myReaction) {
                                handleReaction(myReaction);
                            } else {
                                setShowReactionPicker(value => !value);
                            }
                        }}
                        disabled={submittingReaction}
                        style={styles.actionButton}
                    >
                        {submittingReaction ? (
                            <ActivityIndicator
                                size="small"
                                color={Colors.primary}
                            />
                        ) : (
                            <Text
                                style={[
                                    styles.actionText,
                                    myReaction && styles.selectedActionText,
                                ]}
                            >
                                {selectedReaction
                                    ? `${selectedReaction.symbol} ${selectedReaction.label}`
                                    : 'React'}
                            </Text>
                        )}
                    </Pressable>

                    {showReactionPicker && (
                        <View style={styles.reactionPicker}>
                            {reactions.map(reaction => (
                                <Pressable
                                    key={reaction.type}
                                    onPress={() => handleReaction(reaction.type)}
                                    style={styles.reactionOption}
                                >
                                    <Text style={styles.reactionSymbol}>
                                        {reaction.symbol}
                                    </Text>
                                    <Text style={styles.reactionLabel}>
                                        {reaction.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                <Pressable
                    onPress={() => setShowComments(value => !value)}
                    style={styles.actionButton}
                >
                    <Text style={styles.actionText}>
                        Comment
                    </Text>
                </Pressable>
            </View>

            {/* Comments */}
            {showComments && (
                <View style={styles.commentsSection}>
                    <View style={styles.commentInputRow}>
                        <Avatar author={currentUser} size={34} />

                        <TextInput
                            value={commentText}
                            onChangeText={setCommentText}
                            placeholder="Write a comment..."
                            placeholderTextColor={Colors.textSecondary}
                            style={styles.commentInput}
                            multiline
                            maxLength={1000}
                        />

                        <Pressable
                            onPress={handleComment}
                            disabled={!commentText.trim() || submittingComment}
                            style={[
                                styles.sendButton,
                                (!commentText.trim() || submittingComment) &&
                                styles.sendButtonDisabled,
                            ]}
                        >
                            {submittingComment ? (
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.surface}
                                />
                            ) : (
                                <Text style={styles.sendButtonText}>
                                    Send
                                </Text>
                            )}
                        </Pressable>
                    </View>

                    {comments.map(comment => (
                        <View key={comment.id} style={styles.commentItem}>
                            <Avatar author={comment.author} size={34} />

                            <View style={styles.commentBubble}>
                                <Text style={styles.commentAuthor}>
                                    {comment.author.name}
                                </Text>

                                <Text style={styles.commentText}>
                                    {comment.text}
                                </Text>
                            </View>
                        </View>
                    ))}

                    {comments.length === 0 && (
                        <Text style={styles.noComments}>
                            No comments yet. Start the conversation.
                        </Text>
                    )}
                </View>
            )}

            {/* Full-screen image viewer */}
            <Modal
                visible={imageViewerVisible}
                transparent
                animationType="fade"
                onRequestClose={closeImageViewer}
            >
                <View style={styles.viewerOverlay}>
                    <Pressable
                        onPress={closeImageViewer}
                        style={styles.viewerClose}
                    >
                        <Text style={styles.viewerCloseText}>Close</Text>
                    </Pressable>

                    <View style={styles.viewerImageArea}>
                        <Image
                            source={{ uri: post.imageURL }}
                            style={[
                                styles.viewerImage,
                                { transform: [{ scale: imageScale }] },
                            ]}
                            resizeMode="contain"
                        />
                    </View>

                    <View style={styles.zoomControls}>
                        <Pressable
                            onPress={() =>
                                setImageScale(scale => Math.max(1, scale - 0.25))
                            }
                            style={styles.zoomButton}
                        >
                            <Text style={styles.zoomButtonText}>−</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setImageScale(1)}
                            style={styles.zoomButton}
                        >
                            <Text style={styles.zoomResetText}>Reset</Text>
                        </Pressable>

                        <Pressable
                            onPress={() =>
                                setImageScale(scale => Math.min(4, scale + 0.25))
                            }
                            style={styles.zoomButton}
                        >
                            <Text style={styles.zoomButtonText}>+</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.zoomLevel}>
                        {Math.round(imageScale * 100)}%
                    </Text>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.large,
        marginBottom: Spacing.md,
        overflow: 'visible',
    },
    postHeader: {
        padding: Spacing.md,
    },
    authorSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    avatar: {
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.primaryDark,
    },
    authorInfo: {
        flex: 1,
    },
    authorName: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.text,
    },
    authorUsername: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    postDate: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 3,
    },
    postText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        lineHeight: 22,
        color: Colors.text,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
    },
    postImageContainer: {
        width: '100%',
        backgroundColor: Colors.background,
        alignItems: 'center',
    },
    postImage: {
        width: '100%',
        maxHeight: 500,
    },
    imageHint: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        color: Colors.textSecondary,
        paddingVertical: Spacing.xs,
    },
    countRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    countText: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        minHeight: 46,
    },
    reactionAction: {
        position: 'relative',
        flex: 1,
        zIndex: 2,
    },
    actionButton: {
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.sm,
    },
    actionText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.textSecondary,
    },
    selectedActionText: {
        color: Colors.primary,
    },
    reactionPicker: {
        position: 'absolute',
        bottom: 48,
        left: 0,
        right: 0,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.medium,
        padding: Spacing.sm,
        gap: Spacing.xs,
        shadowColor: Colors.text,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 5,
    },
    reactionOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: 7,
        paddingHorizontal: Spacing.xs,
    },
    reactionSymbol: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.primary,
        width: 24,
        textAlign: 'center',
    },
    reactionLabel: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.text,
    },
    commentsSection: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        padding: Spacing.md,
        gap: Spacing.md,
    },
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    commentInput: {
        flex: 1,
        minHeight: 38,
        maxHeight: 90,
        backgroundColor: Colors.background,
        borderRadius: Radius.medium,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.text,
        outlineStyle: 'none',
    } as any,
    sendButton: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.medium,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        minHeight: 36,
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 11,
        color: Colors.surface,
    },
    commentItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    commentBubble: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: Radius.medium,
        padding: Spacing.sm,
    },
    commentAuthor: {
        fontFamily: Fonts.bold,
        fontSize: 11,
        color: Colors.text,
        marginBottom: 4,
    },
    commentText: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        lineHeight: 18,
        color: Colors.text,
    },
    noComments: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center',
        paddingVertical: Spacing.sm,
    },
    viewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.96)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerClose: {
        position: 'absolute',
        top: 25,
        right: 20,
        zIndex: 2,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.medium,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    viewerCloseText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: '#FFFFFF',
    },
    viewerImageArea: {
        width: '100%',
        height: '75%',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    viewerImage: {
        width: '100%',
        height: '100%',
    },
    zoomControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.lg,
    },
    zoomButton: {
        minWidth: 42,
        height: 42,
        paddingHorizontal: Spacing.sm,
        borderRadius: Radius.round,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 24,
        color: '#FFFFFF',
    },
    zoomResetText: {
        fontFamily: Fonts.bold,
        fontSize: 11,
        color: '#FFFFFF',
    },
    zoomLevel: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: '#FFFFFF',
        marginTop: Spacing.sm,
    },
});