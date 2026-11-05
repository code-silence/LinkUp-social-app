
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    Image,
    ActivityIndicator,
    StyleSheet,
    useWindowDimensions,
    Alert,
    Platform,
} from 'react-native';

import { User } from 'firebase/auth';
import { UserProfile } from '../services/user';
import {
    getSuggestions,
    getUsersByConnectionStatus,
    sendFriendRequest,
    acceptFriendRequest,
    removeConnection,
    ConnectionStatus,
} from '../services/friends';
import { Colors, Fonts, Radius, Spacing } from '../theme';

interface FriendsScreenProps {
    user: User;
    onViewProfile: (userId: string) => void;
}

type TabType =
    | 'Suggestions'
    | 'Friend Requests'
    | 'Sent Requests'
    | 'Your Friends';

const TABS: TabType[] = [
    'Suggestions',
    'Friend Requests',
    'Sent Requests',
    'Your Friends',
];

export default function FriendsScreen({
    user,
    onViewProfile,
}: FriendsScreenProps) {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const cardWidth = width < 520 ? '100%' : 220;

    const [activeTab, setActiveTab] = useState<TabType>('Suggestions');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
    const [requests, setRequests] = useState<UserProfile[]>([]);
    const [sentRequests, setSentRequests] = useState<UserProfile[]>([]);
    const [friends, setFriends] = useState<UserProfile[]>([]);

    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const getDisplayName = (profile: UserProfile) => {
        return (
            profile.name ||
            profile.username ||
            profile.email?.split('@')[0] ||
            'Unknown User'
        );
    };

    const loadData = useCallback(async () => {
        setLoading(true);

        try {
            if (activeTab === 'Suggestions') {
                const data = await getSuggestions(user.uid);
                setSuggestions(data);
            } else {
                const statusByTab: Record<
                    Exclude<TabType, 'Suggestions'>,
                    ConnectionStatus
                > = {
                    'Friend Requests': 'pending_received',
                    'Sent Requests': 'pending_sent',
                    'Your Friends': 'accepted',
                };

                const data = await getUsersByConnectionStatus(
                    user.uid,
                    statusByTab[activeTab],
                );

                if (activeTab === 'Friend Requests') setRequests(data);
                if (activeTab === 'Sent Requests') setSentRequests(data);
                if (activeTab === 'Your Friends') setFriends(data);
            }
        } catch (error) {
            console.error('Error loading friend data:', error);
            showAlert(
                'Error',
                'Could not load this list. Please check your connection and try again.',
            );
        } finally {
            setLoading(false);
        }
    }, [activeTab, user.uid]);

    useEffect(() => {
        loadData();
    }, [loadData, refreshKey]);

    const handleAddFriend = async (profile: UserProfile) => {
        if (!profile.uid) return;

        setActionLoading(profile.uid);

        try {
            await sendFriendRequest(user.uid, profile.uid);
            setSuggestions(previous =>
                previous.filter(item => item.uid !== profile.uid),
            );
            showAlert(
                'Request sent',
                `Your friend request was sent to ${getDisplayName(profile)}.`,
            );
        } catch (error: any) {
            console.error('Add friend error:', error);
            showAlert('Could not send request', error.message || 'Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAccept = async (profile: UserProfile) => {
        if (!profile.uid) return;

        setActionLoading(profile.uid);

        try {
            await acceptFriendRequest(user.uid, profile.uid);

            setRequests(previous =>
                previous.filter(item => item.uid !== profile.uid),
            );

            setRefreshKey(value => value + 1);

            showAlert(
                'Request accepted',
                `You and ${getDisplayName(profile)} are now friends.`,
            );
        } catch (error: any) {
            console.error('Accept request error:', error);
            showAlert('Could not accept request', error.message || 'Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveConnection = async (
        profile: UserProfile,
        successMessage: string,
    ) => {
        if (!profile.uid) return;

        setActionLoading(profile.uid);

        try {
            await removeConnection(user.uid, profile.uid);

            setRequests(previous =>
                previous.filter(item => item.uid !== profile.uid),
            );
            setSentRequests(previous =>
                previous.filter(item => item.uid !== profile.uid),
            );
            setFriends(previous =>
                previous.filter(item => item.uid !== profile.uid),
            );

            setRefreshKey(value => value + 1);
            showAlert('Done', successMessage);
        } catch (error: any) {
            console.error('Connection removal error:', error);
            showAlert('Action failed', error.message || 'Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const currentList = useMemo(() => {
        switch (activeTab) {
            case 'Suggestions':
                return suggestions;
            case 'Friend Requests':
                return requests;
            case 'Sent Requests':
                return sentRequests;
            case 'Your Friends':
                return friends;
            default:
                return [];
        }
    }, [activeTab, suggestions, requests, sentRequests, friends]);

    const displayedUsers = useMemo(() => {
        const search = searchQuery.trim().toLowerCase();

        if (!search) return currentList;

        return currentList.filter(profile => {
            const name = getDisplayName(profile).toLowerCase();
            const username = (profile.username || '').toLowerCase();

            return name.includes(search) || username.includes(search);
        });
    }, [currentList, searchQuery]);

    const renderAvatar = (profile: UserProfile) => {
        const name = getDisplayName(profile);

        if (profile.photoURL) {
            return (
                <Image
                    source={{ uri: profile.photoURL }}
                    style={styles.cardAvatarImage}
                />
            );
        }

        return (
            <View style={styles.cardAvatarPlaceholder}>
                <Text style={styles.cardAvatarText}>
                    {name.substring(0, 2).toUpperCase()}
                </Text>
            </View>
        );
    };

    const renderActions = (profile: UserProfile) => {
        const isProcessing = actionLoading === profile.uid;

        if (activeTab === 'Suggestions') {
            return (
                <Pressable
                    style={[
                        styles.primaryButton,
                        isProcessing && styles.buttonDisabled,
                    ]}
                    onPress={() => handleAddFriend(profile)}
                    disabled={isProcessing}
                >
                    <Text style={styles.primaryButtonText}>
                        {isProcessing ? 'Sending...' : 'Add friend'}
                    </Text>
                </Pressable>
            );
        }

        if (activeTab === 'Friend Requests') {
            return (
                <View style={styles.actionGroup}>
                    <Pressable
                        style={[
                            styles.primaryButton,
                            isProcessing && styles.buttonDisabled,
                        ]}
                        onPress={() => handleAccept(profile)}
                        disabled={isProcessing}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isProcessing ? 'Accepting...' : 'Accept'}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.secondaryButton,
                            isProcessing && styles.buttonDisabled,
                        ]}
                        onPress={() =>
                            handleRemoveConnection(
                                profile,
                                'Friend request declined.',
                            )
                        }
                        disabled={isProcessing}
                    >
                        <Text style={styles.secondaryButtonText}>Decline</Text>
                    </Pressable>
                </View>
            );
        }

        if (activeTab === 'Sent Requests') {
            return (
                <Pressable
                    style={[
                        styles.secondaryButton,
                        isProcessing && styles.buttonDisabled,
                    ]}
                    onPress={() =>
                        handleRemoveConnection(
                            profile,
                            'Friend request cancelled.',
                        )
                    }
                    disabled={isProcessing}
                >
                    <Text style={styles.secondaryButtonText}>
                        {isProcessing ? 'Cancelling...' : 'Cancel request'}
                    </Text>
                </Pressable>
            );
        }

        return (
            <Pressable
                style={[
                    styles.secondaryButton,
                    isProcessing && styles.buttonDisabled,
                ]}
                onPress={() =>
                    handleRemoveConnection(
                        profile,
                        `You are no longer friends with ${getDisplayName(profile)}.`,
                    )
                }
                disabled={isProcessing}
            >
                <Text style={styles.secondaryButtonText}>
                    {isProcessing ? 'Removing...' : 'Unfriend'}
                </Text>
            </Pressable>
        );
    };

    const renderCard = (profile: UserProfile) => {
        const displayName = getDisplayName(profile);

        return (
            <View
                key={profile.uid}
                style={[styles.card, { width: cardWidth }]}
            >
                <Pressable
                    onPress={() => onViewProfile(profile.uid)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${displayName}'s profile`}
                >
                    {profile.coverPhotoURL ? (
                        <Image
                            source={{ uri: profile.coverPhotoURL }}
                            style={styles.cardCover}
                        />
                    ) : (
                        <View style={styles.cardCoverPlaceholder} />
                    )}

                    <View style={styles.cardAvatarWrapper}>
                        {renderAvatar(profile)}
                    </View>
                </Pressable>

                <View style={styles.cardInfo}>
                    <Pressable onPress={() => onViewProfile(profile.uid)}>
                        <Text style={styles.cardName} numberOfLines={1}>
                            {displayName}
                        </Text>
                    </Pressable>

                    {profile.username ? (
                        <Text style={styles.cardUsername} numberOfLines={1}>
                            @{profile.username}
                        </Text>
                    ) : null}

                    <Text style={styles.cardMeta}>
                        {activeTab === 'Your Friends'
                            ? `${profile.friendsCount || 0} friends`
                            : activeTab === 'Friend Requests'
                              ? 'Wants to connect with you'
                              : activeTab === 'Sent Requests'
                                ? 'Request pending'
                                : 'Suggested for you'}
                    </Text>

                    <View style={styles.cardActions}>
                        {renderActions(profile)}
                    </View>
                </View>
            </View>
        );
    };

    const getEmptyMessage = () => {
        switch (activeTab) {
            case 'Suggestions':
                return 'No new suggestions right now.';
            case 'Friend Requests':
                return 'You have no pending friend requests.';
            case 'Sent Requests':
                return 'You have no sent requests.';
            case 'Your Friends':
                return "You haven't added any friends yet.";
        }
    };

    return (
        <View
            style={[
                styles.container,
                isMobile ? styles.containerMobile : styles.containerDesktop,
            ]}
        >
            <View
                style={[
                    styles.sidebar,
                    isMobile && styles.sidebarMobile,
                ]}
            >
                <Text style={styles.sidebarTitle}>Friends</Text>

                <View style={styles.tabList}>
                    {TABS.map(tab => (
                        <Pressable
                            key={tab}
                            style={[
                                styles.menuItem,
                                activeTab === tab && styles.menuItemActive,
                            ]}
                            onPress={() => {
                                setActiveTab(tab);
                                setSearchQuery('');
                            }}
                        >
                            <Text
                                style={[
                                    styles.menuText,
                                    activeTab === tab && styles.menuTextActive,
                                ]}
                            >
                                {tab}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <ScrollView
                style={styles.mainContent}
                contentContainerStyle={styles.mainContentInner}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View
                    style={[
                        styles.header,
                        isMobile && styles.headerMobile,
                    ]}
                >
                    <View>
                        <Text style={styles.headerTitle}>{activeTab}</Text>
                        <Text style={styles.headerSubtitle}>
                            {activeTab === 'Suggestions'
                                ? 'Discover people on LinkUp.'
                                : 'Manage your connections.'}
                        </Text>
                    </View>

                    <TextInput
                        style={[
                            styles.searchInput,
                            isMobile && styles.searchInputMobile,
                        ]}
                        placeholder={`Search ${activeTab.toLowerCase()}...`}
                        placeholderTextColor={Colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator
                            size="large"
                            color={Colors.primary}
                        />
                        <Text style={styles.loadingText}>
                            Loading people...
                        </Text>
                    </View>
                ) : displayedUsers.length > 0 ? (
                    <View style={styles.grid}>
                        {displayedUsers.map(renderCard)}
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Text style={styles.emptyIcon}>!</Text>
                        </View>

                        <Text style={styles.emptyText}>
                            {searchQuery.trim()
                                ? 'No matching people found.'
                                : getEmptyMessage()}
                        </Text>

                        {activeTab === 'Your Friends' && (
                            <Pressable
                                style={styles.findFriendsButton}
                                onPress={() => {
                                    setActiveTab('Suggestions');
                                    setSearchQuery('');
                                }}
                            >
                                <Text style={styles.findFriendsText}>
                                    Find friends
                                </Text>
                            </Pressable>
                        )}

                        {activeTab === 'Suggestions' && (
                            <Pressable
                                style={styles.findFriendsButton}
                                onPress={() => setRefreshKey(value => value + 1)}
                            >
                                <Text style={styles.findFriendsText}>
                                    Refresh suggestions
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    containerDesktop: {
        flexDirection: 'row',
    },
    containerMobile: {
        flexDirection: 'column',
    },
    sidebar: {
        width: 235,
        backgroundColor: Colors.surface,
        borderRightWidth: 1,
        borderRightColor: Colors.border,
        padding: Spacing.lg,
    },
    sidebarMobile: {
        width: '100%',
        borderRightWidth: 0,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    sidebarTitle: {
        fontFamily: Fonts.black,
        fontSize: 22,
        color: Colors.text,
        marginBottom: Spacing.lg,
    },
    tabList: {
        flexDirection: 'column',
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.medium,
        marginBottom: Spacing.sm,
    },
    menuItemActive: {
        backgroundColor: Colors.accent,
    },
    menuText: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    menuTextActive: {
        color: Colors.primary,
    },
    mainContent: {
        flex: 1,
    },
    mainContentInner: {
        padding: Spacing.xl,
        paddingBottom: Spacing.xl * 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    headerMobile: {
        alignItems: 'stretch',
    },
    headerTitle: {
        fontFamily: Fonts.black,
        fontSize: 22,
        color: Colors.text,
    },
    headerSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    searchInput: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.round,
        paddingHorizontal: Spacing.md,
        paddingVertical: 11,
        width: 260,
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.text,
        outlineStyle: 'none',
    } as any,
    searchInputMobile: {
        width: '100%',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        alignItems: 'flex-start',
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    cardCover: {
        width: '100%',
        height: 90,
        backgroundColor: Colors.border,
    },
    cardCoverPlaceholder: {
        width: '100%',
        height: 90,
        backgroundColor: Colors.primaryDark,
        opacity: 0.1,
    },
    cardAvatarWrapper: {
        width: 80,
        height: 80,
        borderRadius: Radius.round,
        borderWidth: 3,
        borderColor: Colors.surface,
        position: 'absolute',
        top: 45,
        alignSelf: 'center',
        backgroundColor: Colors.background,
        overflow: 'hidden',
    },
    cardAvatarImage: {
        width: '100%',
        height: '100%',
    },
    cardAvatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardAvatarText: {
        fontFamily: Fonts.black,
        fontSize: 24,
        color: Colors.primary,
    },
    cardInfo: {
        padding: Spacing.md,
        paddingTop: 45,
        alignItems: 'center',
    },
    cardName: {
        fontFamily: Fonts.bold,
        fontSize: 15,
        color: Colors.text,
        textAlign: 'center',
    },
    cardUsername: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.primary,
        marginTop: 3,
    },
    cardMeta: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 6,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    cardActions: {
        width: '100%',
    },
    actionGroup: {
        gap: Spacing.sm,
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 9,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.medium,
        alignItems: 'center',
    },
    primaryButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.surface,
    },
    secondaryButton: {
        backgroundColor: Colors.accent,
        paddingVertical: 9,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.medium,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.text,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    loadingContainer: {
        marginTop: 50,
        alignItems: 'center',
    },
    loadingText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    emptyContainer: {
        width: '100%',
        paddingVertical: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconContainer: {
        width: 60,
        height: 60,
        borderRadius: Radius.round,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    emptyIcon: {
        fontSize: 28,
        color: Colors.primary,
        fontFamily: Fonts.black,
    },
    emptyText: {
        fontFamily: Fonts.bold,
        fontSize: 15,
        color: Colors.text,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    findFriendsButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: 12,
        borderRadius: Radius.medium,
    },
    findFriendsText: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.surface,
    },
});
