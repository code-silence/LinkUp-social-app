import React, { useCallback, useEffect, useState } from 'react';

import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';

import { User } from 'firebase/auth';

import {
    UserProfile,
    UserProfileUpdate,
    getUserProfile,
    updateUserProfile,
} from '../services/user';

import { uploadImageToHost } from '../services/imageUpload';

import { Colors, Fonts, Radius, Spacing } from '../theme';

interface Props {
    user: User;
    // Callback function to sync profile changes with the global state in HomeScreen
    onProfileUpdate?: (profile: UserProfile) => void;
}

type ImageType = 'profile' | 'cover';

type TextFieldKey = Exclude<
    keyof UserProfileUpdate,
    'interests' | 'languages'
>;

interface Field {
    key: TextFieldKey;
    label: string;
    placeholder: string;
    multiline?: boolean;
}

const DEFAULT_PROFILE: UserProfile = {
    uid: '',
    name: '',
    username: '',
    email: '',
    bio: '',
    photoURL: '',
    coverPhotoURL: '',

    gender: '',
    birthday: '',
    relationshipStatus: '',
    phone: '',

    address: '',
    city: '',
    state: '',
    country: '',
    hometown: '',

    college: '',
    university: '',
    degree: '',
    highSchool: '',

    jobTitle: '',
    workplace: '',

    website: '',
    facebook: '',
    instagram: '',
    linkedin: '',

    interests: [],
    languages: [],

    friendsCount: 0,
};

const PROFILE_FIELDS: {
    title: string;
    fields: Field[];
}[] = [
    {
        title: 'Basic information',
        fields: [
            {
                key: 'name',
                label: 'Full name',
                placeholder: 'Your name',
            },
            {
                key: 'username',
                label: 'Username',
                placeholder: 'Choose a username',
            },
            {
                key: 'bio',
                label: 'Bio',
                placeholder: 'Tell people something about yourself',
                multiline: true,
            },
        ],
    },
    {
        title: 'Personal information',
        fields: [
            {
                key: 'phone',
                label: 'Phone number',
                placeholder: 'Your phone number',
            },
        ],
    },
    {
        title: 'Location',
        fields: [
            {
                key: 'address',
                label: 'Address',
                placeholder: 'Your address',
            },
            {
                key: 'city',
                label: 'City',
                placeholder: 'Your city',
            },
            {
                key: 'state',
                label: 'State / Division',
                placeholder: 'Your state or division',
            },
            {
                key: 'country',
                label: 'Country',
                placeholder: 'Your country',
            },
            {
                key: 'hometown',
                label: 'Hometown',
                placeholder: 'Your hometown',
            },
        ],
    },
    {
        title: 'Education',
        fields: [
            {
                key: 'college',
                label: 'College',
                placeholder: 'Your college',
            },
            {
                key: 'university',
                label: 'University',
                placeholder: 'Your university',
            },
            {
                key: 'degree',
                label: 'Degree',
                placeholder: 'Your degree',
            },
            {
                key: 'highSchool',
                label: 'High school',
                placeholder: 'Your high school',
            },
        ],
    },
    {
        title: 'Work',
        fields: [
            {
                key: 'jobTitle',
                label: 'Job title',
                placeholder: 'Your job title',
            },
            {
                key: 'workplace',
                label: 'Workplace',
                placeholder: 'Where do you work?',
            },
        ],
    },
    {
        title: 'Social links',
        fields: [
            {
                key: 'website',
                label: 'Website',
                placeholder: 'https://example.com',
            },
            {
                key: 'facebook',
                label: 'Facebook',
                placeholder: 'Facebook profile URL',
            },
            {
                key: 'instagram',
                label: 'Instagram',
                placeholder: 'Instagram profile URL',
            },
            {
                key: 'linkedin',
                label: 'LinkedIn',
                placeholder: 'LinkedIn profile URL',
            },
        ],
    },
];

function Avatar({
    name,
    url,
    size = 90,
}: {
    name: string;
    url?: string;
    size?: number;
}) {
    const initials = name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <View
            style={[
                styles.avatar,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                },
            ]}
        >
            {url ? (
                <Image
                    source={{ uri: url }}
                    style={styles.avatarImage}
                />
            ) : (
                <Text
                    style={[
                        styles.avatarInitials,
                        { fontSize: Math.max(14, size * 0.28) },
                    ]}
                >
                    {initials || 'U'}
                </Text>
            )}
        </View>
    );
}

