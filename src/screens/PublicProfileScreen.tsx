
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Image,
    Pressable,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';

import { UserProfile, getUserProfile } from '../services/user';
import {
    Post,
    PostAuthor,
    subscribeToUserPosts,
} from '../services/posts';
import PostCard from '../components/PostCard';
import { Colors, Fonts, Radius, Spacing } from '../theme';

interface PublicProfileScreenProps {
    userId: string;
    onBack: () => void;
}

export default function PublicProfileScreen({
    userId,
    onBack,
}: PublicProfileScreenProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [recentPosts, setRecentPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [postsError, setPostsError] = useState('');

    useEffect(() => {
        let isActive = true;

        const loadProfile = async () => {
            setLoading(true);
            setError('');

            try {
                const data = await getUserProfile(userId);

                if (isActive) {
                    setProfile(data);
                }
            } catch (err) {
                console.error('Public profile error:', err);

                if (isActive) {
                    setError('Could not load this profile. Please try again.');
                }
            } finally {
                if (isActive) setLoading(false);
            }
        };

        loadProfile();

        return () => {
            isActive = false;
        };
    }, [userId]);

    useEffect(() => {
        setRecentPosts([]);
        setPostsLoading(true);
        setPostsError('');

        const unsubscribe = subscribeToUserPosts(
            userId,
            posts => {
                setRecentPosts(posts);
                setPostsLoading(false);
            },
            err => {
                console.error('Failed to load public profile posts:', err);
                setPostsError('Could not load this user’s posts.');
                setPostsLoading(false);
            },
        );

        return unsubscribe;
    }, [userId]);

    const displayName =
        profile?.name ||
        profile?.username ||
        'Unknown User';

    const renderInfo = (label: string, value?: string) => {
        if (!value?.trim()) return null;

        return (
            <View style={styles.infoRow} key={label}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        );
    };

    const renderList = (label: string, values?: string[]) => {
        if (!values?.length) return null;

        return (
            <View style={styles.infoSection} key={label}>
                <Text style={styles.sectionTitle}>{label}</Text>
                <View style={styles.chipContainer}>
                    {values.map((value, index) => (
                        <View style={styles.chip} key={`${value}-${index}`}>
                            <Text style={styles.chipText}>{value}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.statusText}>Loading profile...</Text>
            </View>
        );
    }

    if (error || !profile) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorTitle}>
                    {error ? 'Something went wrong' : 'Profile not found'}
                </Text>
                <Text style={styles.statusText}>
                    {error || 'This user profile may no longer exist.'}
                </Text>
                <Pressable style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>Go back</Text>
                </Pressable>
            </View>
        );
    }

    const postViewer: PostAuthor = {
        uid: profile.uid,
        name: profile.name,
        username: profile.username,
        photoURL: profile.photoURL,
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Pressable style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>Back to friends</Text>
            </Pressable>

            <View style={styles.profileCard}>
                {profile.coverPhotoURL ? (
                    <Image
                        source={{ uri: profile.coverPhotoURL }}
                        style={styles.cover}
                    />
                ) : (
                    <View style={styles.coverPlaceholder} />
                )}

                <View style={styles.profileHeader}>
                    {profile.photoURL ? (
                        <Image
                            source={{ uri: profile.photoURL }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {displayName.substring(0, 2).toUpperCase()}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.name}>{displayName}</Text>

                    {profile.username ? (
                        <Text style={styles.username}>
                            @{profile.username}
                        </Text>
                    ) : null}

                    {profile.bio ? (
                        <Text style={styles.bio}>{profile.bio}</Text>
                    ) : null}

                    <Text style={styles.friendCount}>
                        {profile.friendsCount || 0} friends
                    </Text>
                </View>
            </View>

            <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>About</Text>

                {renderInfo(
                    'Location',
                    [profile.city, profile.country].filter(Boolean).join(', '),
                )}
                {renderInfo('Hometown', profile.hometown)}
                {renderInfo('Education', profile.university)}
                {renderInfo('College', profile.college)}
                {renderInfo('Degree', profile.degree)}
                {renderInfo('High school', profile.highSchool)}
                {renderInfo('Work', profile.jobTitle)}
                {renderInfo('Workplace', profile.workplace)}
                {renderInfo('Website', profile.website)}

                {!profile.city &&
                    !profile.country &&
                    !profile.hometown &&
                    !profile.university &&
                    !profile.college &&
                    !profile.degree &&
                    !profile.highSchool &&
                    !profile.jobTitle &&
                    !profile.workplace &&
                    !profile.website && (
                        <Text style={styles.emptyInfo}>
                            No additional information available.
                        </Text>
                    )}
            </View>

            {(profile.interests?.length || profile.languages?.length) ? (
                <View style={styles.detailsCard}>
                    {renderList('Interests', profile.interests)}
                    {renderList('Languages', profile.languages)}
                </View>
            ) : null}

            {(profile.facebook || profile.instagram || profile.linkedin) ? (
                <View style={styles.detailsCard}>
                    <Text style={styles.sectionTitle}>Social links</Text>
                    {renderInfo('Facebook', profile.facebook)}
                    {renderInfo('Instagram', profile.instagram)}
                    {renderInfo('LinkedIn', profile.linkedin)}
                </View>
            ) : null}

            <View style={styles.recentPostsSection}>
                <Text style={styles.sectionTitle}>Recent Posts</Text>

                {postsLoading ? (
                    <View style={styles.postsState}>
                        <ActivityIndicator color={Colors.primary} />
                        <Text style={styles.statusText}>
                            Loading posts...
                        </Text>
                    </View>
                ) : postsError ? (
                    <Text style={styles.postsStateText}>{postsError}</Text>
                ) : recentPosts.length === 0 ? (
                    <Text style={styles.postsStateText}>
                        This user hasn't shared any posts yet.
                    </Text>
                ) : (
                    recentPosts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUser={postViewer}
                        />
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
        maxWidth: 900,
        width: '100%',
        alignSelf: 'center',
    },
    centerContainer: {
        flex: 1,
        minHeight: 350,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.background,
    },
    statusText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.md,
    },
    errorTitle: {
        fontFamily: Fonts.black,
        fontSize: 20,
        color: Colors.text,
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.accent,
        borderRadius: Radius.medium,
        marginBottom: Spacing.md,
    },
    backButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.primary,
    },
    profileCard: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.large,
        overflow: 'hidden',
        marginBottom: Spacing.md,
    },
    cover: {
        width: '100%',
        height: 190,
        backgroundColor: Colors.border,
    },
    coverPlaceholder: {
        height: 190,
        backgroundColor: Colors.primaryDark,
        opacity: 0.12,
    },
    profileHeader: {
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    avatar: {
        width: 116,
        height: 116,
        borderRadius: Radius.round,
        borderWidth: 4,
        borderColor: Colors.surface,
        marginTop: -58,
        backgroundColor: Colors.background,
    },
    avatarPlaceholder: {
        width: 116,
        height: 116,
        borderRadius: Radius.round,
        borderWidth: 4,
        borderColor: Colors.surface,
        marginTop: -58,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontFamily: Fonts.black,
        fontSize: 32,
        color: Colors.primary,
    },
    name: {
        fontFamily: Fonts.black,
        fontSize: 24,
        color: Colors.text,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    username: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.primary,
        marginTop: 3,
    },
    bio: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.md,
        maxWidth: 550,
    },
    friendCount: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
    },
    detailsCard: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.large,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontFamily: Fonts.black,
        fontSize: 17,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    infoRow: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    infoLabel: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    infoValue: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.text,
    },
    emptyInfo: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    chip: {
        backgroundColor: Colors.accent,
        borderRadius: Radius.round,
        paddingVertical: 7,
        paddingHorizontal: Spacing.md,
    },
    chipText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.primary,
    },
    infoSection: {
        marginTop: Spacing.md,
        padding: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: Radius.medium,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    recentPostsSection: {
        marginTop: Spacing.md,
    },
    postsState: {
        alignItems: 'center',
        padding: Spacing.xl,
    },
    postsStateText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: Radius.medium,
    },
});
