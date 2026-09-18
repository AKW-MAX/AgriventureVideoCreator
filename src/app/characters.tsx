import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const characters = [
  {
    id: 'farmer1',
    name: 'Farmer 1',
    emoji: '👨‍🌾',
  },
  {
    id: 'farmer2',
    name: 'Farmer 2',
    emoji: '👨‍🌾',
  },
  {
    id: 'femaleFarmer1',
    name: 'Female Farmer 1',
    emoji: '👩‍🌾',
  },
  {
    id: 'child1',
    name: 'Child 1',
    emoji: '🧒',
  },
  {
    id: 'child2',
    name: 'Child 2',
    emoji: '👧',
  },
  {
    id: 'vet1',
    name: 'Veterinarian 1',
    emoji: '🧑‍⚕️',
  },
  {
    id: 'cow1',
    name: 'Cow 1',
    emoji: '🐄',
  },
  {
    id: 'goat1',
    name: 'Goat 1',
    emoji: '🐐',
  },
  {
    id: 'chicken1',
    name: 'Chicken 1',
    emoji: '🐔',
  },
];

/*
 * Backend running on your computer.
 *
 * Your phone and laptop must be connected
 * to the same network/hotspot.
 */
const BACKEND_URL = 'https://agriventurevideobackend.onrender.com';