export default function ProfileScreen({ user, onProfileUpdate }: Props) {
    const { width } = useWindowDimensions();

    const isMobile = width < 700;
    const isDesktop = width >= 1000;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [editForm, setEditForm] = useState<UserProfileUpdate>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<ImageType | null>(null);

    const [editVisible, setEditVisible] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const [interestsInput, setInterestsInput] = useState('');
    const [languagesInput, setLanguagesInput] = useState('');

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const data = await getUserProfile(user.uid);

            const loadedProfile: UserProfile = {
                ...DEFAULT_PROFILE,
                uid: user.uid,
                email: user.email || '',
                name: user.displayName || '',
                photoURL: user.photoURL || '',
                ...data,
            };

            setProfile(loadedProfile);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load your profile.',
            );
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const openEditProfile = () => {
        if (!profile) return;

        setEditForm({
            name: profile.name,
            username: profile.username,
            bio: profile.bio,
            photoURL: profile.photoURL,
            coverPhotoURL: profile.coverPhotoURL,

            gender: profile.gender,
            birthday: profile.birthday,
            relationshipStatus: profile.relationshipStatus,
            phone: profile.phone,

            address: profile.address,
            city: profile.city,
            state: profile.state,
            country: profile.country,
            hometown: profile.hometown,

            college: profile.college,
            university: profile.university,
            degree: profile.degree,
            highSchool: profile.highSchool,

            jobTitle: profile.jobTitle,
            workplace: profile.workplace,

            website: profile.website,
            facebook: profile.facebook,
            instagram: profile.instagram,
            linkedin: profile.linkedin,

            interests: profile.interests,
            languages: profile.languages,
        });

        setNotice('');
        setError('');
        setInterestsInput(profile.interests.join(', '));
        setLanguagesInput(profile.languages.join(', '));
        setEditVisible(true);
    };

    const updateField = (
        key: TextFieldKey,
        value: string,
    ) => {
        setEditForm(previous => ({
            ...previous,
            [key]: value,
        }));
    };

    const selectImage = (type: ImageType) => {
        if (Platform.OS !== 'web') {
            setError('Image selection is currently supported in the web version.');
            return;
        }

        const input = document.createElement('input');

        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async () => {
            const file = input.files?.[0];

            if (!file) return;

            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image.');
                return;
            }

            setUploading(type);
            setError('');

            try {
                const imageURL = await uploadImageToHost(file);

                setEditForm(previous => ({
                    ...previous,
                    [type === 'profile' ? 'photoURL' : 'coverPhotoURL']:
                        imageURL,
                }));

                setNotice(
                    type === 'profile'
                        ? 'Profile picture uploaded.'
                        : 'Cover photo uploaded.',
                );
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Image upload failed.',
                );
            } finally {
                setUploading(null);
            }
        };

        input.click();
    };

    const saveProfile = async () => {
        if (!editForm.name?.trim()) {
            setError('Your name cannot be empty.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const updatedData: UserProfileUpdate = {
                ...editForm,
                name: editForm.name.trim(),
                username: editForm.username?.trim() || '',

                interests: interestsInput
                    .split(',')
                    .map(item => item.trim())
                    .filter(Boolean),

                languages: languagesInput
                    .split(',')
                    .map(item => item.trim())
                    .filter(Boolean),
            };

            await updateUserProfile(user.uid, updatedData);

            const newlyUpdatedProfile: UserProfile = {
                ...DEFAULT_PROFILE,
                ...profile,
                ...updatedData,
                uid: user.uid,
                email: user.email || '',
            };

            setProfile(newlyUpdatedProfile);
            
            // Sync with global HomeScreen state to update avatars everywhere instantly
            if (onProfileUpdate) {
                onProfileUpdate(newlyUpdatedProfile);
            }

            setEditVisible(false);
            setNotice('Your profile has been updated.');
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not save your profile.',
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerState}>
                <ActivityIndicator
                    size="large"
                    color={Colors.primary}
                />
                <Text style={styles.stateText}>
                    Loading your profile...
                </Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.centerState}>
                <Text style={styles.stateTitle}>
                    Couldn't load your profile
                </Text>

                <Text style={styles.stateText}>
                    {error || 'Something went wrong.'}
                </Text>

                <Pressable
                    onPress={loadProfile}
                    style={styles.primaryButton}
                >
                    <Text style={styles.primaryButtonText}>
                        Try again
                    </Text>
                </Pressable>
            </View>
        );
    }

    const hasLocation = [
        profile.city,
        profile.state,
        profile.country,
    ].filter(Boolean).join(', ');

    const aboutItems = [
        { label: 'Gender', value: profile.gender },
        { label: 'Birthday', value: profile.birthday },
        { label: 'Relationship', value: profile.relationshipStatus },
        { label: 'Phone', value: profile.phone },
        { label: 'Address', value: profile.address },
        { label: 'Location', value: hasLocation },
        { label: 'Hometown', value: profile.hometown },
        { label: 'College', value: profile.college },
        { label: 'University', value: profile.university },
        { label: 'Degree', value: profile.degree },
        { label: 'High school', value: profile.highSchool },
        { label: 'Job title', value: profile.jobTitle },
        { label: 'Workplace', value: profile.workplace },
        { label: 'Website', value: profile.website },
        { label: 'Facebook', value: profile.facebook },
        { label: 'Instagram', value: profile.instagram },
        { label: 'LinkedIn', value: profile.linkedin },
    ].filter(item => item.value?.trim());

    const responsiveStyles = {
        informationLayout: {
            flexDirection: isMobile ? 'column' as const : 'row' as const,
        },
        accountCard: {
            width: isMobile ? '100%' as const : 270,
        },
        detailItem: {
            width: isMobile ? '100%' as const : '45%' as const,
        },
    };

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View
                    style={[
                        styles.page,
                        !isDesktop && styles.pageCompact,
                    ]}
                >
                    {/* Page heading */}
                    <View style={styles.pageHeading}>
                        <View>
                            <Text style={styles.eyebrow}>
                                YOUR ACCOUNT
                            </Text>

                            <Text style={styles.pageTitle}>
                                My Profile
                            </Text>
                        </View>

                        <Pressable
                            onPress={openEditProfile}
                            style={styles.editButton}
                        >
                            <Text style={styles.editButtonText}>
                                Edit profile
                            </Text>
                        </Pressable>
                    </View>

                    {/* Profile Header */}
                    <View style={styles.profileCard}>
                        <View style={styles.coverContainer}>
                            {profile.coverPhotoURL ? (
                                <Image
                                    source={{ uri: profile.coverPhotoURL }}
                                    style={styles.coverImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={styles.coverFallback}>
                                    <Text style={styles.coverBrand}>
                                        LinkUp
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.profileHeaderContent}>
                            <View style={styles.profileIdentity}>
                                <Avatar
                                    name={profile.name}
                                    url={profile.photoURL}
                                    size={isMobile ? 82 : 108}
                                />

                                <View style={styles.profileDetails}>
                                    <Text style={styles.profileName}>
                                        {profile.name || 'Unnamed user'}
                                    </Text>

                                    {profile.username ? (
                                        <Text style={styles.username}>
                                            @{profile.username}
                                        </Text>
                                    ) : null}

                                    {profile.bio ? (
                                        <Text style={styles.bio}>
                                            {profile.bio}
                                        </Text>
                                    ) : null}

                                    {hasLocation ? (
                                        <Text style={styles.location}>
                                            {hasLocation}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>

                            <View style={styles.profileStats}>
                                <View style={styles.stat}>
                                    <Text style={styles.statNumber}>
                                        {profile.friendsCount}
                                    </Text>
                                    <Text style={styles.statLabel}>
                                        Friends
                                    </Text>
                                </View>

                                <View style={styles.statDivider} />

                                <View style={styles.stat}>
                                    <Text style={styles.statNumber}>
                                        {profile.interests.length}
                                    </Text>
                                    <Text style={styles.statLabel}>
                                        Interests
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Profile Information */}
                    <View style={[styles.informationLayout, responsiveStyles.informationLayout]}>                        <View style={styles.aboutCard}>
                        <Text style={styles.sectionTitle}>
                            About me
                        </Text>

                        {profile.bio ? (
                            <Text style={styles.aboutBio}>
                                {profile.bio}
                            </Text>
                        ) : (
                            <Text style={styles.mutedText}>
                                Add a bio to tell people about yourself.
                            </Text>
                        )}

                        {profile.interests.length > 0 && (
                            <View style={styles.infoSection}>
                                <Text style={styles.infoHeading}>
                                    Interests
                                </Text>

                                <View style={styles.chipContainer}>
                                    {profile.interests.map(item => (
                                        <View
                                            key={item}
                                            style={styles.chip}
                                        >
                                            <Text style={styles.chipText}>
                                                {item}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {profile.languages.length > 0 && (
                            <View style={styles.infoSection}>
                                <Text style={styles.infoHeading}>
                                    Languages
                                </Text>

                                <View style={styles.chipContainer}>
                                    {profile.languages.map(item => (
                                        <View
                                            key={item}
                                            style={styles.chip}
                                        >
                                            <Text style={styles.chipText}>
                                                {item}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View style={styles.infoDivider} />

                        <Text style={styles.infoHeading}>
                            Personal details
                        </Text>

                        {aboutItems.length > 0 ? (
                            <View style={styles.detailsGrid}>
                                {aboutItems.map(item => (
                                    <View
                                        key={item.label}
                                        style={[styles.detailItem, responsiveStyles.detailItem]}                                        >
                                        <Text style={styles.detailLabel}>
                                            {item.label}
                                        </Text>

                                        <Text style={styles.detailValue}>
                                            {item.value}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.mutedText}>
                                No additional details added yet.
                            </Text>
                        )}
                    </View>

                        {/* Account Information */}
                        <View style={[styles.accountCard, responsiveStyles.accountCard]}>                            <Text style={styles.sectionTitle}>
                            Account information
                        </Text>

                            <View style={styles.accountInfoItem}>
                                <Text style={styles.detailLabel}>
                                    Email address
                                </Text>
                                <Text style={styles.detailValue}>
                                    {profile.email}
                                </Text>
                            </View>

                            <View style={styles.accountInfoItem}>
                                <Text style={styles.detailLabel}>
                                    User ID
                                </Text>
                                <Text
                                    style={styles.uidText}
                                    numberOfLines={2}
                                >
                                    {profile.uid}
                                </Text>
                            </View>

                            <Pressable
                                onPress={openEditProfile}
                                style={styles.secondaryButton}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    Edit your information
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {notice ? (
                        <Text style={styles.successMessage}>
                            {notice}
                        </Text>
                    ) : null}

                    {error ? (
                        <Text style={styles.errorMessage}>
                            {error}
                        </Text>
                    ) : null}
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={editVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setEditVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalContainer,
                            isMobile && styles.modalMobile,
                        ]}
                    >
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>
                                    Edit profile
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    Update your personal information
                                </Text>
                            </View>

                            <Pressable
                                onPress={() => setEditVisible(false)}
                                style={styles.closeButton}
                            >
                                <Text style={styles.closeButtonText}>
                                    ×
                                </Text>
                            </Pressable>
                        </View>

                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Image Uploads */}
                            <View style={styles.imageUploadSection}>
                                <Text style={styles.formSectionTitle}>
                                    Profile pictures
                                </Text>

                                <View style={styles.uploadRow}>
                                    <Avatar
                                        name={
                                            String(editForm.name || profile.name)
                                        }
                                        url={String(editForm.photoURL || '')}
                                        size={68}
                                    />

                                    <View style={styles.uploadInfo}>
                                        <Text style={styles.uploadTitle}>
                                            Profile picture
                                        </Text>
                                        <Text style={styles.uploadDescription}>
                                            Choose a photo for your account.
                                        </Text>

                                        <Pressable
                                            disabled={uploading !== null}
                                            onPress={() => selectImage('profile')}
                                            style={styles.uploadButton}
                                        >
                                            <Text style={styles.uploadButtonText}>
                                                {uploading === 'profile'
                                                    ? 'Uploading...'
                                                    : 'Change picture'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>

                                <View style={styles.coverPreview}>
                                    {editForm.coverPhotoURL ? (
                                        <Image
                                            source={{
                                                uri: String(editForm.coverPhotoURL),
                                            }}
                                            style={styles.coverPreviewImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={styles.coverPreviewFallback} />
                                    )}
                                </View>

                                <Pressable
                                    disabled={uploading !== null}
                                    onPress={() => selectImage('cover')}
                                    style={styles.coverUploadButton}
                                >
                                    <Text style={styles.uploadButtonText}>
                                        {uploading === 'cover'
                                            ? 'Uploading cover...'
                                            : 'Change cover photo'}
                                    </Text>
                                </Pressable>
                            </View>

                            {/* Profile Fields */}
                            {PROFILE_FIELDS.map(section => (
                                <View key={section.title} style={styles.formSection}>
                                    <Text style={styles.formSectionTitle}>
                                        {section.title}
                                    </Text>

                                    {section.title === 'Personal information' && (
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Gender</Text>

                                            <View style={styles.radioOptions}>
                                                {['Male', 'Female', 'Others'].map(option => (
                                                    <Pressable
                                                        key={option}
                                                        onPress={() => updateField('gender', option)}
                                                        style={[
                                                            styles.radioOption,
                                                            editForm.gender === option &&
                                                            styles.radioOptionActive,
                                                        ]}
                                                    >
                                                        <View
                                                            style={[
                                                                styles.radioOuter,
                                                                editForm.gender === option &&
                                                                styles.radioOuterActive,
                                                            ]}
                                                        >
                                                            {editForm.gender === option && (
                                                                <View style={styles.radioInner} />
                                                            )}
                                                        </View>

                                                        <Text style={styles.radioOptionText}>
                                                            {option}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>Relationship status</Text>

                                                <View style={styles.radioOptions}>
                                                    {[
                                                        'Single',
                                                        'In a relationship',
                                                        'Married',
                                                        "It's complicated",
                                                        'Prefer not to say',
                                                    ].map(option => (
                                                        <Pressable
                                                            key={option}
                                                            onPress={() => updateField('relationshipStatus', option)}
                                                            style={[
                                                                styles.radioOption,
                                                                editForm.relationshipStatus === option &&
                                                                styles.radioOptionActive,
                                                            ]}
                                                        >
                                                            <View
                                                                style={[
                                                                    styles.radioOuter,
                                                                    editForm.relationshipStatus === option &&
                                                                    styles.radioOuterActive,
                                                                ]}
                                                            >
                                                                {editForm.relationshipStatus === option && (
                                                                    <View style={styles.radioInner} />
                                                                )}
                                                            </View>

                                                            <Text style={styles.radioOptionText}>
                                                                {option}
                                                            </Text>
                                                        </Pressable>
                                                    ))}
                                                </View>
                                                <View style={styles.inputGroup}>
                                                    <Text style={styles.inputLabel}>Birthday</Text>

                                                    <input
                                                        type="date"
                                                        value={String(editForm.birthday || '')}
                                                        onChange={event => updateField('birthday', event.target.value)}
                                                        max={new Date().toISOString().split('T')[0]}
                                                        style={{
                                                            width: '100%',
                                                            height: 45,
                                                            padding: '0 13px',
                                                            border: `1px solid ${Colors.border}`,
                                                            borderRadius: Radius.medium,
                                                            backgroundColor: Colors.background,
                                                            color: Colors.text,
                                                            fontFamily: Fonts.regular,
                                                            fontSize: 13,
                                                            boxSizing: 'border-box',
                                                        }}
                                                    />
                                                </View>
                                            </View>
                                        </View>

                                    )}

                                    {section.fields.map(field => (
                                        <View key={field.key} style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>
                                                {field.label}
                                            </Text>

                                            <TextInput
                                                value={String(editForm[field.key] ?? '')}
                                                onChangeText={value =>
                                                    updateField(field.key, value)
                                                }
                                                placeholder={field.placeholder}
                                                placeholderTextColor={Colors.textSecondary}
                                                multiline={field.multiline}
                                                textAlignVertical={
                                                    field.multiline ? 'top' : 'center'
                                                }
                                                style={[
                                                    styles.textInput,
                                                    field.multiline && styles.multilineInput,
                                                ]}
                                            />
                                        </View>
                                    ))}
                                </View>
                            ))}

                            {/* Interests and Languages */}
                            <View style={styles.formSection}>
                                <Text style={styles.formSectionTitle}>
                                    More about you
                                </Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Interests</Text>

                                    <TextInput
                                        value={interestsInput}
                                        onChangeText={setInterestsInput}
                                        placeholder="Coding, Music, Gaming"
                                        placeholderTextColor={Colors.textSecondary}
                                        style={styles.textInput}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Languages</Text>

                                    <TextInput
                                        value={languagesInput}
                                        onChangeText={setLanguagesInput}
                                        placeholder="English, Bengali, Hindi"
                                        placeholderTextColor={Colors.textSecondary}
                                        style={styles.textInput}
                                    />
                                </View>
                            </View>

                            {error ? (
                                <Text style={styles.errorMessage}>
                                    {error}
                                </Text>
                            ) : null}
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <Pressable
                                onPress={() => setEditVisible(false)}
                                style={styles.cancelButton}
                                disabled={saving}
                            >
                                <Text style={styles.cancelButtonText}>
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={saveProfile}
                                disabled={saving || uploading !== null}
                                style={[
                                    styles.primaryButton,
                                    styles.saveButton,
                                    (saving || uploading !== null) &&
                                    styles.disabledButton,
                                ]}
                            >
                                {saving ? (
                                    <ActivityIndicator
                                        color={Colors.surface}
                                        size="small"
                                    />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        Save changes
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        minHeight: '100%',
        backgroundColor: Colors.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        alignItems: 'center',
    },
    page: {
        width: '100%',
        maxWidth: 1050,
    },
    pageCompact: {
        maxWidth: 720,
    },
    pageHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 22,
    },
    eyebrow: {
        fontFamily: Fonts.bold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: Colors.primary,
        marginBottom: 7,
    },
    pageTitle: {
        fontFamily: Fonts.black,
        fontSize: 27,
        color: Colors.text,
    },
    editButton: {
        paddingHorizontal: 17,
        paddingVertical: 11,
        borderRadius: Radius.medium,
        backgroundColor: Colors.primary,
    },
    editButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.surface,
    },
    profileCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    coverContainer: {
        height: 190,
        width: '100%',
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverFallback: {
        flex: 1,
        backgroundColor: Colors.primaryDark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverBrand: {
        fontFamily: Fonts.black,
        fontSize: 34,
        color: Colors.accent,
        opacity: 0.65,
    },
    profileHeaderContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    profileIdentity: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 17,
        marginTop: -35,
    },
    avatar: {
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: Colors.surface,
        overflow: 'hidden',
        flexShrink: 0,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitials: {
        fontFamily: Fonts.black,
        color: Colors.primaryDark,
    },
    profileDetails: {
        flex: 1,
        minWidth: 0,
        paddingTop: 43,
    },
    profileName: {
        fontFamily: Fonts.black,
        fontSize: 22,
        color: Colors.text,
    },
    username: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.primary,
        marginTop: 4,
    },
    bio: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        lineHeight: 20,
        color: Colors.textSecondary,
        marginTop: 10,
    },
    location: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 8,
    },
    profileStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 22,
        marginTop: 23,
        paddingTop: 17,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    stat: {
        alignItems: 'center',
        gap: 4,
    },
    statNumber: {
        fontFamily: Fonts.black,
        fontSize: 17,
        color: Colors.text,
    },
    statLabel: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: Colors.border,
    },
    informationLayout: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: Spacing.lg,
        marginTop: Spacing.lg,
    },
    aboutCard: {
        flex: 1,
        minWidth: 0,
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg,
    },
    accountCard: {
        width: 270,
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg,
    },
    sectionTitle: {
        fontFamily: Fonts.black,
        fontSize: 17,
        color: Colors.text,
        marginBottom: 16,
    },
    aboutBio: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        lineHeight: 21,
        color: Colors.textSecondary,
    },
    mutedText: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        lineHeight: 20,
        color: Colors.textSecondary,
    },
    infoSection: {
        marginTop: 22,
    },
    infoHeading: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.text,
        marginBottom: 12,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: Colors.accent,
        borderRadius: Radius.round,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    chipText: {
        fontFamily: Fonts.bold,
        fontSize: 11,
        color: Colors.primary,
    },
    infoDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 22,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 18,
    },
    detailItem: {
        width: '45%',
        minWidth: 0,
    },
    detailLabel: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 5,
    },
    detailValue: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.text,
    },
    accountInfoItem: {
        marginBottom: 20,
    },
    uidText: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        lineHeight: 17,
        color: Colors.text,
    },
    secondaryButton: {
        backgroundColor: Colors.accent,
        padding: 12,
        alignItems: 'center',
        borderRadius: Radius.medium,
        marginTop: 5,
    },
    secondaryButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.primary,
    },
    successMessage: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.success,
        marginTop: 15,
    },
    errorMessage: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.danger,
        marginTop: 12,
    },
    centerState: {
        flex: 1,
        minHeight: 350,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.background,
    },
    stateTitle: {
        fontFamily: Fonts.black,
        fontSize: 18,
        color: Colors.text,
        marginBottom: 8,
    },
    stateText: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 12,
        textAlign: 'center',
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 13,
        borderRadius: Radius.medium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.surface,
    },
    disabledButton: {
        opacity: 0.55,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 650,
        maxHeight: '92%',
        backgroundColor: Colors.surface,
        borderRadius: Radius.large,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modalMobile: {
        maxWidth: '100%',
        maxHeight: '100%',
        height: '100%',
        borderRadius: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontFamily: Fonts.black,
        fontSize: 20,
        color: Colors.text,
    },
    modalSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 5,
    },
    closeButton: {
        width: 35,
        height: 35,
        borderRadius: Radius.round,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: 25,
        color: Colors.textSecondary,
    },
    modalScroll: {
        flexShrink: 1,
    },
    modalContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    imageUploadSection: {
        marginBottom: 25,
    },
    formSection: {
        marginBottom: 25,
    },
    formSectionTitle: {
        fontFamily: Fonts.black,
        fontSize: 15,
        color: Colors.text,
        marginBottom: 17,
    },
    uploadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 20,
    },
    uploadInfo: {
        flex: 1,
    },
    uploadTitle: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.text,
    },
    uploadDescription: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 5,
    },
    uploadButton: {
        alignSelf: 'flex-start',
        marginTop: 9,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: Colors.accent,
        borderRadius: Radius.medium,
    },
    uploadButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 11,
        color: Colors.primary,
    },
    coverPreview: {
        height: 110,
        width: '100%',
        borderRadius: Radius.medium,
        overflow: 'hidden',
        backgroundColor: Colors.accent,
    },
    coverPreviewImage: {
        width: '100%',
        height: '100%',
    },
    coverPreviewFallback: {
        flex: 1,
        backgroundColor: Colors.primaryDark,
    },
    coverUploadButton: {
        alignSelf: 'flex-start',
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        backgroundColor: Colors.accent,
        borderRadius: Radius.medium,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: Colors.text,
        marginBottom: 8,
    },
    textInput: {
        minHeight: 45,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.medium,
        paddingHorizontal: 13,
        paddingVertical: 11,
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.text,
        backgroundColor: Colors.background,
        outlineStyle: 'none',
    } as any,
    multilineInput: {
        minHeight: 95,
        paddingTop: 12,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
        padding: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    cancelButton: {
        paddingHorizontal: 18,
        paddingVertical: 13,
        borderRadius: Radius.medium,
        backgroundColor: Colors.background,
    },
    cancelButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.textSecondary,
    },
    radioOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.medium,
    },
    radioOptionActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.accent,
    },
    radioOuter: {
        width: 18,
        height: 18,
        borderRadius: Radius.round,
        borderWidth: 1.5,
        borderColor: Colors.textSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterActive: {
        borderColor: Colors.primary,
    },
    radioInner: {
        width: 9,
        height: 9,
        borderRadius: Radius.round,
        backgroundColor: Colors.primary,
    },
    radioOptionText: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.text,
    },
    saveButton: {
        minWidth: 125,
    },
});