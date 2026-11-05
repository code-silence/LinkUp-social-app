
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    limit,
    startAfter,
    runTransaction,
    increment,
    serverTimestamp,
    QueryDocumentSnapshot,
    DocumentData,
} from 'firebase/firestore';

import { db } from './firebase';
import { UserProfile } from './user';

export type ConnectionStatus =
    | 'pending_sent'
    | 'pending_received'
    | 'accepted';

const SUGGESTION_LIMIT = 10;
const FETCH_BATCH_SIZE = 50;
const CONNECTION_LIMIT = 100;

const getProfilesByIds = async (
    userIds: string[],
): Promise<UserProfile[]> => {
    const uniqueIds = [...new Set(userIds)];

    const profiles = await Promise.all(
        uniqueIds.map(async uid => {
            const snapshot = await getDoc(doc(db, 'users', uid));

            if (!snapshot.exists()) return null;

            return {
                ...snapshot.data(),
                uid: snapshot.id,
            } as UserProfile;
        }),
    );

    return profiles.filter(
        (profile): profile is UserProfile => profile !== null,
    );
};

// Returns at most 10 users who have no existing connection.
export const getSuggestions = async (
    currentUserId: string,
): Promise<UserProfile[]> => {
    const connectionsRef = collection(
        db,
        'users',
        currentUserId,
        'connections',
    );

    const connectionsSnapshot = await getDocs(connectionsRef);

    const existingIds = new Set(
        connectionsSnapshot.docs.map(snapshot => snapshot.id),
    );

    const usersRef = collection(db, 'users');

    const suggestions: UserProfile[] = [];
    let lastDocument:
        | QueryDocumentSnapshot<DocumentData>
        | undefined;

    while (suggestions.length < SUGGESTION_LIMIT) {
        const usersQuery = lastDocument
            ? query(
                  usersRef,
                  startAfter(lastDocument),
                  limit(FETCH_BATCH_SIZE),
              )
            : query(usersRef, limit(FETCH_BATCH_SIZE));

        const snapshot = await getDocs(usersQuery);

        if (snapshot.empty) break;

        for (const userDoc of snapshot.docs) {
            if (
                userDoc.id === currentUserId ||
                existingIds.has(userDoc.id)
            ) {
                continue;
            }

            suggestions.push({
                ...userDoc.data(),
                uid: userDoc.id,
            } as UserProfile);

            if (suggestions.length >= SUGGESTION_LIMIT) break;
        }

        lastDocument = snapshot.docs[snapshot.docs.length - 1];

        if (snapshot.docs.length < FETCH_BATCH_SIZE) break;
    }

    return suggestions;
};

// Send a friend request.
export const sendFriendRequest = async (
    currentUserId: string,
    targetUserId: string,
): Promise<void> => {
    if (
        !currentUserId ||
        !targetUserId ||
        currentUserId === targetUserId
    ) {
        throw new Error('Invalid user ID.');
    }

    const currentRef = doc(
        db,
        'users',
        currentUserId,
        'connections',
        targetUserId,
    );

    const targetRef = doc(
        db,
        'users',
        targetUserId,
        'connections',
        currentUserId,
    );

    await runTransaction(db, async transaction => {
        const [currentSnap, targetSnap] = await Promise.all([
            transaction.get(currentRef),
            transaction.get(targetRef),
        ]);

        const currentStatus = currentSnap.data()?.status;
        const targetStatus = targetSnap.data()?.status;

        if (
            currentStatus === 'accepted' ||
            targetStatus === 'accepted'
        ) {
            throw new Error('You are already friends.');
        }

        if (currentStatus === 'pending_sent') {
            throw new Error('You have already sent a request.');
        }

        if (currentStatus === 'pending_received') {
            throw new Error(
                'This user has already sent you a request. Accept it instead.',
            );
        }

        const timestamp = serverTimestamp();

        transaction.set(currentRef, {
            uid: targetUserId,
            status: 'pending_sent',
            timestamp,
        });

        transaction.set(targetRef, {
            uid: currentUserId,
            status: 'pending_received',
            timestamp,
        });
    });
};

