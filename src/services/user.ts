import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    getFirestore,
} from 'firebase/firestore';

const db = getFirestore();

export interface UserProfile {
    uid: string;
    name: string;
    username: string;
    email: string;
    bio?: string;
    photoURL?: string;
    coverPhotoURL?: string;

    gender?: string;
    birthday?: string;
    relationshipStatus?: string;
    phone?: string;

    address?: string;
    city?: string;
    state?: string;
    country?: string;
    hometown?: string;

    college?: string;
    university?: string;
    degree?: string;
    highSchool?: string;

    jobTitle?: string;
    workplace?: string;

    website?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;

    interests?: string[];
    languages?: string[];

    friendsCount?: number;
}

export type UserProfileUpdate = Partial<UserProfile>;

/**
 * Fetch user profile from Firestore and calculate actual accepted friends count dynamically
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return null;
        }

        const userData = userSnap.data() as UserProfile;

        // Fetch actual accepted friends count dynamically from Firebase connections subcollection
        const connectionsRef = collection(db, 'users', uid, 'connections');
        const acceptedQuery = query(connectionsRef, where('status', '==', 'accepted'));
        const acceptedSnap = await getDocs(acceptedQuery);
        const actualFriendsCount = acceptedSnap.size;

        return {
            ...userData,
            uid: userSnap.id,
            friendsCount: actualFriendsCount, // Always use real-time calculated count from Firestore
        };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
};

/**
 * Update user profile in Firestore
 */
export const updateUserProfile = async (uid: string, data: UserProfileUpdate): Promise<void> => {
    try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, data, { merge: true });
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
};