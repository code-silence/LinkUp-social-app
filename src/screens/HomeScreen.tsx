import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    ActivityIndicator,
    Image,
} from 'react-native';

import ProfileScreen from './ProfileScreen';
import FriendsScreen from './FriendsScreen';

import { User } from 'firebase/auth';
import { Colors, Fonts, Radius, Spacing } from '../theme';
import { getUserProfile, UserProfile } from '../services/user';
import PublicProfileScreen from './PublicProfileScreen';
import CreatePostScreen from './CreatePostScreen';
import { Post, PostAuthor, subscribeToFeed } from '../services/posts';
import PostCard from '../components/PostCard';

interface Props {
    user: User;
    onLogout: () => void;
}

const navigation = [
    { label: 'Home', icon: '⌂' },
    { label: 'Friends', icon: '♧' },
    { label: 'Create Post', icon: '+' },
    { label: 'Notifications', icon: '♢' },
    { label: 'Profile', icon: '◉' },
] as const;

function Avatar({
    name,
    url,
    size = 42,
}: {
    name: string;
    url?: string;
    size?: number;
}) {
    const initials = name
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
            {url ? (
                <Image
                    source={{ uri: url }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                />
            ) : (
                <Text
                    style={[
                        styles.avatarText,
                        { fontSize: Math.max(14, size * 0.35) },
                    ]}
                >
                    {initials || 'U'}
                </Text>
            )}
        </View>
    );
}

