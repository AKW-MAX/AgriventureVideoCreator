import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function CreateStoryScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const continueToCharacters = () => {
    if (!title.trim()) {
      return;
    }

    router.push({
      pathname: '/characters',
      params: {
        title,
        description,
        selectedCharacters: JSON.stringify([]),
        characterPhotos: JSON.stringify({}),
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Create a Story
      </Text>

      <Text style={styles.label}>
        Story Title
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your story title"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>
        Description
      </Text>

      <TextInput
        style={[styles.input, styles.descriptionInput]}
        placeholder="Describe your farming story"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <Pressable
        style={[
          styles.button,
          !title.trim() && styles.buttonDisabled,
        ]}
        onPress={continueToCharacters}
        disabled={!title.trim()}
      >
        <Text style={styles.buttonText}>
          Continue
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 30,
  },

  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
  },

  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },

  descriptionInput: {
    height: 120,
    textAlignVertical: 'top',
  },

  button: {
    backgroundColor: '#2e7d32',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
});