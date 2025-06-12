import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

const RideRatingScreen = () => {
  const { driverName, from, to, fare, vehicle } = useLocalSearchParams();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [starColor, setStarColor] = useState(['#ccc', '#ccc', '#ccc', '#ccc', '#ccc']);

  const handleStarPress = (index: number) => {
    const newStarColor = ['#ccc', '#ccc', '#ccc', '#ccc', '#ccc'];
    for (let i = 0; i <= index; i++) {
      newStarColor[i] = '#FFD700';
    }
    setStarColor(newStarColor);
    setRating(index + 1);
  };

  const handleSubmit = () => {
    // API call to send rating and feedback to driver would go here
    console.log(`Rating: ${rating}, Feedback: ${feedback}, Driver: ${driverName}`);
    // Store in ride history (dummy for now)
    const rideHistory = {
      date: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }),
      from,
      to,
      fare: parseFloat(Array.isArray(fare) ? fare[0] : fare ?? ''),
      driver: driverName,
      vehicle,
      rating,
      feedback,
    };
    console.log('Ride History Updated:', rideHistory);
    router.push('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Driver</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.driverText}>Driver: {driverName}</Text>
        <View style={styles.starContainer}>
          {[0, 1, 2, 3, 4].map((i) => (
            <TouchableOpacity key={i} onPress={() => handleStarPress(i)}>
              <Icon name="star" size={40} color={starColor[i]} />
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.feedbackInput}
          placeholder="Leave your feedback..."
          value={feedback}
          onChangeText={setFeedback}
          multiline
        />
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 20,
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  feedbackInput: {
    width: width - 32,
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RideRatingScreen;