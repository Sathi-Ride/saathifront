"use client"

import React, { useState, useEffect } from "react"
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TextInput, StatusBar, SafeAreaView, Animated, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { rideService } from '../utils/rideService'
import webSocketService from '../utils/websocketService'

const { width, height } = Dimensions.get("window")

// Error boundary component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RideRating ErrorBoundary] Caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>Please try refreshing the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const RideRatingScreen = () => {
  const { driverName, from, to, fare, vehicle, rideId } = useLocalSearchParams()
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(true)
  const confettiAnimation = new Animated.Value(0)

  useEffect(() => {
    // Start confetti animation
    if (showConfetti) {
      Animated.sequence([
        Animated.timing(confettiAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowConfetti(false)
      })
    }
  }, [])

  const handleStarPress = (index: number) => {
    setRating(index + 1)
  }

  const handleSubmit = async () => {
    if (!rideId || rating === 0) return
    setSubmitting(true)
    try {
      // Use WebSocket for rating if connected, otherwise fallback to REST
      let success = false
      
      if (webSocketService.isSocketConnected()) {
        // Use WebSocket for rating
        success = await new Promise((resolve) => {
          webSocketService.emitEvent('rateRide', {
            rideId,
            rating,
            comment: feedback
          }, (response: any) => {
            resolve(response && response.code === 200)
          })
        })
      } else {
        // Fallback to REST API
        success = await rideService.rateDriver(rideId as string, rating)
      }
      
      if (success) {
        // Show success animation
        setShowConfetti(true)
        Animated.sequence([
          Animated.timing(confettiAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(confettiAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setTimeout(() => {
        router.push('/(tabs)')
          }, 1000)
        })
      } else {
        alert('Failed to submit rating. Please try again.')
      }
    } catch (err) {
      alert('Error submitting rating. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getRatingText = () => {
    switch (rating) {
      case 1:
        return "Poor"
      case 2:
        return "Fair"
      case 3:
        return "Good"
      case 4:
        return "Very Good"
      case 5:
        return "Excellent"
      default:
        return "Rate your experience"
    }
  }

  return (
    <ErrorBoundary>
    <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          {/* Optionally, wrap content in ScrollView for better keyboard handling */}
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      {/* Confetti Animation */}
      {showConfetti && (
        <Animated.View style={[styles.confetti, { opacity: confettiAnimation }]}>
          {[...Array(20)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.confettiPiece,
                {
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][i % 5],
                  left: Math.random() * width,
                  top: Math.random() * height,
                  transform: [{ rotate: `${Math.random() * 360}deg` }],
                },
              ]}
            />
          ))}
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Ride</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Trip Summary Card */}
        <View style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Icon name="check-circle" size={32} color="#4CAF50" />
            <Text style={styles.tripCompleteText}>Trip Completed!</Text>
          </View>

          <View style={styles.tripDetails}>
            <View style={styles.tripRow}>
              <Icon name="person" size={20} color="#075B5E" />
              <Text style={styles.tripLabel}>Driver:</Text>
              <Text style={styles.tripValue}>{driverName}</Text>
            </View>
            <View style={styles.tripRow}>
              <Icon name="directions-car" size={20} color="#075B5E" />
              <Text style={styles.tripLabel}>Vehicle:</Text>
              <Text style={styles.tripValue}>{vehicle}</Text>
            </View>
            <View style={styles.tripRow}>
              <Icon name="payment" size={20} color="#075B5E" />
              <Text style={styles.tripLabel}>Fare:</Text>
              <Text style={styles.tripValue}>₹{fare}</Text>
            </View>
            <View style={styles.tripRow}>
              <Icon name="location-on" size={20} color="#075B5E" />
              <Text style={styles.tripLabel}>From:</Text>
              <Text style={styles.tripValue} numberOfLines={1}>{from}</Text>
            </View>
            <View style={styles.tripRow}>
              <Icon name="location-on" size={20} color="#EA2F14" />
              <Text style={styles.tripLabel}>To:</Text>
              <Text style={styles.tripValue} numberOfLines={1}>{to}</Text>
            </View>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>How was your ride?</Text>
          <Text style={styles.ratingSubtitle}>{getRatingText()}</Text>

          <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleStarPress(star - 1)} style={styles.starButton}>
                <Icon name="star" size={40} color={rating >= star ? "#FFD700" : "#E0E0E0"} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Feedback Section */}
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Share your feedback</Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Tell us about your experience..."
            placeholderTextColor="#999"
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (rating === 0 || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
        >
          <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit Rating'}</Text>
          <Icon name="send" size={20} color="#fff" style={styles.submitIcon} />
        </TouchableOpacity>

        {/* Skip Button */}
        <TouchableOpacity style={styles.skipButton} onPress={() => router.push("/(tabs)")}>
                <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
          </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#f8f9fa",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 30,
    color: "#000",
  },
  backButton: {
    padding: 8,
    color: "#075B5E",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#075B5E",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tripCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  tripCompleteText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
  },
  tripDetails: {
    gap: 12,
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tripLabel: {
    fontSize: 16,
    color: "#666",
    minWidth: 60,
  },
  tripValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  ratingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: 16,
    color: "#075B5E",
    fontWeight: "500",
    marginBottom: 24,
  },
  starContainer: {
    flexDirection: "row",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  feedbackCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    minHeight: 100,
    backgroundColor: "#f8f9fa",
  },
  submitButton: {
    backgroundColor: "#075B5E",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  submitIcon: {
    marginLeft: 4,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  confetti: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  confettiPiece: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})

export default RideRatingScreen
