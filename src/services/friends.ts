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
    serverTimestamp
} from 'firebase/firestore';
import { UserProfile } from './user';

const db = getFirestore();

export interface FriendConnection {
    uid: string;
    status: 'pending_sent' | 'pending_received' | 'accepted';
    timestamp: any;
}

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
            // FORCE the uid to be the document ID so it is NEVER undefined
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

export const acceptFriendRequest = async (currentUserId: string, requesterId: string): Promise<void> => {
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
    } catch (error) {
        console.error('Error accepting friend request:', error);
        throw error;
    }
};

export const removeConnection = async (currentUserId: string, targetUserId: string): Promise<void> => {
    if (!currentUserId || !targetUserId) throw new Error("Missing user ID");
    try {
        const currentUserRef = doc(db, 'users', currentUserId, 'connections', targetUserId);
        await deleteDoc(currentUserRef);

        const targetUserRef = doc(db, 'users', targetUserId, 'connections', currentUserId);
        await deleteDoc(targetUserRef);
    } catch (error) {
        console.error('Error removing connection:', error);
        throw error;
    }
};

export const getUsersByConnectionStatus = async (
    currentUserId: string, 
    desiredStatus: 'accepted' | 'pending_received'
): Promise<UserProfile[]> => {
    try {
        const connectionsRef = collection(db, 'users', currentUserId, 'connections');
        const q = query(connectionsRef, where('status', '==', desiredStatus));
        const snap = await getDocs(q);

        if (snap.empty) return [];

        const userIds: string[] = [];
        snap.forEach(docSnap => {
            // Ensure we get the ID even if the document payload is missing the uid field
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
                // FORCE the uid to be the document ID
                users.push({ ...userSnap.data(), uid: userSnap.id } as UserProfile);
            }
        }

        return users;
    } catch (error) {
        console.error(`Error fetching users with status ${desiredStatus}:`, error);
        throw error;
    }
};