// Accept an incoming friend request.
export const acceptFriendRequest = async (
    currentUserId: string,
    requesterId: string,
): Promise<void> => {
    if (
        !currentUserId ||
        !requesterId ||
        currentUserId === requesterId
    ) {
        throw new Error('Invalid user ID.');
    }

    const currentRef = doc(
        db,
        'users',
        currentUserId,
        'connections',
        requesterId,
    );

    const requesterRef = doc(
        db,
        'users',
        requesterId,
        'connections',
        currentUserId,
    );

    const currentProfileRef = doc(db, 'users', currentUserId);
    const requesterProfileRef = doc(db, 'users', requesterId);

    await runTransaction(db, async transaction => {
        const [
            currentSnap,
            requesterSnap,
            currentProfileSnap,
            requesterProfileSnap,
        ] = await Promise.all([
            transaction.get(currentRef),
            transaction.get(requesterRef),
            transaction.get(currentProfileRef),
            transaction.get(requesterProfileRef),
        ]);

        if (
            currentSnap.data()?.status !== 'pending_received' ||
            requesterSnap.data()?.status !== 'pending_sent'
        ) {
            throw new Error(
                'This friend request is no longer available.',
            );
        }

        const timestamp = serverTimestamp();

        transaction.set(currentRef, {
            uid: requesterId,
            status: 'accepted',
            timestamp,
        });

        transaction.set(requesterRef, {
            uid: currentUserId,
            status: 'accepted',
            timestamp,
        });

        if (currentProfileSnap.exists()) {
            transaction.update(currentProfileRef, {
                friendsCount: increment(1),
            });
        }

        if (requesterProfileSnap.exists()) {
            transaction.update(requesterProfileRef, {
                friendsCount: increment(1),
            });
        }
    });
};

// Decline a request, cancel a sent request, or unfriend.
export const removeConnection = async (
    currentUserId: string,
    targetUserId: string,
): Promise<void> => {
    if (
        !currentUserId ||
        !targetUserId ||
        currentUserId === targetUserId
    ) {
        throw new Error('Invalid user ID.');
    }

    const currentRef = doc(
        db,
        'users',
        currentUserId,
        'connections',
        targetUserId,
    );

    const targetRef = doc(
        db,
        'users',
        targetUserId,
        'connections',
        currentUserId,
    );

    const currentProfileRef = doc(db, 'users', currentUserId);
    const targetProfileRef = doc(db, 'users', targetUserId);

    await runTransaction(db, async transaction => {
        const [
            currentSnap,
            targetSnap,
            currentProfileSnap,
            targetProfileSnap,
        ] = await Promise.all([
            transaction.get(currentRef),
            transaction.get(targetRef),
            transaction.get(currentProfileRef),
            transaction.get(targetProfileRef),
        ]);

        const wasAccepted =
            currentSnap.data()?.status === 'accepted' ||
            targetSnap.data()?.status === 'accepted';

        transaction.delete(currentRef);
        transaction.delete(targetRef);

        if (wasAccepted) {
            if (currentProfileSnap.exists()) {
                transaction.update(currentProfileRef, {
                    friendsCount: increment(-1),
                });
            }

            if (targetProfileSnap.exists()) {
                transaction.update(targetProfileRef, {
                    friendsCount: increment(-1),
                });
            }
        }
    });
};

// Get users by their connection status.
export const getUsersByConnectionStatus = async (
    currentUserId: string,
    desiredStatus: ConnectionStatus,
): Promise<UserProfile[]> => {
    const connectionsRef = collection(
        db,
        'users',
        currentUserId,
        'connections',
    );

    const connectionsQuery = query(
        connectionsRef,
        where('status', '==', desiredStatus),
        limit(CONNECTION_LIMIT),
    );

    const snapshot = await getDocs(connectionsQuery);

    const userIds = snapshot.docs.map(
        connection => connection.data().uid || connection.id,
    );

    return getProfilesByIds(userIds);
};

export const getFriends = (uid: string) =>
    getUsersByConnectionStatus(uid, 'accepted');

export const getIncomingRequests = (uid: string) =>
    getUsersByConnectionStatus(uid, 'pending_received');

export const getOutgoingRequests = (uid: string) =>
    getUsersByConnectionStatus(uid, 'pending_sent');
