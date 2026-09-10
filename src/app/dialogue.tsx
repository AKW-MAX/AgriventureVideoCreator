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
  ActivityIndicator,
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
  voice_id?: string;
  voiceId?: string;
  id?: string;

  name?: string;
  display_name?: string;
  displayName?: string;

  language?: string;
  language_code?: string;
  languageCode?: string;

  gender?: string;
  type?: string;

  preview_audio?: string;
  preview_audio_url?: string;
  previewAudio?: string;
  previewAudioUrl?: string;

  status?: string;
  error?: unknown;

  [key: string]: unknown;
};

// ==========================================
// BACKEND
// ==========================================

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
// SAFE JSON ARRAY PARSER
// ==========================================

const safeParseArray = (
  value: string
): string[] => {
  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.map(String);
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

// ==========================================
// SAFE JSON OBJECT PARSER
// ==========================================

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
      return parsed as CharacterPhotos;
    }

    return {};
  } catch (error) {
    console.warn(
      'Could not parse object:',
      error
    );

    return {};
  }
};

// ==========================================
// SAFE VOICE PARSER
// ==========================================

const safeParseVoices = (
  value: string
): CharacterVoices => {
  return safeParseObject(value);
};

// ==========================================
// GET VOICE ID
// ==========================================

const getVoiceId = (
  voice: HeyGenVoice
): string => {
  return String(
    voice.voice_id ||
      voice.voiceId ||
      voice.id ||
      ''
  );
};

// ==========================================
// GET VOICE NAME
// ==========================================

const getVoiceName = (
  voice: HeyGenVoice
): string => {
  return String(
    voice.name ||
      voice.display_name ||
      voice.displayName ||
      'Unnamed voice'
  );
};

// ==========================================
// GET VOICE LANGUAGE
// ==========================================

const getVoiceLanguage = (
  voice: HeyGenVoice
): string => {
  return String(
    voice.language ||
      voice.language_code ||
      voice.languageCode ||
      'Language not specified'
  );
};

// ==========================================
// GET VOICE GENDER
// ==========================================

const getVoiceGender = (
  voice: HeyGenVoice
): string => {
  return String(
    voice.gender ||
      'Voice'
  );
};

// ==========================================
// NORMALIZE ERROR
// ==========================================

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (
    error &&
    typeof error === 'object'
  ) {
    const objectError =
      error as Record<string, unknown>;

    if (
      typeof objectError.message ===
      'string'
    ) {
      return objectError.message;
    }
  }

  return fallback;
};

// ==========================================
// EXTRACT VOICES FROM BACKEND RESPONSE
// ==========================================

const extractVoices = (
  data: any
): any[] => {
  // ----------------------------------------
  // Most likely backend response
  // ----------------------------------------

  if (
    Array.isArray(data?.voices)
  ) {
    return data.voices;
  }

  // ----------------------------------------
  // HeyGen native response
  // ----------------------------------------

  if (
    Array.isArray(data?.data)
  ) {
    return data.data;
  }

  // ----------------------------------------
  // Nested data.voices
  // ----------------------------------------

  if (
    Array.isArray(
      data?.data?.voices
    )
  ) {
    return data.data.voices;
  }

  // ----------------------------------------
  // Nested data.data
  // ----------------------------------------

  if (
    Array.isArray(
      data?.data?.data
    )
  ) {
    return data.data.data;
  }

  // ----------------------------------------
  // Result wrapper
  // ----------------------------------------

  if (
    Array.isArray(data?.result)
  ) {
    return data.result;
  }

  // ----------------------------------------
  // Result voices
  // ----------------------------------------

  if (
    Array.isArray(
      data?.result?.voices
    )
  ) {
    return data.result.voices;
  }

  return [];
};

// ==========================================
// NORMALIZE VOICE
// ==========================================

const normalizeVoice = (
  voice: any
): HeyGenVoice => {
  return {
    ...voice,

    voice_id:
      voice?.voice_id ||
      voice?.voiceId ||
      voice?.id ||
      '',

    name:
      voice?.name ||
      voice?.display_name ||
      voice?.displayName ||
      'Unnamed voice',

    language:
      voice?.language ||
      voice?.language_code ||
      voice?.languageCode ||
      '',

    gender:
      voice?.gender ||
      '',

    preview_audio:
      voice?.preview_audio ||
      voice?.preview_audio_url ||
      voice?.previewAudio ||
      voice?.previewAudioUrl ||
      '',
  };
};

// ==========================================
// DIALOGUE SCREEN
// ==========================================