export default function HomeScreen({ user, onLogout }: Props) {
    const { width, height } = useWindowDimensions();
    type ActivePage = 'Home' | 'Profile' | 'Friends' | 'Create Post';

    const [activePage, setActivePage] = useState<ActivePage>('Home');
    const [globalProfile, setGlobalProfile] = useState<UserProfile | null>(null);
    const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

    const isMobile = width < 700;
    const isDesktop = width >= 1100;

    const [posts, setPosts] = useState<Post[]>([]);
    const [feedLoading, setFeedLoading] = useState(true);
    const [feedError, setFeedError] = useState('');
    const emailPrefix = user.email ? user.email.split('@')[0] : 'User';


    const currentUser: PostAuthor = {
        uid: user.uid,
        name: globalProfile?.name || user.displayName || emailPrefix,
        username: globalProfile?.username || '',
        photoURL: globalProfile?.photoURL || user.photoURL || '',
    };

    useEffect(() => {
        const unsubscribe = subscribeToFeed(
            data => {
                setPosts(data);
                setFeedLoading(false);
                setFeedError('');
            },
            error => {
                console.error('Feed subscription error:', error);
                setFeedError('Could not load your feed. Please try again.');
                setFeedLoading(false);
            },
        );

        return unsubscribe;
    }, []);

    useEffect(() => {
        const fetchGlobalProfile = async () => {
            try {
                const data = await getUserProfile(user.uid);
                setGlobalProfile(data as UserProfile);
            } catch (error) {
                console.error('Error fetching global profile:', error);
            }
        };
        fetchGlobalProfile();
    }, [user.uid]);

    const displayUserName = globalProfile?.name || user.displayName || emailPrefix;
    const displayFirstName = displayUserName.split(' ')[0];
    const displayPhotoURL = globalProfile?.photoURL || user.photoURL || undefined;

    const renderNavigationItem = (
        item: (typeof navigation)[number],
        mobile = false,
    ) => {
        const isActive = activePage === item.label;
        const canNavigate =
            item.label === 'Home' ||
            item.label === 'Profile' ||
            item.label === 'Friends' ||
            item.label === 'Create Post';

        return (
            <Pressable
                key={item.label}
                disabled={!canNavigate}
                onPress={() => {
                    if (canNavigate) {
                        setActivePage(item.label as ActivePage);
                        setViewingProfileId(null);
                    }
                }}
                style={
                    mobile
                        ? styles.mobileNavItem
                        : [
                            styles.navItem,
                            isActive && styles.navItemActive,
                        ]
                }
            >
                <Text
                    style={[
                        mobile ? styles.mobileNavIcon : styles.navIcon,
                        isActive && styles.navTextActive,
                    ]}
                >
                    {item.icon}
                </Text>

                <Text
                    style={[
                        mobile ? styles.mobileNavLabel : styles.navLabel,
                        isActive && styles.navTextActive,
                    ]}
                >
                    {mobile && item.label === 'Create Post'
                        ? 'Create'
                        : item.label}
                </Text>
            </Pressable>
        );
    };

    return (
        <View style={[styles.app, { height }]}>
            {!isMobile && (
                <View style={styles.sidebar}>
                    <ScrollView
                        style={styles.sidebarScroll}
                        contentContainerStyle={styles.sidebarContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.brand}>LinkUp</Text>

                        <View style={styles.account}>
                            <Avatar
                                name={displayUserName}
                                url={displayPhotoURL}
                                size={46}
                            />

                            <View style={styles.accountInfo}>
                                <Text style={styles.accountName} numberOfLines={1}>
                                    {displayUserName}
                                </Text>

                                <Text style={styles.accountEmail} numberOfLines={1}>
                                    {user.email}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.menuHeading}>MENU</Text>

                        <View style={styles.navigation}>
                            {navigation.map(item => renderNavigationItem(item))}
                        </View>

                        <View style={styles.sidebarBottom}>
                            <View style={styles.sidebarDivider} />

                            <Pressable
                                onPress={onLogout}
                                style={styles.logoutButton}
                            >
                                <Text style={styles.logoutIcon}>↪</Text>
                                <Text style={styles.logoutText}>Sign out</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            )}

            <View style={styles.mainArea}>
                <View style={styles.topBar}>
                    {isMobile ? (
                        <Text style={styles.brand}>LinkUp</Text>
                    ) : (
                        <Text style={styles.topBarTitle}>
                            {viewingProfileId ? "Viewing Profile" : activePage}
                        </Text>
                    )}

                    <View style={styles.topBarRight}>
                        {isMobile && (
                            <Pressable
                                onPress={onLogout}
                                style={styles.mobileLogout}
                            >
                                <Text style={styles.mobileLogoutText}>
                                    Sign out
                                </Text>
                            </Pressable>
                        )}

                        <Avatar
                            name={displayUserName}
                            url={displayPhotoURL}
                            size={40}
                        />
                    </View>
                </View>

                {viewingProfileId ? (
                    <PublicProfileScreen
                        userId={viewingProfileId}
                        onBack={() => setViewingProfileId(null)}
                    />
                ) : activePage === 'Profile' ? (
                    <ProfileScreen
                        user={user}
                        onProfileUpdate={updatedProfile =>
                            setGlobalProfile(updatedProfile)
                        }
                    />
                ) : activePage === 'Friends' ? (
                    <FriendsScreen
                        user={user}
                        onViewProfile={userId => {
                            setViewingProfileId(userId);
                        }}
                    />
                ) : activePage === 'Create Post' ? (
                    <CreatePostScreen
                        user={user}
                        onPostCreated={() => {
                            setActivePage('Home');
                            setViewingProfileId(null);
                        }}
                    />
                ) : (
                    <ScrollView
                        style={styles.contentScroll}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        <View
                            style={[
                                styles.contentLayout,
                                !isDesktop && styles.contentLayoutCompact,
                            ]}
                        >
                            <View style={styles.feedColumn}>
                                <View style={styles.welcomeSection}>
                                    <Text style={styles.welcomeEyebrow}>
                                        YOUR COMMUNITY
                                    </Text>

                                    <Text style={styles.welcomeTitle}>
                                        Hey, {displayFirstName}!
                                    </Text>

                                    <Text style={styles.welcomeSubtitle}>
                                        Stay connected with the people who matter.
                                    </Text>
                                </View>

                                <View style={styles.feedCard}>
                                    <View style={styles.feedCardHeader}>
                                        <Text style={styles.feedTitle}>Your feed</Text>
                                        <Text style={styles.feedSubtitle}>
                                            Latest updates from your community
                                        </Text>
                                    </View>

                                    <View style={styles.postsContainer}>
                                        {feedLoading ? (
                                            <ActivityIndicator
                                                size="large"
                                                color={Colors.primary}
                                                style={styles.feedLoader}
                                            />
                                        ) : feedError ? (
                                            <Text style={styles.feedStatus}>{feedError}</Text>
                                        ) : posts.length === 0 ? (
                                            <View style={styles.emptyFeed}>
                                                <View style={styles.emptyIcon}>
                                                    <Text style={styles.emptyIconText}>◇</Text>
                                                </View>

                                                <Text style={styles.emptyTitle}>
                                                    Nothing here yet
                                                </Text>

                                                <Text style={styles.emptyDescription}>
                                                    Your feed will show posts from you and your friends.
                                                    Be the first to share something!
                                                </Text>
                                            </View>
                                        ) : (
                                            posts.map(post => (
                                                <PostCard
                                                    key={post.id}
                                                    post={post}
                                                    currentUser={currentUser}
                                                    onViewProfile={userId => {
                                                        setViewingProfileId(userId);
                                                    }}
                                                />
                                            ))
                                        )}
                                    </View>
                                </View>
                            </View>

                            {isDesktop && (
                                <View style={styles.rightSidebar}>
                                    <View style={styles.accountCard}>
                                        <Text style={styles.cardHeading}>
                                            YOUR ACCOUNT
                                        </Text>

                                        <View style={styles.accountCardProfile}>
                                            <Avatar
                                                name={displayUserName}
                                                url={displayPhotoURL}
                                                size={54}
                                            />

                                            <View style={styles.accountCardInfo}>
                                                <Text
                                                    style={styles.accountCardName}
                                                    numberOfLines={1}
                                                >
                                                    {displayUserName}
                                                </Text>

                                                <Text
                                                    style={styles.accountCardEmail}
                                                    numberOfLines={2}
                                                >
                                                    {user.email}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.cardDivider} />

                                        <Text style={styles.accountCardFooter}>
                                            Welcome to your LinkUp community.
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <Text style={styles.footer}>
                            LinkUp · © 2026
                        </Text>
                    </ScrollView>
                )}

                {isMobile && (
                    <View style={styles.bottomNavigation}>
                        {navigation
                            .filter(item => item.label !== 'Notifications')
                            .map(item => renderNavigationItem(item, true))}
                    </View>
                )}

            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    app: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.background,
        overflow: 'hidden',
    },
    sidebar: {
        width: 250,
        height: '100%',
        backgroundColor: Colors.surface,
        borderRightWidth: 1,
        borderRightColor: Colors.border,
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 0,
    },
    sidebarScroll: {
        flex: 1,
    },
    sidebarContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.lg,
    },
    brand: {
        fontFamily: Fonts.black,
        fontSize: 27,
        color: Colors.primary,
    },
    account: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 35,
        paddingBottom: 25,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    accountInfo: {
        flex: 1,
        minWidth: 0,
    },
    accountName: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.text,
    },
    accountEmail: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    avatar: {
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontFamily: Fonts.black,
        fontSize: 14,
        color: Colors.primaryDark,
    },
    menuHeading: {
        fontFamily: Fonts.bold,
        fontSize: 11,
        letterSpacing: 1.5,
        color: Colors.textSecondary,
        marginTop: 28,
        marginBottom: 14,
    },
    navigation: {
        gap: 5,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: Radius.medium,
    },
    navItemActive: {
        backgroundColor: Colors.accent,
    },
    navIcon: {
        fontFamily: Fonts.bold,
        fontSize: 21,
        color: Colors.textSecondary,
        width: 25,
        textAlign: 'center',
    },
    navLabel: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    navTextActive: {
        color: Colors.primary,
    },
    sidebarBottom: {
        marginTop: 'auto',
    },
    sidebarDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginBottom: 15,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
    },
    logoutIcon: {
        fontSize: 20,
        color: Colors.danger,
    },
    logoutText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.danger,
    },
    mainArea: {
        flex: 1,
        height: '100%',
        minWidth: 0,
        minHeight: 0,
    },
    topBar: {
        height: 72,
        flexShrink: 0,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingHorizontal: Spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    topBarTitle: {
        fontFamily: Fonts.bold,
        fontSize: 17,
        color: Colors.text,
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    mobileLogout: {
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: Radius.medium,
        backgroundColor: Colors.background,
    },
    mobileLogoutText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.danger,
    },
    contentScroll: {
        flex: 1,
        minHeight: 0,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl,
        alignItems: 'center',
    },
    contentLayout: {
        width: '100%',
        maxWidth: 1120,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.lg,
    },
    contentLayoutCompact: {
        maxWidth: 720,
    },
    feedColumn: {
        flex: 1,
        minWidth: 0,
    },
    welcomeSection: {
        paddingTop: 12,
        paddingBottom: 27,
    },
    welcomeEyebrow: {
        fontFamily: Fonts.bold,
        fontSize: 11,
        letterSpacing: 1.5,
        color: Colors.primary,
        marginBottom: 10,
    },
    welcomeTitle: {
        fontFamily: Fonts.black,
        fontSize: 30,
        color: Colors.text,
    },
    welcomeSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 7,
        lineHeight: 21,
    },
    feedCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    feedCardHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    feedTitle: {
        fontFamily: Fonts.black,
        fontSize: 18,
        color: Colors.text,
    },
    feedSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 5,
    },
    emptyFeed: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 25,
        paddingVertical: 65,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: Radius.large,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    emptyIconText: {
        fontSize: 34,
        color: Colors.primary,
    },
    emptyTitle: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: Colors.text,
    },
    emptyDescription: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        lineHeight: 20,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 300,
    },
    rightSidebar: {
        width: 270,
        paddingTop: 12,
    },
    accountCard: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.large,
        padding: 19,
    },
    cardHeading: {
        fontFamily: Fonts.bold,
        fontSize: 11,
        letterSpacing: 1.2,
        color: Colors.textSecondary,
        marginBottom: 20,
    },
    accountCardProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    accountCardInfo: {
        flex: 1,
        minWidth: 0,
    },
    accountCardName: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.text,
    },
    accountCardEmail: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 5,
    },
    cardDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 18,
    },
    accountCardFooter: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        lineHeight: 19,
        color: Colors.textSecondary,
    },
    footer: {
        width: '100%',
        maxWidth: 1120,
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 35,
        textAlign: 'center',
    },
    bottomNavigation: {
        height: 66,
        flexShrink: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingHorizontal: 4,
    },
    mobileNavItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },
    mobileNavIcon: {
        fontFamily: Fonts.bold,
        fontSize: 21,
        color: Colors.textSecondary,
    },
    mobileNavLabel: {
        fontFamily: Fonts.bold,
        fontSize: 10,
        color: Colors.textSecondary,
    },
    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: Colors.text,
        marginBottom: Spacing.lg,
    },
    backButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: Radius.medium,
    },
    backButtonText: {
        fontFamily: Fonts.bold,
        color: Colors.surface,
        fontSize: 14,
    },
    postsContainer: {
        padding: Spacing.md,
    },
    feedLoader: {
        paddingVertical: Spacing.xl,
    },
    feedStatus: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.danger,
        textAlign: 'center',
        paddingVertical: Spacing.xl,
    },
});