import React, { useState } from 'react';

import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    Image,
} from 'react-native';

import { User } from 'firebase/auth';

import { Colors, Fonts, Radius, Spacing } from '../theme';

interface Props {
    user: User;
    onLogout: () => void;
}

type Page =
    | 'Home'
    | 'Friends'
    | 'Create Post'
    | 'Notifications'
    | 'Profile'
    | 'Settings';

interface Post {
    id: number;
    name: string;
    initials: string;
    time: string;
    content: string;
    likes: number;
    comments: number;
    liked: boolean;
}

const initialPosts: Post[] = [
    {
        id: 1,
        name: 'Sarah Johnson',
        initials: 'SJ',
        time: '12 minutes ago',
        content: 'Sometimes the smallest moments create the biggest memories. Enjoying a beautiful day!',
        likes: 24,
        comments: 8,
        liked: false,
    },
    {
        id: 2,
        name: 'Alex Morgan',
        initials: 'AM',
        time: '1 hour ago',
        content: 'Finally finished my new project! It took a lot of coffee, patience, and late nights. Really happy with the result.',
        likes: 42,
        comments: 13,
        liked: true,
    },
    {
        id: 3,
        name: 'Emily Carter',
        initials: 'EC',
        time: '3 hours ago',
        content: 'A little reminder: progress is progress, no matter how small. Keep going!',
        likes: 18,
        comments: 4,
        liked: false,
    },
];

const navigation: { name: Page; icon: string }[] = [
    { name: 'Home', icon: '⌂' },
    { name: 'Friends', icon: '♧' },
    { name: 'Create Post', icon: '+' },
    { name: 'Notifications', icon: '♢' },
    { name: 'Profile', icon: '◉' },
    { name: 'Settings', icon: '⚙' },
];