export default function DialogueScreen() {
  const router = useRouter();

  // ==========================================
  // PARAMETERS
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

  const existingDialogue =
    getParamString(
      params.dialogue
    );

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
  // PARSE PHOTOS
  // ==========================================

  const characterPhotos =
    characterPhotosParam
      ? safeParseObject(
          characterPhotosParam
        )
      : {};

  // ==========================================
  // PARSE VOICES
  // ==========================================

  const initialCharacterVoices =
    characterVoicesParam
      ? safeParseVoices(
          characterVoicesParam
        )
      : {};

  // ==========================================
  // STATE
  // ==========================================

  const [
    selectedCharacter,
    setSelectedCharacter,
  ] = useState(
    existingDialogueCharacter ||
      selectedCharacters[0] ||
      ''
  );

  const [
    dialogue,
    setDialogue,
  ] = useState(
    existingDialogue
  );

  const [
    characterVoices,
    setCharacterVoices,
  ] = useState<CharacterVoices>(
    initialCharacterVoices
  );

  const [
    voices,
    setVoices,
  ] = useState<HeyGenVoice[]>([]);

  const [
    voiceLoading,
    setVoiceLoading,
  ] = useState(false);

  const [
    voiceError,
    setVoiceError,
  ] = useState('');

  const [
    cloningVoice,
    setCloningVoice,
  ] = useState(false);

  const [
    cloneStatus,
    setCloneStatus,
  ] = useState('');

  // ==========================================
  // AUDIO RECORDER
  // ==========================================

  const audioRecorder =
    useAudioRecorder(
      RecordingPresets.HIGH_QUALITY
    );

  const recorderState =
    useAudioRecorderState(
      audioRecorder
    );

  // ==========================================
  // LOAD HEYGEN AI VOICES
  // ==========================================

  useEffect(() => {
    let active = true;

    const loadVoices = async () => {
      try {
        setVoiceLoading(true);
        setVoiceError('');

        console.log(
          '======================================'
        );

        console.log(
          '🎙 Loading HeyGen AI voices...'
        );

        const url =
          `${BACKEND_URL}/api/video/heygen/voices`;

        console.log(
          '📡 Voice URL:',
          url
        );

        // --------------------------------------
        // REQUEST
        // --------------------------------------

        const response =
          await fetch(
            url,
            {
              method: 'GET',

              headers: {
                Accept:
                  'application/json',
              },
            }
          );

        console.log(
          '📥 Voice HTTP status:',
          response.status
        );

        // --------------------------------------
        // READ RAW RESPONSE
        // --------------------------------------

        const text =
          await response.text();

        console.log(
          '📥 Raw voice response:',
          text
        );

        // --------------------------------------
        // PARSE JSON
        // --------------------------------------

        let data: any = {};

        try {
          data =
            JSON.parse(text);
        } catch {
          throw new Error(
            `Backend returned invalid JSON. HTTP ${response.status}`
          );
        }

        console.log(
          '📦 Parsed voice response:',
          JSON.stringify(
            data,
            null,
            2
          )
        );

        // --------------------------------------
        // HTTP ERROR
        // --------------------------------------

        if (!response.ok) {
          throw new Error(
            data?.error?.message ||
              data?.error ||
              data?.message ||
              `Could not load HeyGen voices. HTTP ${response.status}`
          );
        }

        // --------------------------------------
        // EXTRACT VOICES
        // --------------------------------------

        const rawVoices =
          extractVoices(data);

        console.log(
          '🎙 Raw voices found:',
          rawVoices.length
        );

        // --------------------------------------
        // NORMALIZE
        // --------------------------------------

        const normalizedVoices =
          rawVoices
            .map(
              normalizeVoice
            )
            .filter(
              voice =>
                Boolean(
                  getVoiceId(
                    voice
                  )
                )
            );

        console.log(
          '✅ Valid voices found:',
          normalizedVoices.length
        );

        if (
          normalizedVoices.length >
          0
        ) {
          console.log(
            '🎙 First voice:',
            JSON.stringify(
              normalizedVoices[0],
              null,
              2
            )
          );
        }

        // --------------------------------------
        // SAVE
        // --------------------------------------

        if (active) {
          setVoices(
            normalizedVoices
          );
        }

        // --------------------------------------
        // NO VOICES
        // --------------------------------------

        if (
          normalizedVoices.length ===
          0
        ) {
          throw new Error(
            'The backend connected successfully, but no HeyGen voices were found.'
          );
        }

        console.log(
          '======================================'
        );
      } catch (error) {
        console.error(
          '❌ Voice loading error:',
          error
        );

        if (active) {
          setVoices([]);

          setVoiceError(
            getErrorMessage(
              error,
              'Could not load HeyGen AI voices.'
            )
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

  // ==========================================
  // RELOAD VOICES
  // ==========================================

  const reloadVoices = async () => {
    try {
      setVoiceLoading(true);
      setVoiceError('');

      console.log(
        '🔄 Reloading HeyGen voices...'
      );

      const response =
        await fetch(
          `${BACKEND_URL}/api/video/heygen/voices`,
          {
            method: 'GET',
            headers: {
              Accept:
                'application/json',
            },
          }
        );

      const text =
        await response.text();

      console.log(
        '📥 Reload response:',
        text
      );

      let data: any = {};

      try {
        data =
          JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid JSON from backend. HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            data?.error ||
            data?.message ||
            `Could not reload voices. HTTP ${response.status}`
        );
      }

      const rawVoices =
        extractVoices(data);

      const normalizedVoices =
        rawVoices
          .map(
            normalizeVoice
          )
          .filter(
            voice =>
              Boolean(
                getVoiceId(
                  voice
                )
              )
          );

      console.log(
        '✅ Reloaded voices:',
        normalizedVoices.length
      );

      if (
        normalizedVoices.length ===
        0
      ) {
        throw new Error(
          'HeyGen returned no voices.'
        );
      }

      setVoices(
        normalizedVoices
      );
    } catch (error) {
      console.error(
        '❌ Reload voices error:',
        error
      );

      setVoices([]);

      setVoiceError(
        getErrorMessage(
          error,
          'Could not reload HeyGen voices.'
        )
      );
    } finally {
      setVoiceLoading(false);
    }
  };

  // ==========================================
  // SELECT VOICE
  // ==========================================

  const selectVoice = (
    voiceId: string
  ) => {
    if (!selectedCharacter) {
      Alert.alert(
        'Choose a character',
        'Please select the character who will speak.'
      );

      return;
    }

    if (!voiceId) {
      Alert.alert(
        'Voice unavailable',
        'This voice does not have a valid HeyGen voice ID.'
      );

      return;
    }

    console.log(
      '🎙 Assigning voice:',
      voiceId,
      'to:',
      selectedCharacter
    );

    setCharacterVoices(
      current => ({
        ...current,
        [selectedCharacter]:
          voiceId,
      })
    );

    setCloneStatus('');
  };

  // ==========================================
  // START RECORDING
  // ==========================================

  const startRecording =
    async () => {
      try {
        setCloneStatus(
          'Requesting microphone access...'
        );

        const permission =
          await AudioModule.requestRecordingPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            'Microphone permission required',
            'Allow microphone access to record a character voice.'
          );

          setCloneStatus('');

          return;
        }

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        await audioRecorder.prepareToRecordAsync();

        audioRecorder.record();

        setCloneStatus(
          '🔴 Recording your voice... Press the button again to stop.'
        );
      } catch (error) {
        console.error(
          '❌ Recording start error:',
          error
        );

        setCloneStatus('');

        Alert.alert(
          'Recording error',
          getErrorMessage(
            error,
            'Could not start recording.'
          )
        );
      }
    };

  // ==========================================
  // STOP RECORDING
  // ==========================================

  const stopRecording =
    async () => {
      try {
        setCloneStatus(
          'Stopping recording...'
        );

        await audioRecorder.stop();

        const uri =
          audioRecorder.uri;

        if (!uri) {
          throw new Error(
            'No voice recording was created.'
          );
        }

        console.log(
          '🎙 Recording URI:',
          uri
        );

        return uri;
      } catch (error) {
        console.error(
          '❌ Recording stop error:',
          error
        );

        throw error;
      }
    };

  // ==========================================
  // GET AUDIO MIME TYPE
  // ==========================================

  const getAudioMimeType = (
    uri: string
  ): string => {
    const lowerUri =
      uri.toLowerCase();

    if (
      lowerUri.endsWith('.m4a') ||
      lowerUri.endsWith('.mp4')
    ) {
      return 'audio/mp4';
    }

    if (
      lowerUri.endsWith('.mp3')
    ) {
      return 'audio/mpeg';
    }

    if (
      lowerUri.endsWith('.wav')
    ) {
      return 'audio/wav';
    }

    if (
      lowerUri.endsWith('.aac')
    ) {
      return 'audio/aac';
    }

    if (
      lowerUri.endsWith('.webm')
    ) {
      return 'audio/webm';
    }

    return 'audio/mp4';
  };

  // ==========================================
  // CLONE VOICE
  // ==========================================

  const cloneVoice = async () => {
    if (!selectedCharacter) {
      Alert.alert(
        'Choose a character',
        'Please select the character whose voice you want to clone.'
      );

      return;
    }

    try {
      // ----------------------------------------
      // START RECORDING
      // ----------------------------------------

      if (
        !recorderState.isRecording
      ) {
        await startRecording();

        return;
      }

      // ----------------------------------------
      // STOP
      // ----------------------------------------

      const recordingUri =
        await stopRecording();

      if (!recordingUri) {
        throw new Error(
          'No recording file was created.'
        );
      }

      setCloningVoice(true);

      setCloneStatus(
        'Preparing your voice recording...'
      );

      // ----------------------------------------
      // READ AUDIO
      // ----------------------------------------

      console.log(
        '📂 Reading recording:',
        recordingUri
      );

      const audioBase64 =
        await FileSystem.readAsStringAsync(
          recordingUri,
          {
            encoding:
              FileSystem.EncodingType.Base64,
          }
        );

      if (!audioBase64) {
        throw new Error(
          'The recorded audio is empty.'
        );
      }

      console.log(
        '🎙 Audio base64 length:',
        audioBase64.length
      );

      // ----------------------------------------
      // MIME
      // ----------------------------------------

      const audioMimeType =
        getAudioMimeType(
          recordingUri
        );

      console.log(
        '🎵 Audio MIME type:',
        audioMimeType
      );

      // ----------------------------------------
      // SEND TO BACKEND
      // ----------------------------------------

      setCloneStatus(
        'Uploading your voice to HeyGen...'
      );

      const response =
        await fetch(
          `${BACKEND_URL}/api/video/heygen/clone-voice`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json',
            },

            body: JSON.stringify({
              audioBase64,

              mediaType:
                audioMimeType,

              audioMimeType:
                audioMimeType,

              name:
                `${selectedCharacter} voice`,

              language:
                'en',
            }),
          }
        );

      const text =
        await response.text();

      console.log(
        '🎙 Voice clone raw response:',
        text
      );

      let data: any = {};

      try {
        data =
          JSON.parse(text);
      } catch {
        throw new Error(
          `Backend returned invalid JSON. HTTP ${response.status}`
        );
      }

      console.log(
        '🎙 Voice clone response:',
        data
      );

      // ----------------------------------------
      // ERROR
      // ----------------------------------------

      if (
        !response.ok ||
        !data.success
      ) {
        const backendError =
          data?.error?.message ||
          data?.error ||
          data?.message ||
          `Voice cloning failed. HTTP ${response.status}`;

        throw new Error(
          typeof backendError ===
          'string'
            ? backendError
            : JSON.stringify(
                backendError
              )
        );
      }

      // ----------------------------------------
      // VOICE ID
      // ----------------------------------------

      const voiceCloneId =
        data.voiceCloneId ||
        data.voice_clone_id ||
        data.voiceId ||
        data.voice_id ||
        data.id ||
        '';

      if (!voiceCloneId) {
        throw new Error(
          'HeyGen accepted the request, but no voice clone ID was returned.'
        );
      }

      console.log(
        '🎙 Voice clone ID:',
        voiceCloneId
      );

      // ----------------------------------------
      // POLL
      // ----------------------------------------

      let clonedVoiceId = '';

      for (
        let attempt = 0;
        attempt < 30;
        attempt += 1
      ) {
        setCloneStatus(
          `Creating voice clone... ${
            attempt + 1
          }/30`
        );

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              3000
            )
        );

        const statusUrl =
          `${BACKEND_URL}/api/video/heygen/clone-voice/${encodeURIComponent(
            voiceCloneId
          )}`;

        console.log(
          '🔎 Checking clone status:',
          statusUrl
        );

        const statusResponse =
          await fetch(
            statusUrl,
            {
              method: 'GET',

              headers: {
                Accept:
                  'application/json',
              },
            }
          );

        const statusText =
          await statusResponse.text();

        let statusData: any = {};

        try {
          statusData =
            JSON.parse(
              statusText
            );
        } catch {
          throw new Error(
            `Could not read HeyGen clone status. HTTP ${statusResponse.status}`
          );
        }

        console.log(
          '🎙 Clone status response:',
          statusData
        );

        if (
          !statusResponse.ok ||
          !statusData.success
        ) {
          const statusError =
            statusData?.error?.message ||
            statusData?.error ||
            statusData?.message ||
            `Could not check voice clone status. HTTP ${statusResponse.status}`;

          throw new Error(
            typeof statusError ===
            'string'
              ? statusError
              : JSON.stringify(
                  statusError
                )
          );
        }

        const voice =
          statusData.voice ||
          statusData.data ||
          statusData.result ||
          {};

        const status =
          String(
            voice.status ||
              statusData.status ||
              ''
          ).toLowerCase();

        const possibleVoiceId =
          voice.voice_id ||
          voice.voiceId ||
          voice.id ||
          statusData.voiceId ||
          statusData.voice_id ||
          statusData.voiceCloneId ||
          '';

        console.log(
          '🎙 Current clone status:',
          status
        );

        console.log(
          '🎙 Possible voice ID:',
          possibleVoiceId
        );

        // --------------------------------------
        // SUCCESS
        // --------------------------------------

        if (
          possibleVoiceId &&
          (
            status ===
              'complete' ||
            status ===
              'completed' ||
            status ===
              'ready' ||
            status ===
              'success' ||
            status ===
              'succeeded' ||
            !status
          )
        ) {
          clonedVoiceId =
            String(
              possibleVoiceId
            );

          console.log(
            '✅ Voice clone completed:',
            clonedVoiceId
          );

          break;
        }

        // --------------------------------------
        // FAILED
        // --------------------------------------

        if (
          status ===
            'failed' ||
          status ===
            'error' ||
          status ===
            'rejected'
        ) {
          const cloneError =
            voice.error?.message ||
            voice.error ||
            statusData.error?.message ||
            statusData.error ||
            'HeyGen could not complete the voice clone.';

          throw new Error(
            typeof cloneError ===
            'string'
              ? cloneError
              : JSON.stringify(
                  cloneError
                )
          );
        }
      }

      // ----------------------------------------
      // CHECK RESULT
      // ----------------------------------------

      if (!clonedVoiceId) {
        throw new Error(
          'Voice cloning is still processing. HeyGen has not returned the final voice ID yet.'
        );
      }

      // ----------------------------------------
      // SAVE
      // ----------------------------------------

      setCharacterVoices(
        current => ({
          ...current,
          [selectedCharacter]:
            clonedVoiceId,
        })
      );

      setCloneStatus(
        '✅ Voice cloned successfully.'
      );

      Alert.alert(
        'Voice cloned successfully',
        `The cloned voice has been assigned to ${selectedCharacter}.`
      );
    } catch (error) {
      console.error(
        '❌ Voice cloning error:',
        error
      );

      setCloneStatus('');

      Alert.alert(
        'Voice cloning error',
        getErrorMessage(
          error,
          'Could not clone the voice.'
        )
      );
    } finally {
      setCloningVoice(false);

      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
      } catch (error) {
        console.warn(
          'Could not restore audio mode:',
          error
        );
      }
    }
  };

  // ==========================================
  // CURRENT SELECTED VOICE
  // ==========================================

  const selectedVoiceId =
    selectedCharacter
      ? characterVoices[
          selectedCharacter
        ]
      : '';

  const selectedVoice =
    voices.find(
      voice =>
        getVoiceId(voice) ===
        selectedVoiceId
    );

  // ==========================================
  // SAVE DIALOGUE
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

    if (!selectedVoiceId) {
      Alert.alert(
        'Choose a voice',
        'Please select an AI voice or clone a voice for this character.'
      );

      return;
    }

    console.log(
      '💾 Saving dialogue:',
      {
        character:
          selectedCharacter,

        voiceId:
          selectedVoiceId,

        dialogue:
          dialogue.trim(),
      }
    );

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
      keyboardShouldPersistTaps="handled"
    >
      {/* ======================================
          TITLE
      ====================================== */}

      <Text style={styles.title}>
        Add Dialogue
      </Text>

      <Text style={styles.subtitle}>
        Choose who will speak, write their
        dialogue, and select an AI voice or
        create a voice clone.
      </Text>

      {/* ======================================
          SPEAKING CHARACTER
      ====================================== */}

      <Text style={styles.label}>
        Speaking Character
      </Text>

      <View
        style={styles.charactersBox}
      >
        {selectedCharacters.length ===
        0 ? (
          <Text style={styles.emptyText}>
            No characters selected yet.
          </Text>
        ) : (
          selectedCharacters.map(
            character => (
              <Pressable
                key={character}
                style={[
                  styles.characterButton,

                  selectedCharacter ===
                    character &&
                    styles.characterButtonSelected,
                ]}
                onPress={() => {
                  setSelectedCharacter(
                    character
                  );

                  setCloneStatus('');
                }}
                disabled={
                  cloningVoice
                }
              >
                <View
                  style={
                    styles.characterRow
                  }
                >
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

                  <View
                    style={
                      styles.characterInfo
                    }
                  >
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

                    {characterVoices[
                      character
                    ] ? (
                      <Text
                        style={
                          styles.voiceAssigned
                        }
                      >
                        🎙 Voice assigned
                      </Text>
                    ) : (
                      <Text
                        style={
                          styles.noVoiceAssigned
                        }
                      >
                        No voice selected
                      </Text>
                    )}
                  </View>

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
        placeholder="Example: Welcome to our farm. Today we are going to learn how to plant maize."
        placeholderTextColor="#888"
        multiline
        value={dialogue}
        onChangeText={
          setDialogue
        }
        textAlignVertical="top"
        maxLength={500}
      />

      <Text
        style={
          styles.characterCounter
        }
      >
        {dialogue.length}/500
      </Text>

      {/* ======================================
          VOICE
      ====================================== */}

      <Text style={styles.label}>
        Character Voice
      </Text>

      <Text style={styles.voiceHint}>
        Select an AI voice, or record your
        own voice and create a clone for this
        character.
      </Text>

      {/* ======================================
          CURRENT VOICE
      ====================================== */}

      {selectedVoiceId ? (
        <View
          style={
            styles.selectedVoiceBox
          }
        >
          <Text
            style={
              styles.selectedVoiceTitle
            }
          >
            ✓ Selected Voice
          </Text>

          <Text
            style={
              styles.selectedVoiceName
            }
          >
            {selectedVoice
              ? getVoiceName(
                  selectedVoice
                )
              : 'Custom cloned voice'}
          </Text>

          <Text
            style={
              styles.selectedVoiceId
            }
          >
            Voice ID: {selectedVoiceId}
          </Text>
        </View>
      ) : (
        <View
          style={styles.noVoiceBox}
        >
          <Text
            style={
              styles.noVoiceText
            }
          >
            ⚠️ No voice selected
          </Text>
        </View>
      )}

      {/* ======================================
          LOADING
      ====================================== */}

      {voiceLoading && (
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="small"
          />

          <Text
            style={
              styles.voiceStatus
            }
          >
            Loading HeyGen AI voices...
          </Text>
        </View>
      )}

      {/* ======================================
          ERROR
      ====================================== */}

      {voiceError ? (
        <View
          style={
            styles.errorBox
          }
        >
          <Text
            style={
              styles.voiceError
            }
          >
            {voiceError}
          </Text>

          <Text
            style={
              styles.errorHint
            }
          >
            The app could not load the HeyGen
            voice list from your backend.
          </Text>

          <Pressable
            style={
              styles.reloadButton
            }
            onPress={
              reloadVoices
            }
            disabled={
              voiceLoading
            }
          >
            {voiceLoading ? (
              <ActivityIndicator
                color="#ffffff"
                size="small"
              />
            ) : (
              <Text
                style={
                  styles.reloadButtonText
                }
              >
                🔄 Reload Voices
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {/* ======================================
          AI VOICES
      ====================================== */}

      {!voiceLoading &&
        voices.length > 0 && (
          <>
            <View
              style={
                styles.voiceHeaderRow
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                🤖 AI Voices
              </Text>

              <Text
                style={
                  styles.voiceCount
                }
              >
                {voices.length} voices
              </Text>
            </View>

            <Text
              style={
                styles.voiceSelectionHint
              }
            >
              Tap a voice to assign it to{' '}
              {selectedCharacter ||
                'the character'}.
            </Text>

            <View
              style={
                styles.voiceList
              }
            >
              {voices.map(
                voice => {
                  const id =
                    getVoiceId(
                      voice
                    );

                  if (!id) {
                    return null;
                  }

                  const isSelected =
                    selectedVoiceId ===
                    id;

                  return (
                    <Pressable
                      key={id}
                      style={[
                        styles.voiceButton,

                        isSelected &&
                          styles.voiceButtonSelected,
                      ]}
                      onPress={() =>
                        selectVoice(
                          id
                        )
                      }
                      disabled={
                        cloningVoice
                      }
                    >
                      <View
                        style={
                          styles.voiceButtonRow
                        }
                      >
                        <View
                          style={
                            styles.voiceAvatar
                          }
                        >
                          <Text
                            style={
                              styles.voiceAvatarText
                            }
                          >
                            🎙
                          </Text>
                        </View>

                        <View
                          style={
                            styles.voiceTextContainer
                          }
                        >
                          <Text
                            style={
                              styles.voiceName
                            }
                          >
                            {getVoiceName(
                              voice
                            )}
                          </Text>

                          <Text
                            style={
                              styles.voiceMeta
                            }
                          >
                            {getVoiceLanguage(
                              voice
                            )}

                            {' · '}

                            {getVoiceGender(
                              voice
                            )}
                          </Text>
                        </View>

                        {isSelected && (
                          <View
                            style={
                              styles.selectedCheckCircle
                            }
                          >
                            <Text
                              style={
                                styles.voiceCheck
                              }
                            >
                              ✓
                            </Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                }
              )}
            </View>
          </>
        )}

      {/* ======================================
          NO VOICES
      ====================================== */}

      {!voiceLoading &&
        !voiceError &&
        voices.length === 0 && (
          <View
            style={
              styles.noVoicesBox
            }
          >
            <Text
              style={
                styles.noVoicesTitle
              }
            >
              No AI voices available
            </Text>

            <Text
              style={
                styles.noVoicesText
              }
            >
              Your backend connected, but it
              did not return any HeyGen voices.
            </Text>

            <Pressable
              style={
                styles.reloadButton
              }
              onPress={
                reloadVoices
              }
            >
              <Text
                style={
                  styles.reloadButtonText
                }
              >
                🔄 Load Voices
              </Text>
            </Pressable>
          </View>
        )}

      {/* ======================================
          CUSTOM VOICE
      ====================================== */}

      <Text
        style={
          styles.sectionTitle
        }
      >
        🎙 Custom Voice
      </Text>

      <Text
        style={
          styles.cloneInstructions
        }
      >
        Record a clear sample of the
        character's voice. Press once to
        start recording, then press again to
        stop and send it to HeyGen.
      </Text>

      <Pressable
        style={[
          styles.cloneButton,

          recorderState.isRecording &&
            styles.stopRecordingButton,

          cloningVoice &&
            styles.cloneButtonDisabled,
        ]}
        onPress={
          cloneVoice
        }
        disabled={
          cloningVoice
        }
      >
        {cloningVoice ? (
          <View
            style={
              styles.cloneButtonRow
            }
          >
            <ActivityIndicator
              color="#ffffff"
              size="small"
            />

            <Text
              style={
                styles.cloneButtonText
              }
            >
              Cloning Voice...
            </Text>
          </View>
        ) : (
          <Text
            style={
              styles.cloneButtonText
            }
          >
            {recorderState.isRecording
              ? '⏹ Stop and Clone Recording'
              : '🎙 Record and Clone Voice'}
          </Text>
        )}
      </Pressable>

      {/* ======================================
          CLONE STATUS
      ====================================== */}

      {cloneStatus ? (
        <View
          style={
            styles.cloneStatusBox
          }
        >
          <Text
            style={
              styles.cloneStatusText
            }
          >
            {cloneStatus}
          </Text>
        </View>
      ) : null}

      {/* ======================================
          PREVIEW
      ====================================== */}

      {selectedCharacter &&
        dialogue.trim() && (
          <View
            style={
              styles.previewBox
            }
          >
            <Text
              style={
                styles.previewTitle
              }
            >
              💬 Dialogue Preview
            </Text>

            <Text
              style={
                styles.previewSpeaker
              }
            >
              {selectedCharacter}
            </Text>

            <Text
              style={
                styles.previewVoice
              }
            >
              🎙{' '}
              {selectedVoice
                ? getVoiceName(
                    selectedVoice
                  )
                : selectedVoiceId
                  ? 'Custom cloned voice'
                  : 'No voice selected'}
            </Text>

            <Text
              style={
                styles.previewDialogue
              }
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
            !dialogue.trim() ||
            !selectedVoiceId ||
            cloningVoice) &&
            styles.saveButtonDisabled,
        ]}
        onPress={
          saveDialogue
        }
        disabled={
          !selectedCharacter ||
          !dialogue.trim() ||
          !selectedVoiceId ||
          cloningVoice
        }
      >
        <Text
          style={
            styles.saveButtonText
          }
        >
          ✓ Save Dialogue
        </Text>
      </Pressable>

      {/* ======================================
          INFO
      ====================================== */}

      <View
        style={styles.infoBox}
      >
        <Text
          style={styles.infoTitle}
        >
          🎬 What happens next?
        </Text>

        <Text
          style={styles.infoText}
        >
          Your character, dialogue and
          selected voice are saved with the
          scene. When you generate the video,
          the selected HeyGen voice ID will be
          used to speak the dialogue.
        </Text>
      </View>
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

    // ========================================
    // TITLE
    // ========================================

    title: {
      fontSize: 30,
      fontWeight: 'bold',
      color: '#222',
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
      color: '#222',
    },

    // ========================================
    // CHARACTERS
    // ========================================

    charactersBox: {
      marginBottom: 15,
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
      fontSize: 28,
      marginRight: 10,
    },

    characterInfo: {
      flex: 1,
    },

    characterText: {
      fontSize: 16,
      color: '#222',
    },

    characterTextSelected: {
      fontWeight: 'bold',
      color: '#2e7d32',
    },

    voiceAssigned: {
      marginTop: 3,
      fontSize: 12,
      color: '#2e7d32',
    },

    noVoiceAssigned: {
      marginTop: 3,
      fontSize: 12,
      color: '#999',
    },

    checkmark: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#2e7d32',
    },

    emptyText: {
      fontSize: 14,
      color: '#777777',
      paddingVertical: 10,
    },

    // ========================================
    // DIALOGUE
    // ========================================

    dialogueInput: {
      height: 160,
      borderWidth: 1,
      borderColor: '#cccccc',
      borderRadius: 12,
      padding: 15,
      fontSize: 16,
      backgroundColor: '#ffffff',
      color: '#222',
    },

    characterCounter: {
      textAlign: 'right',
      fontSize: 12,
      color: '#777',
      marginTop: 5,
    },

    // ========================================
    // VOICE
    // ========================================

    voiceHint: {
      marginBottom: 10,
      color: '#555',
      fontSize: 13,
      lineHeight: 19,
    },

    voiceSelectionHint: {
      color: '#666',
      fontSize: 13,
      marginBottom: 12,
      lineHeight: 19,
    },

    voiceHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },

    voiceCount: {
      fontSize: 12,
      color: '#777',
      marginTop: 8,
    },

    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },

    voiceStatus: {
      marginLeft: 8,
      color: '#555',
      fontSize: 13,
    },

    // ========================================
    // ERROR
    // ========================================

    errorBox: {
      backgroundColor: '#fff0f0',
      borderWidth: 1,
      borderColor: '#f0b5b5',
      padding: 12,
      borderRadius: 10,
      marginBottom: 15,
    },

    voiceError: {
      color: '#b3261e',
      fontSize: 13,
      lineHeight: 19,
    },

    errorHint: {
      color: '#777',
      fontSize: 12,
      marginTop: 5,
      lineHeight: 18,
    },

    reloadButton: {
      marginTop: 12,
      backgroundColor: '#2e7d32',
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 8,
      alignSelf: 'flex-start',
      minWidth: 130,
      alignItems: 'center',
    },

    reloadButtonText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 13,
    },

    // ========================================
    // SELECTED VOICE
    // ========================================

    selectedVoiceBox: {
      backgroundColor: '#e8f5e9',
      borderWidth: 1,
      borderColor: '#2e7d32',
      borderRadius: 10,
      padding: 14,
      marginBottom: 15,
    },

    selectedVoiceTitle: {
      color: '#2e7d32',
      fontSize: 13,
      fontWeight: 'bold',
    },

    selectedVoiceName: {
      color: '#222',
      fontSize: 17,
      fontWeight: 'bold',
      marginTop: 4,
    },

    selectedVoiceId: {
      color: '#777',
      fontSize: 10,
      marginTop: 4,
    },

    noVoiceBox: {
      backgroundColor: '#fff8e1',
      borderWidth: 1,
      borderColor: '#e0c66b',
      borderRadius: 10,
      padding: 12,
      marginBottom: 15,
    },

    noVoiceText: {
      color: '#856404',
      fontSize: 13,
      fontWeight: 'bold',
    },

    // ========================================
    // VOICE LIST
    // ========================================

    sectionTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      marginTop: 8,
      marginBottom: 10,
      color: '#222',
    },

    voiceList: {
      marginBottom: 15,
    },

    voiceButton: {
      padding: 13,
      borderWidth: 1,
      borderColor: '#dddddd',
      borderRadius: 10,
      backgroundColor: '#ffffff',
      marginBottom: 8,
    },

    voiceButtonSelected: {
      borderColor: '#2e7d32',
      backgroundColor: '#e8f5e9',
      borderWidth: 2,
    },

    voiceButtonRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    voiceAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#f0f0f0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    voiceAvatarText: {
      fontSize: 20,
    },

    voiceTextContainer: {
      flex: 1,
    },

    voiceName: {
      fontSize: 15,
      fontWeight: 'bold',
      color: '#222',
    },

    voiceMeta: {
      marginTop: 3,
      color: '#666',
      fontSize: 12,
    },

    selectedCheckCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#2e7d32',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },

    voiceCheck: {
      fontSize: 17,
      color: '#ffffff',
      fontWeight: 'bold',
    },

    // ========================================
    // NO VOICES
    // ========================================

    noVoicesBox: {
      backgroundColor: '#fff8e1',
      borderWidth: 1,
      borderColor: '#e0c66b',
      borderRadius: 10,
      padding: 15,
      marginBottom: 20,
    },

    noVoicesTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: '#856404',
    },

    noVoicesText: {
      fontSize: 13,
      color: '#856404',
      marginTop: 5,
      lineHeight: 18,
    },

    // ========================================
    // CLONING
    // ========================================

    cloneInstructions: {
      fontSize: 13,
      lineHeight: 19,
      color: '#555',
      marginBottom: 10,
    },

    cloneButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRadius: 10,
      backgroundColor: '#6a4bbc',
      marginBottom: 10,
    },

    stopRecordingButton: {
      backgroundColor: '#c62828',
    },

    cloneButtonDisabled: {
      opacity: 0.65,
    },

    cloneButtonRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    cloneButtonText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: 'bold',
      marginLeft: 8,
    },

    cloneStatusBox: {
      backgroundColor: '#f0ebff',
      padding: 12,
      borderRadius: 10,
      marginBottom: 10,
    },

    cloneStatusText: {
      color: '#51369a',
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
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

    previewVoice: {
      fontSize: 13,
      color: '#6a4bbc',
      marginBottom: 8,
    },

    previewDialogue: {
      fontSize: 15,
      lineHeight: 22,
      fontStyle: 'italic',
      color: '#333',
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
      color: '#ffffff',
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