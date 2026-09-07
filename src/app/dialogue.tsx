import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
type CharacterVoices = Record<string, string>;

type HeyGenVoice = {
  voice_id: string;
  name: string;
  language: string;
  gender: string;
  type: 'public' | 'private';
};

const BACKEND_URL = 'http://10.159.131.218:5001';

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

const safeParseVoices = (
  value: string
): CharacterVoices =>
  safeParseObject(value);

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
    characterVoices?: string | string[];
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

  const characterVoicesParam =
    getParamString(
      params.characterVoices
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

  const initialCharacterVoices =
    characterVoicesParam
      ? safeParseVoices(
          characterVoicesParam
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

  const [characterVoices, setCharacterVoices] =
    useState<CharacterVoices>(
      initialCharacterVoices
    );

  const [voices, setVoices] =
    useState<HeyGenVoice[]>([]);

  const [voiceLoading, setVoiceLoading] =
    useState(false);

  const [voiceError, setVoiceError] =
    useState('');

  const [cloningVoice, setCloningVoice] =
    useState(false);

  const audioRecorder = useAudioRecorder(
    RecordingPresets.HIGH_QUALITY
  );

  const recorderState = useAudioRecorderState(
    audioRecorder
  );

  useEffect(() => {
    let active = true;

    const loadVoices = async () => {
      try {
        setVoiceLoading(true);

        const response = await fetch(
          `${BACKEND_URL}/api/video/heygen/voices`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error?.message ||
            data.message ||
            'Could not load voices.'
          );
        }

        if (active) {
          setVoices(data.voices || []);
        }
      } catch (error) {
        if (active) {
          setVoiceError(
            error instanceof Error
              ? error.message
              : 'Could not load HeyGen voices.'
          );
        }
      } finally {
        if (active) {
          setVoiceLoading(false);
        }
      }
    };

    loadVoices();

    return () => {
      active = false;
    };
  }, []);

  const selectVoice = (voiceId: string) => {
    if (!selectedCharacter) {
      return;
    }

    setCharacterVoices(current => ({
      ...current,
      [selectedCharacter]: voiceId,
    }));
  };

  const cloneVoice = async () => {
    if (!selectedCharacter) {
      return;
    }

    try {
      if (!recorderState.isRecording) {
        const permission =
          await AudioModule.requestRecordingPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            'Microphone permission required',
            'Allow microphone access to record a character voice.'
          );

          return;
        }

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        return;
      }

      await audioRecorder.stop();

      if (!audioRecorder.uri) {
        throw new Error('No voice recording was created.');
      }

      setCloningVoice(true);

      const audioBase64 =
        await FileSystem.readAsStringAsync(
          audioRecorder.uri,
          {
            encoding:
              FileSystem.EncodingType.Base64,
          }
        );

      const response = await fetch(
        `${BACKEND_URL}/api/video/heygen/clone-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioBase64,
            audioMimeType:
              'application/octet-stream',
            name: `${selectedCharacter} voice`,
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.voiceCloneId
      ) {
        throw new Error(
          data.error?.message ||
          data.message ||
          'Voice cloning failed.'
        );
      }

      let clonedVoiceId = '';

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise(resolve =>
          setTimeout(resolve, 3000)
        );

        const statusResponse = await fetch(
          `${BACKEND_URL}/api/video/heygen/clone-voice/${data.voiceCloneId}`
        );

        const statusData =
          await statusResponse.json();

        if (!statusResponse.ok || !statusData.success) {
          throw new Error(
            statusData.error?.message ||
            statusData.message ||
            'Could not check voice clone status.'
          );
        }

        if (
          statusData.status === 'complete' &&
          statusData.voiceId
        ) {
          clonedVoiceId = statusData.voiceId;
          break;
        }

        if (statusData.status === 'failed') {
          throw new Error(
            statusData.error ||
            'HeyGen could not complete the voice clone.'
          );
        }
      }

      if (!clonedVoiceId) {
        throw new Error(
          'Voice cloning is still processing. Please try again shortly.'
        );
      }

      selectVoice(clonedVoiceId);

      Alert.alert(
        'Voice cloned',
        `The cloned voice is assigned to ${selectedCharacter}.`
      );
    } catch (error) {
      Alert.alert(
        'Voice cloning error',
        error instanceof Error
          ? error.message
          : 'Could not clone the voice.'
      );
    } finally {
      setCloningVoice(false);
    }
  };

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

        characterVoices:
          JSON.stringify(
            characterVoices
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

      <Text style={styles.label}>
        Character Voice
      </Text>

      <Text style={styles.voiceHint}>
        Choose an AI voice or record this character's voice to create a clone.
      </Text>

      {voiceLoading ? (
        <Text style={styles.voiceStatus}>
          Loading HeyGen voices...
        </Text>
      ) : null}

      {voiceError ? (
        <Text style={styles.voiceError}>
          {voiceError}
        </Text>
      ) : null}

      <View style={styles.voiceList}>
        {voices.slice(0, 24).map(voice => (
          <Pressable
            key={voice.voice_id}
            style={[
              styles.voiceButton,
              characterVoices[selectedCharacter] ===
                voice.voice_id &&
                styles.voiceButtonSelected,
            ]}
            onPress={() =>
              selectVoice(voice.voice_id)
            }
          >
            <Text style={styles.voiceName}>
              {voice.name.trim()}
            </Text>
            <Text style={styles.voiceMeta}>
              {voice.language} · {voice.gender}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.cloneButton}
        onPress={cloneVoice}
        disabled={cloningVoice}
      >
        <Text style={styles.cloneButtonText}>
          {recorderState.isRecording
            ? '⏹ Stop and Clone Recording'
            : cloningVoice
              ? '⏳ Cloning Voice...'
              : '🎙 Record and Clone Voice'}
        </Text>
      </Pressable>

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

  voiceHint: {
    marginBottom: 10,
    color: '#555',
    fontSize: 13,
    lineHeight: 19,
  },

  voiceStatus: {
    marginBottom: 10,
    color: '#555',
    fontSize: 13,
  },

  voiceError: {
    marginBottom: 10,
    color: '#b3261e',
    fontSize: 13,
  },

  voiceList: {
    gap: 8,
    marginBottom: 12,
  },

  voiceButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },

  voiceButtonSelected: {
    borderColor: '#2e7d32',
    backgroundColor: '#e8f5e9',
  },

  voiceName: {
    fontSize: 15,
    fontWeight: 'bold',
  },

  voiceMeta: {
    marginTop: 3,
    color: '#666',
    fontSize: 12,
  },

  cloneButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#6a4bbc',
  },

  cloneButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
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