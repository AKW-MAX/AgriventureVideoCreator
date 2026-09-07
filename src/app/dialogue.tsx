import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

// ==========================================
// TYPES
// ==========================================

type CharacterPhotos = Record<string, string>;

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
// SAFE JSON PARSER
// ==========================================

const safeParseArray = (
  value: string
): string[] => {
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
};

const safeParseObject = (
  value: string
): CharacterPhotos => {
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
};

// ==========================================
// DIALOGUE SCREEN
// ==========================================

export default function DialogueScreen() {
  const router = useRouter();

  // ==========================================
  // PARAMETERS
  // ==========================================

  const params = useLocalSearchParams<{
    title?: string | string[];
    description?: string | string[];
    selectedCharacters?: string | string[];
    characterPhotos?: string | string[];
    dialogue?: string | string[];
    dialogueCharacter?: string | string[];
  }>();

  const title = getParamString(
    params.title
  );

  const description = getParamString(
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

  const existingDialogue =
    getParamString(params.dialogue);

  const existingDialogueCharacter =
    getParamString(
      params.dialogueCharacter
    );

  // ==========================================
  // PARSE CHARACTERS
  // ==========================================

  const selectedCharacters =
    selectedCharactersParam
      ? safeParseArray(
          selectedCharactersParam
        )
      : [];

  // ==========================================
  // PARSE CHARACTER PHOTOS
  // ==========================================

  const characterPhotos =
    characterPhotosParam
      ? safeParseObject(
          characterPhotosParam
        )
      : {};

  // ==========================================
  // STATE
  // ==========================================

  const [selectedCharacter, setSelectedCharacter] =
    useState(
      existingDialogueCharacter ||
        selectedCharacters[0] ||
        ''
    );

  const [dialogue, setDialogue] =
    useState(existingDialogue);

  // ==========================================
  // SAVE
  // ==========================================

  const saveDialogue = () => {
    if (
      !selectedCharacter ||
      !dialogue.trim()
    ) {
      Alert.alert(
        'Dialogue required',
        'Please choose a character and enter what they should say.'
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

        // IMPORTANT:
        // Keep the transparent character
        // images when returning to Scene.

        characterPhotos:
          JSON.stringify(
            characterPhotos
          ),

        dialogue:
          dialogue.trim(),

        dialogueCharacter:
          selectedCharacter,
      },
    });
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
        Add Dialogue
      </Text>

      <Text style={styles.subtitle}>
        Choose who will speak and what they
        will say.
      </Text>

      {/* ======================================
          SPEAKING CHARACTER
      ====================================== */}

      <Text style={styles.label}>
        Speaking Character
      </Text>

      <View style={styles.charactersBox}>

        {selectedCharacters.length === 0 ? (
          <Text style={styles.emptyText}>
            No characters selected yet.
          </Text>
        ) : (
          selectedCharacters.map(
            (character: string) => (
              <Pressable
                key={character}
                style={[
                  styles.characterButton,

                  selectedCharacter ===
                    character &&
                    styles.characterButtonSelected,
                ]}
                onPress={() =>
                  setSelectedCharacter(
                    character
                  )
                }
              >
                <View
                  style={
                    styles.characterRow
                  }
                >
                  {/* CHARACTER PHOTO
                      INDICATOR */}

                  <Text
                    style={
                      styles.characterIcon
                    }
                  >
                    {characterPhotos[
                      character
                    ]
                      ? '🧑'
                      : '👤'}
                  </Text>

                  <Text
                    style={[
                      styles.characterText,

                      selectedCharacter ===
                        character &&
                        styles.characterTextSelected,
                    ]}
                  >
                    {character}
                  </Text>

                  {/* SELECTED CHECK */}

                  {selectedCharacter ===
                    character && (
                    <Text
                      style={
                        styles.checkmark
                      }
                    >
                      ✓
                    </Text>
                  )}
                </View>
              </Pressable>
            )
          )
        )}

      </View>

      {/* ======================================
          DIALOGUE
      ====================================== */}

      <Text style={styles.label}>
        What should they say?
      </Text>

      <TextInput
        style={styles.dialogueInput}
        placeholder={
          'Example: Welcome to our farm. Today we are going to learn how to plant maize.'
        }
        placeholderTextColor="#888"
        multiline
        value={dialogue}
        onChangeText={setDialogue}
        textAlignVertical="top"
        maxLength={500}
      />

      {/* CHARACTER COUNTER */}

      <Text style={styles.characterCounter}>
        {dialogue.length}/500
      </Text>

      {/* ======================================
          PREVIEW
      ====================================== */}

      {selectedCharacter &&
        dialogue.trim() && (
          <View
            style={styles.previewBox}
          >
            <Text
              style={
                styles.previewTitle
              }
            >
              💬 Dialogue Preview
            </Text>

            <Text
              style={styles.previewSpeaker}
            >
              {selectedCharacter}
            </Text>

            <Text
              style={styles.previewDialogue}
            >
              "{dialogue.trim()}"
            </Text>
          </View>
        )}

      {/* ======================================
          SAVE
      ====================================== */}

      <Pressable
        style={[
          styles.saveButton,

          (!selectedCharacter ||
            !dialogue.trim()) &&
            styles.saveButtonDisabled,
        ]}
        onPress={saveDialogue}
        disabled={
          !selectedCharacter ||
          !dialogue.trim()
        }
      >
        <Text style={styles.saveButtonText}>
          ✓ Save Dialogue
        </Text>
      </Pressable>

      {/* ======================================
          INFO
      ====================================== */}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          🎬 What happens next?
        </Text>

        <Text style={styles.infoText}>
          Your dialogue will appear in the
          scene. Later, we will use this
          dialogue to create the character's
          voice and animation.
        </Text>
      </View>

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

  // ========================================
  // TITLE
  // ========================================

  title: {
    fontSize: 30,
    fontWeight: 'bold',
  },

  subtitle: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 25,
    lineHeight: 22,
    color: '#555',
  },

  // ========================================
  // LABEL
  // ========================================

  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },

  // ========================================
  // CHARACTERS
  // ========================================

  charactersBox: {
    marginBottom: 20,
  },

  characterButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dddddd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },

  characterButtonSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2e7d32',
  },

  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  characterIcon: {
    fontSize: 25,
    marginRight: 10,
  },

  characterText: {
    fontSize: 16,
    flex: 1,
  },

  characterTextSelected: {
    fontWeight: 'bold',
    color: '#2e7d32',
  },

  checkmark: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2e7d32',
  },

  emptyText: {
    fontSize: 14,
    color: '#777777',
  },

  // ========================================
  // INPUT
  // ========================================

  dialogueInput: {
    height: 160,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },

  characterCounter: {
    textAlign: 'right',
    fontSize: 12,
    color: '#777',
    marginTop: 5,
  },

  // ========================================
  // PREVIEW
  // ========================================

  previewBox: {
    backgroundColor: '#fff8e1',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },

  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  previewSpeaker: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },

  previewDialogue: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // ========================================
  // SAVE
  // ========================================

  saveButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 25,
  },

  saveButtonDisabled: {
    backgroundColor: '#aaaaaa',
  },

  saveButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },

  // ========================================
  // INFO
  // ========================================

  infoBox: {
    backgroundColor: '#eef6ff',
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
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

});