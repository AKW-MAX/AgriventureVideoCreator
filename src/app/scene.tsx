import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Image,
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

function safeParseObject(value: string): CharacterPhotos {
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
      'Could not parse characterPhotos:',
      error
    );

    return {};
  }
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
  const startPosition = useRef<CharacterPosition>(position);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        startPosition.current = position;
      },

      onPanResponderMove: (_, gesture) => {
        onMove(
          startPosition.current.x + gesture.dx,
          startPosition.current.y + gesture.dy
        );
      },

      onPanResponderRelease: (_, gesture) => {
        onMove(
          startPosition.current.x + gesture.dx,
          startPosition.current.y + gesture.dy
        );
      },
    })
  ).current;

  const imageWidth = position.size;
  const imageHeight = position.size * 1.25;

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
      {/* ======================================
          CHARACTER
      ====================================== */}

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
              fontSize: position.size * 0.6,
            },
          ]}
        >
          {getCharacterEmoji(character)}
        </Text>
      )}

      {/* ======================================
          EDITOR LABEL
      ====================================== */}

      <Text style={styles.characterName}>
        {character}
      </Text>

      {/* ======================================
          EDITOR CONTROLS
      ====================================== */}

      <View style={styles.characterControls}>

        {/* SMALLER */}

        <Pressable
          style={styles.controlButton}
          onPress={() =>
            onResize(
              Math.max(
                60,
                position.size - 10
              )
            )
          }
        >
          <Text style={styles.controlButtonText}>
            −
          </Text>
        </Pressable>

        {/* LARGER */}

        <Pressable
          style={styles.controlButton}
          onPress={() =>
            onResize(
              Math.min(
                260,
                position.size + 10
              )
            )
          }
        >
          <Text style={styles.controlButtonText}>
            +
          </Text>
        </Pressable>

        {/* DELETE */}

        <Pressable
          style={[
            styles.controlButton,
            styles.deleteButton,
          ]}
          onPress={onDelete}
        >
          <Text style={styles.controlButtonText}>
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

  const params = useLocalSearchParams<{
    title?: string | string[];
    description?: string | string[];
    selectedCharacters?: string | string[];
    characterPhotos?: string | string[];
    dialogue?: string | string[];
    dialogueCharacter?: string | string[];
  }>();

  const title = getParamString(params.title);

  const description =
    getParamString(params.description);

  const selectedCharactersParam =
    getParamString(
      params.selectedCharacters
    );

  const characterPhotosParam =
    getParamString(
      params.characterPhotos
    );

  const dialogue =
    getParamString(params.dialogue);

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

  // ==========================================
  // STATE
  // ==========================================

  const [backgroundImage, setBackgroundImage] =
    useState<string | null>(null);

  const [selectedCharacters, setSelectedCharacters] =
    useState<string[]>(
      initialCharacters
    );

  const [characterPhotos, setCharacterPhotos] =
    useState<CharacterPhotos>(
      initialPhotos
    );

  const [savedDialogue, setSavedDialogue] =
    useState(dialogue);

  const [savedDialogueCharacter, setSavedDialogueCharacter] =
    useState(dialogueCharacter);

  const [characterPositions, setCharacterPositions] =
    useState<CharacterPosition[]>(
      createInitialPositions(
        initialCharacters
      )
    );

  // ==========================================
  // CHOOSE REAL FARM BACKGROUND
  // ==========================================

  const chooseBackground = async () => {
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
          aspect: [9, 16],
          quality: 0.9,
        });

      if (
        !result.canceled &&
        result.assets.length > 0
      ) {
        setBackgroundImage(
          result.assets[0].uri
        );
      }
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
        const updated = [...current];

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
        const updated = [...current];

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
  // PREPARE SCENE
  // ==========================================

  const generateScene = () => {
    if (!backgroundImage) {
      Alert.alert(
        'Background required',
        'Please choose a real farm background before preparing the scene.'
      );

      return;
    }

    if (
      selectedCharacters.length === 0
    ) {
      Alert.alert(
        'Character required',
        'Please add at least one character to the scene.'
      );

      return;
    }

    Alert.alert(
      'Scene Ready',
      'Your scene is ready for the next video-generation step.'
    );
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
      {/* ======================================
          TITLE
      ====================================== */}

      <Text style={styles.title}>
        Scene 1
      </Text>

      <Text style={styles.subtitle}>
        Build your first farming scene
      </Text>

      {/* ======================================
          STORY
      ====================================== */}

      <View style={styles.storyBox}>
        <Text style={styles.storyTitle}>
          {title || 'Untitled Story'}
        </Text>

        <Text style={styles.storyDescription}>
          {description ||
            'No story description yet.'}
        </Text>
      </View>

      {/* ======================================
          CHARACTERS LIST
      ====================================== */}

      {selectedCharacters.length > 0 && (
        <View style={styles.characterBox}>

          <Text
            style={
              styles.selectedCharacter
            }
          >
            Characters in this scene:
          </Text>

          {selectedCharacters.map(
            (character, index) => (
              <Text
                key={`${character}-${index}`}
                style={styles.characterItem}
              >
                {characterPhotos[character]
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

      {/* ======================================
          SCENE PREVIEW
      ====================================== */}

      <View style={styles.preview}>

        {/* REAL BACKGROUND */}

        {backgroundImage ? (
          <Image
            source={{
              uri: backgroundImage,
            }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.previewIcon}>
              🌾
            </Text>

            <Text style={styles.previewText}>
              Choose a real farm background
            </Text>
          </View>
        )}

        {/* CHARACTERS */}

        {selectedCharacters.map(
          (character, index) => (
            <DraggableCharacter
              key={`${character}-${index}`}
              character={character}
              characterPhoto={
                characterPhotos[
                  character
                ]
              }
              position={
                characterPositions[index] || {
                  x: 20,
                  y: 240,
                  size: 110,
                }
              }
              onMove={(x, y) =>
                moveCharacter(
                  index,
                  x,
                  y
                )
              }
              onResize={(size) =>
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

        {/* ====================================
            DIALOGUE OVERLAY
        ==================================== */}

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

      {/* ======================================
          EDITOR INFORMATION
      ====================================== */}

      <View style={styles.infoBox}>

        <Text style={styles.infoTitle}>
          🎬 Scene Editor
        </Text>

        <Text style={styles.infoText}>
          Drag a character to move them around
          the farm. Use − and + to change their
          size. Use ✕ to remove them.
        </Text>

      </View>

      {/* ======================================
          DIALOGUE
      ====================================== */}

      {savedDialogue ? (
        <View style={styles.dialogueBox}>

          <Text style={styles.dialogueTitle}>
            💬 Dialogue
          </Text>

          <Text style={styles.speaker}>
            {savedDialogueCharacter ||
              'Character'}
          </Text>

          <Text style={styles.dialogueText}>
            "{savedDialogue}"
          </Text>

        </View>
      ) : null}

      {/* ======================================
          REMOVE BACKGROUND
      ====================================== */}

      {backgroundImage ? (
        <Pressable
          style={styles.removeButton}
          onPress={() =>
            setBackgroundImage(null)
          }
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

      {/* ======================================
          CHOOSE BACKGROUND
      ====================================== */}

      <Pressable
        style={styles.option}
        onPress={
          chooseBackground
        }
      >
        <Text style={styles.optionTitle}>
          🖼️ Choose Background
        </Text>

        <Text style={styles.optionText}>
          Add a real farm photo
        </Text>
      </Pressable>

      {/* ======================================
          CHARACTERS
      ====================================== */}

      <Pressable
        style={styles.option}
        onPress={
          openCharacters
        }
      >
        <Text style={styles.optionTitle}>
          🎭 Add Character
        </Text>

        <Text style={styles.optionText}>
          Add, remove, or change characters
        </Text>
      </Pressable>

      {/* ======================================
          DIALOGUE
      ====================================== */}

      <Pressable
        style={styles.option}
        onPress={
          openDialogue
        }
      >
        <Text style={styles.optionTitle}>
          💬 Add Dialogue
        </Text>

        <Text style={styles.optionText}>
          {savedDialogue
            ? 'Edit character dialogue'
            : 'Add what your characters will say'}
        </Text>
      </Pressable>

      {/* ======================================
          PREPARE
      ====================================== */}

      <Pressable
        style={
          styles.generateButton
        }
        onPress={
          generateScene
        }
      >
        <Text
          style={
            styles.generateButtonText
          }
        >
          🎬 Prepare Scene
        </Text>
      </Pressable>

    </ScrollView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({

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

  // ========================================
  // STORY
  // ========================================

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

  // ========================================
  // CHARACTER LIST
  // ========================================

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

  // ========================================
  // PREVIEW
  // ========================================

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

  // ========================================
  // CHARACTER
  // ========================================

  characterOnScene: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },

  characterEmoji: {
    textAlign: 'center',
  },

  characterName: {
    backgroundColor: 'rgba(0,0,0,0.65)',
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  deleteButton: {
    backgroundColor: 'rgba(180,0,0,0.85)',
  },

  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },

  // ========================================
  // INFO
  // ========================================

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

  // ========================================
  // DIALOGUE
  // ========================================

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

  // ========================================
  // DIALOGUE OVERLAY
  // ========================================

  dialogueOverlay: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.70)',
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

  // ========================================
  // REMOVE BACKGROUND
  // ========================================

  removeButton: {
    alignItems: 'center',
    marginBottom: 15,
  },

  removeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0a892e',
  },

  // ========================================
  // OPTIONS
  // ========================================

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

  // ========================================
  // GENERATE
  // ========================================

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

});