
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';

import { db } from './firebase';

export interface UserProfile {
    uid: string;

    // Basic information
    name: string;
    username: string;
    email: string;
    bio: string;
    photoURL: string;
    coverPhotoURL: string;

    // Personal information
    gender: string;
    birthday: string;
    relationshipStatus: string;
    phone: string;

    // Location
    address: string;
    city: string;
    state: string;
    country: string;
    hometown: string;

    // Education
    college: string;
    university: string;
    degree: string;
    highSchool: string;

    // Work
    jobTitle: string;
    workplace: string;

    // Social links
    website: string;
    facebook: string;
    instagram: string;
    linkedin: string;

    // Additional information
    interests: string[];
    languages: string[];

    // Account information
    friendsCount: number;
    createdAt?: unknown;
    updatedAt?: unknown;
}

export type UserProfileUpdate = Partial<
    Omit<UserProfile, 'uid' | 'email' | 'friendsCount' | 'createdAt' | 'updatedAt'>
>;

export const getUserProfile = async (
    uid: string,
): Promise<UserProfile | null> => {
    const profileRef = doc(db, 'users', uid);
    const snapshot = await getDoc(profileRef);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.data() as UserProfile;
};

export const updateUserProfile = async (
    uid: string,
    data: UserProfileUpdate,
): Promise<void> => {
    const profileRef = doc(db, 'users', uid);

    await setDoc(
        profileRef,
        {
            ...data,
            updatedAt: serverTimestamp(),
        },
        { merge: true },
    );
};
