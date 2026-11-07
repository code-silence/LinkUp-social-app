
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Image,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Platform,
    Alert,
} from 'react-native';

import { User } from 'firebase/auth';
import { Colors, Fonts, Radius, Spacing } from '../theme';
import { getUserProfile } from '../services/user';
import { uploadImageToHost } from '../services/imageUpload';
import { createPost, PostAuthor } from '../services/posts';
import ShineButton from '../components/ShineButton';

interface Props {
    user: User;
    onPostCreated?: () => void;
}

export default function CreatePostScreen({
    user,
    onPostCreated,
}: Props) {
    const [caption, setCaption] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const [profile, setProfile] = useState<Awaited<ReturnType<typeof getUserProfile>>>(null);
    useEffect(() => {
        let mounted = true;

        getUserProfile(user.uid)
            .then(data => {
                if (mounted) setProfile(data);
            })
            .catch(error => {
                console.error('Could not load profile:', error);
            });

        return () => {
            mounted = false;
        };
    }, [user.uid]);
    const showMessage = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleImageSelection = async () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/png,image/webp';

            input.onchange = () => {
                const file = input.files?.[0];

                if (!file) return;

                if (file.size > 5 * 1024 * 1024) {
                    showMessage('Image too large', 'Image size must be less than 5 MB.');
                    return;
                }

                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
            };

            input.click();
            return;
        }

        const { launchImageLibrary } = require('react-native-image-picker');

        const result = await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
        });

        if (result.didCancel || !result.assets?.length) return;

        const asset = result.assets[0];

        if (!asset.uri) return;

        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            showMessage('Image too large', 'Image size must be less than 5 MB.');
            return;
        }

        try {
            const response = await fetch(asset.uri);
            const blob = await response.blob();

            const file = new File(
                [blob],
                asset.fileName || `linkup-${Date.now()}.jpg`,
                { type: asset.type || 'image/jpeg' },
            );

            setImageFile(file);
            setImagePreview(asset.uri);
        } catch {
            showMessage('Error', 'Could not load the selected image.');
        }
    };

    const removeImage = () => {
        if (imagePreview && Platform.OS === 'web') {
            URL.revokeObjectURL(imagePreview);
        }

        setImageFile(null);
        setImagePreview(null);
    };

    const handlePost = async () => {
        if (!caption.trim() && !imageFile) {
            showMessage('Empty post', 'Write something or select an image.');
            return;
        }

        if (posting) return;

        setPosting(true);

        try {
            const profile = await getUserProfile(user.uid);

            if (!profile) {
                throw new Error('Could not load your profile.');
            }

            const author: PostAuthor = {
                uid: user.uid,
                name: profile.name || user.displayName || 'User',
                username: profile.username || '',
                photoURL: profile.photoURL || user.photoURL || '',
            };

            let imageURL = '';

            if (imageFile) {
                imageURL = await uploadImageToHost(imageFile);
            }

            await createPost(author, caption, imageURL);

            setCaption('');
            removeImage();

            showMessage('Post published', 'Your post has been shared successfully.');

            onPostCreated?.();
        } catch (error) {
            console.error('Post creation error:', error);

            showMessage(
                'Could not publish post',
                error instanceof Error
                    ? error.message
                    : 'Something went wrong. Please try again.',
            );
        } finally {
            setPosting(false);
        }
    };

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={styles.eyebrow}>SHARE SOMETHING</Text>
                <Text style={styles.title}>Create a post</Text>
                <Text style={styles.subtitle}>
                    Share a moment with your LinkUp community.
                </Text>
            </View>

            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        {profile?.photoURL ? (
                            <Image
                                source={{ uri: profile.photoURL }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Text style={styles.avatarText}>
                                {(profile?.name || user.displayName || user.email || 'U')[0].toUpperCase()}
                            </Text>
                        )}
                    </View>

                    <View style={styles.authorInfo}>
                        <Text style={styles.authorName}>
                            {profile?.name || user.displayName || 'Your profile'}
                        </Text>
                        <Text style={styles.visibility}>
                            Public post
                        </Text>
                    </View>
                </View>

                <TextInput
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="What's on your mind?"
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                    editable={!posting}
                    textAlignVertical="top"
                    style={styles.captionInput}
                />

                {imagePreview && (
                    <View style={styles.previewContainer}>
                        <Image
                            source={{ uri: imagePreview }}
                            style={styles.previewImage}
                            resizeMode="cover"
                        />

                        {!posting && (
                            <Pressable
                                onPress={removeImage}
                                style={styles.removeImage}
                            >
                                <Text style={styles.removeImageText}>×</Text>
                            </Pressable>
                        )}
                    </View>
                )}

                <View style={styles.divider} />

                <View style={styles.actions}>
                    <Pressable
                        onPress={handleImageSelection}
                        disabled={posting}
                        style={styles.imageButton}
                    >
                        <Text style={styles.imageIcon}>▧</Text>
                        <Text style={styles.imageButtonText}>
                            Add photo
                        </Text>
                    </Pressable>

                    <Text style={styles.characterCount}>
                        {caption.length} characters
                    </Text>
                </View>

                <ShineButton
                    onPress={handlePost}
                    disabled={posting || (!caption.trim() && !imageFile)}
                    style={[
                        styles.postButton,
                        (posting || (!caption.trim() && !imageFile)) &&
                        styles.postButtonDisabled,
                    ]}
                    accessibilityLabel="Publish post"
                >
                    {posting ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color={Colors.surface} size="small" />
                            <Text style={styles.postButtonText}>
                                Publishing...
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.postButtonText}>
                            Publish post
                        </Text>
                    )}
                </ShineButton>
            </View>

            <View style={styles.tip}>
                <Text style={styles.tipTitle}>A little reminder</Text>
                <Text style={styles.tipText}>
                    Be kind, respect others, and share something worth connecting over.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        minHeight: 0,
        backgroundColor: Colors.background,
    },
    container: {
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
        padding: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    header: {
        marginBottom: Spacing.lg,
    },
    eyebrow: {
        fontFamily: Fonts.bold,
        fontSize: 11,
        letterSpacing: 1.5,
        color: Colors.primary,
        marginBottom: 9,
    },
    title: {
        fontFamily: Fonts.black,
        fontSize: 28,
        color: Colors.text,
    },
    subtitle: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 7,
    },
    card: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.large,
        padding: Spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: Spacing.lg,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: Radius.round,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontFamily: Fonts.black,
        fontSize: 17,
        color: Colors.primaryDark,
    },
    authorInfo: {
        flex: 1,
    },
    authorName: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.text,
    },
    visibility: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    captionInput: {
        minHeight: 170,
        fontFamily: Fonts.regular,
        fontSize: 16,
        lineHeight: 25,
        color: Colors.text,
        padding: 0,
        outlineStyle: 'none',
    } as any,
    previewContainer: {
        position: 'relative',
        marginTop: Spacing.md,
        borderRadius: Radius.medium,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: 300,
        backgroundColor: Colors.background,
    },
    removeImage: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 34,
        height: 34,
        borderRadius: Radius.round,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeImageText: {
        fontSize: 25,
        color: Colors.danger,
        lineHeight: 28,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.md,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    imageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingVertical: 10,
        paddingHorizontal: 13,
        borderRadius: Radius.medium,
        backgroundColor: Colors.background,
    },
    imageIcon: {
        fontSize: 19,
        color: Colors.primary,
    },
    imageButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.primary,
    },
    characterCount: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
    },
    postButton: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.medium,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.lg,
    },
    postButtonDisabled: {
        opacity: 0.5,
    },
    postButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: Colors.surface,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    tip: {
        marginTop: Spacing.lg,
        padding: Spacing.lg,
        backgroundColor: Colors.accent,
        borderRadius: Radius.large,
    },
    tipTitle: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: Colors.primaryDark,
    },
    tipText: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        lineHeight: 19,
        color: Colors.primaryDark,
        marginTop: 6,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: Radius.round,
    },
});
