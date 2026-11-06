import {
    collection,
    doc,
    setDoc,
    updateDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    getFirestore,
} from 'firebase/firestore';

const db = getFirestore();

export interface AppNotification {
    id: string;
    senderId: string;
    senderName: string;
    senderPhotoURL?: string;
    type: 'like' | 'comment' | 'friend_request';
    message: string;
    postId?: string; // Added postId to link notification to a specific post
    read: boolean;
    createdAt: any;
}

/**
 * Send a notification to a specific user's notifications subcollection
 */
export const sendNotification = async (
    recipientId: string,
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
): Promise<void> => {
    if (!recipientId || recipientId === notification.senderId) return;

    try {
        const notifRef = doc(collection(db, 'users', recipientId, 'notifications'));
        await setDoc(notifRef, {
            ...notification,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

/**
 * Real-time subscription to fetch notifications for the current user
 */
export const subscribeToNotifications = (
    userId: string,
    onUpdate: (notifications: AppNotification[]) => void,
    onError: (error: Error) => void
) => {
    const notifRef = collection(db, 'users', userId, 'notifications');
    const q = query(notifRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
        q,
        snapshot => {
            const list: AppNotification[] = [];
            snapshot.forEach(docSnap => {
                list.push({
                    id: docSnap.id,
                    ...docSnap.data(),
                } as AppNotification);
            });
            onUpdate(list);
        },
        error => onError(error)
    );
};

/**
 * Mark a specific notification as read
 */
export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<void> => {
    try {
        const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
        await updateDoc(notifRef, { read: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};