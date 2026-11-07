import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    query,
    where,
    getFirestore,
    serverTimestamp,
    updateDoc,
    increment,
} from 'firebase/firestore';
import { UserProfile } from './user';
import { sendNotification } from './notifications';

const db = getFirestore();

export type ConnectionStatus = 'pending_sent' | 'pending_received' | 'accepted';

export interface FriendConnection {
    uid: string;
    status: ConnectionStatus;
    timestamp: any;
}

/**
 * Fetch all users for suggestions, excluding current user and existing connections
 */
export const getSuggestions = async (currentUserId: string): Promise<UserProfile[]> => {
    try {
        const connectionsRef = collection(db, 'users', currentUserId, 'connections');
        const connectionsSnap = await getDocs(connectionsRef);
        const existingConnectionIds = new Set<string>();
        connectionsSnap.forEach(docSnap => {
            existingConnectionIds.add(docSnap.id);
        });

        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);

        const suggestions: UserProfile[] = [];
        querySnapshot.forEach((docSnap) => {
            const userData = { ...docSnap.data(), uid: docSnap.id } as UserProfile;

            if (
                userData.uid &&
                userData.uid !== currentUserId &&
                !existingConnectionIds.has(userData.uid)
            ) {
                suggestions.push(userData);
            }
        });

        return suggestions;
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        throw error;
    }
};

/**
 * Send a friend request to a target user
 */
export const sendFriendRequest = async (currentUserId: string, targetUserId: string): Promise<void> => {
    if (!currentUserId || !targetUserId) throw new Error("Missing user ID");
    try {
        const timestamp = serverTimestamp();

        const currentUserRef = doc(db, 'users', currentUserId, 'connections', targetUserId);
        await setDoc(currentUserRef, {
            uid: targetUserId,
            status: 'pending_sent',
            timestamp: timestamp
        }, { merge: true });

        const targetUserRef = doc(db, 'users', targetUserId, 'connections', currentUserId);
        await setDoc(targetUserRef, {
            uid: currentUserId,
            status: 'pending_received',
            timestamp: timestamp
        }, { merge: true });
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw error;
    }
};

export const getConnectionStatus = async (
    currentUserId: string,
    targetUserId: string,
): Promise<ConnectionStatus | null> => {
    const connectionRef = doc(
        db,
        'users',
        currentUserId,
        'connections',
        targetUserId,
    );

    const snapshot = await getDoc(connectionRef);

    if (!snapshot.exists()) return null;

    return snapshot.data().status as ConnectionStatus;
};

/**
 * Accept a friend request, update connections, and increment friendsCount for both users
 */
export const acceptFriendRequest = async (
    currentUserId: string,
    requesterId: string,
    currentUserProfile?: UserProfile
): Promise<void> => {
    if (!currentUserId || !requesterId) throw new Error("Missing user ID");
    try {
        const timestamp = serverTimestamp();

        const currentUserRef = doc(db, 'users', currentUserId, 'connections', requesterId);
        await setDoc(currentUserRef, {
            uid: requesterId,
            status: 'accepted',
            timestamp: timestamp
        }, { merge: true });

        const requesterUserRef = doc(db, 'users', requesterId, 'connections', currentUserId);
        await setDoc(requesterUserRef, {
            uid: currentUserId,
            status: 'accepted',
            timestamp: timestamp
        }, { merge: true });

        // Increment friendsCount for both users safely
        const currentUserDocRef = doc(db, 'users', currentUserId);
        const currentUserSnap = await getDoc(currentUserDocRef);
        const currentCount1 = currentUserSnap.exists() ? (currentUserSnap.data().friendsCount || 0) : 0;
        await updateDoc(currentUserDocRef, { friendsCount: currentCount1 + 1 });

        const requesterDocRef = doc(db, 'users', requesterId);
        const requesterSnap = await getDoc(requesterDocRef);
        const currentCount2 = requesterSnap.exists() ? (requesterSnap.data().friendsCount || 0) : 0;
        await updateDoc(requesterDocRef, { friendsCount: currentCount2 + 1 });

        // Send notification to the requester that their request was accepted
        await sendNotification(requesterId, {
            senderId: currentUserId,
            senderName: currentUserProfile?.name || 'Someone',
            senderPhotoURL: currentUserProfile?.photoURL || '',
            type: 'friend_request',
            message: `accepted your friend request. You are now friends.`,
            postId: '',
        });
    } catch (error) {
        console.error('Error accepting friend request:', error);
        throw error;
    }
};

/**
 * Remove or decline a connection between users & decrement friendsCount safely (ensuring it never goes below 0)
 */
export const removeConnection = async (currentUserId: string, targetUserId: string): Promise<void> => {
    if (!currentUserId || !targetUserId) throw new Error("Missing user ID");
    try {
        const currentUserRef = doc(db, 'users', currentUserId, 'connections', targetUserId);
        const docSnap = await getDoc(currentUserRef);
        const wasAccepted = docSnap.exists() && docSnap.data().status === 'accepted';

        await deleteDoc(currentUserRef);

        const targetUserRef = doc(db, 'users', targetUserId, 'connections', currentUserId);
        await deleteDoc(targetUserRef);

        if (wasAccepted) {
            // Decrement friendsCount safely for current user (minimum 0)
            const currentUserDocRef = doc(db, 'users', currentUserId);
            const currentUserSnap = await getDoc(currentUserDocRef);
            if (currentUserSnap.exists()) {
                const currentCount = currentUserSnap.data().friendsCount || 0;
                await updateDoc(currentUserDocRef, { friendsCount: Math.max(0, currentCount - 1) });
            }

            // Decrement friendsCount safely for target user (minimum 0)
            const targetUserDocRef = doc(db, 'users', targetUserId);
            const targetUserSnap = await getDoc(targetUserDocRef);
            if (targetUserSnap.exists()) {
                const targetCount = targetUserSnap.data().friendsCount || 0;
                await updateDoc(targetUserDocRef, { friendsCount: Math.max(0, targetCount - 1) });
            }
        }
    } catch (error) {
        console.error('Error removing connection:', error);
        throw error;
    }
};

/**
 * Fetch users based on their connection status
 */
export const getUsersByConnectionStatus = async (
    currentUserId: string,
    desiredStatus: ConnectionStatus
): Promise<UserProfile[]> => {
    try {
        const connectionsRef = collection(db, 'users', currentUserId, 'connections');
        const q = query(connectionsRef, where('status', '==', desiredStatus));
        const snap = await getDocs(q);

        if (snap.empty) return [];

        const userIds: string[] = [];
        snap.forEach(docSnap => {
            const connectionUid = docSnap.data().uid || docSnap.id;
            if (connectionUid) {
                userIds.push(connectionUid);
            }
        });

        const users: UserProfile[] = [];
        for (const uid of userIds) {
            if (!uid) continue;

            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                users.push({ ...userSnap.data(), uid: userSnap.id } as UserProfile);
            }
        }

        return users;
    } catch (error) {
        console.error(`Error fetching users with status ${desiredStatus}:`, error);
        throw error;
    }
};