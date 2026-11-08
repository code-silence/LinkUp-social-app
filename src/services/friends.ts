import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    getFirestore,
} from 'firebase/firestore';
import { UserProfile } from './user';

const db = getFirestore();

export type ConnectionStatus = 'pending_sent' | 'pending_received' | 'accepted';

/**
 * Get IDs of users who are already friends or have pending requests with the current user
 */
const getConnectedUserIds = async (userId: string): Promise<string[]> => {
    const connectionsRef = collection(db, 'users', userId, 'connections');
    const snapshot = await getDocs(connectionsRef);
    const ids: string[] = [userId]; // Exclude self
    snapshot.forEach(docSnap => {
        ids.push(docSnap.id);
    });
    return ids;
};

/**
 * Get mutual friend count or list between current user and target user
 */
export const getMutualFriendsCount = async (currentUserId: string, targetUserId: string): Promise<number> => {
    try {
        const currentUserFriendsRef = collection(db, 'users', currentUserId, 'connections');
        const targetUserFriendsRef = collection(db, 'users', targetUserId, 'connections');

        const [currentSnapshot, targetSnapshot] = await Promise.all([
            getDocs(currentUserFriendsRef),
            getDocs(targetUserFriendsRef),
        ]);

        const currentUserFriendIds = new Set<string>();
        currentSnapshot.forEach(docSnap => {
            if (docSnap.data().status === 'accepted') {
                currentUserFriendIds.add(docSnap.id);
            }
        });

        let mutualCount = 0;
        targetSnapshot.forEach(docSnap => {
            if (docSnap.data().status === 'accepted' && currentUserFriendIds.has(docSnap.id)) {
                mutualCount++;
            }
        });

        return mutualCount;
    } catch (error) {
        console.error('Error calculating mutual friends:', error);
        return 0;
    }
};

/**
 * Get suggestions for friends. By default, returns users with mutual friends > 0.
 * When searching, can query all non-connected users.
 */
export const getSuggestions = async (userId: string, searchQuery: string = ''): Promise<UserProfile[]> => {
    try {
        const connectedIds = await getConnectedUserIds(userId);
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const allUsers: UserProfile[] = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data() as UserProfile;
            const targetId = docSnap.id;
            if (!connectedIds.includes(targetId)) {
                allUsers.push({
                    ...data,
                    uid: targetId,
                });
            }
        });

        const search = searchQuery.trim().toLowerCase();

        // If user is searching, filter from all non-connected users
        if (search) {
            return allUsers.filter(user => {
                const name = (user.name || '').toLowerCase();
                const username = (user.username || '').toLowerCase();
                return name.includes(search) || username.includes(search);
            });
        }

        // Otherwise (default suggestion view), filter users who have at least 1 mutual friend
        const suggestionsWithMutual: UserProfile[] = [];
        for (const user of allUsers) {
            const mutualCount = await getMutualFriendsCount(userId, user.uid);
            if (mutualCount > 0) {
                suggestionsWithMutual.push(user);
            }
        }

        return suggestionsWithMutual;
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }
};

/**
 * Get users by connection status (accepted, pending_sent, pending_received)
 */
export const getUsersByConnectionStatus = async (
    userId: string,
    status: ConnectionStatus
): Promise<UserProfile[]> => {
    try {
        const connectionsRef = collection(db, 'users', userId, 'connections');
        const q = query(connectionsRef, where('status', '==', status));
        const snapshot = await getDocs(q);

        const profiles: UserProfile[] = [];
        for (const docSnap of snapshot.docs) {
            const targetUserId = docSnap.id;
            const userDoc = await getDoc(doc(db, 'users', targetUserId));
            if (userDoc.exists()) {
                profiles.push({
                    ...(userDoc.data() as UserProfile),
                    uid: targetUserId,
                });
            }
        }
        return profiles;
    } catch (error) {
        console.error('Error fetching connections by status:', error);
        return [];
    }
};

/**
 * Send a friend request
 */
export const sendFriendRequest = async (currentUserId: string, targetUserId: string): Promise<void> => {
    try {
        const currentUserRef = doc(db, 'users', currentUserId, 'connections', targetUserId);
        const targetUserRef = doc(db, 'users', targetUserId, 'connections', currentUserId);

        await Promise.all([
            setDoc(currentUserRef, {
                status: 'pending_sent',
                updatedAt: serverTimestamp(),
            }),
            setDoc(targetUserRef, {
                status: 'pending_received',
                updatedAt: serverTimestamp(),
            }),
        ]);
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw error;
    }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (
    currentUserId: string,
    targetUserId: string,
    currentUserProfile?: UserProfile
): Promise<void> => {
    try {
        const currentUserRef = doc(db, 'users', currentUserId, 'connections', targetUserId);
        const targetUserRef = doc(db, 'users', targetUserId, 'connections', currentUserId);

        await Promise.all([
            setDoc(currentUserRef, {
                status: 'accepted',
                updatedAt: serverTimestamp(),
            }),
            setDoc(targetUserRef, {
                status: 'accepted',
                updatedAt: serverTimestamp(),
            }),
        ]);
    } catch (error) {
        console.error('Error accepting friend request:', error);
        throw error;
    }
};

/**
 * Remove a connection or cancel/decline a request
 */
export const removeConnection = async (currentUserId: string, targetUserId: string): Promise<void> => {
    try {
        const currentUserRef = doc(db, 'users', currentUserId, 'connections', targetUserId);
        const targetUserRef = doc(db, 'users', targetUserId, 'connections', currentUserId);

        await Promise.all([
            deleteDoc(currentUserRef),
            deleteDoc(targetUserRef),
        ]);
    } catch (error) {
        console.error('Error removing connection:', error);
        throw error;
    }
};

/**
 * Check connection status between two users
 */
export const getConnectionStatus = async (
    currentUserId: string,
    targetUserId: string
): Promise<ConnectionStatus | null> => {
    try {
        const ref = doc(db, 'users', currentUserId, 'connections', targetUserId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            return snap.data().status as ConnectionStatus;
        }
        return null;
    } catch (error) {
        console.error('Error checking connection status:', error);
        return null;
    }
};

/**
 * Real-time subscription to check if there are pending received friend requests
 */
export const subscribeToPendingFriendRequests = (
    userId: string,
    onUpdate: (hasPending: boolean) => void,
    onError: (error: Error) => void
) => {
    const connectionsRef = collection(db, 'users', userId, 'connections');
    const q = query(connectionsRef, where('status', '==', 'pending_received'));

    // Note: onSnapshot can be attached to query if imported properly, or we can use getDocs polling / simple listener
    // Here we use standard snapshot on collection and filter locally for maximum compatibility
    import('firebase/firestore').then(({ onSnapshot }) => {
        return onSnapshot(
            q,
            snapshot => {
                onUpdate(!snapshot.empty);
            },
            error => onError(error)
        );
    });

    return () => {};
};