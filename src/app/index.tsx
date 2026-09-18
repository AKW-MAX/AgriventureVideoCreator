import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const BACKEND_URL = 'https://agriventurevideobackend.onrender.com';

type CreatedVideo = {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  createdAt?: string;
};

function getString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

function makeVideoUrl(value: unknown): string | null {
  const raw = getString(value).trim();

  if (!raw) {
    return null;
  }

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('file://')
  ) {
    return raw;
  }

  if (raw.startsWith('/')) {
    return `${BACKEND_URL}${raw}`;
  }

  return `${BACKEND_URL}/${raw}`;
}

function extractVideoUrl(video: any): string | null {
  if (!video) {
    return null;
  }

  const possibleValues = [
    video.videoUrl,
    video.videoURL,
    video.url,
    video.video,
    video.fileUrl,
    video.fileURL,
    video.outputUrl,
    video.outputURL,
    video.downloadUrl,
    video.downloadURL,
  ];

  for (const value of possibleValues) {
    const url = makeVideoUrl(value);

    if (url) {
      return url;
    }
  }

  return null;
}

function normalizeVideos(rawVideos: any[]): CreatedVideo[] {
  if (!Array.isArray(rawVideos)) {
    return [];
  }

  return rawVideos
    .map((video: any, index: number) => {
      const videoUrl = extractVideoUrl(video);

      if (!videoUrl) {
        return null;
      }

      return {
        id: getString(video._id || video.id || index),
        title:
          getString(video.title) ||
          getString(video.name) ||
          `Farming Video ${index + 1}`,
        description: getString(video.description),
        videoUrl,
        createdAt:
          getString(video.createdAt) ||
          getString(video.created_at),
      };
    })
    .filter(Boolean) as CreatedVideo[];
}

export default function HomeScreen() {
  const router = useRouter();

  const [videos, setVideos] = useState<CreatedVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const historyUrl =
    `${BACKEND_URL}/api/video/heygen/history`;

  const loadVideos = useCallback(async () => {
    try {
      setLoadingVideos(true);

      const response = await fetch(historyUrl);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Failed to load videos.'
        );
      }

      const rawVideos =
        data?.videos ||
        data?.data ||
        data?.history ||
        [];

      const normalizedVideos =
        normalizeVideos(rawVideos);

      setVideos(normalizedVideos);
    } catch (error: any) {
      console.log(
        '❌ Failed to load video history:',
        error?.message || error
      );
    } finally {
      setLoadingVideos(false);
    }
  }, [historyUrl]);

  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [loadVideos])
  );

  const openVideo = async (videoUrl: string) => {
    try {
      await Linking.openURL(videoUrl);
    } catch (error) {
      Alert.alert(
        'Unable to open video',
        'The video could not be opened.'
      );
    }
  };

  const downloadVideo = async (video: CreatedVideo) => {
    try {
      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          'Sharing unavailable',
          'Sharing is not available on this device.'
        );
        return;
      }

      const fileName =
        `${video.title
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase()}.mp4`;

      const fileUri =
        `${FileSystem.cacheDirectory}${fileName}`;

      const downloadResult =
        await FileSystem.downloadAsync(
          video.videoUrl,
          fileUri
        );

      await Sharing.shareAsync(
        downloadResult.uri,
        {
          mimeType: 'video/mp4',
          dialogTitle: 'Share your farming video',
        }
      );
    } catch (error: any) {
      console.log(
        '❌ Video download error:',
        error?.message || error
      );

      Alert.alert(
        'Download failed',
        error?.message ||
          'Unable to download the video.'
      );
    }
  };

  const createVideo = () => {
    router.push('/create');
  };

  const createPoster = () => {
    router.push('/poster');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Agriventure
        </Text>

        <Text style={styles.subtitle}>
          Farming Story Video Creator
        </Text>
      </View>

      <Pressable
        style={styles.createButton}
        onPress={createVideo}
      >
        <Text style={styles.createButtonText}>
          🎬 Create Farming Story
        </Text>
      </Pressable>

      {/* ==========================================
          PRODUCT POSTER CREATOR
          ========================================== */}

      <View style={styles.posterSection}>
        <Text style={styles.posterTitle}>
          Create Marketing Poster
        </Text>

        <Text style={styles.posterDescription}>
          Create professional product posters for your
          agricultural products and share them on social media.
        </Text>

        <Pressable
          style={styles.posterButton}
          onPress={createPoster}
        >
          <Text style={styles.posterButtonText}>
            📢 Create Product Poster
          </Text>
        </Pressable>
      </View>

      {/* ==========================================
          CREATED VIDEOS
          ========================================== */}

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>
          Created Videos
        </Text>

        {loadingVideos ? (
          <Text style={styles.emptyText}>
            Loading videos...
          </Text>
        ) : videos.length === 0 ? (
          <Text style={styles.emptyText}>
            No videos created yet.
          </Text>
        ) : (
          videos.map((video) => (
            <View
              key={video.id}
              style={styles.videoCard}
            >
              <Text style={styles.videoTitle}>
                {video.title}
              </Text>

              {video.description ? (
                <Text
                  style={styles.videoDescription}
                >
                  {video.description}
                </Text>
              ) : null}

              {video.createdAt ? (
                <Text style={styles.videoDate}>
                  {new Date(
                    video.createdAt
                  ).toLocaleString()}
                </Text>
              ) : null}

              <View style={styles.videoActions}>
                <Pressable
                  style={styles.openButton}
                  onPress={() =>
                    openVideo(video.videoUrl)
                  }
                >
                  <Text style={styles.actionText}>
                    ▶ Open
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.downloadButton}
                  onPress={() =>
                    downloadVideo(video)
                  }
                >
                  <Text style={styles.actionText}>
                    ⬇ Download
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#ffffff',
  },

  header: {
    marginTop: 30,
    marginBottom: 25,
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2e7d32',
  },

  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: '#666666',
  },

  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 15,
    borderRadius: 10,
  },

  createButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  posterSection: {
    marginTop: 25,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#f4f8f4',
    borderWidth: 1,
    borderColor: '#dce8dc',
  },

  posterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222222',
  },

  posterDescription: {
    marginTop: 7,
    marginBottom: 15,
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
  },

  posterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 10,
  },

  posterButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  historySection: {
    marginTop: 30,
  },

  historyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#222222',
  },

  emptyText: {
    color: '#777777',
    fontSize: 14,
    marginTop: 5,
  },

  videoCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  videoTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222222',
  },

  videoDescription: {
    marginTop: 6,
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },

  videoDate: {
    marginTop: 6,
    fontSize: 12,
    color: '#888888',
  },

  videoActions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },

  openButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 11,
    borderRadius: 8,
  },

  downloadButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#555555',
    paddingVertical: 11,
    borderRadius: 8,
  },

  actionText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
