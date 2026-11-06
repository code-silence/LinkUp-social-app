import {
    collection,
    doc,
    setDoc,
    addDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    getFirestore,
    getDocs,
    where,
    increment,
    updateDoc,
} from 'firebase/firestore';
import { sendNotification } from './notifications';

const db = getFirestore();

export type ReactionType = 'love' | 'haha' | 'angry' | 'wow' | 'sad' | 'like';

export interface PostAuthor {
    uid: string;
    name: string;
    username: string;
    photoURL?: string;
}

export interface Post {
    id: string;
    authorId: string;
    author: PostAuthor;
    text: string;
    imageURL?: string;
    createdAt: any;
    reactionCounts?: Partial<Record<ReactionType, number>>;
    commentCount?: number;
}

export interface PostComment {
    id: string;
    author: PostAuthor;
    text: string;
    createdAt: any;
}

export interface PostReactionWithAuthor {
    uid: string;
    type: ReactionType;
    author: PostAuthor;
}

/**
 * Create a new post in Firestore
 */
export const createPost = async (
    author: PostAuthor,
    text: string,
    imageURL?: string
): Promise<string> => {
    try {
        const postRef = doc(collection(db, 'posts'));
        await setDoc(postRef, {
            authorId: author.uid,
            author,
            text,
            imageURL: imageURL || '',
            createdAt: serverTimestamp(),
            reactionCounts: {},
            commentCount: 0,
        });
        return postRef.id;
    } catch (error) {
        console.error('Error creating post:', error);
        throw error;
    }
};

/**
 * Subscribe to global feed posts in real-time
 */
export const subscribeToFeed = (
    onUpdate: (posts: Post[]) => void,
    onError: (error: Error) => void
) => {
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
        q,
        snapshot => {
            const list: Post[] = [];
            snapshot.forEach(docSnap => {
                list.push({
                    id: docSnap.id,
                    ...docSnap.data(),
                } as Post);
            });
            onUpdate(list);
        },
        error => onError(error)
    );
};

/**
 * Subscribe to posts created by a specific user
 */
export const subscribeToUserPosts = (
    userId: string,
    onUpdate: (posts: Post[]) => void,
    onError: (error: Error) => void
) => {
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, where('authorId', '==', userId), orderBy('createdAt', 'desc'));

    return onSnapshot(
        q,
        snapshot => {
            const list: Post[] = [];
            snapshot.forEach(docSnap => {
                list.push({
                    id: docSnap.id,
                    ...docSnap.data(),
                } as Post);
            });
            onUpdate(list);
        },
        error => onError(error)
    );
};

/**
 * Set or update a reaction on a post & trigger notification with reaction type
 */
export const setPostReaction = async (
    postId: string,
    postAuthorId: string,
    currentUser: PostAuthor,
    type: ReactionType
): Promise<void> => {
    try {
        const reactionRef = doc(db, 'posts', postId, 'reactions', currentUser.uid);
        const postRef = doc(db, 'posts', postId);

        const oldReactionSnap = await getDocs(
            query(collection(db, 'posts', postId, 'reactions'), where('uid', '==', currentUser.uid))
        );

        let previousType: ReactionType | null = null;
        if (!oldReactionSnap.empty) {
            previousType = oldReactionSnap.docs[0].data().type as ReactionType;
        }

        if (previousType === type) {
            await deleteDoc(reactionRef);
            await updateDoc(postRef, {
                [`reactionCounts.${type}`]: increment(-1),
            });
        } else {
            await setDoc(reactionRef, {
                uid: currentUser.uid,
                type,
                author: currentUser,
            });

            const updates: any = { [`reactionCounts.${type}`]: increment(1) };
            if (previousType) {
                updates[`reactionCounts.${previousType}`] = increment(-1);
            }
            await updateDoc(postRef, updates);

            // Map reaction type to friendly display label
            const reactionLabels: Record<ReactionType, string> = {
                love: 'Love 💖',
                haha: 'Haha 😂',
                angry: 'Angry 😡',
                wow: 'Wow 😮',
                sad: 'Sad 😢',
                like: 'Like 👍',
            };

            const reactionText = reactionLabels[type] || type;

            // Send notification with specific reaction type to post owner
            await sendNotification(postAuthorId, {
                senderId: currentUser.uid,
                senderName: currentUser.name,
                senderPhotoURL: currentUser.photoURL || '',
                type: 'like',
                message: `reacted with ${reactionText} to your post.`,
                postId: postId,
            });
        }
    } catch (error) {
        console.error('Error setting reaction:', error);
        throw error;
    }
};

export const subscribeToUserReaction = (
    postId: string,
    userId: string,
    onUpdate: (type: ReactionType | null) => void
) => {
    const reactionRef = doc(db, 'posts', postId, 'reactions', userId);
    return onSnapshot(reactionRef, docSnap => {
        if (docSnap.exists()) {
            onUpdate(docSnap.data().type as ReactionType);
        } else {
            onUpdate(null);
        }
    });
};

export const subscribeToPostReactions = (
    postId: string,
    onUpdate: (reactions: PostReactionWithAuthor[]) => void,
    onError: (error: Error) => void
) => {
    const reactionsRef = collection(db, 'posts', postId, 'reactions');
    return onSnapshot(
        reactionsRef,
        snapshot => {
            const list: PostReactionWithAuthor[] = [];
            snapshot.forEach(docSnap => {
                list.push(docSnap.data() as PostReactionWithAuthor);
            });
            onUpdate(list);
        },
        error => onError(error)
    );
};

/**
 * Add a comment to a post & trigger notification
 */
export const addPostComment = async (
    postId: string,
    postAuthorId: string,
    currentUser: PostAuthor,
    text: string
): Promise<void> => {
    try {
        const commentsRef = collection(db, 'posts', postId, 'comments');
        const postRef = doc(db, 'posts', postId);

        await addDoc(commentsRef, {
            author: currentUser,
            text,
            createdAt: serverTimestamp(),
        });

        await updateDoc(postRef, {
            commentCount: increment(1),
        });

        await sendNotification(postAuthorId, {
            senderId: currentUser.uid,
            senderName: currentUser.name,
            senderPhotoURL: currentUser.photoURL || '',
            type: 'comment',
            message: `commented on your post: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
            postId: postId,
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
};

export const subscribeToPostComments = (
    postId: string,
    onUpdate: (comments: PostComment[]) => void,
    onError: (error: Error) => void
) => {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
        q,
        snapshot => {
            const list: PostComment[] = [];
            snapshot.forEach(docSnap => {
                list.push({
                    id: docSnap.id,
                    ...docSnap.data(),
                } as PostComment);
            });
            onUpdate(list);
        },
        error => onError(error)
    );
};