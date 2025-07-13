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
import webSocketService from '../utils/websocketService'

const { width, height } = Dimensions.get("window")

type Message = {
  id: string
  text: string
  sender: "user" | "driver"
  timestamp: Date
  status: "sent" | "delivered" | "read"
}

const MessagingScreen = () => {
  const params = useLocalSearchParams()
  const passengerName = params.passengerName as string
  const passengerPhone = params.passengerPhone as string
  const driverName = params.driverName as string
  const driverPhone = params.driverPhone as string
  const rideId = params.rideId as string
  const userRole = params.userRole as string
  const router = useRouter()
  const scrollViewRef = useRef<ScrollView>(null)

  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [loading, setLoading] = useState(true)
  const [typingTimeout, setTypingTimeout] = useState<any>(null)
  const [lastTypingTime, setLastTypingTime] = useState(0)
  const [typingDebounceTimeout, setTypingDebounceTimeout] = useState<any>(null)

  // Determine if current user is driver or passenger
  const isDriver = userRole === 'driver'
  const otherUserName = isDriver ? passengerName : driverName
  const otherUserPhone = isDriver ? passengerPhone : driverPhone

  useEffect(() => {
    let isMounted = true
    let messageCreatedListener: any
    let messageDeletedListener: any
    let isTypingListener: any

    async function setupWebSocket() {
      try {
        // Connect to appropriate WebSocket namespace
        const namespace = isDriver ? 'driver' : 'passenger'
        await webSocketService.connect(rideId, namespace)
        
        // Get all messages with proper error handling
        setTimeout(() => {
          if (isMounted) {
            webSocketService.emitEvent('getAllMessages', {}, (response: any) => {
              if (isMounted && response && response.code === 200 && Array.isArray(response.data)) {
                console.log('Messaging: Loaded messages:', response.data.length);
                setMessages(response.data)
                setLoading(false)
              } else {
                console.log('Messaging: No messages or invalid response:', response)
                setMessages([])
                setLoading(false)
              }
            })
          }
        }, 1000)
        
        // Listen for new messages
        messageCreatedListener = (msg: any) => {
          if (isMounted) {
            console.log('Messaging: New message received:', msg)
            setMessages(prev => [...prev, msg])
          }
        }
        
        // Listen for deleted messages
        messageDeletedListener = (msg: any) => {
          if (isMounted) {
            console.log('Messaging: Message deleted:', msg)
            setMessages(prev => prev.filter(m => m._id !== msg._id))
          }
        }
        
        // Listen for typing indicators with debouncing
        isTypingListener = (data: any) => {
          if (isMounted) {
            console.log('Messaging: Typing indicator received:', data)
            
            // Clear existing debounce timeout
            if (typingDebounceTimeout) {
              clearTimeout(typingDebounceTimeout)
            }
            
            setIsTyping(true)
            
            // Set new debounce timeout
            const timeout = setTimeout(() => {
              if (isMounted) {
                setIsTyping(false)
              }
            }, 3000)
            
            setTypingDebounceTimeout(timeout)
          }
        }
        
        webSocketService.on('messageCreated', messageCreatedListener)
        webSocketService.on('messageDeleted', messageDeletedListener)
        webSocketService.on('isTyping', isTypingListener)
      } catch (err) {
        console.error('Messaging: WebSocket setup failed:', err)
        setLoading(false)
      }
    }
    setupWebSocket()
    return () => {
      isMounted = false
      if (messageCreatedListener) webSocketService.off('messageCreated', messageCreatedListener)
      if (messageDeletedListener) webSocketService.off('messageDeleted', messageDeletedListener)
      if (isTypingListener) webSocketService.off('isTyping', isTypingListener)
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
      if (typingDebounceTimeout) {
        clearTimeout(typingDebounceTimeout)
      }
    }
  }, [rideId, isDriver])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }, [messages])

  const handleSend = () => {
    if (!message.trim()) return
    
    // Send message via WebSocket - use correct data format
    webSocketService.emitEvent('sendMessage', message.trim(), (response: any) => {
      if (response && response.code === 201) {
        console.log('Messaging: Message sent successfully')
      } else {
        console.error('Messaging: Failed to send message', response)
      }
    })
    
    setMessage("")
  }

  const handleTyping = () => {
    const now = Date.now()
    // Prevent typing indicators more frequently than every 3 seconds
    if (now - lastTypingTime < 3000) {
      return
    }
    
    setLastTypingTime(now)
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }
    
    // Send typing indicator
    webSocketService.emitEvent('isTyping', {})
    
    // Set timeout to stop typing indicator after 5 seconds
    const timeout = setTimeout(() => {
      setIsTyping(false)
    }, 5000)
    
    setTypingTimeout(timeout)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const renderMessage = (msg: any, index: number) => {
    // Determine if message is from current user based on userRole
    const isCurrentUser = isDriver ? 
      (msg.senderId?._id === '6854c59aea13b84826d53918' || msg.sender === 'driver') : 
      (msg.senderId?._id === '685f936891d792c962656032' || msg.sender === 'user')
    
    const showTime =
      index === 0 ||
      (messages[index - 1] && Math.abs(new Date(msg.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime()) > 300000)

    return (
      <View key={msg._id || msg.id || index}>
        {showTime && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(new Date(msg.createdAt))}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isCurrentUser ? styles.userMessage : styles.otherMessage]}>
          <View style={[styles.messageBubble, isCurrentUser ? styles.userBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isCurrentUser ? styles.userText : styles.otherText]}>
              {msg.content || msg.text || 'Message content unavailable'}
            </Text>
          </View>
          {isCurrentUser && (
            <View style={styles.messageStatus}>
              <Icon
                name="done-all"
                size={12}
                color="#4CAF50"
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
          <View style={styles.userAvatar}>
            <Icon name="person" size={20} color="#f8f9fa" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{otherUserName}</Text>
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
            <View style={[styles.messageContainer, styles.otherMessage]}>
              <View style={[styles.messageBubble, styles.otherBubble, styles.typingBubble]}>
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
              onChangeText={(text) => {
                setMessage(text)
                // Only trigger typing indicator on first character and with debouncing
                if (text.length === 1) {
                  handleTyping()
                }
              }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#075B5E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
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
    color: "#666",
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  timeContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  timeText: {
    fontSize: 12,
    color: "#999",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
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
  otherMessage: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#075B5E",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  typingBubble: {
    backgroundColor: "#f0f0f0",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: "#fff",
  },
  otherText: {
    color: "#333",
  },
  messageStatus: {
    marginLeft: 8,
    marginBottom: 4,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#999",
    marginHorizontal: 2,
  },
  typingDot1: {
    animationDelay: "0ms",
  },
  typingDot2: {
    animationDelay: "150ms",
  },
  typingDot3: {
    animationDelay: "300ms",
  },
  inputContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: "#075B5E",
  },
  sendButtonInactive: {
    backgroundColor: "#ccc",
  },
})

export default MessagingScreen