export default function CharactersScreen() {
  const router = useRouter();

  const {
    title,
    description,
    selectedCharacters: selectedCharactersParam,
    characterPhotos: characterPhotosParam,
    characterVoices: characterVoicesParam,
  } = useLocalSearchParams<{
    title?: string;
    description?: string;
    selectedCharacters?: string;
    characterPhotos?: string;
    characterVoices?: string;
  }>();

  // ==========================================
  // SELECTED CHARACTERS
  // ==========================================

  const [selectedCharacters, setSelectedCharacters] =
    useState<string[]>(
      selectedCharactersParam
        ? JSON.parse(selectedCharactersParam)
        : []
    );

  // ==========================================
  // CHARACTER PHOTOS
  // ==========================================

  /*
   * Contains the CURRENT image for each character.
   *
   * Initially:
   * Farmer 1 -> original uploaded photo
   *
   * After animation:
   * Farmer 1 -> Gemini animated image
   *
   * After background removal:
   * Farmer 1 -> transparent PNG
   */
  const [characterPhotos, setCharacterPhotos] =
    useState<Record<string, string>>(
      characterPhotosParam
        ? JSON.parse(characterPhotosParam)
        : {}
    );

  /*
   * Keep original uploaded photo so the user
   * can restore it.
   */
  const [originalCharacterPhotos, setOriginalCharacterPhotos] =
    useState<Record<string, string>>({});

  /*
   * MIME type of the current image.
   */
  const [characterMimeTypes, setCharacterMimeTypes] =
    useState<Record<string, string>>({});

  /*
   * Whether current image has a transparent background.
   */
  const [backgroundRemoved, setBackgroundRemoved] =
    useState<Record<string, boolean>>({});

  // ==========================================
  // GEMINI RESULTS
  // ==========================================

  const [geminiDescriptions, setGeminiDescriptions] =
    useState<Record<string, string>>({});

  const [geminiScripts, setGeminiScripts] =
    useState<Record<string, string>>({});

  // ==========================================
  // LOADING STATES
  // ==========================================

  const [animatingCharacter, setAnimatingCharacter] =
    useState<string | null>(null);

  const [removingBackgroundCharacter, setRemovingBackgroundCharacter] =
    useState<string | null>(null);

  // ==========================================
  // SELECT / DESELECT CHARACTER
  // ==========================================

  const toggleCharacter = (
    characterName: string
  ) => {
    setSelectedCharacters((current) => {
      if (current.includes(characterName)) {
        return current.filter(
          (character) => character !== characterName
        );
      }

      return [...current, characterName];
    });
  };

  // ==========================================
  // UPLOAD CHARACTER PHOTO
  // ==========================================

  const uploadCharacterPhoto = async (
    characterName: string
  ) => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Please allow access to your photos.'
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.9,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      const photoUri = asset.uri;

      /*
       * Determine MIME type.
       */
      let mimeType =
        asset.mimeType || 'image/jpeg';

      if (
        !asset.mimeType &&
        photoUri.toLowerCase().endsWith('.png')
      ) {
        mimeType = 'image/png';
      }

      console.log(
        '================================'
      );

      console.log(
        'CHARACTER PHOTO SELECTED'
      );

      console.log(
        'Character:',
        characterName
      );

      console.log(
        'Photo:',
        photoUri
      );

      console.log(
        'MIME type:',
        mimeType
      );

      console.log(
        '================================'
      );

      // --------------------------------------
      // Save current photo
      // --------------------------------------

      setCharacterPhotos((current) => ({
        ...current,
        [characterName]: photoUri,
      }));

      // --------------------------------------
      // Save original photo
      // --------------------------------------

      setOriginalCharacterPhotos((current) => ({
        ...current,
        [characterName]: photoUri,
      }));

      // --------------------------------------
      // Save MIME type
      // --------------------------------------

      setCharacterMimeTypes((current) => ({
        ...current,
        [characterName]: mimeType,
      }));

      // --------------------------------------
      // Reset background removal
      // --------------------------------------

      setBackgroundRemoved((current) => ({
        ...current,
        [characterName]: false,
      }));

      // --------------------------------------
      // New photo invalidates Gemini results
      // --------------------------------------

      setGeminiDescriptions((current) => {
        const updated = { ...current };

        delete updated[characterName];

        return updated;
      });

      setGeminiScripts((current) => {
        const updated = { ...current };

        delete updated[characterName];

        return updated;
      });

    } catch (error) {
      console.error(
        'Photo selection error:',
        error instanceof Error
          ? error.message
          : error
      );

      Alert.alert(
        'Photo Error',
        'Could not select the photo.'
      );
    }
  };

  // ==========================================
  // READ PHOTO AS BASE64
  // ==========================================

  const readPhotoAsBase64 = async (
    photoUri: string
  ): Promise<string> => {

    /*
     * If this is already a Base64 data URI,
     * extract Base64 directly.
     */
    if (
      photoUri.startsWith('data:')
    ) {
      const commaIndex =
        photoUri.indexOf(',');

      if (commaIndex !== -1) {
        return photoUri.slice(
          commaIndex + 1
        );
      }
    }

    // ----------------------------------------
    // Try Expo FileSystem
    // ----------------------------------------

    try {
      console.log(
        'Reading image with Expo FileSystem...'
      );

      const base64 =
        await FileSystem.readAsStringAsync(
          photoUri,
          {
            encoding:
              FileSystem.EncodingType.Base64,
          }
        );

      if (base64) {
        console.log(
          'Photo converted to Base64 using FileSystem.'
        );

        return base64;
      }

    } catch (fsErr) {
      console.warn(
        'FileSystem.readAsStringAsync failed:',
        fsErr instanceof Error
          ? fsErr.message
          : fsErr
      );
    }

    // ----------------------------------------
    // Fallback: fetch -> blob -> Base64
    // ----------------------------------------

    try {
      console.log(
        'Using fetch/blob fallback...'
      );

      const response =
        await fetch(photoUri);

      if (!response.ok) {
        throw new Error(
          `Could not fetch image. HTTP ${response.status}`
        );
      }

      const blob =
        await response.blob();

      const arrayBuffer =
        await blob.arrayBuffer();

      let binary = '';

      const bytes =
        new Uint8Array(arrayBuffer);

      const chunkSize = 0x8000;

      for (
        let i = 0;
        i < bytes.length;
        i += chunkSize
      ) {
        const chunk =
          bytes.subarray(
            i,
            i + chunkSize
          );

        binary +=
          String.fromCharCode.apply(
            null,
            Array.from(chunk)
          );
      }

      const base64 =
        btoa(binary);

      if (base64) {
        console.log(
          'Photo converted to Base64 using fetch fallback.'
        );

        return base64;
      }

    } catch (fetchErr) {
      console.warn(
        'fetch -> Base64 fallback failed:',
        fetchErr instanceof Error
          ? fetchErr.message
          : fetchErr
      );
    }

    throw new Error(
      'The selected photo could not be converted to Base64.'
    );
  };

  // ==========================================
  // REMOVE BACKGROUND
  // ==========================================

  const removeCharacterBackground = async (
    characterName: string
  ) => {
    const photoUri =
      characterPhotos[characterName];

    if (!photoUri) {
      Alert.alert(
        'Photo required',
        'Please upload a character photo first.'
      );

      return;
    }

    /*
     * Don't run operation twice.
     */
    if (
      removingBackgroundCharacter ===
      characterName
    ) {
      return;
    }

    try {
      setRemovingBackgroundCharacter(
        characterName
      );

      console.log(
        '================================'
      );

      console.log(
        'BACKGROUND REMOVAL'
      );

      console.log(
        `Character: ${characterName}`
      );

      console.log(
        '================================'
      );

      // --------------------------------------
      // Convert photo to Base64
      // --------------------------------------

      const base64 =
        await readPhotoAsBase64(
          photoUri
        );

      const mimeType =
        characterMimeTypes[
          characterName
        ] || 'image/jpeg';

      console.log(
        'Sending image to background removal backend...'
      );

      // --------------------------------------
      // Send to backend
      // --------------------------------------

      const response =
        await fetch(
          `${BACKEND_URL}/api/character/remove-background`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              imageBase64: base64,
              mimeType,
              characterName,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        'Background removal response:',
        data
      );

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          data.error ||
          'Background removal failed.'
        );
      }

      if (!data.url) {
        throw new Error(
          'The backend did not return a processed image.'
        );
      }

      const isFallback = !!data.fallback;

      // --------------------------------------
      // Save result (or keep the original image as a fallback if the service is unavailable)
      // --------------------------------------

      setCharacterPhotos((current) => ({
        ...current,
        [characterName]: data.url,
      }));

      setCharacterMimeTypes((current) => ({
        ...current,
        [characterName]: data.mimeType || 'image/png',
      }));

      setBackgroundRemoved((current) => ({
        ...current,
        [characterName]: !isFallback,
      }));

      console.log(
        'Character image result received.',
        isFallback ? 'using file fallback' : 'background removed'
      );

      console.log(
        '================================'
      );

      Alert.alert(
        isFallback ? 'Background Removal Warning' : 'Background Removed',
        isFallback
          ? `${characterName}'s background removal service is unavailable, so the original photo was kept.`
          : `${characterName}'s background has been removed successfully.`
      );

    } catch (error) {
      console.error(
        'Background removal error:',
        error
      );

      Alert.alert(
        'Background Removal Error',
        error instanceof Error
          ? error.message
          : 'Could not remove the character background.'
      );

    } finally {
      setRemovingBackgroundCharacter(
        null
      );
    }
  };

  // ==========================================
  // RESTORE ORIGINAL PHOTO
  // ==========================================

  const restoreOriginalPhoto = (
    characterName: string
  ) => {
    const originalPhoto =
      originalCharacterPhotos[
        characterName
      ];

    if (!originalPhoto) {
      return;
    }

    setCharacterPhotos((current) => ({
      ...current,
      [characterName]: originalPhoto,
    }));

    setCharacterMimeTypes((current) => ({
      ...current,
      [characterName]:
        originalPhoto
          .toLowerCase()
          .endsWith('.png')
          ? 'image/png'
          : 'image/jpeg',
    }));

    setBackgroundRemoved((current) => ({
      ...current,
      [characterName]: false,
    }));

    /*
     * Clear Gemini results because we are
     * returning to the original photo.
     */
    setGeminiDescriptions((current) => {
      const updated = { ...current };

      delete updated[characterName];

      return updated;
    });

    setGeminiScripts((current) => {
      const updated = { ...current };

      delete updated[characterName];

      return updated;
    });
  };

  // ==========================================
  // TEST BACKEND CONNECTION
  // ==========================================

  const testBackend = async () => {
    try {
      console.log(
        'Testing backend:',
        `${BACKEND_URL}/api/character/test`
      );

      const response =
        await fetch(
          `${BACKEND_URL}/api/character/test`
        );

      const data =
        await response.json();

      console.log(
        'Backend test response:',
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Backend test failed.'
        );
      }

      Alert.alert(
        'Backend Connected',
        data.message ||
          'Character API is reachable.'
      );

    } catch (error) {
      console.error(
        'Backend connection error:',
        error instanceof Error
          ? error.message
          : error
      );

      Alert.alert(
        'Connection Error',
        `Could not connect to the backend.\n\n${BACKEND_URL}\n\nMake sure server.js is running and your phone and laptop are on the same network.`
      );
    }
  };

  // ==========================================
  // ANIMATE CHARACTER WITH GEMINI
  // ==========================================

  const animateCharacter = async (
    characterName: string
  ) => {
    const photoUri =
      characterPhotos[characterName];

    if (!photoUri) {
      Alert.alert(
        'Photo required',
        'Please upload a character photo first.'
      );

      return;
    }

    /*
     * Prevent duplicate requests.
     */
    if (
      animatingCharacter ===
      characterName
    ) {
      return;
    }

    try {
      setAnimatingCharacter(
        characterName
      );

      console.log(
        '================================'
      );

      console.log(
        'GEMINI CHARACTER ANIMATION'
      );

      console.log(
        `Character: ${characterName}`
      );

      console.log(
        '================================'
      );

      // --------------------------------------
      // Convert image to Base64
      // --------------------------------------

      console.log(
        'Converting character image to Base64...'
      );

      const base64 =
        await readPhotoAsBase64(
          photoUri
        );

      const mimeType =
        characterMimeTypes[
          characterName
        ] || 'image/jpeg';

      console.log(
        'MIME type:',
        mimeType
      );

      console.log(
        'Image Base64 length:',
        base64.length
      );

      // --------------------------------------
      // Send image to Gemini backend
      // --------------------------------------

      console.log(
        'Sending character image to Gemini...'
      );

      const response =
        await fetch(
          `${BACKEND_URL}/api/character/animate`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              imageBase64: base64,

              mimeType,

              characterName,

              prompt: `
Transform this uploaded person into a friendly,
high-quality animated farming education character.

IMPORTANT:

- Keep the same person's identity.
- Keep the same face and facial characteristics.
- Keep the same approximate age.
- Keep the same gender.
- Keep the same hairstyle.
- Keep the same clothing and clothing colors.
- Keep the same body proportions.
- Keep the general pose and appearance.
- Do not replace the person with another person.

Create a polished 3D animated character suitable
for an agricultural education video.

The character should look like the uploaded person,
but converted into a professional animated/cartoon style.

Use a clean, appealing appearance suitable for
placing the character over a real farm photograph
or real farm video.

Make the character visually clear and recognizable.

Do not add text.
Do not add another person.
Do not add logos.
Do not create a video.

Return one finished character image.
              `,
            }),
          }
        );

      console.log(
        'Gemini HTTP status:',
        response.status
      );

      const data =
        await response.json();

      console.log(
        'Gemini animation response:',
        data
      );

      // --------------------------------------
      // Check HTTP response
      // --------------------------------------

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          'Gemini character animation failed.'
        );
      }

      // --------------------------------------
      // Check backend success
      // --------------------------------------

      if (!data.success) {
        throw new Error(
          data.message ||
          data.error ||
          'Gemini character animation failed.'
        );
      }

      // --------------------------------------
      // Make sure an image was returned
      // --------------------------------------

      if (!data.url) {
        throw new Error(
          'Gemini generated the character, but the backend did not return an image URL.'
        );
      }

      console.log(
        'Animated character URL:',
        data.url
      );

      // --------------------------------------
      // Replace current character image
      // --------------------------------------

      setCharacterPhotos((current) => ({
        ...current,
        [characterName]: data.url,
      }));

      // --------------------------------------
      // Generated image is normally PNG
      // --------------------------------------

      setCharacterMimeTypes((current) => ({
        ...current,
        [characterName]:
          data.mimeType || 'image/png',
      }));

      // --------------------------------------
      // Update background state
      // --------------------------------------

      setBackgroundRemoved((current) => ({
        ...current,
        [characterName]:
          data.transparent === true,
      }));

      // --------------------------------------
      // Clear old analysis
      // --------------------------------------

      setGeminiDescriptions((current) => {
        const updated = { ...current };

        delete updated[characterName];

        return updated;
      });

      // --------------------------------------
      // Clear old animation script
      // --------------------------------------

      setGeminiScripts((current) => {
        const updated = { ...current };

        delete updated[characterName];

        return updated;
      });

      console.log(
        '================================'
      );

      console.log(
        'CHARACTER ANIMATION SUCCESSFUL'
      );

      console.log(
        `Character: ${characterName}`
      );

      console.log(
        'Cloudinary URL:',
        data.url
      );

      console.log(
        '================================'
      );

      Alert.alert(
        'Character Animated',
        `${characterName} has been converted into an animated character and saved to Cloudinary.`
      );

    } catch (error) {
      console.error(
        '================================'
      );

      console.error(
        'GEMINI CHARACTER ANIMATION ERROR'
      );

      console.error(
        error
      );

      console.error(
        '================================'
      );

      Alert.alert(
        'Animation Error',
        error instanceof Error
          ? error.message
          : 'Something went wrong while animating the character.'
      );

    } finally {
      setAnimatingCharacter(null);
    }
  };

  // ==========================================
  // GENERATE ANIMATION SCRIPT
  // ==========================================

  const generateScript = async (
    characterName: string
  ) => {
    const photoUri =
      characterPhotos[characterName];

    if (!photoUri) {
      Alert.alert(
        'Photo required',
        'Please upload a character photo first.'
      );

      return;
    }

    try {
      setAnimatingCharacter(
        characterName
      );

      console.log(
        'Preparing character image for script generation...'
      );

      const base64 =
        await readPhotoAsBase64(
          photoUri
        );

      const mimeType =
        characterMimeTypes[
          characterName
        ] || 'image/png';

      console.log(
        'Sending image for animation script...'
      );

      const response =
        await fetch(
          `${BACKEND_URL}/api/character/animate/generate`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              imageBase64: base64,

              mimeType,

              characterName,

              durationSeconds: 5,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        'Script response:',
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          'Script generation failed.'
        );
      }

      if (!data.script) {
        throw new Error(
          'Gemini did not return an animation script.'
        );
      }

      const scriptText =
        JSON.stringify(
          data.script,
          null,
          2
        );

      setGeminiScripts(
        (current) => ({
          ...current,

          [characterName]:
            scriptText,
        })
      );

      Alert.alert(
        'Script Generated',
        `${characterName}'s animation script was generated successfully.`
      );

    } catch (error) {
      console.error(
        'Generate script error:',
        error
      );

      Alert.alert(
        'Script Error',
        error instanceof Error
          ? error.message
          : 'Could not generate animation script.'
      );

    } finally {
      setAnimatingCharacter(null);
    }
  };

  // ==========================================
  // FINISH CHARACTER SELECTION
  // ==========================================

  const finishSelection = () => {
    if (selectedCharacters.length === 0) {
      Alert.alert(
        'Select a character',
        'Please select at least one character before continuing.'
      );

      return;
    }

    router.replace({
      pathname: '/scene',

      params: {
        title,

        description,

        selectedCharacters:
          JSON.stringify(
            selectedCharacters
          ),

        characterPhotos:
          JSON.stringify(
            characterPhotos
          ),

        characterVoices:
          characterVoicesParam ||
          JSON.stringify({}),
      },
    });
  };

  // ==========================================
  // SCREEN
  // ==========================================

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.container
      }
    >

      {/* TITLE */}

      <Text style={styles.title}>
        Choose Characters
      </Text>

      <Text style={styles.subtitle}>
        Upload real photos and turn them
        into animated farming characters.
      </Text>

      {/* BACKEND TEST */}

      <Pressable
        style={styles.testButton}
        onPress={testBackend}
      >
        <Text style={styles.testButtonText}>
          🔌 Test Backend Connection
        </Text>
      </Pressable>

      {/* SELECTED CHARACTERS */}

      {selectedCharacters.length > 0 && (
        <View style={styles.selectedBox}>

          <Text style={styles.selectedTitle}>
            Selected Characters
          </Text>

          {selectedCharacters.map(
            (character) => (
              <Text
                key={character}
                style={styles.selectedItem}
              >
                ✓ {character}

                {characterPhotos[character]
                  ? '  📷'
                  : ''}

                {backgroundRemoved[character]
                  ? '  ✂️'
                  : ''}
              </Text>
            )
          )}

        </View>
      )}

      {/* CHARACTER SECTION */}

      <Text style={styles.sectionTitle}>
        Characters
      </Text>

      {/* CHARACTER LIST */}

      {characters.map(
        (character) => {

          const isSelected =
            selectedCharacters.includes(
              character.name
            );

          const photo =
            characterPhotos[
              character.name
            ];

          const geminiDescription =
            geminiDescriptions[
              character.name
            ];

          const script =
            geminiScripts[
              character.name
            ];

          const isAnimating =
            animatingCharacter ===
            character.name;

          const isRemovingBackground =
            removingBackgroundCharacter ===
            character.name;

          const hasTransparentBackground =
            backgroundRemoved[
              character.name
            ] === true;

          return (
            <View
              key={character.id}
              style={[
                styles.characterCard,

                isSelected &&
                  styles.characterCardSelected,
              ]}
            >

              {/* IMAGE */}

              <View>

                {photo ? (

                  <View>

                    <Image
                      source={{
                        uri: photo,
                      }}
                      style={
                        styles.characterPhoto
                      }
                    />

                    {hasTransparentBackground && (
                      <View
                        style={
                          styles.transparentBadge
                        }
                      >
                        <Text
                          style={
                            styles.transparentBadgeText
                          }
                        >
                          ✂️ PNG
                        </Text>
                      </View>
                    )}

                  </View>

                ) : (

                  <View
                    style={
                      styles.emojiContainer
                    }
                  >
                    <Text
                      style={
                        styles.characterEmoji
                      }
                    >
                      {character.emoji}
                    </Text>
                  </View>

                )}

              </View>

              {/* INFORMATION */}

              <View
                style={
                  styles.characterInfo
                }
              >

                <Text
                  style={
                    styles.characterName
                  }
                >
                  {character.name}
                </Text>

                <Text
                  style={
                    styles.characterDescription
                  }
                >
                  {hasTransparentBackground
                    ? '✓ Animated character ready'
                    : geminiDescription
                    ? '✓ Gemini analyzed'
                    : photo
                    ? 'Real photo added'
                    : 'No photo added yet'}
                </Text>

                {/* UPLOAD */}

                <Pressable
                  style={
                    styles.photoButton
                  }
                  onPress={() =>
                    uploadCharacterPhoto(
                      character.name
                    )
                  }
                >
                  <Text
                    style={
                      styles.photoButtonText
                    }
                  >
                    📷{' '}
                    {photo
                      ? 'Change Photo'
                      : 'Upload Photo'}
                  </Text>
                </Pressable>

                {/* REMOVE BACKGROUND */}

                {photo && (
                  <Pressable
                    style={[
                      styles.backgroundButton,

                      isRemovingBackground &&
                        styles.backgroundButtonDisabled,
                    ]}
                    onPress={() =>
                      removeCharacterBackground(
                        character.name
                      )
                    }
                    disabled={
                      isRemovingBackground ||
                      isAnimating
                    }
                  >
                    <Text
                      style={
                        styles.backgroundButtonText
                      }
                    >
                      {isRemovingBackground
                        ? '⏳ Removing Background...'
                        : hasTransparentBackground
                        ? '✂️ Background Removed'
                        : '✂️ Remove Background'}
                    </Text>
                  </Pressable>
                )}

                {/* RESTORE */}

                {photo &&
                  hasTransparentBackground &&
                  originalCharacterPhotos[
                    character.name
                  ] && (

                    <Pressable
                      style={
                        styles.restoreButton
                      }
                      onPress={() =>
                        restoreOriginalPhoto(
                          character.name
                        )
                      }
                      disabled={isAnimating}
                    >
                      <Text
                        style={
                          styles.restoreButtonText
                        }
                      >
                        ↩ Restore Original
                      </Text>
                    </Pressable>

                  )}

                {/* GEMINI ANIMATION */}

                {photo && (
                  <Pressable
                    style={[
                      styles.animateButton,

                      isAnimating &&
                        styles.animateButtonDisabled,
                    ]}
                    onPress={() =>
                      animateCharacter(
                        character.name
                      )
                    }
                    disabled={
                      isAnimating ||
                      isRemovingBackground
                    }
                  >
                    <Text
                      style={
                        styles.animateButtonText
                      }
                    >
                      {isAnimating
                        ? '⏳ Animating with Gemini...'
                        : '✨ Animate with Gemini'}
                    </Text>
                  </Pressable>
                )}

                {/* SCRIPT */}

                {photo && (
                  <Pressable
                    style={
                      styles.scriptButton
                    }
                    onPress={() =>
                      generateScript(
                        character.name
                      )
                    }
                    disabled={
                      isAnimating ||
                      isRemovingBackground
                    }
                  >
                    <Text
                      style={
                        styles.scriptButtonText
                      }
                    >
                      🧭 Generate Animation Script
                    </Text>
                  </Pressable>
                )}

                {/* GEMINI DESCRIPTION */}

                {geminiDescription && (
                  <View
                    style={
                      styles.resultBox
                    }
                  >

                    <Text
                      style={
                        styles.resultTitle
                      }
                    >
                      🤖 Gemini Character Analysis
                    </Text>

                    <Text
                      style={
                        styles.resultText
                      }
                    >
                      {geminiDescription}
                    </Text>

                  </View>
                )}

                {/* SCRIPT RESULT */}

                {script && (
                  <View
                    style={
                      styles.scriptResultBox
                    }
                  >

                    <Text
                      style={
                        styles.scriptResultTitle
                      }
                    >
                      🧭 Animation Script
                    </Text>

                    <Text
                      style={
                        styles.scriptResultText
                      }
                      selectable
                    >
                      {script.slice(
                        0,
                        2500
                      )}
                    </Text>

                  </View>
                )}

              </View>

              {/* CHECKBOX */}

              <Pressable
                style={[
                  styles.checkbox,

                  isSelected &&
                    styles.checkboxSelected,
                ]}
                onPress={() =>
                  toggleCharacter(
                    character.name
                  )
                }
              >

                {isSelected && (
                  <Text
                    style={
                      styles.checkmark
                    }
                  >
                    ✓
                  </Text>
                )}

              </Pressable>

            </View>
          );
        }
      )}

      {/* DONE */}

      <Pressable
        style={[
          styles.doneButton,

          selectedCharacters.length === 0 &&
            styles.doneButtonDisabled,
        ]}
        onPress={
          finishSelection
        }
        disabled={
          selectedCharacters.length === 0
        }
      >
        <Text
          style={
            styles.doneButtonText
          }
        >
          Done
        </Text>
      </Pressable>

    </ScrollView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles =
  StyleSheet.create({

    screen: {
      flex: 1,
    },

    container: {
      padding: 20,
      paddingTop: 30,
      paddingBottom: 50,
    },

    title: {
      fontSize: 30,
      fontWeight: 'bold',
    },

    subtitle: {
      fontSize: 16,
      marginTop: 8,
      marginBottom: 20,
      color: '#555',
    },

    testButton: {
      backgroundColor: '#1565c0',
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: 20,
    },

    testButtonText: {
      color: 'white',
      fontSize: 13,
      fontWeight: 'bold',
    },

    selectedBox: {
      backgroundColor: '#e8f5e9',
      padding: 15,
      borderRadius: 12,
      marginBottom: 25,
    },

    selectedTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      marginBottom: 8,
    },

    selectedItem: {
      fontSize: 15,
      marginTop: 4,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 12,
    },

    characterCard: {
      backgroundColor: 'white',
      borderRadius: 15,
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 3,
      borderWidth: 2,
      borderColor: 'transparent',
    },

    characterCardSelected: {
      borderColor: '#2e7d32',
      backgroundColor: '#f1f8f2',
    },

    emojiContainer: {
      width: 70,
      height: 90,
      borderRadius: 10,
      backgroundColor: '#eeeeee',
      justifyContent: 'center',
      alignItems: 'center',
    },

    characterPhoto: {
      width: 70,
      height: 90,
      borderRadius: 10,
      backgroundColor: '#eeeeee',
    },

    characterEmoji: {
      fontSize: 42,
    },

    characterInfo: {
      flex: 1,
      marginLeft: 12,
    },

    characterName: {
      fontSize: 17,
      fontWeight: 'bold',
    },

    characterDescription: {
      fontSize: 13,
      marginTop: 4,
      color: '#666',
    },

    photoButton: {
      backgroundColor: '#e8f5e9',
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 7,
      alignSelf: 'flex-start',
      marginTop: 8,
    },

    photoButtonText: {
      color: '#2e7d32',
      fontSize: 12,
      fontWeight: 'bold',
    },

    backgroundButton: {
      backgroundColor: '#00695c',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 7,
      alignSelf: 'flex-start',
      marginTop: 7,
    },

    backgroundButtonDisabled: {
      backgroundColor: '#78909c',
    },

    backgroundButtonText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },

    restoreButton: {
      backgroundColor: '#eeeeee',
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 7,
      alignSelf: 'flex-start',
      marginTop: 6,
    },

    restoreButtonText: {
      color: '#444',
      fontSize: 12,
      fontWeight: 'bold',
    },

    transparentBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      backgroundColor: '#2e7d32',
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: 5,
    },

    transparentBadgeText: {
      color: 'white',
      fontSize: 9,
      fontWeight: 'bold',
    },

    animateButton: {
      backgroundColor: '#263238',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 7,
      alignSelf: 'flex-start',
      marginTop: 6,
    },

    animateButtonDisabled: {
      backgroundColor: '#78909c',
    },

    animateButtonText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },

    scriptButton: {
      backgroundColor: '#4a148c',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 7,
      alignSelf: 'flex-start',
      marginTop: 8,
    },

    scriptButtonText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },

    resultBox: {
      backgroundColor: '#f5f5f5',
      padding: 10,
      borderRadius: 8,
      marginTop: 8,
    },

    resultTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 5,
      color: '#2e7d32',
    },

    resultText: {
      fontSize: 11,
      lineHeight: 16,
      color: '#444',
    },

    scriptResultBox: {
      backgroundColor: '#ede7f6',
      padding: 10,
      borderRadius: 8,
      marginTop: 8,
    },

    scriptResultTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 5,
      color: '#4a148c',
    },

    scriptResultText: {
      fontSize: 10,
      lineHeight: 15,
      color: '#333',
    },

    checkbox: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: '#999',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },

    checkboxSelected: {
      backgroundColor: '#2e7d32',
      borderColor: '#2e7d32',
    },

    checkmark: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },

    doneButton: {
      backgroundColor: '#2e7d32',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },

    doneButtonDisabled: {
      backgroundColor: '#aaaaaa',
    },

    doneButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },

  });