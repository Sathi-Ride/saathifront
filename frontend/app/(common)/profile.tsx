import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import apiClient from '../utils/apiClient';

const { width } = Dimensions.get('window');

const ProfileSettingsScreen = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageUri, setImageUri] = useState('https://www.shutterstock.com/image-vector/default-avatar-photo-placeholder-grey-600nw-2007531536.jpg'); // Default image

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await apiClient.get('me');
        const userData = response.data.data;
        setName(userData.firstName || '');
        setLastName(userData.lastName || '');
        setEmail(userData.email || '');
        setMobile(userData.mobile || '');
        // If the backend supports a profile picture URL, set it here
        // setImageUri(userData.profilePicture || imageUri);
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        Alert.alert('Error', 'Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateUserDto = { firstName: name, lastName, email };
      const response = await apiClient.patch('me', updateUserDto);
      if (response.data.statusCode === 200) {
        Alert.alert('Success', 'Profile updated successfully');
        router.back();
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = () => {
    // Placeholder for image upload logic
    Alert.alert('Info', 'Image upload functionality is not implemented yet.');
    console.log('Image upload triggered');
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
      </View>
      <View style={styles.profileContainer}>
        <View style={styles.profileImageContainer}>
          <Image
            style={styles.profileImage}
            source={{ uri: imageUri }}
          />
          <TouchableOpacity style={styles.addImageButton} onPress={handleImageUpload}>
            <Icon name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          mode="flat"
          placeholder="Enter your first name"
          placeholderTextColor="#ccc"
          value={name}
          onChangeText={setName}
          style={styles.input}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
        />
        <TextInput
          mode="flat"
          placeholder="Enter your last name"
          placeholderTextColor="#ccc"
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
          placeholder="Enter your email"
          placeholderTextColor="#ccc"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
        />
        <TextInput
          mode="flat"
          value={mobile}
          style={styles.input}
          underlineColor="transparent"
          placeholder="Your phone number"
          placeholderTextColor="#ccc"
          activeUnderlineColor="transparent"
          editable={false}
        />
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
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