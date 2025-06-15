import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const ProfileSettingsScreen = () => {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const router = useRouter();

  const handleSave = () => {
    // Handle save logic
    console.log('Profile saved:', { name, lastName, email, city });
    router.back();
  };

  const handleImageUpload = () => {
    // Handle image upload logic
    console.log('Image upload triggered');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile settings</Text>
      </View>
      <View style={styles.profileContainer}>
        <View style={styles.profileImageContainer}>
          <Image
            style={styles.profileImage}
            source={{ uri: 'https://www.shutterstock.com/image-vector/default-avatar-photo-placeholder-grey-600nw-2007531536.jpg' }} // Placeholder image
          />
          <TouchableOpacity style={styles.addImageButton} onPress={handleImageUpload}>
            <Icon name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          mode="flat"
          placeholder='Enter your first name'
          placeholderTextColor={'#ccc'}
          value={name}
          onChangeText={setName}
          style={styles.input}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
        />
        <TextInput
          mode="flat"
          placeholder='Enter your last name'
          placeholderTextColor={'#ccc'}
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
        />
        <TextInput
          mode="flat"
          value={email}
          onChangeText={setEmail}
          placeholder='Enter your email'
          placeholderTextColor={'#ccc'}      
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
        />
        <TextInput
            mode="flat"
            value={city}
            onChangeText={setCity}
            style={styles.input}
            underlineColor="transparent"
            placeholder='Enter your city'
            placeholderTextColor={'#ccc'}
            activeUnderlineColor="transparent"
            editable={false}
        />
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
  },
  profileContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  addImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    paddingHorizontal: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 50,
  },
  cityInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 50,
  },
  saveButton: {
    backgroundColor: '#00809D',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    width: width - 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileSettingsScreen;