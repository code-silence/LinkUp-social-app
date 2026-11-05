
import {
    addDoc,
    collection,
    doc,
    increment,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    where,
} from 'firebase/firestore';

import { db } from './firebase';

// -------------------- TYPES --------------------

export type ReactionType =
    | 'love'
    | 'haha'
    | 'angry'
    | 'clap'
    | 'sad';

export interface PostAuthor {
    uid: string;
    name: string;
    username: string;
    photoURL: string;
}

export interface Post {
    id: string;
    authorId: string;
    author: PostAuthor;
    text: string;
    imageURL: string;
    reactionCounts: Record<ReactionType, number>;
    commentCount: number;
    createdAt?: unknown;
    updatedAt?: unknown;
}

export interface PostComment {
    id: string;
    postId: string;
    author: PostAuthor;
    text: string;
    createdAt?: unknown;
}

export interface PostReaction {
    uid: string;
    type: ReactionType;
    createdAt?: unknown;
    updatedAt?: unknown;
}

export interface PostNotification {
    id: string;
    type: 'reaction' | 'comment';
    postId: string;
    actor: PostAuthor;
    reaction?: ReactionType;
    message: string;
    isRead: boolean;
    createdAt?: unknown;
}

const INITIAL_REACTION_COUNTS: Record<ReactionType, number> = {
    love: 0,
    haha: 0,
    angry: 0,
    clap: 0,
    sad: 0,
};

// -------------------- CREATE POST --------------------

export const createPost = async (
    author: PostAuthor,
    text: string,
    imageURL = '',
): Promise<string> => {
    const trimmedText = text.trim();

    if (!trimmedText && !imageURL) {
        throw new Error('Write something or select an image before posting.');
    }

    const postRef = await addDoc(collection(db, 'posts'), {
        authorId: author.uid,
        author,
        text: trimmedText,
        imageURL,
        reactionCounts: INITIAL_REACTION_COUNTS,
        commentCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return postRef.id;
};

// -------------------- FEED SUBSCRIPTION --------------------

export const subscribeToFeed = (
    callback: (posts: Post[]) => void,
    onError?: (error: Error) => void,
) => {
    const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(30),
    );

    return onSnapshot(
        postsQuery,
        snapshot => {
            const posts = snapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data(),
                }) as Post,
            );

            callback(posts);
        },
        error => onError?.(error),
    );
};

// -------------------- PROFILE POSTS --------------------

export const subscribeToUserPosts = (
    uid: string,
    callback: (posts: Post[]) => void,
    onError?: (error: Error) => void,
) => {
    const postsQuery = query(
        collection(db, 'posts'),
        where('authorId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(10),
    );

    return onSnapshot(
        postsQuery,
        snapshot => {
            const posts = snapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data(),
                }) as Post,
            );

            callback(posts);
        },
        error => onError?.(error),
    );
};

// -------------------- REACTIONS --------------------

export const setPostReaction = async (
    postId: string,
    authorId: string,
    actor: PostAuthor,
    reaction: ReactionType,
): Promise<void> => {
    const postRef = doc(db, 'posts', postId);
    const reactionRef = doc(
        db,
        'posts',
        postId,
        'reactions',
        actor.uid,
    );

    await runTransaction(db, async transaction => {
        const postSnapshot = await transaction.get(postRef);
        const reactionSnapshot = await transaction.get(reactionRef);

        if (!postSnapshot.exists()) {
            throw new Error('This post no longer exists.');
        }

        const existingReaction = reactionSnapshot.exists()
            ? reactionSnapshot.data() as PostReaction
            : null;

        // Tapping the same reaction removes it.
        if (existingReaction?.type === reaction) {
            transaction.delete(reactionRef);

            transaction.update(postRef, {
                [`reactionCounts.${reaction}`]: increment(-1),
                updatedAt: serverTimestamp(),
            });

            return;
        }

        const updates: Record<string, unknown> = {
            [`reactionCounts.${reaction}`]: increment(1),
            updatedAt: serverTimestamp(),
        };

        // Changing a reaction decrements the previous one.
        if (existingReaction) {
            updates[`reactionCounts.${existingReaction.type}`] =
                increment(-1);
        }

        transaction.set(reactionRef, {
            uid: actor.uid,
            type: reaction,
            createdAt: existingReaction?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        transaction.update(postRef, updates);

        // Don't notify users about their own reactions.
        if (authorId !== actor.uid) {
            const notificationRef = doc(
                collection(db, 'users', authorId, 'notifications'),
            );

            transaction.set(notificationRef, {
                type: 'reaction',
                postId,
                actor,
                reaction,
                message: `${actor.name} reacted to your post.`,
                isRead: false,
                createdAt: serverTimestamp(),
            });
        }
    });
};

// -------------------- USER'S REACTION --------------------

export const subscribeToUserReaction = (
    postId: string,
    uid: string,
    callback: (reaction: ReactionType | null) => void,
) => {
    const reactionRef = doc(
        db,
        'posts',
        postId,
        'reactions',
        uid,
    );

    return onSnapshot(reactionRef, snapshot => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }

        callback(snapshot.data().type as ReactionType);
    });
};

// -------------------- COMMENTS --------------------

export const addPostComment = async (
    postId: string,
    author: PostAuthor,
    text: string,
): Promise<string> => {
    const trimmedText = text.trim();

    if (!trimmedText) {
        throw new Error('Comment cannot be empty.');
    }

    const postRef = doc(db, 'posts', postId);
    const commentRef = doc(
        collection(db, 'posts', postId, 'comments'),
    );

    await runTransaction(db, async transaction => {
        const postSnapshot = await transaction.get(postRef);

        if (!postSnapshot.exists()) {
            throw new Error('This post no longer exists.');
        }

        const post = postSnapshot.data();

        transaction.set(commentRef, {
            postId,
            author,
            text: trimmedText,
            createdAt: serverTimestamp(),
        });

        transaction.update(postRef, {
            commentCount: increment(1),
            updatedAt: serverTimestamp(),
        });

        // Don't notify users about their own comments.
        if (post.authorId !== author.uid) {
            const notificationRef = doc(
                collection(
                    db,
                    'users',
                    post.authorId,
                    'notifications',
                ),
            );

            transaction.set(notificationRef, {
                type: 'comment',
                postId,
                actor: author,
                message: `${author.name} commented on your post.`,
                isRead: false,
                createdAt: serverTimestamp(),
            });
        }
    });

    return commentRef.id;
};

// -------------------- COMMENT SUBSCRIPTION --------------------

export const subscribeToPostComments = (
    postId: string,
    callback: (comments: PostComment[]) => void,
    onError?: (error: Error) => void,
) => {
    const commentsQuery = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'asc'),
        limit(100),
    );

    return onSnapshot(
        commentsQuery,
        snapshot => {
            const comments = snapshot.docs.map(
                item => ({
                    id: item.id,
                    postId,
                    ...item.data(),
                }) as PostComment,
            );

            callback(comments);
        },
        error => onError?.(error),
    );
};
