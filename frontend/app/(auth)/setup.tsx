"use client"

import { useState } from "react"
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native"
import { useRouter } from "expo-router"
import { useSearchParams } from "expo-router/build/hooks"
import Icon from "react-native-vector-icons/MaterialIcons"

const SetupScreen = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const source = searchParams.get("source")
  const verified = searchParams.get("verified") === "true" // Check if coming from OTP verification

  // Mock Google user data - in real app, this would come from Google Auth
  const [name, setName] = useState(
    source === "google" ? "John Doe" : "", // Prefilled from Google
  )
  const [email, setEmail] = useState(
    source === "google" ? "john.doe@gmail.com" : "", // Prefilled from Google
  )
  const [phone, setPhone] = useState(
    source === "phone" ? "+977 9876543210" : "+977 ", // Prefilled if from phone auth
  )
  const [loading, setLoading] = useState(false)

  // Focus states for each input
  const [nameFocused, setNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [phoneFocused, setPhoneFocused] = useState(false)

  const handleNext = () => {
    setLoading(true)

    // Simulate API call delay
    setTimeout(() => {
      setLoading(false)

      if (source === "phone") {
        // Phone flow: Go directly to home screen (no verification needed)
        router.replace("/(tabs)")
      } else if (source === "google" && !verified) {
        // Google flow: Go to phone verification first
        router.push({
          pathname: "/(auth)/verify",
          params: {
            phone: phone,
            name: name,
            email: email,
            source: "google",
          },
        })
      } else if (source === "google" && verified) {
        // Google flow after verification: All info confirmed, go to home
        router.replace("/(tabs)")
      }
    }, 2000)
  }

  const getTitle = () => {
    if (source === "google" && verified) {
      return "Welcome to Saathi!"
    } else if (source === "google") {
      return "Complete your profile"
    } else {
      return "Set up your account"
    }
  }

  const getButtonText = () => {
    if (source === "google" && verified) {
      return "Get Started"
    } else if (source === "google") {
      return "Verify Phone"
    } else {
      return "Next"
    }
  }

  const getHelpText = () => {
    if (source === "google" && verified) {
      return "Your account is ready! Tap 'Get Started' to begin using Saathi."
    } else if (source === "google") {
      return "We'll send you a verification code to confirm your phone number"
    } else {
      return "We'll verify your information in the next step"
    }
  }

  const isFormValid = () => {
    if (source === "phone") {
      return name.trim() && email.trim() && phone.trim()
    } else if (source === "google" && !verified) {
      return phone.trim() && phone.length > 5 // Basic phone validation
    } else if (source === "google" && verified) {
      return true // All info is already validated
    }
    return false
  }

  // Show success screen for verified Google users
  if (source === "google" && verified) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Icon name="check-circle" size={80} color="#4CAF50" />
          </View>

          <Text style={styles.successTitle}>Account Setup Complete!</Text>
          <Text style={styles.successSubtitle}>Welcome to Saathi, you're all set to start riding.</Text>

          {/* Show all verified info */}
          <View style={styles.verifiedInfoContainer}>
            <View style={styles.verifiedItem}>
              <Icon name="person" size={20} color="#075B5E" />
              <Text style={styles.verifiedText}>{name}</Text>
              <View style={styles.verifiedBadge}>
                <Icon name="verified" size={16} color="#4CAF50" />
              </View>
            </View>

            <View style={styles.verifiedItem}>
              <Icon name="email" size={20} color="#075B5E" />
              <Text style={styles.verifiedText}>{email}</Text>
              <View style={styles.verifiedBadge}>
                <Icon name="verified" size={16} color="#4CAF50" />
              </View>
            </View>

            <View style={styles.verifiedItem}>
              <Icon name="phone" size={20} color="#075B5E" />
              <Text style={styles.verifiedText}>{phone}</Text>
              <View style={styles.verifiedBadge}>
                <Icon name="verified" size={16} color="#4CAF50" />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.getStartedButton} onPress={handleNext}>
            <Text style={styles.getStartedButtonText}>Get Started</Text>
            <Icon name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Regular setup screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#075B5E" />
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>{getTitle()}</Text>

        <TouchableOpacity style={styles.profileImageContainer}>
          <View style={styles.profilePlaceholder}>
            <Icon name="person" size={40} color="#999" />
          </View>
          <View style={styles.cameraIcon}>
            <Icon name="camera-alt" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, nameFocused && styles.inputFocused, source === "google" && styles.inputPrefilled]}
            value={name}
            onChangeText={setName}
            placeholder="Enter your Name"
            placeholderTextColor="#ccc"
            editable={source !== "google"} // Disabled for Google (prefilled)
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, emailFocused && styles.inputFocused, source === "google" && styles.inputPrefilled]}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your Email"
            placeholderTextColor="#ccc"
            keyboardType="email-address"
            editable={source !== "google"} // Disabled for Google (prefilled)
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, phoneFocused && styles.inputFocused, source === "phone" && styles.inputPrefilled]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Enter your Phone Number"
            placeholderTextColor="#ccc"
            editable={source !== "phone"} // Disabled for phone flow (prefilled)
            autoFocus={source === "google" && !verified} // Auto-focus for Google flow
            onFocus={() => setPhoneFocused(true)}
            onBlur={() => setPhoneFocused(false)}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!isFormValid() || loading) && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!isFormValid() || loading}
        >
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>{getButtonText()}</Text>
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.helpText}>{getHelpText()}</Text>
      </View>

      <View style={styles.keyboardPlaceholder} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 12,
    marginTop: 20,
    alignSelf: "flex-start",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 32,
    textAlign: "center",
    color: "#333",
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 32,
    position: "relative",
  },
  profilePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#075B5E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    height: 56,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#333",
  },
  inputFocused: {
    borderColor: "#8DBCC7",
    backgroundColor: "#f8fcfd",
  },
  inputPrefilled: {
    backgroundColor: "#f8f9fa",
    borderColor: "#d0d7de",
    color: "#666",
  },
  button: {
    width: "100%",
    backgroundColor: "#075B5E",
    borderRadius: 12,
    marginTop: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
  },
  buttonContent: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  keyboardPlaceholder: {
    height: 100,
  },
  // Success screen styles
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  verifiedInfoContainer: {
    width: "100%",
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    gap: 16,
  },
  verifiedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  verifiedText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  verifiedBadge: {
    marginLeft: "auto",
  },
  getStartedButton: {
    width: "100%",
    backgroundColor: "#075B5E",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
})

export default SetupScreen