export default function HomeScreen({ user, onLogout }: Props) {
    const { width } = useWindowDimensions();

    const isDesktop = width >= 1100;
    const isMobile = width < 700;

    const [activePage, setActivePage] = useState<Page>('Home');
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [postText, setPostText] = useState('');
    const [search, setSearch] = useState('');

    const userName = user.displayName || 'LinkUp User';
    const initials = userName
        .split(' ')
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const navigate = (page: Page) => {
        setActivePage(page);
        setSearch('');
    };

    const publishPost = () => {
        if (!postText.trim()) return;

        const newPost: Post = {
            id: Date.now(),
            name: userName,
            initials,
            time: 'Just now',
            content: postText.trim(),
            likes: 0,
            comments: 0,
            liked: false,
        };

        setPosts(previous => [newPost, ...previous]);
        setPostText('');
        setActivePage('Home');
    };

    const toggleLike = (id: number) => {
        setPosts(previous =>
            previous.map(post =>
                post.id === id
                    ? {
                        ...post,
                        liked: !post.liked,
                        likes: post.likes + (post.liked ? -1 : 1),
                    }
                    : post,
            ),
        );
    };

    const filteredPosts = posts.filter(post =>
        `${post.name} ${post.content}`
            .toLowerCase()
            .includes(search.toLowerCase()),
    );

    const Avatar = ({
        name,
        size = 42,
    }: {
        name: string;
        size?: number;
    }) => (
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
            <Text style={styles.avatarText}>
                {name.slice(0, 2).toUpperCase()}
            </Text>
        </View>
    );

    const NavButton = ({
        item,
        mobile = false,
    }: {
        item: { name: Page; icon: string };
        mobile?: boolean;
    }) => {
        const active = activePage === item.name;

        return (
            <Pressable
                onPress={() => navigate(item.name)}
                style={[
                    mobile ? styles.mobileNavItem : styles.navItem,
                    active && styles.navItemActive,
                ]}
            >
                <Text
                    style={[
                        mobile ? styles.mobileNavIcon : styles.navIcon,
                        active && styles.navTextActive,
                    ]}
                >
                    {item.icon}
                </Text>

                {!mobile && (
                    <Text
                        style={[
                            styles.navText,
                            active && styles.navTextActive,
                        ]}
                    >
                        {item.name}
                    </Text>
                )}

                {mobile && (
                    <Text
                        style={[
                            styles.mobileNavLabel,
                            active && styles.navTextActive,
                        ]}
                    >
                        {item.name === 'Create Post' ? 'Create' : item.name}
                    </Text>
                )}
            </Pressable>
        );
    };

    const renderPost = (post: Post) => (
        <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
                <Avatar name={post.initials} />

                <View style={styles.postUserInfo}>
                    <Text style={styles.postName}>{post.name}</Text>
                    <Text style={styles.postTime}>{post.time}</Text>
                </View>

                <Pressable style={styles.moreButton}>
                    <Text style={styles.moreText}>•••</Text>
                </Pressable>
            </View>

            <Text style={styles.postContent}>{post.content}</Text>

            <View style={styles.postDivider} />

            <View style={styles.postActions}>
                <Pressable
                    onPress={() => toggleLike(post.id)}
                    style={styles.postAction}
                >
                    <Text
                        style={[
                            styles.actionText,
                            post.liked && styles.likedText,
                        ]}
                    >
                        {post.liked ? '♥ Liked' : '♡ Like'}
                    </Text>
                    <Text style={styles.actionCount}>{post.likes}</Text>
                </Pressable>

                <Pressable
                    onPress={() => navigate('Notifications')}
                    style={styles.postAction}
                >
                    <Text style={styles.actionText}>◯ Comment</Text>
                    <Text style={styles.actionCount}>{post.comments}</Text>
                </Pressable>

                <Pressable style={styles.postAction}>
                    <Text style={styles.actionText}>↗ Share</Text>
                </Pressable>
            </View>
        </View>
    );

    const renderPlaceholder = () => {
        const descriptions: Record<Page, string> = {
            Home: '',
            Friends: 'Connect with people and build your community.',
            'Create Post': 'Share something with your LinkUp community.',
            Notifications: 'Stay updated with what is happening.',
            Profile: 'Your personal space on LinkUp.',
            Settings: 'Manage your account and preferences.',
        };

        if (activePage === 'Create Post') {
            return (
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Create a post</Text>
                    <Text style={styles.sectionSubtitle}>
                        Share something with your friends.
                    </Text>

                    <View style={styles.composerHeader}>
                        <Avatar name={initials} size={48} />
                        <View>
                            <Text style={styles.postName}>{userName}</Text>
                            <Text style={styles.postTime}>Posting to everyone</Text>
                        </View>
                    </View>

                    <TextInput
                        style={styles.composerInput}
                        placeholder="What's happening?"
                        placeholderTextColor={Colors.textSecondary}
                        multiline
                        value={postText}
                        onChangeText={setPostText}
                        textAlignVertical="top"
                    />

                    <Pressable
                        onPress={publishPost}
                        disabled={!postText.trim()}
                        style={[
                            styles.primaryButton,
                            !postText.trim() && styles.disabledButton,
                        ]}
                    >
                        <Text style={styles.primaryButtonText}>
                            Publish post
                        </Text>
                    </Pressable>
                </View>
            );
        }

        return (
            <View style={styles.placeholderContainer}>
                <View style={styles.placeholderIcon}>
                    <Text style={styles.placeholderIconText}>
                        {navigation.find(item => item.name === activePage)?.icon}
                    </Text>
                </View>

                <Text style={styles.placeholderTitle}>
                    {activePage}
                </Text>

                <Text style={styles.placeholderDescription}>
                    {descriptions[activePage]}
                </Text>

                <View style={styles.comingSoon}>
                    <Text style={styles.comingSoonText}>
                        Coming soon
                    </Text>
                </View>

                {activePage === 'Profile' && (
                    <View style={styles.profileInfo}>
                        <Avatar name={initials} size={76} />
                        <Text style={styles.profileName}>{userName}</Text>
                        <Text style={styles.profileEmail}>{user.email}</Text>
                    </View>
                )}

                {activePage === 'Settings' && (
                    <Pressable
                        onPress={onLogout}
                        style={styles.logoutButton}
                    >
                        <Text style={styles.logoutText}>Sign out</Text>
                    </Pressable>
                )}
            </View>
        );
    };

    const renderRightSidebar = () => (
        <View style={styles.rightSidebar}>
            <View style={styles.rightCard}>
                <Text style={styles.rightTitle}>People you may know</Text>

                {[
                    { name: 'Daniel Smith', initials: 'DS' },
                    { name: 'Sophia Lee', initials: 'SL' },
                    { name: 'James Wilson', initials: 'JW' },
                ].map(person => (
                    <View key={person.name} style={styles.suggestion}>
                        <Avatar name={person.initials} size={38} />

                        <View style={styles.suggestionInfo}>
                            <Text style={styles.suggestionName}>
                                {person.name}
                            </Text>
                            <Text style={styles.suggestionSub}>
                                Suggested for you
                            </Text>
                        </View>

                        <Pressable
                            style={styles.addButton}
                            onPress={() => navigate('Friends')}
                        >
                            <Text style={styles.addButtonText}>+</Text>
                        </Pressable>
                    </View>
                ))}

                <Pressable onPress={() => navigate('Friends')}>
                    <Text style={styles.viewAll}>See all friends</Text>
                </Pressable>
            </View>

            <View style={styles.rightCard}>
                <Text style={styles.rightTitle}>Your LinkUp</Text>
                <Text style={styles.rightDescription}>
                    Good connections make great moments.
                </Text>
            </View>

            <Text style={styles.footerText}>
                About · Privacy · Terms
            </Text>
            <Text style={styles.footerText}>
                © 2026 LinkUp
            </Text>
        </View>
    );

    return (
        <View style={styles.app}>
            {/* Desktop sidebar */}
            {!isMobile && (
                <View style={styles.sidebar}>
                    <Pressable
                        onPress={() => navigate('Home')}
                        style={styles.brand}
                    >
                        <Text style={styles.brandText}>LinkUp</Text>
                    </Pressable>

                    <View style={styles.sidebarProfile}>
                        <Avatar name={initials} size={48} />
                        <View>
                            <Text style={styles.sidebarName}>{userName}</Text>
                            <Text style={styles.sidebarEmail}>
                                {user.email}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.menuLabel}>MENU</Text>

                    {navigation.map(item => (
                        <NavButton key={item.name} item={item} />
                    ))}

                    <Pressable
                        onPress={onLogout}
                        style={styles.sidebarLogout}
                    >
                        <Text style={styles.logoutText}>↪ Sign out</Text>
                    </Pressable>
                </View>
            )}

            <View style={styles.mainArea}>
                {/* Top bar */}
                <View style={styles.topBar}>
                    {isMobile ? (
                        <Text style={styles.brandText}>LinkUp</Text>
                    ) : (
                        <View style={styles.searchBox}>
                            <Text style={styles.searchIcon}>⌕</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search LinkUp..."
                                placeholderTextColor={Colors.textSecondary}
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>
                    )}

                    <View style={styles.topBarRight}>
                        {isMobile && (
                            <Pressable
                                onPress={() => navigate('Notifications')}
                                style={styles.topIconButton}
                            >
                                <Text style={styles.topIcon}>♢</Text>
                            </Pressable>
                        )}

                        <Pressable
                            onPress={() => navigate('Profile')}
                        >
                            <Avatar name={initials} size={38} />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.contentLayout}>
                    <ScrollView
                        style={styles.feedScroll}
                        contentContainerStyle={styles.feedContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {activePage === 'Home' ? (
                            <>
                                <View style={styles.welcomeSection}>
                                    <Text style={styles.pageHeading}>
                                        Your Feed
                                    </Text>
                                    <Text style={styles.pageSubtitle}>
                                        See what's happening in your world.
                                    </Text>
                                </View>

                                <Pressable
                                    onPress={() => navigate('Create Post')}
                                    style={styles.quickComposer}
                                >
                                    <Avatar name={initials} size={44} />
                                    <View style={styles.quickComposerInput}>
                                        <Text style={styles.quickComposerText}>
                                            What's happening, {userName.split(' ')[0]}?
                                        </Text>
                                    </View>
                                </Pressable>

                                <View style={styles.quickActions}>
                                    <Pressable
                                        onPress={() => navigate('Create Post')}
                                        style={styles.quickAction}
                                    >
                                        <Text style={styles.quickActionText}>
                                            ▧ Photo post
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => navigate('Create Post')}
                                        style={styles.quickAction}
                                    >
                                        <Text style={styles.quickActionText}>
                                            ✎ Write something
                                        </Text>
                                    </Pressable>
                                </View>

                                <View style={styles.feedHeading}>
                                    <Text style={styles.sectionTitle}>
                                        Recent posts
                                    </Text>
                                    <Text style={styles.feedLabel}>
                                        Latest
                                    </Text>
                                </View>

                                {filteredPosts.length > 0 ? (
                                    filteredPosts.map(renderPost)
                                ) : (
                                    <Text style={styles.emptyText}>
                                        No posts found.
                                    </Text>
                                )}
                            </>
                        ) : (
                            renderPlaceholder()
                        )}
                    </ScrollView>

                    {isDesktop && renderRightSidebar()}
                </View>
            </View>

            {/* Mobile bottom navigation */}
            {isMobile && (
                <View style={styles.bottomNavigation}>
                    {navigation
                        .filter(item => item.name !== 'Settings')
                        .map(item => (
                            <NavButton
                                key={item.name}
                                item={item}
                                mobile
                            />
                        ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    app: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.background,
    },

    sidebar: {
        width: 250,
        backgroundColor: Colors.surface,
        borderRightWidth: 1,
        borderRightColor: Colors.border,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xl,
    },

    brand: {
        marginBottom: 35,
    },

    brandText: {
        fontFamily: Fonts.black,
        fontSize: 27,
        color: Colors.primary,
    },

    sidebarProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingBottom: 25,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginBottom: 25,
    },

    sidebarName: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.text,
    },

    sidebarEmail: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 4,
    },

    menuLabel: {
        fontFamily: Fonts.bold,
        fontSize: 11,
        letterSpacing: 1.5,
        color: Colors.textSecondary,
        marginBottom: 12,
    },

    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: Radius.medium,
        marginBottom: 5,
    },

    navItemActive: {
        backgroundColor: Colors.accent,
    },

    navIcon: {
        fontFamily: Fonts.bold,
        fontSize: 22,
        color: Colors.textSecondary,
        width: 25,
        textAlign: 'center',
    },

    navText: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.textSecondary,
    },

    navTextActive: {
        color: Colors.primary,
    },

    sidebarLogout: {
        marginTop: 'auto',
        padding: 14,
    },

    mainArea: {
        flex: 1,
        minWidth: 0,
    },

    topBar: {
        height: 76,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingHorizontal: Spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: Radius.round,
        paddingHorizontal: 16,
        width: 330,
        height: 42,
    },

    searchIcon: {
        fontSize: 22,
        color: Colors.textSecondary,
        marginRight: 8,
    },

    searchInput: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.text,
        outlineStyle: 'none',
    } as any,

    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
    },

    topIconButton: {
        width: 38,
        height: 38,
        borderRadius: Radius.round,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },

    topIcon: {
        fontSize: 23,
        color: Colors.primary,
    },

    contentLayout: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        minHeight: 0,
    },

    feedScroll: {
        flex: 1,
        maxWidth: 720,
    },

    feedContent: {
        padding: Spacing.lg,
        paddingBottom: 50,
    },

    welcomeSection: {
        marginBottom: 22,
    },

    pageHeading: {
        fontFamily: Fonts.black,
        fontSize: 27,
        color: Colors.text,
    },

    pageSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 6,
    },

    avatar: {
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatarText: {
        fontFamily: Fonts.black,
        fontSize: 14,
        color: Colors.primaryDark,
    },

    quickComposer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 17,
        backgroundColor: Colors.surface,
        borderTopLeftRadius: Radius.large,
        borderTopRightRadius: Radius.large,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },

    quickComposerInput: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: Radius.round,
        paddingVertical: 13,
        paddingHorizontal: 17,
    },

    quickComposerText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
    },

    quickActions: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        paddingHorizontal: 17,
        paddingBottom: 15,
        borderBottomLeftRadius: Radius.large,
        borderBottomRightRadius: Radius.large,
        gap: 12,
    },

    quickAction: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: Colors.background,
        borderRadius: Radius.medium,
    },

    quickActionText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.primary,
    },

    feedHeading: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 15,
    },

    sectionTitle: {
        fontFamily: Fonts.black,
        fontSize: 18,
        color: Colors.text,
    },

    feedLabel: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.primary,
    },

    postCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    postUserInfo: {
        marginLeft: 12,
        flex: 1,
    },

    postName: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.text,
    },

    postTime: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },

    moreButton: {
        padding: 8,
    },

    moreText: {
        fontFamily: Fonts.black,
        fontSize: 16,
        color: Colors.textSecondary,
    },

    postContent: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        lineHeight: 23,
        color: Colors.text,
        marginTop: 18,
        marginBottom: 18,
    },

    postDivider: {
        height: 1,
        backgroundColor: Colors.border,
    },

    postActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 15,
    },

    postAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 5,
    },

    actionText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.textSecondary,
    },

    actionCount: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
    },

    likedText: {
        color: Colors.danger,
    },

    rightSidebar: {
        width: 290,
        padding: Spacing.lg,
        paddingTop: 30,
    },

    rightCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        padding: 18,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    rightTitle: {
        fontFamily: Fonts.black,
        fontSize: 15,
        color: Colors.text,
        marginBottom: 18,
    },

    suggestion: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 17,
    },

    suggestionInfo: {
        flex: 1,
        marginLeft: 9,
    },

    suggestionName: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.text,
    },

    suggestionSub: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 3,
    },

    addButton: {
        width: 30,
        height: 30,
        borderRadius: Radius.round,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },

    addButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 20,
        color: Colors.primary,
    },

    viewAll: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.primary,
        marginTop: 5,
    },

    rightDescription: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        lineHeight: 21,
        color: Colors.textSecondary,
    },

    footerText: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 8,
    },

    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        minHeight: 400,
    },

    placeholderIcon: {
        width: 75,
        height: 75,
        borderRadius: Radius.large,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },

    placeholderIconText: {
        fontFamily: Fonts.bold,
        fontSize: 34,
        color: Colors.primary,
    },

    placeholderTitle: {
        fontFamily: Fonts.black,
        fontSize: 25,
        color: Colors.text,
    },

    placeholderDescription: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 9,
        textAlign: 'center',
    },

    comingSoon: {
        marginTop: 20,
        backgroundColor: Colors.accent,
        borderRadius: Radius.round,
        paddingHorizontal: 18,
        paddingVertical: 9,
    },

    comingSoonText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.primary,
    },

    profileInfo: {
        alignItems: 'center',
        marginTop: 30,
    },

    profileName: {
        fontFamily: Fonts.black,
        fontSize: 19,
        color: Colors.text,
        marginTop: 12,
    },

    profileEmail: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 5,
    },

    sectionCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 22,
        marginTop: 15,
    },

    sectionSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 6,
        marginBottom: 25,
    },

    composerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },

    composerInput: {
        minHeight: 160,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.medium,
        padding: 15,
        fontFamily: Fonts.regular,
        fontSize: 15,
        color: Colors.text,
        outlineStyle: 'none',
    } as any,

    primaryButton: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.medium,
        padding: 15,
        alignItems: 'center',
        marginTop: 18,
    },

    primaryButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.surface,
    },

    disabledButton: {
        opacity: 0.5,
    },

    emptyText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        padding: 30,
    },

    logoutButton: {
        backgroundColor: Colors.danger,
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: Radius.medium,
        marginTop: 30,
    },

    logoutText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.surface,
    },

    bottomNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 68,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingHorizontal: 4,
    },

    mobileNavItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 3,
    },

    mobileNavIcon: {
        fontFamily: Fonts.bold,
        fontSize: 22,
        color: Colors.textSecondary,
    },

    mobileNavLabel: {
        fontFamily: Fonts.bold,
        fontSize: 9,
        color: Colors.textSecondary,
    },

});