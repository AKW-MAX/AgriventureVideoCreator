import * as FileSystem from 'expo-file-system/legacy';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const API_BASE_URL = 'https://agriventurevideobackend.onrender.com';
const STEP_COUNT = 16;
const MELODY_NOTES = ['C4', 'D4', 'E4', 'G4', 'A4'] as const;
type MelodyNote = (typeof MELODY_NOTES)[number] | null;
type DrumTrack = 'kick' | 'snare' | 'hat';

const INITIAL_DRUMS: Record<DrumTrack, boolean[]> = {
  kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  hat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
};

const TRACK_LABELS: Record<DrumTrack, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hat: 'Hi-hat',
};

export default function ComposerScreen() {
  const router = useRouter();
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const [bpm, setBpm] = useState(110);
  const [drums, setDrums] = useState(INITIAL_DRUMS);
  const [melody, setMelody] = useState<MelodyNote[]>(Array(STEP_COUNT).fill(null));
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const toggleDrum = (track: DrumTrack, step: number) => {
    setDrums((current) => ({
      ...current,
      [track]: current[track].map((enabled, index) =>
        index === step ? !enabled : enabled
      ),
    }));
    setAudioUrl(null);
    player.pause();
  };

  const cycleMelodyNote = (step: number) => {
    setMelody((current) =>
      current.map((note, index) => {
        if (index !== step) return note;
        if (note === null) return MELODY_NOTES[0];
        const nextIndex = MELODY_NOTES.indexOf(note) + 1;
        return nextIndex < MELODY_NOTES.length ? MELODY_NOTES[nextIndex] : null;
      })
    );
    setAudioUrl(null);
    player.pause();
  };

  const renderLoop = async () => {
    try {
      setIsRendering(true);
      player.pause();
      setAudioUrl(null);

      const response = await fetch(`${API_BASE_URL}/api/composer/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bpm, drums, melody }),
      });
      const responseText = await response.text();
      let data: { success?: boolean; message?: string; audioUrl?: string };
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('The server returned an invalid response.');
      }
      if (!response.ok || !data.success || !data.audioUrl) {
        throw new Error(data.message || `Audio creation failed (${response.status}).`);
      }

      const finalUrl = data.audioUrl.startsWith('http')
        ? data.audioUrl
        : `${API_BASE_URL}${data.audioUrl.startsWith('/') ? '' : '/'}${data.audioUrl}`;
      setAudioUrl(finalUrl);
      player.replace({ uri: finalUrl });
      player.play();
    } catch (error) {
      console.error('Beat and melody creation error:', error);
      Alert.alert(
        'Could not create music',
        error instanceof Error ? error.message : 'Unable to create your music loop.'
      );
    } finally {
      setIsRendering(false);
    }
  };

  const saveAudio = async () => {
    if (!audioUrl) return;
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device.');
      }
      const cacheDirectory = FileSystem.cacheDirectory;
      if (!cacheDirectory) throw new Error('Temporary storage is not available.');
      const result = await FileSystem.downloadAsync(
        audioUrl,
        `${cacheDirectory}agriventure-beat-${Date.now()}.wav`
      );
      if (result.status !== 200) {
        throw new Error(`Could not download the audio (server returned ${result.status}).`);
      }
      await Sharing.shareAsync(result.uri, {
        mimeType: 'audio/wav',
        dialogTitle: 'Save or share your music loop',
        UTI: 'public.wav',
      });
    } catch (error) {
      console.error('Music save error:', error);
      Alert.alert(
        'Unable to save music',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  const renderStepRow = (track: DrumTrack) => (
    <View key={track} style={styles.gridRow}>
      <Text style={styles.trackName}>{TRACK_LABELS[track]}</Text>
      <View style={styles.steps}>
        {drums[track].map((enabled, index) => (
          <Pressable
            key={`${track}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`${TRACK_LABELS[track]}, step ${index + 1}, ${enabled ? 'on' : 'off'}`}
            accessibilityState={{ selected: enabled }}
            onPress={() => toggleDrum(track, index)}
            style={[
              styles.step,
              index % 4 === 0 && styles.beatStep,
              enabled && styles[`${track}Active`],
            ]}
          />
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <Text style={styles.title}>Beat & Melody Maker</Text>
      <Text style={styles.subtitle}>
        Tap the beat squares to turn sounds on or off. Tap a melody square to cycle through notes.
      </Text>

      <View style={styles.tempoCard}>
        <View style={styles.tempoText}>
          <Text style={styles.sectionTitle}>Tempo</Text>
          <Text style={styles.helperText}>Beats per minute</Text>
        </View>
        <Pressable
          accessibilityLabel="Decrease tempo"
          style={styles.tempoButton}
          onPress={() => setBpm((value) => Math.max(70, value - 5))}
        >
          <Text style={styles.tempoButtonText}>−</Text>
        </Pressable>
        <Text style={styles.bpm}>{bpm}</Text>
        <Pressable
          accessibilityLabel="Increase tempo"
          style={styles.tempoButton}
          onPress={() => setBpm((value) => Math.min(160, value + 5))}
        >
          <Text style={styles.tempoButtonText}>＋</Text>
        </Pressable>
      </View>

      <View style={styles.patternCard}>
        <View style={styles.barLabels}>
          <Text style={styles.trackHeader}>DRUMS</Text>
          <View style={styles.steps}>
            {Array.from({ length: STEP_COUNT }, (_, index) => (
              <Text key={index} style={[styles.stepNumber, index % 4 === 0 && styles.strongBeat]}>
                {index % 4 === 0 ? `${index / 4 + 1}` : ''}
              </Text>
            ))}
          </View>
        </View>
        {renderStepRow('kick')}
        {renderStepRow('snare')}
        {renderStepRow('hat')}

        <View style={styles.melodyHeading}>
          <Text style={styles.trackHeader}>MELODY</Text>
          <Text style={styles.helperText}>Tap to change note</Text>
        </View>
        <View style={styles.gridRow}>
          <Text style={styles.trackName}>Notes</Text>
          <View style={styles.steps}>
            {melody.map((note, index) => (
              <Pressable
                key={`melody-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Melody step ${index + 1}, ${note ?? 'off'}`}
                onPress={() => cycleMelodyNote(index)}
                style={[
                  styles.noteStep,
                  index % 4 === 0 && styles.beatStep,
                  note !== null && styles.noteActive,
                ]}
              >
                <Text style={[styles.noteText, note !== null && styles.noteTextActive]}>
                  {note?.replace('4', '') ?? '·'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Text style={styles.legend}>Notes are in C major. The pattern repeats for four bars.</Text>
      </View>

      <Pressable
        style={[styles.createButton, isRendering && styles.disabledButton]}
        onPress={renderLoop}
        disabled={isRendering}
      >
        {isRendering ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.createButtonText}>Create & preview music</Text>
        )}
      </Pressable>

      {audioUrl ? (
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Your music loop is ready</Text>
          <View style={styles.resultActions}>
            <Pressable
              style={styles.outlineButton}
              onPress={() => {
                if (playerStatus.playing) player.pause();
                else player.play();
              }}
            >
              <Text style={styles.outlineButtonText}>
                {playerStatus.playing ? 'Ⅱ Pause preview' : '▶ Play preview'}
              </Text>
            </Pressable>
            <Pressable style={styles.createButton} onPress={saveAudio}>
              <Text style={styles.createButtonText}>Save / share WAV</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 18, paddingBottom: 44, backgroundColor: '#ffffff' },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 16 },
  backText: { color: '#2e7d32', fontSize: 16, fontWeight: '600' },
  title: { marginTop: 8, color: '#222222', fontSize: 28, fontWeight: 'bold' },
  subtitle: { marginTop: 7, marginBottom: 18, color: '#666666', fontSize: 14, lineHeight: 20 },
  tempoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f3f7f3',
  },
  tempoText: { flex: 1 },
  sectionTitle: { color: '#222222', fontSize: 17, fontWeight: 'bold' },
  helperText: { color: '#6b726b', fontSize: 12 },
  tempoButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#e0ebe0',
  },
  tempoButtonText: { color: '#2e7d32', fontSize: 20, fontWeight: 'bold' },
  bpm: { width: 54, color: '#222222', fontSize: 21, fontWeight: 'bold', textAlign: 'center' },
  patternCard: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e1e9e1',
    borderRadius: 14,
    backgroundColor: '#fbfcfb',
  },
  barLabels: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  trackHeader: { width: 54, color: '#687568', fontSize: 10, fontWeight: 'bold' },
  steps: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 2 },
  stepNumber: { flex: 1, color: '#a0a9a0', fontSize: 9, textAlign: 'center' },
  strongBeat: { color: '#4f5e4f', fontWeight: 'bold' },
  gridRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  trackName: { width: 54, color: '#333333', fontSize: 11, fontWeight: '600' },
  step: {
    flex: 1,
    height: 30,
    maxWidth: 30,
    borderRadius: 5,
    backgroundColor: '#e8ece8',
  },
  beatStep: { marginLeft: 2 },
  kickActive: { backgroundColor: '#2e7d32' },
  snareActive: { backgroundColor: '#ef8b35' },
  hatActive: { backgroundColor: '#4689c8' },
  melodyHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 23,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#e3e9e3',
  },
  noteStep: {
    flex: 1,
    height: 34,
    maxWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: '#e8ece8',
  },
  noteActive: { backgroundColor: '#7556a5' },
  noteText: { color: '#8b938b', fontSize: 11, fontWeight: '600' },
  noteTextActive: { color: '#ffffff' },
  legend: { marginTop: 14, color: '#6b726b', fontSize: 12 },
  createButton: {
    minHeight: 50,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2e7d32',
  },
  createButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  disabledButton: { opacity: 0.5 },
  resultCard: { marginTop: 18, padding: 15, borderRadius: 12, backgroundColor: '#f3f7f3' },
  resultActions: { gap: 10 },
  outlineButton: {
    minHeight: 46,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2e7d32',
    borderRadius: 9,
  },
  outlineButtonText: { color: '#2e7d32', fontSize: 14, fontWeight: '600' },
});
