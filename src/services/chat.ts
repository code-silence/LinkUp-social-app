
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limitToLast,
    serverTimestamp,
    runTransaction,
    increment,
    writeBatch,
    updateDoc,
    Timestamp,
} from 'firebase/firestore';

import { db } from './firebase';

// Types

export interface Chat {
    id: string;
    participants: string[];
    lastMessage: string;
    lastMessageAt: Timestamp | null;
    lastMessageSenderId: string | null;
    unreadCounts: Record<string, number>;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    recipientId: string;
    text: string;
    createdAt: Timestamp | null;
    deliveredAt: Timestamp | null;
    seenAt: Timestamp | null;
}

// Helpers

export const getChatId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
};

const getFriendConnection = async (
    userId: string,
    otherUserId: string,
) => {
    const connectionRef = doc(
        db,
        'users',
        userId,
        'connections',
        otherUserId,
    );

    const connectionSnap = await getDoc(connectionRef);

    return connectionSnap.exists() &&
        connectionSnap.data().status === 'accepted';
};

// Create or retrieve a conversation

export const getOrCreateChat = async (
    currentUserId: string,
    otherUserId: string,
): Promise<string> => {
    if (currentUserId === otherUserId) {
        throw new Error('You cannot chat with yourself.');
    }

    const chatId = getChatId(currentUserId, otherUserId);
    const chatRef = doc(db, 'chats', chatId);

    const chatSnap = await getDoc(chatRef);

    // Existing conversations remain accessible.
    if (chatSnap.exists()) {
        const participants = chatSnap.data().participants as string[];

        if (
            !participants.includes(currentUserId) ||
            !participants.includes(otherUserId)
        ) {
            throw new Error('Invalid conversation.');
        }

        return chatId;
    }

    // Only accepted friends can start new conversations.
    const areFriends = await getFriendConnection(
        currentUserId,
        otherUserId,
    );

    if (!areFriends) {
        throw new Error('You can only chat with accepted friends.');
    }

    await setDoc(chatRef, {
        participants: [currentUserId, otherUserId],
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: null,
        unreadCounts: {
            [currentUserId]: 0,
            [otherUserId]: 0,
        },
        createdAt: serverTimestamp(),
    });

    return chatId;
};


// Get the other participant's ID from an existing conversation
export const getOtherParticipantId = async (
    chatId: string,
    currentUserId: string,
): Promise<string | null> => {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        return null;
    }

    const participants = chatSnap.data().participants as string[];

    if (!participants.includes(currentUserId)) {
        return null;
    }

    return participants.find(id => id !== currentUserId) || null;
};


// Subscribe to user's conversations

export const subscribeToChats = (
    userId: string,
    callback: (chats: Chat[]) => void,
    onError?: (error: Error) => void,
) => {
    const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('lastMessageAt', 'desc'),
    );

    return onSnapshot(
        chatsQuery,
        (snapshot) => {
            const chats = snapshot.docs.map((chatDoc) => ({
                id: chatDoc.id,
                ...chatDoc.data(),
            })) as Chat[];

            callback(chats);
        },
        (error) => onError?.(error),
    );
};

// Subscribe to conversation messages

export const subscribeToMessages = (
    chatId: string,
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void,
) => {
    const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc'),
        limitToLast(50),
    );

    return onSnapshot(
        messagesQuery,
        (snapshot) => {
            const messages = snapshot.docs.map((messageDoc) => ({
                id: messageDoc.id,
                ...messageDoc.data(),
            })) as ChatMessage[];

            callback(messages);
        },
        (error) => onError?.(error),
    );
};

// Send a message

export const sendMessage = async (
    chatId: string,
    senderId: string,
    text: string,
) => {
    const messageText = text.trim();

    if (!messageText) {
        throw new Error('Message cannot be empty.');
    }

    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        throw new Error('Conversation not found.');
    }

    const participants = chatSnap.data().participants as string[];

    if (!participants.includes(senderId)) {
        throw new Error('You are not part of this conversation.');
    }

    const recipientId = participants.find(
        (id) => id !== senderId,
    );

    if (!recipientId) {
        throw new Error('Invalid conversation participants.');
    }

    const areFriends = await getFriendConnection(
        senderId,
        recipientId,
    );

    if (!areFriends) {
        throw new Error('You must be friends to send messages.');
    }

    const messageRef = doc(
        collection(db, 'chats', chatId, 'messages'),
    );

    await runTransaction(db, async (transaction) => {
        const currentChat = await transaction.get(chatRef);

        if (!currentChat.exists()) {
            throw new Error('Conversation not found.');
        }

        transaction.set(messageRef, {
            senderId,
            recipientId,
            text: messageText,
            createdAt: serverTimestamp(),
            deliveredAt: null,
            seenAt: null,
        });

        transaction.update(chatRef, {
            lastMessage: messageText,
            lastMessageAt: serverTimestamp(),
            lastMessageSenderId: senderId,
            [`unreadCounts.${recipientId}`]: increment(1),
        });
    });

    return messageRef.id;
};

// Mark incoming messages as delivered

export const markMessagesDelivered = async (
    chatId: string,
    userId: string,
) => {
    const messagesRef = collection(
        db,
        'chats',
        chatId,
        'messages',
    );

    const messagesQuery = query(
        messagesRef,
        where('recipientId', '==', userId),
        where('deliveredAt', '==', null),
    );

    const snapshot = await getDocs(messagesQuery);

    if (snapshot.empty) return;

    const batch = writeBatch(db);

    snapshot.docs.forEach((messageDoc) => {
        batch.update(messageDoc.ref, {
            deliveredAt: serverTimestamp(),
        });
    });

    await batch.commit();
};

// Mark incoming messages as seen

export const markMessagesSeen = async (
    chatId: string,
    userId: string,
) => {
    const messagesRef = collection(
        db,
        'chats',
        chatId,
        'messages',
    );

    const messagesQuery = query(
        messagesRef,
        where('recipientId', '==', userId),
        where('seenAt', '==', null),
    );

    const snapshot = await getDocs(messagesQuery);

    const batch = writeBatch(db);

    snapshot.docs.forEach((messageDoc) => {
        batch.update(messageDoc.ref, {
            deliveredAt: messageDoc.data().deliveredAt ?? serverTimestamp(),
            seenAt: serverTimestamp(),
        });
    });

    const chatRef = doc(db, 'chats', chatId);

    batch.update(chatRef, {
        [`unreadCounts.${userId}`]: 0,
    });

    await batch.commit();
};
