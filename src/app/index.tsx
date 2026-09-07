import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const BACKEND_URL = 'http://10.159.131.218:5001';

type CreatedVideo = {
  videoId: string;
  title: string;
  videoUrl: string;
  createdAt: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [videos, setVideos] = useState<CreatedVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  const loadVideos = async () => {
    try {
      setLoadingVideos(true);
      const response = await fetch(
        `${BACKEND_URL}/api/video/heygen/history`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Could not load videos.'
        );
      }

      setVideos(data.videos || []);
    } catch (error) {
      Alert.alert(
        'Video library error',
        error instanceof Error
          ? error.message
          : 'Could not load created videos.'
      );
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const downloadVideo = async (video: CreatedVideo) => {
    try {
      const targetUri =
        `${FileSystem.documentDirectory || ''}${video.videoId}.mp4`;
      const download =
        await FileSystem.downloadAsync(
          video.videoUrl,
          targetUri
        );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(download.uri, {
          mimeType: 'video/mp4',
          dialogTitle: 'Save Agriventure video',
          UTI: 'public.mpeg-4',
        });
      } else {
        Alert.alert(
          'Video downloaded',
          `Saved to ${download.uri}`
        );
      }
    } catch (error) {
      Alert.alert(
        'Download failed',
        error instanceof Error
          ? error.message
          : 'Could not download the video.'
      );
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>
        Agriventure
      </Text>

      <Text style={styles.subtitle}>
        Farming Story Video Creator
      </Text>

      <Text style={styles.description}>
        Create creative farming stories using characters,
        real farm backgrounds and videos.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push('/create')}
      >
        <Text style={styles.buttonText}>
          Create Story
        </Text>
      </Pressable>

      <View style={styles.libraryHeader}>
        <Text style={styles.libraryTitle}>
          Created Videos
        </Text>

        <Pressable
          style={styles.refreshButton}
          onPress={loadVideos}
        >
          <Text style={styles.refreshButtonText}>
            Refresh
          </Text>
        </Pressable>
      </View>

      {loadingVideos ? (
        <Text style={styles.emptyText}>
          Loading your videos...
        </Text>
      ) : videos.length === 0 ? (
        <Text style={styles.emptyText}>
          Your completed videos will appear here.
        </Text>
      ) : (
        videos.map(video => (
          <View
            key={video.videoId}
            style={styles.videoItem}
          >
            <Text style={styles.videoTitle}>
              {video.title}
            </Text>

            <Text style={styles.videoDate}>
              {new Date(video.createdAt).toLocaleString()}
            </Text>

            <View style={styles.videoActions}>
              <Pressable
                style={styles.videoAction}
                onPress={() => Linking.openURL(video.videoUrl)}
              >
                <Text style={styles.videoActionText}>
                  Open
                </Text>
              </Pressable>

              <Pressable
                style={styles.videoDownloadAction}
                onPress={() => downloadVideo(video)}
              >
                <Text style={styles.videoActionText}>
                  Download
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  container: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 60,
  },

  title: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#2e7d32',
  },

  subtitle: {
    fontSize: 20,
    marginTop: 10,
    color: '#333333',
  },

  description: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 15,
    marginBottom: 30,
    color: '#555555',
  },

  button: {
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 15,
    borderRadius: 10,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 36,
    marginBottom: 12,
  },

  libraryTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222222',
  },

  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
  },

  refreshButtonText: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },

  emptyText: {
    color: '#666666',
    fontSize: 14,
  },

  videoItem: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f4f8f4',
  },

  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222222',
  },

  videoDate: {
    marginTop: 4,
    color: '#777777',
    fontSize: 12,
  },

  videoActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  videoAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2e7d32',
  },

  videoDownloadAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1565c0',
  },

  videoActionText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
