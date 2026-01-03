<template>
  <div class="user-selector">
    <label for="user-search" class="selector-label">Select User:</label>
    <div class="input-wrapper">
      <input
        id="user-search"
        v-model="searchQuery"
        @input="handleInput"
        @focus="showDropdown = true"
        @blur="handleBlur"
        @keydown.down="highlightNext"
        @keydown.up="highlightPrevious"
        @keydown.enter="selectHighlighted"
        @keydown.escape="showDropdown = false"
        type="text"
        class="user-input"
        :class="{ 'error': hasError }"
        placeholder="Type username or clear to see all..."
      />
      <div v-if="loading" class="loading-indicator">⟳</div>
    </div>
    
    <!-- Dropdown with user suggestions -->
    <div v-if="showDropdown && (filteredUsers.length > 0 || searchQuery)" class="dropdown">
      <div
        v-if="filteredUsers.length === 0 && searchQuery"
        class="dropdown-item no-results"
      >
        No users found
      </div>
      <div
        v-for="(user, index) in filteredUsers"
        :key="user.user"
        :class="[
          'dropdown-item',
          { 'highlighted': index === highlightedIndex }
        ]"
        @mousedown="selectUser(user.user)"
        @mouseenter="highlightedIndex = index"
      >
        <span class="user-name">{{ user.user }}</span>
        <span class="session-count">({{ user.session_count }} sessions)</span>
      </div>
    </div>
    
    <!-- Error message -->
    <div v-if="hasError" class="error-message">
      User "{{ searchQuery }}" not found
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'UserSelector',
  props: {
    modelValue: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'user-selected'],
  setup(props, { emit }) {
    const searchQuery = ref(props.modelValue || '')
    const users = ref([])
    const loading = ref(false)
    const showDropdown = ref(false)
    const highlightedIndex = ref(-1)
    const hasError = ref(false)
    
    // Filter users based on search query
    const filteredUsers = computed(() => {
      if (!searchQuery.value.trim()) return users.value.slice(0, 10)
      return users.value
    })
    
    // Fetch all users
    const fetchAllUsers = async () => {
      try {
        loading.value = true
        const response = await axios.get('/api/users')
        users.value = response.data.data || []
        hasError.value = false
      } catch (error) {
        console.error('Error fetching all users:', error)
        users.value = []
        hasError.value = false // Don't show error for empty search
      } finally {
        loading.value = false
      }
    }
    
    // Search for users
    const searchUsers = async (query) => {
      if (!query.trim()) {
        // When empty, fetch all users
        await fetchAllUsers()
        return
      }
      
      try {
        loading.value = true
        const response = await axios.get(`/api/users-search/${encodeURIComponent(query)}`)
        users.value = response.data.data || []
        hasError.value = false
      } catch (error) {
        console.error('Error searching users:', error)
        users.value = []
        if (searchQuery.value.trim()) {
          hasError.value = true
        }
      } finally {
        loading.value = false
      }
    }
    
    // Handle input with debouncing
    let searchTimeout
    const handleInput = () => {
      hasError.value = false
      showDropdown.value = true
      highlightedIndex.value = -1
      
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        searchUsers(searchQuery.value)
      }, 300)
    }
    
    // Initialize with all users on mount
    const initializeUsers = async () => {
      if (!searchQuery.value.trim()) {
        await fetchAllUsers()
      }
    }
    
    // Select a user
    const selectUser = (username) => {
      searchQuery.value = username
      showDropdown.value = false
      hasError.value = false
      emit('update:modelValue', username)
      emit('user-selected', username)
    }
    
    // Handle blur with delay to allow click events
    const handleBlur = () => {
      setTimeout(() => {
        showDropdown.value = false
      }, 150)
    }
    
    // Keyboard navigation
    const highlightNext = () => {
      if (filteredUsers.value.length === 0) return
      highlightedIndex.value = (highlightedIndex.value + 1) % filteredUsers.value.length
    }
    
    const highlightPrevious = () => {
      if (filteredUsers.value.length === 0) return
      highlightedIndex.value = highlightedIndex.value <= 0 
        ? filteredUsers.value.length - 1 
        : highlightedIndex.value - 1
    }
    
    const selectHighlighted = () => {
      if (highlightedIndex.value >= 0 && filteredUsers.value[highlightedIndex.value]) {
        selectUser(filteredUsers.value[highlightedIndex.value].user)
      }
    }
    
    // Watch for external changes
    watch(() => props.modelValue, (newValue) => {
      if (newValue !== searchQuery.value) {
        searchQuery.value = newValue
      }
    })
    
    // Initialize on mount
    onMounted(() => {
      initializeUsers()
    })
    
    return {
      searchQuery,
      users,
      loading,
      showDropdown,
      highlightedIndex,
      hasError,
      filteredUsers,
      handleInput,
      handleBlur,
      selectUser,
      highlightNext,
      highlightPrevious,
      selectHighlighted
    }
  }
}
</script>

<style scoped>
.user-selector {
  position: relative;
  max-width: 400px;
  margin: 0 auto 30px;
}

.selector-label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #2c3e50;
}

.input-wrapper {
  position: relative;
}

.user-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s ease;
  background: white;
}

.user-input:focus {
  outline: none;
  border-color: #3498db;
}

.user-input.error {
  border-color: #e74c3c;
}

.loading-indicator {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  animation: spin 1s linear infinite;
  color: #666;
}

@keyframes spin {
  from { transform: translateY(-50%) rotate(0deg); }
  to { transform: translateY(-50%) rotate(360deg); }
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover,
.dropdown-item.highlighted {
  background-color: #f8f9fa;
}

.dropdown-item.no-results {
  color: #666;
  font-style: italic;
  cursor: default;
}

.dropdown-item.no-results:hover {
  background-color: white;
}

.user-name {
  font-weight: 500;
  color: #2c3e50;
}

.session-count {
  color: #7f8c8d;
  font-size: 14px;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 6px;
  padding: 0 4px;
}
</style>