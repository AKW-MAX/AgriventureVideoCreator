import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ==========================================
// TYPES
// ==========================================

type CharacterPosition = {
  x: number;
  y: number;
  size: number;
};

type CharacterPhotos = Record<string, string>;
type CharacterVoices = Record<string, string>;

type GenerationStage =
  | 'idle'
  | 'background'
  | 'character'
  | 'composing';

type ImageInput = {
  imageBase64?: string;
  imageUrl?: string;
  mimeType?: string;
};

type BackgroundMode = 'photo' | 'video';

// ==========================================
// BACKEND
// ==========================================

const BACKEND_URL = 'http://10.159.131.218:5001';

// ==========================================
// CHARACTER EMOJIS
// ==========================================

const getCharacterEmoji = (character: string) => {
  switch (character) {
    case 'Farmer 1':
    case 'Farmer':
    case 'Farmer 2':
      return '👨‍🌾';

    case 'Female Farmer 1':
    case 'Female Farmer':
      return '👩‍🌾';

    case 'Child 1':
      return '🧒';

    case 'Child 2':
      return '👧';

    case 'Veterinarian 1':
    case 'Veterinarian':
      return '🧑‍⚕️';

    case 'Cow 1':
    case 'Cow':
      return '🐄';

    case 'Goat 1':
    case 'Goat':
      return '🐐';

    case 'Chicken 1':
    case 'Chicken':
      return '🐔';

    default:
      return '👤';
  }
};

// ==========================================
// SAFE PARAMETER HELPER
// ==========================================

const getParamString = (
  value: string | string[] | undefined
): string => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
};

// ==========================================
// SAFE JSON HELPERS
// ==========================================

function safeParseArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch (error) {
    console.warn(
      'Could not parse selectedCharacters:',
      error
    );

    return [];
  }
}

function safeParseObject(
  value: string
): CharacterPhotos {
  try {
    const parsed = JSON.parse(value);

    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }

    return {};
  } catch (error) {
    console.warn(
      'Could not parse character data:',
      error
    );

    return {};
  }
}

// ==========================================
// SAFE BACKEND URL HELPER
// ==========================================

function makeBackendUrl(
  value: unknown
): string | null {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return null;
  }

  const trimmed = value.trim();

  // Already a complete URL
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // Backend returned a relative path
  if (trimmed.startsWith('/')) {
    return `${BACKEND_URL}${trimmed}`;
  }

  // Backend returned only a filename
  return `${BACKEND_URL}/api/video/files/${encodeURIComponent(
    trimmed
  )}`;
}

// ==========================================
// IMAGE INPUT HELPER
// ==========================================

async function getImageInput(
  photoUri: string
): Promise<ImageInput> {
  if (!photoUri) {
    throw new Error(
      'No image was selected.'
    );
  }

  // ------------------------------------------
  // Remote image
  // ------------------------------------------

  if (
    photoUri.startsWith('http://') ||
    photoUri.startsWith('https://')
  ) {
    return {
      imageUrl: photoUri,
      mimeType: 'image/jpeg',
    };
  }

  // ------------------------------------------
  // Data URI
  // ------------------------------------------

  if (photoUri.startsWith('data:')) {
    const commaIndex =
      photoUri.indexOf(',');

    const mimeType =
      photoUri.match(
        /^data:([^;]+);/i
      )?.[1] || 'image/jpeg';

    return {
      imageBase64:
        commaIndex === -1
          ? photoUri
          : photoUri.slice(
              commaIndex + 1
            ),
      mimeType,
    };
  }

  // ------------------------------------------
  // Local Expo file
  // ------------------------------------------

  const base64 =
    await FileSystem.readAsStringAsync(
      photoUri,
      {
        encoding:
          FileSystem.EncodingType.Base64,
      }
    );

  return {
    imageBase64: base64,
    mimeType: 'image/jpeg',
  };
}

// ==========================================
// INITIAL POSITIONS
// ==========================================

const createInitialPositions = (
  characters: string[]
): CharacterPosition[] => {
  return characters.map((_, index) => ({
    x: 20 + index * 55,
    y: 240,
    size: 110,
  }));
};

// ==========================================
// DRAGGABLE CHARACTER
// ==========================================

function DraggableCharacter({
  character,
  position,
  characterPhoto,
  onMove,
  onDelete,
  onResize,
}: {
  character: string;
  position: CharacterPosition;
  characterPhoto?: string;
  onMove: (x: number, y: number) => void;
  onDelete: () => void;
  onResize: (size: number) => void;
}) {
  const startPosition =
    useRef<CharacterPosition>(position);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:
        () => true,

      onPanResponderGrant: () => {
        startPosition.current = {
          ...position,
        };
      },

      onPanResponderMove: (
        _,
        gesture
      ) => {
        onMove(
          startPosition.current.x +
            gesture.dx,
          startPosition.current.y +
            gesture.dy
        );
      },

      onPanResponderRelease: (
        _,
        gesture
      ) => {
        onMove(
          startPosition.current.x +
            gesture.dx,
          startPosition.current.y +
            gesture.dy
        );
      },
    })
  ).current;

  const imageWidth =
    position.size;

  const imageHeight =
    position.size * 1.25;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.characterOnScene,
        {
          left: position.x,
          top: position.y,
        },
      ]}
    >
      {characterPhoto ? (
        <Image
          source={{
            uri: characterPhoto,
          }}
          style={{
            width: imageWidth,
            height: imageHeight,
          }}
          resizeMode="contain"
        />
      ) : (
        <Text
          style={[
            styles.characterEmoji,
            {
              fontSize:
                position.size * 0.6,
            },
          ]}
        >
          {getCharacterEmoji(
            character
          )}
        </Text>
      )}

      <Text
        style={styles.characterName}
      >
        {character}
      </Text>

      <View
        style={
          styles.characterControls
        }
      >
        <Pressable
          style={
            styles.controlButton
          }
          onPress={() =>
            onResize(
              Math.max(
                60,
                position.size - 10
              )
            )
          }
        >
          <Text
            style={
              styles.controlButtonText
            }
          >
            −
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.controlButton
          }
          onPress={() =>
            onResize(
              Math.min(
                260,
                position.size + 10
              )
            )
          }
        >
          <Text
            style={
              styles.controlButtonText
            }
          >
            +
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.controlButton,
            styles.deleteButton,
          ]}
          onPress={onDelete}
        >
          <Text
            style={
              styles.controlButtonText
            }
          >
            ✕
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ==========================================
// SCENE SCREEN
// ==========================================

