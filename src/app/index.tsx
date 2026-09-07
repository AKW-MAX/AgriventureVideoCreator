import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>

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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
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
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 15,
    marginBottom: 30,
    color: '#555555',
  },

  button: {
    backgroundColor: '#2e7d32',
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 10,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },

});