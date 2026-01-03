<template>
  <div id="app">
    <div class="container">
      <div class="header">
        <h1>WMD User Analytics Dashboard</h1>
        <p>Interactive data visualization powered by Vue.js and D3.js</p>
        <div v-if="loading" style="text-align: center; padding: 20px; color: #666;">Loading...</div>
        <div v-if="error" style="text-align: center; padding: 20px; color: red;">Error: {{ error }}</div>
      </div>
      
      <!-- User Selector -->
      <UserSelector 
        v-model="selectedUser" 
        @user-selected="handleUserSelection"
      />
      
      <!-- Charts stacked vertically -->
      <div class="charts-container">
        <!-- Existing Bar Chart -->
        <SessionBarChart 
          :data="sessionData"
          :loading="sessionLoading"
          :error="sessionError"
        />
        
        
        <!-- Session Visualization -->
        <SessionVisualization
          :data="sessionVisualizationData"
          :loading="sessionVisualizationLoading"
        />
        
        <!-- Session Timeline -->
        <SessionTimeline 
          :data="timelineData"
          :loading="timelineLoading"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import UserSelector from './components/UserSelector.vue'
import SessionBarChart from './components/SessionBarChart.vue'
import SessionVisualization from './components/SessionVisualization.vue'
import SessionTimeline from './components/SessionTimeline.vue'

export default {
  name: 'App',
  components: {
    UserSelector,
    SessionBarChart,
    SessionVisualization,
    SessionTimeline
  },
  setup() {
    // State management
    const selectedUser = ref('')
    const sessionData = ref([])
    const sessionVisualizationData = ref([])
    const timelineData = ref([])
    
    // Loading states
    const sessionLoading = ref(false)
    const sessionVisualizationLoading = ref(false)
    const timelineLoading = ref(false)
    
    // Error states
    const sessionError = ref('')
    const sessionVisualizationError = ref('')
    const timelineError = ref('')
    
    // Fetch session data for bar chart
    const fetchSessionData = async () => {
      try {
        sessionLoading.value = true
        sessionError.value = ''
        const response = await axios.get('/api/user-sessions')
        sessionData.value = response.data.data || []
      } catch (err) {
        console.error('Error fetching session data:', err)
        sessionError.value = 'Failed to fetch session data'
        sessionData.value = []
      } finally {
        sessionLoading.value = false
      }
    }
    
    // Fetch session visualization data
    const fetchSessionVisualizationData = async (username) => {
      if (!username) {
        sessionVisualizationData.value = []
        return
      }
      
      try {
        sessionVisualizationLoading.value = true
        sessionVisualizationError.value = ''
        const response = await axios.get(`/api/user-sessions`)
        // Transform session data for visualization
        const processedData = response.data.data?.filter(session => session.player_name === username) || []
        sessionVisualizationData.value = processedData
      } catch (err) {
        console.error('Error fetching session data:', err)
        sessionVisualizationError.value = 'Failed to fetch session data'
        sessionVisualizationData.value = []
      } finally {
        sessionVisualizationLoading.value = false
      }
    }
    
    // Fetch timeline data for session chart
    const fetchTimelineData = async (username) => {
      if (!username) {
        timelineData.value = []
        return
      }
      
      try {
        timelineLoading.value = true
        timelineError.value = ''
        const response = await axios.get(`/api/session-timing/${encodeURIComponent(username)}`)
        timelineData.value = response.data.data || []
      } catch (err) {
        console.error('Error fetching timeline data:', err)
        timelineError.value = 'Failed to fetch session timing data'
        timelineData.value = []
      } finally {
        timelineLoading.value = false
      }
    }
    
    // Get user with most sessions for default selection
    const getDefaultUser = async () => {
      try {
        const response = await axios.get('/api/user-with-most-sessions')
        if (response.data.data && response.data.data.user) {
          selectedUser.value = response.data.data.user
          await fetchUserData(selectedUser.value)
        }
      } catch (err) {
        console.error('Error getting default user:', err)
      }
    }
    
    // Fetch all user data when user is selected
    const fetchUserData = async (username) => {
      if (!username) return
      
      // Fetch session visualization and timeline data in parallel
      await Promise.all([
        fetchSessionVisualizationData(username),
        fetchTimelineData(username)
      ])
    }
    
    // Handle user selection
    const handleUserSelection = (username) => {
      fetchUserData(username)
    }
    
    // Initialize app
    onMounted(async () => {
      // Load initial session data for bar chart
      await fetchSessionData()
      
      // Get default user and load their data
      await getDefaultUser()
    })
    
    // Watch for selected user changes
    watch(selectedUser, (newUser) => {
      if (newUser) {
        fetchUserData(newUser)
      }
    })
    
    return {
      selectedUser,
      sessionData,
      sessionVisualizationData,
      timelineData,
      sessionLoading,
      sessionVisualizationLoading,
      timelineLoading,
      sessionError,
      sessionVisualizationError,
      timelineError,
      handleUserSelection
    }
  }
}
</script>