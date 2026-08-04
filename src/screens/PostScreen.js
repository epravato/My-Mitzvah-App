// Where you prove you did the challenge. Take a photo, pick the challenge and group,
// add a caption, then post it to the feed.
//
// On a phone this opens the camera. On the web demo it opens a file picker instead,
// since browsers cannot launch a native camera the same way.

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePosts } from '../context/PostsContext';
import { colors, spacing, radius, cardShadow, webInputReset } from '../theme';

export default function PostScreen({ navigation }) {
  const { addPost, groups, challenges, user, postedToday } = usePosts();
  const insets = useSafeAreaInsets();

  const [photoUri, setPhotoUri] = useState(null);
  const [caption, setCaption] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState('Tefillin');
  const [selectedGroupId, setSelectedGroupId] = useState('group-global');
  const [captionFocused, setCaptionFocused] = useState(false);

  const joinedGroups = groups.filter((group) => group.joined);

  async function pickPhoto() {
    // Web has no native camera launch, so fall back to the file picker there.
    const useCamera = Platform.OS !== 'web';

    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera needed', 'Allow camera access to post your photo.');
        return;
      }
    }

    const options = { mediaTypes: ['images'], quality: 0.7 };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  function submitPost() {
    addPost({
      challenge: selectedChallenge,
      caption,
      photoUri,
      groupId: selectedGroupId,
    });
    setPhotoUri(null);
    setCaption('');
    navigation.navigate('Feed');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.medium }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Log today</Text>
      <Text style={styles.subtitle}>
        {postedToday
          ? 'Already logged today. You can still share another.'
          : `Day ${user.streak + 1} of your streak`}
      </Text>

      <TouchableOpacity
        style={[styles.photoBox, cardShadow]}
        onPress={pickPhoto}
        activeOpacity={0.85}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoEmpty}>
            <View style={styles.cameraCircle}>
              <Ionicons name="camera-outline" size={30} color={colors.blue} />
            </View>
            <Text style={styles.photoEmptyText}>
              {Platform.OS === 'web' ? 'Choose a photo' : 'Take a photo'}
            </Text>
            <Text style={styles.photoEmptyHint}>Your proof for today</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Challenge</Text>
      <View style={styles.chipRow}>
        {challenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            style={[
              styles.chip,
              selectedChallenge === challenge.name && styles.chipActive,
              !challenge.active && styles.chipDisabled,
            ]}
            onPress={() => challenge.active && setSelectedChallenge(challenge.name)}
            activeOpacity={challenge.active ? 0.8 : 1}
          >
            <Ionicons
              name={challenge.icon}
              size={15}
              color={selectedChallenge === challenge.name ? colors.blue : colors.textMuted}
            />
            <Text
              style={[
                styles.chipText,
                selectedChallenge === challenge.name && styles.chipTextActive,
              ]}
            >
              {challenge.name}
            </Text>
            {!challenge.active ? <Text style={styles.soonText}>soon</Text> : null}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Share with</Text>
      <View style={styles.chipRow}>
        {joinedGroups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={[styles.chip, selectedGroupId === group.id && styles.chipActive]}
            onPress={() => setSelectedGroupId(group.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={group.isGlobal ? 'globe-outline' : 'people-outline'}
              size={15}
              color={selectedGroupId === group.id ? colors.blue : colors.textMuted}
            />
            <Text
              style={[styles.chipText, selectedGroupId === group.id && styles.chipTextActive]}
            >
              {group.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Caption</Text>
      <TextInput
        style={[styles.input, webInputReset, captionFocused && styles.inputFocused]}
        placeholder="Say something about today"
        placeholderTextColor={colors.textFaint}
        value={caption}
        onChangeText={setCaption}
        onFocus={() => setCaptionFocused(true)}
        onBlur={() => setCaptionFocused(false)}
        multiline
      />

      <TouchableOpacity style={styles.postButton} onPress={submitPost} activeOpacity={0.85}>
        <Ionicons name="checkmark-circle-outline" size={19} color={colors.card} />
        <Text style={styles.postButtonText}>Post to feed</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.medium,
    paddingBottom: spacing.large * 2,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
    marginBottom: spacing.large,
  },
  photoBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.medium,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.medium,
  },
  photoEmptyHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.large,
    marginBottom: spacing.small,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.small,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.small,
  },
  chipActive: {
    borderColor: colors.blue,
    backgroundColor: colors.blueSoft,
  },
  chipDisabled: {
    opacity: 0.55,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  chipTextActive: {
    color: colors.blue,
    fontWeight: '700',
  },
  soonText: {
    color: colors.textFaint,
    fontSize: 10,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    color: colors.text,
    padding: spacing.medium,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: colors.blue,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.small,
    paddingVertical: 15,
    marginTop: spacing.large,
  },
  postButtonText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: spacing.small,
  },
});
