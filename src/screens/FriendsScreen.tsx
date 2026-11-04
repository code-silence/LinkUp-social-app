import React, { useState, useEffect } from 'react';
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
    removeConnection 
} from '../services/friends';
import { Colors, Fonts, Radius, Spacing } from '../theme';

interface FriendsScreenProps {
    user: User;
    onViewProfile: (userId: string) => void;
}

type TabType = 'Suggestions' | 'Friend Requests' | 'Your Friends';

export default function FriendsScreen({ user, onViewProfile }: FriendsScreenProps) {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [activeTab, setActiveTab] = useState<TabType>('Suggestions');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    
    const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
    const [requests, setRequests] = useState<UserProfile[]>([]);
    const [friends, setFriends] = useState<UserProfile[]>([]);
    
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'Suggestions') {
                const fetchedSuggestions = await getSuggestions(user.uid);
                setSuggestions(fetchedSuggestions);
            } else if (activeTab === 'Friend Requests') {
                const fetchedRequests = await getUsersByConnectionStatus(user.uid, 'pending_received');
                setRequests(fetchedRequests);
            } else if (activeTab === 'Your Friends') {
                const fetchedFriends = await getUsersByConnectionStatus(user.uid, 'accepted');
                setFriends(fetchedFriends);
            }
        } catch (error) {
            console.error('Error loading friend data:', error);
            showAlert('Error', 'Failed to load data. Please check your internet or Firebase rules.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async (targetUser: UserProfile) => {
        if (!targetUser || !targetUser.uid) {
            showAlert('Error', 'Invalid user data.');
            return;
        }
        setActionLoading(targetUser.uid);
        try {
            await sendFriendRequest(user.uid, targetUser.uid);
            setSuggestions(prev => prev.filter(u => u.uid !== targetUser.uid));
            showAlert('Request Sent', `Friend request sent to ${getDisplayName(targetUser)}`);
        } catch (error: any) {
            console.error('Add friend error:', error);
            showAlert('Error', error.message || 'Could not send friend request.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleConfirmRequest = async (targetUser: UserProfile) => {
        if (!targetUser || !targetUser.uid) {
            showAlert('Error', 'Invalid user data.');
            return;
        }
        setActionLoading(targetUser.uid);
        try {
            await acceptFriendRequest(user.uid, targetUser.uid);
            setRequests(prev => prev.filter(u => u.uid !== targetUser.uid));
            showAlert('Accepted', `You are now friends with ${getDisplayName(targetUser)}`);
        } catch (error: any) {
            console.error('Confirm request error:', error);
            showAlert('Error', error.message || 'Could not accept request. Check Firebase rules.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveAction = async (targetUserId: string) => {
        if (!targetUserId) {
            showAlert('Error', 'Invalid user ID.');
            return;
        }
        setActionLoading(targetUserId);
        try {
            await removeConnection(user.uid, targetUserId);
            
            if (activeTab === 'Suggestions') {
                setSuggestions(prev => prev.filter(u => u.uid !== targetUserId));
            } else if (activeTab === 'Friend Requests') {
                setRequests(prev => prev.filter(u => u.uid !== targetUserId));
            } else if (activeTab === 'Your Friends') {
                setFriends(prev => prev.filter(u => u.uid !== targetUserId));
            }
        } catch (error: any) {
            console.error('Remove action error:', error);
            showAlert('Error', error.message || 'Action failed. Check Firebase rules.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleMessage = (name: string) => {
        showAlert('Message', `Opening chat with ${name}... (Coming soon)`);
    };

    const getDisplayName = (profile: UserProfile) => {
        return profile.name || (profile as any).displayName || 'Unknown User';
    };

    let currentList: UserProfile[] = [];
    if (activeTab === 'Suggestions') currentList = suggestions;
    else if (activeTab === 'Friend Requests') currentList = requests;
    else if (activeTab === 'Your Friends') currentList = friends;

    const displayedUsers = currentList.filter(u => 
        getDisplayName(u).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderAvatar = (imageUrl?: string, name?: string) => {
        if (imageUrl) {
            return <Image source={{ uri: imageUrl }} style={styles.cardAvatarImage} />;
        }
        return (
            <View style={styles.cardAvatarPlaceholder}>
                <Text style={styles.cardAvatarText}>
                    {(name || 'U').substring(0, 2).toUpperCase()}
                </Text>
            </View>
        );
    };

    const renderCard = (profile: UserProfile) => {
        const isProcessing = actionLoading === profile.uid;
        const displayName = getDisplayName(profile);

        return (
            <View key={profile.uid} style={styles.card}>
                <Pressable onPress={() => onViewProfile(profile.uid)}>
                    {profile.coverPhotoURL ? (
                        <Image source={{ uri: profile.coverPhotoURL }} style={styles.cardCover} />
                    ) : (
                        <View style={styles.cardCoverPlaceholder} />
                    )}
                    
                    <View style={styles.cardAvatarWrapper}>
                        {renderAvatar(profile.photoURL, displayName)}
                    </View>
                </Pressable>

                <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={styles.cardMutual}>
                        {profile.friendsCount || 0} mutual friends
                    </Text>

                    <View style={styles.cardActions}>
                        {activeTab === 'Suggestions' && (
                            <>
                                <Pressable 
                                    style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
                                    onPress={() => handleAddFriend(profile)}
                                    disabled={isProcessing}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {isProcessing ? 'Sending...' : 'Add friend'}
                                    </Text>
                                </Pressable>
                                <Pressable 
                                    style={[styles.secondaryButton, isProcessing && styles.buttonDisabled]}
                                    onPress={() => handleRemoveAction(profile.uid)}
                                    disabled={isProcessing}
                                >
                                    <Text style={styles.secondaryButtonText}>Remove</Text>
                                </Pressable>
                            </>
                        )}
                        
                        {activeTab === 'Friend Requests' && (
                            <>
                                <Pressable 
                                    style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
                                    onPress={() => handleConfirmRequest(profile)}
                                    disabled={isProcessing}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {isProcessing ? 'Accepting...' : 'Confirm'}
                                    </Text>
                                </Pressable>
                                <Pressable 
                                    style={[styles.secondaryButton, isProcessing && styles.buttonDisabled]}
                                    onPress={() => handleRemoveAction(profile.uid)}
                                    disabled={isProcessing}
                                >
                                    <Text style={styles.secondaryButtonText}>Delete</Text>
                                </Pressable>
                            </>
                        )}

                        {activeTab === 'Your Friends' && (
                            <>
                                <Pressable 
                                    style={styles.primaryButton}
                                    onPress={() => handleMessage(displayName)}
                                >
                                    <Text style={styles.primaryButtonText}>Message</Text>
                                </Pressable>
                                <Pressable 
                                    style={[styles.secondaryButton, isProcessing && styles.buttonDisabled]}
                                    onPress={() => handleRemoveAction(profile.uid)}
                                    disabled={isProcessing}
                                >
                                    <Text style={styles.secondaryButtonText}>
                                        {isProcessing ? 'Removing...' : 'Unfriend'}
                                    </Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, isMobile ? styles.containerMobile : styles.containerDesktop]}>
            <View style={[styles.sidebar, isMobile && styles.sidebarMobile]}>
                <Text style={styles.sidebarTitle}>Friends</Text>
                
                <Pressable 
                    style={[styles.menuItem, activeTab === 'Suggestions' && styles.menuItemActive]}
                    onPress={() => setActiveTab('Suggestions')}
                >
                    <View style={styles.menuIconWrapper}>
                        <Text style={styles.menuIcon}>👥</Text>
                    </View>
                    <Text style={styles.menuText}>Suggestions</Text>
                </Pressable>

                <Pressable 
                    style={[styles.menuItem, activeTab === 'Friend Requests' && styles.menuItemActive]}
                    onPress={() => setActiveTab('Friend Requests')}
                >
                    <View style={styles.menuIconWrapper}>
                        <Text style={styles.menuIcon}>📥</Text>
                    </View>
                    <Text style={styles.menuText}>Friend requests</Text>
                </Pressable>

                <Pressable 
                    style={[styles.menuItem, activeTab === 'Your Friends' && styles.menuItemActive]}
                    onPress={() => setActiveTab('Your Friends')}
                >
                    <View style={styles.menuIconWrapper}>
                        <Text style={styles.menuIcon}>👤</Text>
                    </View>
                    <Text style={styles.menuText}>All friends</Text>
                </Pressable>
            </View>

            <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{activeTab}</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={`Search ${activeTab.toLowerCase()}...`}
                        placeholderTextColor={Colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>Loading people...</Text>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {displayedUsers.length > 0 ? (
                            displayedUsers.map(u => renderCard(u))
                        ) : (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconContainer}>
                                    <Text style={styles.emptyIcon}>!</Text>
                                </View>
                                <Text style={styles.emptyText}>
                                    {activeTab === 'Your Friends' 
                                        ? "You don't have any friends yet." 
                                        : activeTab === 'Friend Requests'
                                        ? "No pending friend requests."
                                        : "No suggestions found."}
                                </Text>
                                
                                {activeTab === 'Your Friends' && (
                                    <Pressable 
                                        style={styles.findFriendsButton}
                                        onPress={() => setActiveTab('Suggestions')}
                                    >
                                        <Text style={styles.findFriendsText}>Find Friends</Text>
                                    </Pressable>
                                )}
                            </View>
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        flexWrap: 'wrap',
    },
    sidebarTitle: {
        fontFamily: Fonts.black,
        fontSize: 22,
        color: Colors.text,
        marginBottom: Spacing.lg,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.medium,
        marginBottom: Spacing.sm,
        marginRight: Spacing.sm,
    },
    menuItemActive: {
        backgroundColor: Colors.accent,
    },
    menuIconWrapper: {
        width: 35,
        height: 35,
        borderRadius: Radius.round,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuIcon: {
        fontSize: 16,
    },
    menuText: {
        fontFamily: Fonts.bold,
        fontSize: 15,
        color: Colors.text,
    },
    mainContent: {
        flex: 1,
        padding: Spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    headerTitle: {
        fontFamily: Fonts.black,
        fontSize: 20,
        color: Colors.text,
    },
    searchInput: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.round,
        paddingHorizontal: 16,
        paddingVertical: 10,
        width: 250,
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.text,
        outlineStyle: 'none',
    } as any,
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        justifyContent: 'flex-start',
    },
    card: {
        width: 210,
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        marginBottom: Spacing.md,
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
        borderRadius: 40,
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
    cardMutual: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
        marginBottom: 15,
    },
    cardActions: {
        width: '100%',
        gap: 8,
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 8,
        borderRadius: Radius.medium,
        alignItems: 'center',
    },
    primaryButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: '#FFFFFF',
    },
    secondaryButton: {
        backgroundColor: Colors.accent,
        paddingVertical: 8,
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
        marginTop: 10,
    },
    emptyContainer: {
        width: '100%',
        paddingVertical: 80,
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
        fontSize: 16,
        color: Colors.text,
        marginBottom: Spacing.lg,
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
        color: '#FFFFFF',
    },
});