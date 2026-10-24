import * as FileSystem from 'expo-file-system/legacy';
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_BASE_URL = 'https://agriventurevideobackend.onrender.com';
const MAX_SLIDES = 8;

type Slide = {
  id: string;
  text: string;
  imageUri: string | null;
};

type MusicSelection = {
  name: string;
  mimeType: string;
  base64: string;
};

function getImageMimeType(uri: string): string {
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function getAudioMimeType(mimeType: string | null | undefined, name: string): string {
  const supportedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
  ];
  if (mimeType && supportedTypes.includes(mimeType)) return mimeType;
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'wav') return 'audio/wav';
  if (extension === 'm4a' || extension === 'mp4') return 'audio/mp4';
  if (extension === 'aac') return 'audio/aac';
  if (extension === 'ogg' || extension === 'opus') return 'audio/ogg';
  return 'audio/mpeg';
}

async function readAsDataUri(uri: string, mimeType: string): Promise<string> {
  const base64 = Platform.OS === 'web'
    ? await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
    : await new File(uri).base64();
  if (!base64) {
    throw new Error('A selected file could not be read. Please choose it again.');
  }
  return `data:${mimeType};base64,${base64}`;
}

function stripDataUriPrefix(value: string): string {
  return value.replace(/^data:[^;]+;base64,/i, '');
}

