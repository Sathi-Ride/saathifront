"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter, useLocalSearchParams } from "expo-router"

const { width, height } = Dimensions.get("window")

type Message = {
  id: string
  text: string
  sender: "user" | "driver"
  timestamp: Date
  status: "sent" | "delivered" | "read"
}

// Global message storage - in real app, this would be managed by state management (Zustand) or API
const globalMessages: { [key: string]: Message[] } = {}

const MessagingScreen = () => {
  const { driverName, driverPhone, rideId } = useLocalSearchParams()
  const router = useRouter()
  const scrollViewRef = useRef<ScrollView>(null)

  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isOnline, setIsOnline] = useState(true) // Mock online status

  // Create unique conversation ID based on ride
  const conversationId = `ride_${rideId || "current"}_${driverPhone}`

  useEffect(() => {
    // Load existing messages for this conversation
    if (globalMessages[conversationId]) {
      setMessages(globalMessages[conversationId])
    } else {
      // Initialize with welcome message
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: `Hi! I'm ${driverName}, your driver. Feel free to message me if you have any questions.`,
        sender: "driver",
        timestamp: new Date(),
        status: "delivered",
      }
      setMessages([welcomeMessage])
      globalMessages[conversationId] = [welcomeMessage]
    }

    // Simulate driver typing occasionally
    const typingInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        // 5% chance every second
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 2000)
      }
    }, 1000)

    return () => {
      clearInterval(typingInterval)
    }
  }, [conversationId, driverName])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }, [messages])

  const handleSend = () => {
    if (!message.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      sender: "user",
      timestamp: new Date(),
      status: "sent",
    }

    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)
    globalMessages[conversationId] = updatedMessages
    setMessage("")

    // TODO: Replace with actual API call
    // sendMessageToAPI(conversationId, newMessage)

    // Simulate message delivery
    setTimeout(() => {
      const deliveredMessages = updatedMessages.map((msg) =>
        msg.id === newMessage.id ? { ...msg, status: "delivered" as const } : msg,
      )
      setMessages(deliveredMessages)
      globalMessages[conversationId] = deliveredMessages
    }, 1000)

    // Simulate driver response (remove this when you have real API)
    if (Math.random() > 0.7) {
      // 30% chance of auto-response
      setTimeout(
        () => {
          const responses = [
            "Got it! 👍",
            "On my way!",
            "Thanks for letting me know",
            "I'll be there in a few minutes",
            "No problem!",
          ]
          const driverResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: responses[Math.floor(Math.random() * responses.length)],
            sender: "driver",
            timestamp: new Date(),
            status: "delivered",
          }
          const newMessages = [...globalMessages[conversationId], driverResponse]
          setMessages(newMessages)
          globalMessages[conversationId] = newMessages
        },
        2000 + Math.random() * 3000,
      ) // Random delay 2-5 seconds
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const renderMessage = (msg: Message, index: number) => {
    const isUser = msg.sender === "user"
    const showTime =
      index === 0 ||
      (messages[index - 1] && Math.abs(msg.timestamp.getTime() - messages[index - 1].timestamp.getTime()) > 300000) // 5 minutes

    return (
      <View key={msg.id}>
        {showTime && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(msg.timestamp)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.driverMessage]}>
          <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.driverBubble]}>
            <Text style={[styles.messageText, isUser ? styles.userText : styles.driverText]}>{msg.text}</Text>
          </View>
          {isUser && (
            <View style={styles.messageStatus}>
              <Icon
                name={msg.status === "read" ? "done-all" : msg.status === "delivered" ? "done-all" : "done"}
                size={12}
                color={msg.status === "read" ? "#4CAF50" : msg.status === "delivered" ? "#075B5E" : "#999"}
              />
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075B5E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.driverAvatar}>
            <Icon name="person" size={20} color="#f8f9fa" />
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{driverName}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, isOnline ? styles.online : styles.offline]} />
              <Text style={styles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
            </View>
          </View>
        </View>

      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, index) => renderMessage(msg, index))}

          {/* Typing indicator */}
          {isTyping && (
            <View style={[styles.messageContainer, styles.driverMessage]}>
              <View style={[styles.messageBubble, styles.driverBubble, styles.typingBubble]}>
                <View style={styles.typingIndicator}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, message.trim() ? styles.sendButtonActive : styles.sendButtonInactive]}
              onPress={handleSend}
              disabled={!message.trim()}
            >
              <Icon name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// Function to clear messages when ride is completed (call this from your ride completion logic)
export const clearRideMessages = (rideId: string, driverPhone: string) => {
  const conversationId = `ride_${rideId}_${driverPhone}`
  delete globalMessages[conversationId]
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop:40,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    color: "#000",
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#075B5E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    color: "#fff",
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  online: {
    backgroundColor: "#4CAF50",
  },
  offline: {
    backgroundColor: "#999",
  },
  statusText: {
    fontSize: 12,
    color: "#4CAF50",
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  timeContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  timeText: {
    fontSize: 12,
    color: "#999",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  userMessage: {
    justifyContent: "flex-end",
  },
  driverMessage: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#075B5E",
    borderBottomRightRadius: 4,
  },
  driverBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: "#fff",
  },
  driverText: {
    color: "#333",
  },
  messageStatus: {
    marginLeft: 4,
    marginBottom: 2,
  },
  typingBubble: {
    paddingVertical: 12,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#999",
  },
  typingDot1: {
    // Animation would be added here
  },
  typingDot2: {
    // Animation would be added here
  },
  typingDot3: {
    // Animation would be added here
  },
  inputContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f8f9fa",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: "#075B5E",
  },
  sendButtonInactive: {
    backgroundColor: "#ccc",
  },
})

export default MessagingScreen