export default function SceneScreen() {
  const router = useRouter();

  // ==========================================
  // ROUTE PARAMETERS
  // ==========================================

  const params =
    useLocalSearchParams<{
      title?: string | string[];
      description?: string | string[];
      selectedCharacters?:
        | string
        | string[];
      characterPhotos?:
        | string
        | string[];
      characterVoices?:
        | string
        | string[];
      dialogue?: string | string[];
      dialogueCharacter?:
        | string
        | string[];
    }>();

  const title = getParamString(
    params.title
  );

  const description =
    getParamString(
      params.description
    );

  const selectedCharactersParam =
    getParamString(
      params.selectedCharacters
    );

  const characterPhotosParam =
    getParamString(
      params.characterPhotos
    );

  const characterVoicesParam =
    getParamString(
      params.characterVoices
    );

  const dialogue = getParamString(
    params.dialogue
  );

  const dialogueCharacter =
    getParamString(
      params.dialogueCharacter
    );

  // ==========================================
  // INITIAL DATA
  // ==========================================

  const initialCharacters =
    selectedCharactersParam
      ? safeParseArray(
          selectedCharactersParam
        )
      : [];

  const initialPhotos =
    characterPhotosParam
      ? safeParseObject(
          characterPhotosParam
        )
      : {};

  const initialVoices =
    characterVoicesParam
      ? safeParseObject(
          characterVoicesParam
        )
      : {};

  // ==========================================
  // STATE
  // ==========================================

  const [
    backgroundImage,
    setBackgroundImage,
  ] = useState<string | null>(
    null
  );

  const [
    backgroundMode,
    setBackgroundMode,
  ] = useState<BackgroundMode>(
    'photo'
  );

  const [
    selectedCharacters,
    setSelectedCharacters,
  ] = useState<string[]>(
    initialCharacters
  );

  const [
    characterPhotos,
    setCharacterPhotos,
  ] = useState<CharacterPhotos>(
    initialPhotos
  );

  const [
    characterVoices,
    setCharacterVoices,
  ] = useState<CharacterVoices>(
    initialVoices
  );

  const [
    savedDialogue,
    setSavedDialogue,
  ] = useState(dialogue);

  const [
    savedDialogueCharacter,
    setSavedDialogueCharacter,
  ] = useState(
    dialogueCharacter
  );

  const [
    characterPositions,
    setCharacterPositions,
  ] = useState<CharacterPosition[]>(
    createInitialPositions(
      initialCharacters
    )
  );

  const [
    generatingVideo,
    setGeneratingVideo,
  ] = useState(false);

  const [
    generationStage,
    setGenerationStage,
  ] = useState<GenerationStage>(
    'idle'
  );

  const [
    generatedVideoUrl,
    setGeneratedVideoUrl,
  ] = useState<string | null>(
    null
  );

  const [
    downloadingVideo,
    setDownloadingVideo,
  ] = useState(false);

  // ==========================================
  // CHOOSE REAL FARM BACKGROUND
  // ==========================================

  const chooseBackground =
    async () => {
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
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [9, 16],
              quality: 0.9,
            }
          );

        if (
          result.canceled ||
          !result.assets ||
          result.assets.length === 0
        ) {
          return;
        }

        const selectedUri =
          result.assets[0].uri;

        setBackgroundImage(
          selectedUri
        );

        Alert.alert(
          'Farm Background',
          'How would you like to use this farm photo?',
          [
            {
              text: '📷 Use Photo As-Is',
              onPress: () => {
                setBackgroundMode(
                  'photo'
                );

                console.log(
                  '📷 Background mode: PHOTO'
                );
              },
            },

            {
              text: '🎬 Animate with Gemini/Veo',
              onPress: () => {
                setBackgroundMode(
                  'video'
                );

                console.log(
                  '🎬 Background mode: GEMINI/VEO'
                );
              },
            },

            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      } catch (error) {
        console.error(
          'Background selection error:',
          error
        );

        Alert.alert(
          'Background Error',
          'Could not select the background image.'
        );
      }
    };

  // ==========================================
  // OPEN CHARACTERS
  // ==========================================

  const openCharacters = () => {
    router.push({
      pathname: '/characters',
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
          JSON.stringify(
            characterVoices
          ),
      },
    });
  };

  // ==========================================
  // OPEN DIALOGUE
  // ==========================================

  const openDialogue = () => {
    router.push({
      pathname: '/dialogue',
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
          JSON.stringify(
            characterVoices
          ),

        dialogue:
          savedDialogue,

        dialogueCharacter:
          savedDialogueCharacter,
      },
    });
  };

  // ==========================================
  // MOVE CHARACTER
  // ==========================================

  const moveCharacter = (
    index: number,
    x: number,
    y: number
  ) => {
    setCharacterPositions(
      current => {
        const updated = [
          ...current,
        ];

        if (!updated[index]) {
          return current;
        }

        updated[index] = {
          ...updated[index],
          x,
          y,
        };

        return updated;
      }
    );
  };

  // ==========================================
  // RESIZE CHARACTER
  // ==========================================

  const resizeCharacter = (
    index: number,
    size: number
  ) => {
    setCharacterPositions(
      current => {
        const updated = [
          ...current,
        ];

        if (!updated[index]) {
          return current;
        }

        updated[index] = {
          ...updated[index],
          size,
        };

        return updated;
      }
    );
  };

  // ==========================================
  // DELETE CHARACTER
  // ==========================================

  const deleteCharacter = (
    index: number
  ) => {
    const character =
      selectedCharacters[index];

    Alert.alert(
      'Remove Character',
      `Remove ${character} from this scene?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Remove',
          style: 'destructive',

          onPress: () => {
            setSelectedCharacters(
              current =>
                current.filter(
                  (_, i) =>
                    i !== index
                )
            );

            setCharacterPositions(
              current =>
                current.filter(
                  (_, i) =>
                    i !== index
                )
            );
          },
        },
      ]
    );
  };

  // ==========================================
  // GENERATE VIDEO
  // ==========================================

  const generateScene =
    async () => {
      // ========================================
      // VALIDATION
      // ========================================

      if (!backgroundImage) {
        Alert.alert(
          'Background required',
          'Please choose a real farm background first.'
        );
        return;
      }

      if (
        selectedCharacters.length ===
        0
      ) {
        Alert.alert(
          'Character required',
          'Please add at least one character to the scene.'
        );
        return;
      }

      if (
        !savedDialogue.trim()
      ) {
        Alert.alert(
          'Dialogue required',
          'Add dialogue before generating the video.'
        );
        return;
      }

      const characterName =
        savedDialogueCharacter ||
        selectedCharacters[0];

      const characterPhoto =
        characterPhotos[
          characterName
        ] ||
        characterPhotos[
          selectedCharacters[0]
        ];

      if (!characterPhoto) {
        Alert.alert(
          'Character photo required',
          'Choose a character photo before generating the video.'
        );
        return;
      }

      const voiceId =
        characterVoices[
          characterName
        ];

      if (!voiceId) {
        Alert.alert(
          'Voice required',
          `Please choose a voice for ${characterName} before generating the video.`
        );
        return;
      }

      try {
        setGeneratingVideo(
          true
        );

        setGeneratedVideoUrl(
          null
        );

        // ========================================
        // STEP 1
        // PREPARE BACKGROUND
        // ========================================

        setGenerationStage(
          'background'
        );

        console.log(
          '======================================'
        );

        console.log(
          '🌾 STEP 1: PREPARING FARM BACKGROUND'
        );

        console.log(
          '======================================'
        );

        const backgroundInput =
          await getImageInput(
            backgroundImage
          );

        if (
          !backgroundInput.imageBase64
        ) {
          throw new Error(
            'The selected farm image could not be converted to base64.'
          );
        }

        let backgroundFilename:
          | string
          | undefined;

        // ========================================
        // PHOTO MODE
        // ========================================

        if (
          backgroundMode ===
          'photo'
        ) {
          console.log(
            '📷 Keeping farm photo as-is...'
          );

          const backgroundResponse =
            await fetch(
              `${BACKEND_URL}/api/video/background/photo`,
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify({
                  backgroundImageBase64:
                    backgroundInput.imageBase64,

                  mimeType:
                    backgroundInput.mimeType ||
                    'image/jpeg',

                  duration: 15,
                }),
              }
            );

          const backgroundText =
            await backgroundResponse.text();

          let backgroundData: any;

          try {
            backgroundData =
              JSON.parse(
                backgroundText
              );
          } catch {
            throw new Error(
              `Backend returned an invalid photo background response: ${backgroundText.slice(
                0,
                300
              )}`
            );
          }

          console.log(
            'Photo background response:',
            backgroundData
          );

          if (
            !backgroundResponse.ok ||
            !backgroundData.success
          ) {
            throw new Error(
              backgroundData.message ||
                backgroundData.error ||
                `Photo background preparation failed (${backgroundResponse.status}).`
            );
          }

          backgroundFilename =
            backgroundData.filename ||
            backgroundData.fileName;

          if (
            !backgroundFilename
          ) {
            throw new Error(
              'Photo background was created but no filename was returned by the backend.'
            );
          }

          console.log(
            '✅ Static farm background:',
            backgroundFilename
          );
        }

        // ========================================
        // GEMINI / VEO MODE
        // ========================================

        else {
          console.log(
            '🎬 Animating farm photo with Gemini/Veo...'
          );

          const backgroundResponse =
            await fetch(
              `${BACKEND_URL}/api/video/background/generate`,
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify({
                  backgroundImageBase64:
                    backgroundInput.imageBase64,

                  mimeType:
                    backgroundInput.mimeType ||
                    'image/jpeg',
                }),
              }
            );

          const backgroundText =
            await backgroundResponse.text();

          let backgroundData: any;

          try {
            backgroundData =
              JSON.parse(
                backgroundText
              );
          } catch {
            throw new Error(
              `Backend returned an invalid Gemini background response: ${backgroundText.slice(
                0,
                300
              )}`
            );
          }

          console.log(
            'Gemini background response:',
            backgroundData
          );

          if (
            backgroundResponse.status ===
              429 ||
            backgroundData.code ===
              'GEMINI_QUOTA_EXCEEDED'
          ) {
            throw new Error(
              'Gemini/Veo quota has been exceeded. Please choose "Use Photo As-Is" for this scene.'
            );
          }

          if (
            !backgroundResponse.ok ||
            !backgroundData.success
          ) {
            throw new Error(
              backgroundData.message ||
                backgroundData.error ||
                `Gemini background generation failed (${backgroundResponse.status}).`
            );
          }

          backgroundFilename =
            backgroundData.filename ||
            backgroundData.fileName;

          if (
            !backgroundFilename
          ) {
            throw new Error(
              'Gemini completed but no moving background filename was returned.'
            );
          }

          console.log(
            '✅ Moving Gemini background:',
            backgroundFilename
          );
        }

        // ========================================
        // STEP 2
        // HEYGEN CHARACTER
        // ========================================

        setGenerationStage(
          'character'
        );

        console.log(
          '======================================'
        );

        console.log(
          '🎭 STEP 2: CREATING CHARACTER VIDEO'
        );

        console.log(
          '======================================'
        );

        const characterInput =
          await getImageInput(
            characterPhoto
          );

        if (
          !characterInput.imageBase64 &&
          !characterInput.imageUrl
        ) {
          throw new Error(
            'The character image could not be prepared.'
          );
        }

        const createResponse =
          await fetch(
            `${BACKEND_URL}/api/video/heygen/create`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                ...characterInput,

                title:
                  title ||
                  'Agriventure Scene',

                script:
                  savedDialogue.trim(),

                voiceId,

                aspectRatio:
                  '9:16',

                resolution:
                  '720p',
              }),
            }
          );

        const createText =
          await createResponse.text();

        let createData: any;

        try {
          createData =
            JSON.parse(
              createText
            );
        } catch {
          throw new Error(
            `Backend returned an invalid HeyGen response: ${createText.slice(
              0,
              300
            )}`
          );
        }

        console.log(
          'HeyGen create response:',
          createData
        );

        if (
          !createResponse.ok ||
          !createData.success
        ) {
          const heygenMessage =
            createData.error?.message ||
            createData.message ||
            createData.error ||
            'HeyGen video creation failed.';

          throw new Error(
            heygenMessage
          );
        }

        const videoId =
          createData.videoId ||
          createData.video_id ||
          createData.data?.video_id ||
          createData.data?.videoId;

        if (!videoId) {
          throw new Error(
            'HeyGen did not return a video ID.'
          );
        }

        console.log(
          '✅ HeyGen video ID:',
          videoId
        );

        // ========================================
        // STEP 3
        // WAIT FOR HEYGEN
        // ========================================

        let characterFilename:
          | string
          | null = null;

        let lastStatus =
          'waiting';

        for (
          let attempt = 0;
          attempt < 60;
          attempt += 1
        ) {
          console.log(
            `🎭 Checking HeyGen character ${attempt + 1}/60`
          );

          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                5000
              )
          );

          const characterResponse =
            await fetch(
              `${BACKEND_URL}/api/video/heygen/status/${encodeURIComponent(
                videoId
              )}`
            );

          const characterText =
            await characterResponse.text();

          let characterData: any;

          try {
            characterData =
              JSON.parse(
                characterText
              );
          } catch {
            throw new Error(
              `HeyGen status returned invalid data: ${characterText.slice(
                0,
                300
              )}`
            );
          }

          console.log(
            'HeyGen status response:',
            characterData
          );

          lastStatus =
            characterData.status ||
            characterData.data?.status ||
            lastStatus;

          // ======================================
          // HEYGEN FAILED
          // ======================================

          if (
            lastStatus === 'failed' ||
            lastStatus === 'error'
          ) {
            const failureMessage =
              characterData.failureMessage ||
              characterData.failure_message ||
              characterData.error?.message ||
              characterData.error ||
              characterData.message ||
              characterData.data?.failure_message ||
              'HeyGen could not generate the character video.';

            throw new Error(
              `HeyGen generation failed: ${failureMessage}`
            );
          }

          // ======================================
          // HEYGEN COMPLETED
          // ======================================

          if (
            lastStatus ===
              'completed' ||
            characterData.completed ===
              true
          ) {
            console.log(
              '✅ HeyGen reports video completed.'
            );

            // ------------------------------------
            // Get the generated HeyGen video
            // and prepare it for FFmpeg.
            // ------------------------------------

            const characterFileResponse =
              await fetch(
                `${BACKEND_URL}/api/video/heygen/character/${encodeURIComponent(
                  videoId
                )}`
              );

            const characterFileText =
              await characterFileResponse.text();

            let characterFileData: any;

            try {
              characterFileData =
                JSON.parse(
                  characterFileText
                );
            } catch {
              throw new Error(
                `HeyGen character response was invalid: ${characterFileText.slice(
                  0,
                  300
                )}`
              );
            }

            console.log(
              'HeyGen character file response:',
              characterFileData
            );

            if (
              !characterFileResponse.ok ||
              !characterFileData.success
            ) {
              throw new Error(
                characterFileData.message ||
                  characterFileData.error ||
                  'HeyGen video could not be prepared for composition.'
              );
            }

            characterFilename =
              characterFileData.filename ||
              characterFileData.fileName;

            if (
              !characterFilename
            ) {
              throw new Error(
                'HeyGen completed successfully, but the backend did not return a character filename.'
              );
            }

            break;
          }
        }

        // ========================================
        // CHARACTER TIMEOUT
        // ========================================

        if (!characterFilename) {
          throw new Error(
            `HeyGen is still processing the character video (status: ${lastStatus}). Please try again shortly.`
          );
        }

        console.log(
          '✅ Character video file:',
          characterFilename
        );

        // ========================================
        // STEP 4
        // FFMPEG COMPOSITION
        // ========================================

        setGenerationStage(
          'composing'
        );

        console.log(
          '======================================'
        );

        console.log(
          '🎬 STEP 4: COMBINING VIDEOS'
        );

        console.log(
          '======================================'
        );

        const composeResponse =
          await fetch(
            `${BACKEND_URL}/api/video/compose`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                backgroundFilename,

                characterFilename,

                videoId,

                title:
                  title ||
                  'Agriventure Scene',
              }),
            }
          );

        const composeText =
          await composeResponse.text();

        let composeData: any;

        try {
          composeData =
            JSON.parse(
              composeText
            );
        } catch {
          throw new Error(
            `Backend returned an invalid FFmpeg response: ${composeText.slice(
              0,
              300
            )}`
          );
        }

        console.log(
          'FFmpeg compose response:',
          composeData
        );

        if (
          !composeResponse.ok ||
          !composeData.success
        ) {
          throw new Error(
            composeData.message ||
              composeData.error ||
              `FFmpeg composition failed (${composeResponse.status}).`
          );
        }

        // ========================================
        // GET FINAL VIDEO URL
        // ========================================

        const rawFinalVideo =
          composeData.videoUrl ||
          composeData.video_url ||
          composeData.url ||
          composeData.fileUrl ||
          composeData.file_url ||
          composeData.filename ||
          composeData.fileName ||
          composeData.data?.videoUrl ||
          composeData.data?.video_url ||
          composeData.data?.url ||
          composeData.data?.filename ||
          composeData.data?.fileName;

        console.log(
          'Raw final video value:',
          rawFinalVideo
        );

        const finalVideoUrl =
          makeBackendUrl(
            rawFinalVideo
          );

        console.log(
          'Resolved final video URL:',
          finalVideoUrl
        );

        // ========================================
        // NEVER USE undefined URL
        // ========================================

        if (!finalVideoUrl) {
          console.error(
            '❌ Backend did not provide a usable final video URL.'
          );

          console.error(
            'Complete compose response:',
            JSON.stringify(
              composeData,
              null,
              2
            )
          );

          throw new Error(
            'The final video was created, but the backend did not return a usable video URL.'
          );
        }

        // ========================================
        // FINAL VIDEO READY
        // ========================================

        setGeneratedVideoUrl(
          finalVideoUrl
        );

        setGenerationStage(
          'idle'
        );

        console.log(
          '======================================'
        );

        console.log(
          '🎉 FINAL VIDEO READY'
        );

        console.log(
          finalVideoUrl
        );

        console.log(
          '======================================'
        );

        Alert.alert(
          'Video Ready 🎉',
          'Your farming video has been created successfully!',
          [
            {
              text: 'Stay Here',
              style: 'cancel',
            },

            {
              text: 'Go to Home',
              onPress: () => {
                router.replace('/');
              },
            },
          ],
          {
            cancelable: false,
          }
        );
      } catch (error) {
        console.error(
          '❌ Video generation error:',
          error
        );

        setGenerationStage(
          'idle'
        );

        let message =
          'Could not generate the farming video.';

        if (
          error instanceof Error
        ) {
          message =
            error.message;
        }

        Alert.alert(
          'Video generation failed',
          message
        );
      } finally {
        setGeneratingVideo(
          false
        );
      }
    };

  // ==========================================
  // GENERATION MESSAGE
  // ==========================================

  const getGenerationMessage =
    () => {
      switch (
        generationStage
      ) {
        case 'background':
          return backgroundMode ===
            'photo'
            ? '📷 Preparing Farm Photo...'
            : '🎬 Animating Farm Background...';

        case 'character':
          return '🎭 Generating Animated Character...';

        case 'composing':
          return '🎬 Combining Farm + Character...';

        default:
          return '🎬 Generate Final Video';
      }
    };

  // ==========================================
  // OPEN GENERATED VIDEO
  // ==========================================

  const openGeneratedVideo =
    async () => {
      if (
        !generatedVideoUrl ||
        typeof generatedVideoUrl !==
          'string' ||
        !generatedVideoUrl.trim()
      ) {
        Alert.alert(
          'Video unavailable',
          'There is no valid generated video URL.'
        );

        return;
      }

      const videoUrl =
        generatedVideoUrl.trim();

      if (
        !videoUrl.startsWith(
          'http://'
        ) &&
        !videoUrl.startsWith(
          'https://'
        )
      ) {
        Alert.alert(
          'Invalid video URL',
          `The backend returned an invalid video URL:\n\n${videoUrl}`
        );

        return;
      }

      try {
        console.log(
          '🎥 Opening generated video:',
          videoUrl
        );

        const supported =
          await Linking.canOpenURL(
            videoUrl
          );

        if (!supported) {
          throw new Error(
            'Your device cannot open the generated video URL.'
          );
        }

        await Linking.openURL(
          videoUrl
        );
      } catch (error) {
        console.error(
          'Open video error:',
          error
        );

        Alert.alert(
          'Could not open video',
          error instanceof Error
            ? error.message
            : 'The generated video could not be opened.'
        );
      }
    };

  // ==========================================
  // DOWNLOAD / SHARE GENERATED VIDEO
  // ==========================================

  const downloadGeneratedVideo =
    async () => {
      if (
        !generatedVideoUrl ||
        typeof generatedVideoUrl !==
          'string' ||
        !generatedVideoUrl.trim()
      ) {
        Alert.alert(
          'Video unavailable',
          'There is no valid generated video URL to download.'
        );

        return;
      }

      const videoUrl =
        generatedVideoUrl.trim();

      console.log(
        '📥 Downloading final video:',
        videoUrl
      );

      try {
        setDownloadingVideo(
          true
        );

        // ========================================
        // VALIDATE URL
        // ========================================

        if (
          !videoUrl.startsWith(
            'http://'
          ) &&
          !videoUrl.startsWith(
            'https://'
          )
        ) {
          throw new Error(
            `Invalid video URL returned by the backend: ${videoUrl}`
          );
        }

        const documentDirectory =
          FileSystem.documentDirectory;

        if (!documentDirectory) {
          throw new Error(
            'Device storage is not available.'
          );
        }

        const targetUri =
          `${documentDirectory}agriventure-${Date.now()}.mp4`;

        console.log(
          '📥 Target file:',
          targetUri
        );

        // ========================================
        // DOWNLOAD
        // ========================================

        const download =
          await FileSystem.downloadAsync(
            videoUrl,
            targetUri
          );

        console.log(
          '✅ Download response:',
          download
        );

        if (
          !download ||
          !download.uri
        ) {
          throw new Error(
            'The video could not be downloaded because no local file was returned.'
          );
        }

        // ========================================
        // SHARE
        // ========================================

        const sharingAvailable =
          await Sharing.isAvailableAsync();

        if (!sharingAvailable) {
          Alert.alert(
            'Video downloaded',
            'The video was saved successfully to your device.'
          );

          return;
        }

        await Sharing.shareAsync(
          download.uri,
          {
            mimeType:
              'video/mp4',

            dialogTitle:
              'Save or share Agriventure video',

            UTI:
              'public.mpeg-4',
          }
        );
      } catch (error) {
        console.error(
          '❌ Download/share error:',
          error
        );

        Alert.alert(
          'Download failed',
          error instanceof Error
            ? error.message
            : 'Could not download the generated video.'
        );
      } finally {
        setDownloadingVideo(
          false
        );
      }
    };

  // ==========================================
  // RENDER
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
        Scene 1
      </Text>

      <Text
        style={styles.subtitle}
      >
        Build your first farming scene
      </Text>

      {/* STORY */}

      <View
        style={styles.storyBox}
      >
        <Text
          style={styles.storyTitle}
        >
          {title ||
            'Untitled Story'}
        </Text>

        <Text
          style={
            styles.storyDescription
          }
        >
          {description ||
            'No story description yet.'}
        </Text>
      </View>

      {/* CHARACTERS LIST */}

      {selectedCharacters.length >
        0 && (
        <View
          style={
            styles.characterBox
          }
        >
          <Text
            style={
              styles.selectedCharacter
            }
          >
            Characters in this scene:
          </Text>

          {selectedCharacters.map(
            (
              character,
              index
            ) => (
              <Text
                key={`${character}-${index}`}
                style={
                  styles.characterItem
                }
              >
                {characterPhotos[
                  character
                ]
                  ? '🧑'
                  : getCharacterEmoji(
                      character
                    )}{' '}
                {character}
              </Text>
            )
          )}
        </View>
      )}

      {/* SCENE PREVIEW */}

      <View
        style={styles.preview}
      >
        {/* BACKGROUND MODE BADGE */}

        {backgroundImage ? (
          <View
            style={
              styles.backgroundModeBadge
            }
          >
            <Text
              style={
                styles.backgroundModeBadgeText
              }
            >
              {backgroundMode ===
              'photo'
                ? '📷 PHOTO'
                : '🎬 GEMINI/VEO'}
            </Text>
          </View>
        ) : null}

        {/* BACKGROUND */}

        {backgroundImage ? (
          <Image
            source={{
              uri: backgroundImage,
            }}
            style={
              styles.previewImage
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.emptyPreview
            }
          >
            <Text
              style={
                styles.previewIcon
              }
            >
              🌾
            </Text>

            <Text
              style={
                styles.previewText
              }
            >
              Choose a real farm background
            </Text>
          </View>
        )}

        {/* CHARACTERS */}

        {selectedCharacters.map(
          (
            character,
            index
          ) => (
            <DraggableCharacter
              key={`${character}-${index}`}
              character={
                character
              }
              characterPhoto={
                characterPhotos[
                  character
                ]
              }
              position={
                characterPositions[
                  index
                ] || {
                  x: 20,
                  y: 240,
                  size: 110,
                }
              }
              onMove={(
                x,
                y
              ) =>
                moveCharacter(
                  index,
                  x,
                  y
                )
              }
              onResize={size =>
                resizeCharacter(
                  index,
                  size
                )
              }
              onDelete={() =>
                deleteCharacter(
                  index
                )
              }
            />
          )
        )}

        {/* DIALOGUE OVERLAY */}

        {savedDialogue ? (
          <View
            style={
              styles.dialogueOverlay
            }
          >
            <Text
              style={
                styles.dialogueOverlaySpeaker
              }
            >
              {savedDialogueCharacter ||
                'Character'}
            </Text>

            <Text
              style={
                styles.dialogueOverlayText
              }
            >
              {savedDialogue}
            </Text>
          </View>
        ) : null}
      </View>

      {/* BACKGROUND MODE INFORMATION */}

      {backgroundImage ? (
        <View
          style={
            styles.backgroundModeBox
          }
        >
          <Text
            style={
              styles.backgroundModeTitle
            }
          >
            {backgroundMode ===
            'photo'
              ? '📷 Photo Mode'
              : '🎬 Gemini/Veo Mode'}
          </Text>

          <Text
            style={
              styles.backgroundModeText
            }
          >
            {backgroundMode ===
            'photo'
              ? 'Your real farm photo will be kept as-is and converted into a video background using FFmpeg. Gemini/Veo will not be used.'
              : 'Your real farm photo will be animated into a moving farm background using Gemini/Veo.'}
          </Text>
        </View>
      ) : null}

      {/* EDITOR INFORMATION */}

      <View
        style={styles.infoBox}
      >
        <Text
          style={styles.infoTitle}
        >
          🎬 Scene Editor
        </Text>

        <Text
          style={styles.infoText}
        >
          Drag a character to move them
          around the farm. Use − and +
          to change their size. Use ✕
          to remove them.
        </Text>
      </View>

      {/* DIALOGUE */}

      {savedDialogue ? (
        <View
          style={
            styles.dialogueBox
          }
        >
          <Text
            style={
              styles.dialogueTitle
            }
          >
            💬 Dialogue
          </Text>

          <Text
            style={styles.speaker}
          >
            {savedDialogueCharacter ||
              'Character'}
          </Text>

          <Text
            style={styles.dialogueText}
          >
            "{savedDialogue}"
          </Text>
        </View>
      ) : null}

      {/* REMOVE BACKGROUND */}

      {backgroundImage ? (
        <Pressable
          style={
            styles.removeButton
          }
          onPress={() => {
            setBackgroundImage(
              null
            );

            setBackgroundMode(
              'photo'
            );
          }}
        >
          <Text
            style={
              styles.removeButtonText
            }
          >
            Remove Background
          </Text>
        </Pressable>
      ) : null}

      {/* CHOOSE BACKGROUND */}

      <Pressable
        style={styles.option}
        onPress={
          chooseBackground
        }
        disabled={
          generatingVideo
        }
      >
        <Text
          style={styles.optionTitle}
        >
          🖼️ Choose Background
        </Text>

        <Text
          style={styles.optionText}
        >
          {backgroundImage
            ? backgroundMode ===
              'photo'
              ? '📷 Using photo as-is'
              : '🎬 Using Gemini/Veo animation'
            : 'Add a real farm photo'}
        </Text>
      </Pressable>

      {/* CHARACTERS */}

      <Pressable
        style={styles.option}
        onPress={
          openCharacters
        }
        disabled={
          generatingVideo
        }
      >
        <Text
          style={styles.optionTitle}
        >
          🎭 Add Character
        </Text>

        <Text
          style={styles.optionText}
        >
          Add, remove, or change characters
        </Text>
      </Pressable>

      {/* DIALOGUE */}

      <Pressable
        style={styles.option}
        onPress={
          openDialogue
        }
        disabled={
          generatingVideo
        }
      >
        <Text
          style={styles.optionTitle}
        >
          💬 Add Dialogue
        </Text>

        <Text
          style={styles.optionText}
        >
          {savedDialogue
            ? 'Edit character dialogue'
            : 'Add what your characters will say'}
        </Text>
      </Pressable>

      {/* GENERATE */}

      <Pressable
        style={[
          styles.generateButton,
          generatingVideo &&
            styles.generateButtonDisabled,
        ]}
        onPress={
          generateScene
        }
        disabled={
          generatingVideo
        }
      >
        <Text
          style={
            styles.generateButtonText
          }
        >
          {getGenerationMessage()}
        </Text>
      </Pressable>

      {/* GENERATED VIDEO */}

      {generatedVideoUrl ? (
        <View
          style={
            styles.generatedVideoBox
          }
        >
          <Text
            style={
              styles.generatedVideoTitle
            }
          >
            🎉 Agriventure video ready
          </Text>

          <Text
            style={
              styles.generatedVideoUrlText
            }
            numberOfLines={2}
          >
            {generatedVideoUrl}
          </Text>

          <Pressable
            style={
              styles.openVideoButton
            }
            onPress={
              openGeneratedVideo
            }
          >
            <Text
              style={
                styles.openVideoButtonText
              }
            >
              ▶ Open Generated Video
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.downloadVideoButton,
              downloadingVideo &&
                styles.downloadVideoButtonDisabled,
            ]}
            onPress={
              downloadGeneratedVideo
            }
            disabled={
              downloadingVideo
            }
          >
            <Text
              style={
                styles.downloadVideoButtonText
              }
            >
              {downloadingVideo
                ? 'Downloading Video...'
                : '⬇ Download / Share Video'}
            </Text>
          </Pressable>
        </View>
      ) : null}
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
      backgroundColor: '#f7f7f7',
    },

    container: {
      padding: 20,
      paddingTop: 30,
      paddingBottom: 60,
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

    storyBox: {
      backgroundColor: '#f0f7f0',
      padding: 15,
      borderRadius: 12,
      marginBottom: 15,
    },

    storyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 5,
    },

    storyDescription: {
      fontSize: 14,
      lineHeight: 20,
    },

    characterBox: {
      backgroundColor: '#e8f5e9',
      padding: 12,
      borderRadius: 10,
      marginBottom: 15,
    },

    selectedCharacter: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
    },

    characterItem: {
      fontSize: 15,
      marginTop: 5,
    },

    preview: {
      width: '100%',
      aspectRatio: 9 / 16,
      borderRadius: 15,
      backgroundColor: '#dfe8df',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      marginBottom: 15,
      position: 'relative',
    },

    previewImage: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },

    emptyPreview: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 30,
    },

    previewIcon: {
      fontSize: 50,
      marginBottom: 10,
    },

    previewText: {
      fontSize: 17,
      fontWeight: 'bold',
      color: '#555',
      textAlign: 'center',
    },

    // ======================================
    // BACKGROUND MODE
    // ======================================

    backgroundModeBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 50,
      backgroundColor:
        'rgba(0,0,0,0.75)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },

    backgroundModeBadgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },

    backgroundModeBox: {
      backgroundColor: '#eef7ee',
      padding: 14,
      borderRadius: 12,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: '#c8e6c9',
    },

    backgroundModeTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
      color: '#1b5e20',
    },

    backgroundModeText: {
      fontSize: 13,
      lineHeight: 19,
      color: '#444',
    },

    // ======================================
    // CHARACTERS
    // ======================================

    characterOnScene: {
      position: 'absolute',
      alignItems: 'center',
      zIndex: 10,
    },

    characterEmoji: {
      textAlign: 'center',
    },

    characterName: {
      backgroundColor:
        'rgba(0,0,0,0.65)',
      color: 'white',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 'bold',
      marginTop: 2,
    },

    characterControls: {
      flexDirection: 'row',
      marginTop: 5,
      gap: 5,
    },

    controlButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor:
        'rgba(0,0,0,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    deleteButton: {
      backgroundColor:
        'rgba(180,0,0,0.85)',
    },

    controlButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
      lineHeight: 20,
    },

    // ======================================
    // INFORMATION
    // ======================================

    infoBox: {
      backgroundColor: '#eef6ff',
      padding: 14,
      borderRadius: 12,
      marginBottom: 15,
    },

    infoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
    },

    infoText: {
      fontSize: 13,
      lineHeight: 19,
      color: '#444',
    },

    // ======================================
    // DIALOGUE
    // ======================================

    dialogueBox: {
      backgroundColor: '#fff8e1',
      padding: 15,
      borderRadius: 12,
      marginBottom: 15,
    },

    dialogueTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
    },

    speaker: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#2e7d32',
      marginBottom: 5,
    },

    dialogueText: {
      fontSize: 15,
      lineHeight: 22,
      fontStyle: 'italic',
    },

    dialogueOverlay: {
      position: 'absolute',
      left: 15,
      right: 15,
      bottom: 20,
      backgroundColor:
        'rgba(0,0,0,0.70)',
      borderRadius: 12,
      padding: 12,
      zIndex: 20,
    },

    dialogueOverlaySpeaker: {
      color: '#90ee90',
      fontSize: 13,
      fontWeight: 'bold',
      marginBottom: 4,
    },

    dialogueOverlayText: {
      color: 'white',
      fontSize: 14,
      lineHeight: 20,
    },

    // ======================================
    // BACKGROUND BUTTON
    // ======================================

    removeButton: {
      alignItems: 'center',
      marginBottom: 15,
    },

    removeButtonText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#0a892e',
    },

    // ======================================
    // OPTIONS
    // ======================================

    option: {
      padding: 18,
      borderRadius: 12,
      backgroundColor: '#ffffff',
      marginBottom: 12,
      elevation: 2,
    },

    optionTitle: {
      fontSize: 17,
      fontWeight: 'bold',
    },

    optionText: {
      fontSize: 14,
      marginTop: 5,
      color: '#555',
    },

    // ======================================
    // GENERATE
    // ======================================

    generateButton: {
      backgroundColor: '#2e7d32',
      paddingVertical: 17,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10,
    },

    generateButtonText: {
      color: 'white',
      fontSize: 17,
      fontWeight: 'bold',
    },

    generateButtonDisabled: {
      opacity: 0.6,
    },

    // ======================================
    // GENERATED VIDEO
    // ======================================

    generatedVideoBox: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: '#e8f5e9',
    },

    generatedVideoTitle: {
      marginBottom: 10,
      fontSize: 16,
      fontWeight: 'bold',
      color: '#1b5e20',
    },

    generatedVideoUrlText: {
      fontSize: 11,
      color: '#555',
      marginBottom: 10,
    },

    openVideoButton: {
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: '#2e7d32',
    },

    openVideoButtonText: {
      color: 'white',
      fontWeight: 'bold',
    },

    downloadVideoButton: {
      alignItems: 'center',
      marginTop: 10,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: '#1565c0',
    },

    downloadVideoButtonDisabled: {
      opacity: 0.6,
    },

    downloadVideoButtonText: {
      color: 'white',
      fontWeight: 'bold',
    },
  });