export default function SlidesScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slides, setSlides] = useState<Slide[]>([
    { id: '1', text: '', imageUri: null },
  ]);
  const [music, setMusic] = useState<MusicSelection | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const updateSlide = (id: string, changes: Partial<Slide>) => {
    setSlides((current) =>
      current.map((slide) => (slide.id === id ? { ...slide, ...changes } : slide))
    );
    setVideoUrl(null);
  };

  const addSlide = () => {
    if (slides.length >= MAX_SLIDES) return;
    setSlides((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        text: '',
        imageUri: null,
      },
    ]);
    setVideoUrl(null);
  };

  const removeSlide = (id: string) => {
    if (slides.length <= 1) return;
    setSlides((current) => current.filter((slide) => slide.id !== id));
    setVideoUrl(null);
  };

  const pickSlideImage = async (id: string) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access required', 'Allow photo access to add pictures to your slides.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.75,
      });
      if (result.canceled || !result.assets?.[0]) return;

      updateSlide(id, { imageUri: result.assets[0].uri });
    } catch (error) {
      console.error('Slide image picker error:', error);
      Alert.alert('Image error', 'Unable to select that picture. Please try again.');
    }
  };

  const pickMusic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      let selectedBase64: string | undefined;
      if (Platform.OS === 'web') {
        selectedBase64 = asset.base64;
      } else {
        const extension = asset.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'audio';
        const cachedMusic = new File(
          Paths.cache,
          `agriventure-slide-music-${Date.now()}.${extension}`
        );
        await new File(asset.uri).copy(cachedMusic, { overwrite: true });
        selectedBase64 = await cachedMusic.base64();
      }
      if (!selectedBase64) {
        throw new Error('The selected music file could not be read. Please choose it again.');
      }

      setMusic({
        name: asset.name,
        mimeType: getAudioMimeType(asset.mimeType, asset.name),
        base64: stripDataUriPrefix(selectedBase64),
      });
      setVideoUrl(null);
    } catch (error) {
      console.error('Music picker error:', error);
      Alert.alert(
        'Music error',
        error instanceof Error ? error.message : 'Unable to select that music file. Please try again.'
      );
    }
  };

  const createVideo = async () => {
    if (slides.some((slide) => !slide.text.trim() || !slide.imageUri)) {
      Alert.alert(
        'Finish your slides',
        'Add a picture and caption to every slide before creating your video.'
      );
      return;
    }

    try {
      setIsCreating(true);
      setVideoUrl(null);

      const preparedSlides = await Promise.all(
        slides.map(async (slide) => ({
          text: slide.text.trim(),
          image: await readAsDataUri(slide.imageUri!, getImageMimeType(slide.imageUri!)),
        }))
      );
      const musicPayload = music
        ? {
            mimeType: music.mimeType,
            data: `data:${music.mimeType};base64,${music.base64}`,
          }
        : null;

      const response = await fetch(`${API_BASE_URL}/api/slides/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'My slideshow',
          slides: preparedSlides,
          music: musicPayload,
        }),
      });

      const responseText = await response.text();
      let data: { success?: boolean; message?: string; videoUrl?: string };
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('The server returned an invalid response.');
      }
      if (!response.ok || !data.success || !data.videoUrl) {
        throw new Error(data.message || `Video creation failed (${response.status}).`);
      }

      const finalUrl = data.videoUrl.startsWith('http')
        ? data.videoUrl
        : `${API_BASE_URL}${data.videoUrl.startsWith('/') ? '' : '/'}${data.videoUrl}`;
      setVideoUrl(finalUrl);
      Alert.alert('Video ready', 'Your slideshow video has been created.');
    } catch (error) {
      console.error('Slideshow creation error:', error);
      Alert.alert(
        'Could not create video',
        error instanceof Error ? error.message : 'Unable to create your slideshow.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const shareVideo = async () => {
    if (!videoUrl) return;
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device.');
      }
      const cacheDirectory = FileSystem.cacheDirectory;
      if (!cacheDirectory) throw new Error('Temporary storage is not available.');
      const result = await FileSystem.downloadAsync(
        videoUrl,
        `${cacheDirectory}agriventure-slideshow-${Date.now()}.mp4`
      );
      if (result.status !== 200) {
        throw new Error(`Could not download the video (server returned ${result.status}).`);
      }
      await Sharing.shareAsync(result.uri, {
        mimeType: 'video/mp4',
        dialogTitle: 'Save or share your slideshow',
      });
    } catch (error) {
      console.error('Slideshow share error:', error);
      Alert.alert('Unable to share video', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const downloadVideo = async () => {
    if (!videoUrl) return;

    try {
      setIsSavingVideo(true);

      if (Platform.OS === 'web') {
        await shareVideo();
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync(true, ['video']);
      if (permission.status !== 'granted') {
        throw new Error('Allow video access so Agriventure can save the slideshow to your gallery.');
      }

      const cacheDirectory = FileSystem.cacheDirectory;
      if (!cacheDirectory) {
        throw new Error('Temporary storage is not available on this device.');
      }

      const result = await FileSystem.downloadAsync(
        videoUrl,
        `${cacheDirectory}agriventure-slideshow-${Date.now()}.mp4`
      );
      if (result.status !== 200) {
        throw new Error(`Could not download the video (server returned ${result.status}).`);
      }

      await MediaLibrary.createAssetAsync(result.uri);
      Alert.alert('Video saved', 'Your slideshow was saved to your device gallery.');
    } catch (error) {
      console.error('Slideshow save error:', error);
      Alert.alert(
        'Unable to save video',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setIsSavingVideo(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <Text style={styles.title}>Video Slide Maker</Text>
      <Text style={styles.subtitle}>Turn your photos and captions into a video.</Text>

      <Text style={styles.label}>Video title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. A day on our farm"
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          setVideoUrl(null);
        }}
        maxLength={80}
      />

      {slides.map((slide, index) => (
        <View key={slide.id} style={styles.slideCard}>
          <View style={styles.slideHeading}>
            <Text style={styles.slideTitle}>Slide {index + 1}</Text>
            {slides.length > 1 ? (
              <Pressable onPress={() => removeSlide(slide.id)} accessibilityRole="button">
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>

          {slide.imageUri ? (
            <Image source={{ uri: slide.imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>Add a picture for this slide</Text>
            </View>
          )}

          <Pressable style={styles.secondaryButton} onPress={() => pickSlideImage(slide.id)}>
            <Text style={styles.secondaryButtonText}>
              {slide.imageUri ? 'Choose a different picture' : '＋ Add picture'}
            </Text>
          </Pressable>

          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={[styles.input, styles.captionInput]}
            placeholder="Write what you want to say on this slide"
            value={slide.text}
            onChangeText={(value) => updateSlide(slide.id, { text: value })}
            multiline
            maxLength={240}
          />
        </View>
      ))}

      <Pressable
        style={[styles.outlineButton, slides.length >= MAX_SLIDES && styles.disabledButton]}
        onPress={addSlide}
        disabled={slides.length >= MAX_SLIDES}
      >
        <Text style={styles.outlineButtonText}>
          ＋ Add slide ({slides.length}/{MAX_SLIDES})
        </Text>
      </Pressable>

      <View style={styles.musicCard}>
        <Text style={styles.sectionTitle}>Background music</Text>
        <Text style={styles.helperText}>Choose an audio file from your device (optional).</Text>
        {music ? (
          <View style={styles.musicRow}>
            <Text style={styles.musicName} numberOfLines={1}>{music.name}</Text>
            <Pressable
              onPress={() => {
                setMusic(null);
                setVideoUrl(null);
              }}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ) : null}
        <Pressable style={styles.secondaryButton} onPress={pickMusic}>
          <Text style={styles.secondaryButtonText}>
            {music ? 'Choose different music' : '♫ Choose music'}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.createButton, isCreating && styles.disabledButton]}
        onPress={createVideo}
        disabled={isCreating}
      >
        {isCreating ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.createButtonText}>Create slideshow video</Text>
        )}
      </Pressable>

      {isCreating ? (
        <Text style={styles.helperText}>Rendering your video. This may take a little while.</Text>
      ) : null}

      {videoUrl ? (
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Your video is ready</Text>
          <View style={styles.resultActions}>
            <Pressable style={styles.secondaryButton} onPress={() => Linking.openURL(videoUrl)}>
              <Text style={styles.secondaryButtonText}>▶ Open video</Text>
            </Pressable>
            <Pressable style={styles.createButton} onPress={shareVideo}>
              <Text style={styles.createButtonText}>Share video</Text>
            </Pressable>
            <Pressable
              style={[styles.downloadButton, isSavingVideo && styles.disabledButton]}
              onPress={downloadVideo}
              disabled={isSavingVideo}
            >
              {isSavingVideo ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.createButtonText}>Download to device</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 48,
    backgroundColor: '#ffffff',
  },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 16 },
  backText: { color: '#2e7d32', fontSize: 16, fontWeight: '600' },
  title: { marginTop: 8, color: '#222222', fontSize: 29, fontWeight: 'bold' },
  subtitle: { marginTop: 6, marginBottom: 18, color: '#666666', fontSize: 15 },
  label: { marginTop: 16, marginBottom: 8, color: '#333333', fontSize: 15, fontWeight: '600' },
  input: {
    minHeight: 48,
    padding: 13,
    borderWidth: 1,
    borderColor: '#d7ddd7',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    color: '#222222',
    fontSize: 15,
  },
  slideCard: {
    marginTop: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e1e9e1',
    borderRadius: 14,
    backgroundColor: '#f8faf8',
  },
  slideHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slideTitle: { color: '#222222', fontSize: 18, fontWeight: 'bold' },
  removeText: { color: '#b42318', fontSize: 14, fontWeight: '600' },
  imagePreview: { width: '100%', height: 190, marginTop: 12, borderRadius: 10, backgroundColor: '#e8eee8' },
  imagePlaceholder: {
    height: 150,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#b7c8b7',
    borderRadius: 10,
    backgroundColor: '#f2f6f2',
  },
  placeholderText: { color: '#667366', fontSize: 14 },
  secondaryButton: {
    minHeight: 44,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2e7d32',
    borderRadius: 9,
  },
  secondaryButtonText: { color: '#2e7d32', fontSize: 14, fontWeight: '600' },
  captionInput: { minHeight: 95, textAlignVertical: 'top' },
  outlineButton: {
    minHeight: 48,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2e7d32',
    borderRadius: 10,
  },
  outlineButtonText: { color: '#2e7d32', fontSize: 15, fontWeight: 'bold' },
  musicCard: {
    marginTop: 20,
    padding: 15,
    borderRadius: 14,
    backgroundColor: '#f4f8f4',
  },
  sectionTitle: { color: '#222222', fontSize: 17, fontWeight: 'bold' },
  helperText: { marginTop: 7, color: '#6b726b', fontSize: 13, lineHeight: 19 },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  musicName: { flex: 1, color: '#333333', fontSize: 14 },
  createButton: {
    minHeight: 50,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2e7d32',
  },
  createButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  downloadButton: {
    minHeight: 50,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#555555',
  },
  disabledButton: { opacity: 0.5 },
  resultCard: { marginTop: 20, padding: 15, borderRadius: 14, backgroundColor: '#f4f8f4' },
  resultActions: { gap: 10 },
});
