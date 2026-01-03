<template>
  <div class="session-visualization">
    <div class="chart-header">
      <h3>Session Details - Product View</h3>
      <div class="controls">
        <div v-if="selectedUser" class="user-display">
          <small>User: <strong>{{ selectedUser }}</strong></small>
        </div>
        <div v-if="selectedSession" class="session-display">
          <small>Session: <strong>{{ formatSessionDateTime(selectedSession.session_date) }}</strong></small>
        </div>
      </div>
    </div>
    
    <div class="main-content">
      <!-- Sessions Sidebar -->
      <div class="sessions-sidebar">
        <h4>Session List</h4>
        <div v-if="recentSessions.length === 0" class="no-sessions">
          No sessions found for this user
        </div>
        <div 
          v-for="(session, index) in recentSessions" 
          :key="session.id" 
          class="session-item"
          :class="{ 'selected': selectedSession && selectedSession.id === session.id }"
          @click="selectSession(session)"
        >
          <div class="session-date-time">
            <div class="date">{{ formatSessionDate(session.session_date) }}</div>
            <div class="time">{{ formatSessionTime(session.session_date) }}</div>
          </div>
          <div class="session-stats">
            <div class="duration">{{ getSessionDuration(session.id) }}</div>
            <div class="product-count">{{ session.products.length }} products</div>
          </div>
        </div>
      </div>
      
      <!-- Main Chart Area -->
      <div ref="chartContainer" class="chart-area">
        <div v-if="loading" class="loading">Loading session data...</div>
        <div v-else-if="!selectedSession" class="no-session-selected">
          Select a session to view product details
        </div>
        <div v-else-if="!hierarchicalData.children || hierarchicalData.children.length === 0" class="no-data">
          No product data available for this session
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import * as d3 from 'd3'

export default {
  name: 'SessionVisualization',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    selectedUser: {
      type: String,
      default: ''
    },
    timelineData: {
      type: Array,
      default: () => []
    }
  },
  emits: ['session-selected'],
  setup(props, { emit }) {
    const chartContainer = ref(null)
    const selectedSession = ref(null)
    
    // Color scheme for categories
    const categoryColors = {
      'Electronics': '#3498db',
      'Home': '#e74c3c', 
      'Books': '#f39c12',
      'Clothing': '#2ecc71',
      'Beauty': '#9b59b6',
      'Sports': '#1abc9c'
    }
    
    // Get recent sessions for sidebar (sorted by date, latest first)
    const recentSessions = computed(() => {
      return props.data
        .slice()
        .sort((a, b) => new Date(b.session_date) - new Date(a.session_date))
    })
    
    // Process session data into hierarchical format for chart
    const hierarchicalData = computed(() => {
      if (!selectedSession.value) return { children: [] }
      
      const session = selectedSession.value
      const products = session.products || []
      
      // Get actual session duration from timeline data (more accurate)
      let actualSessionTime = (session.total_time || 0)
      
      // Group products by category for display purposes
      const categories = {}
      
      products.forEach(product => {
        const category = product.product_genre || 'Uncategorized'
        const time = product.total_time || 0
        
        if (!categories[category]) {
          categories[category] = {
            name: category,
            value: 0,
            children: []
          }
        }
        
        categories[category].value += time
        categories[category].children.push({
          name: product.object_name || product,
          value: time,
          category: category
        })
      })
      
      // Use actual session time for total, but show product breakdown for categories
      const hierarchy = {
        name: `Session ${session.id}`,
        value: actualSessionTime, // Use actual session duration
        children: Object.values(categories).sort((a, b) => b.value - a.value)
      }
      
      // Also add a separate bar for total session duration to show the time difference
      const sessionTimeEntry = {
        name: 'Total Session Duration',
        value: actualSessionTime,
        children: [],
        isSessionTotal: true
      }
      
      return hierarchy
    })
    
    // Create a simple bar chart
    const createBarChart = () => {
      
      if (!chartContainer.value) {
        console.log('No chart container, returning')
        return
      }
      
      if (!selectedSession.value) {
        console.log('No selected session, returning')
        return
      }
      
      if (!hierarchicalData.value.children || hierarchicalData.value.children.length === 0) {
        console.log('No hierarchical data, returning')
        return
      }
      
      console.log('All checks passed, creating chart')
      
      // Clear existing chart
      d3.select(chartContainer.value).selectAll("*").remove()
      
      // Chart dimensions
      const containerWidth = chartContainer.value.clientWidth || 800
      const containerHeight = 500
      const margin = { top: 20, right: 20, bottom: 40, left: 100 }
      const width = containerWidth - margin.left - margin.right
      const height = containerHeight - margin.top - margin.bottom
      
      // Create SVG
      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
      
      const g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      
      // Simple bar chart
      const allCategories = hierarchicalData.value.children || []
      const maxValue = d3.max(allCategories, function(d) { return d.value })
      
      const x = d3.scaleLinear()
        .domain([0, maxValue || 0])
        .range([0, width])
      
      const y = d3.scaleBand()
        .domain(allCategories.map(function(d) { return d.name }))
        .range([0, height])
        .padding(0.2)
      
      // Create bars for each category
      const bars = g.selectAll(".category-bar")
        .data(allCategories)
        .enter()
        .append("g")
        .attr("class", "category-bar")
      
      // Category bars
      bars.append("rect")
        .attr("x", 0)
        .attr("y", function(d) { return y(d.name) })
        .attr("width", function(d) { return x(d.value) })
        .attr("height", y.bandwidth())
        .attr("fill", function(d) { 
          // Use different color for session total duration
          if (d.isSessionTotal) return "#e74c3c"
          return categoryColors[d.name] || "#95a5a6"
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this).attr("opacity", 0.8)
          showTooltip(event, d)
        })
        .on("mouseout", function(event, d) {
          d3.select(this).attr("opacity", 1)
          hideTooltip()
        })
      
// Category labels
      bars.append("text")
        .attr("x", function(d) { return d.isSessionTotal ? -10 : -10 })
        .attr("y", function(d) { return y(d.name) + y.bandwidth() / 2 })
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .style("fill", function(d) { return d.isSessionTotal ? "#fff" : "#333" })
        .style("font-weight", "bold")
        .text(function(d) { return d.name })
      
      // Value labels - show both session total and individual category total
      bars.append("text")
        .attr("x", function(d) { return x(d.value) + 5 })
        .attr("y", function(d) { return y(d.name) + y.bandwidth() / 2 })
        .attr("alignment-baseline", "middle")
        .style("font-size", "10px")
        .style("fill", function(d) { return d.isSessionTotal ? "#fff" : "#666" })
        .text(function(d) { 
          const sessionDuration = getSessionDuration(selectedSession.value.id)
          const isSessionTotal = d.name === "Total Session Duration"
          if (isSessionTotal) {
            return sessionDuration + " (Total)"
          } else {
            return formatDuration(d.value) + " (" + (d.children ? d.children.length : 0) + " products)"
          }
        })
      
      // X axis
      g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickFormat(function(d) { return formatDuration(d) }))
        .selectAll("text")
        .style("font-size", "11px")
        .style("fill", "#666")
      
      // Tooltip functions
      const tooltip = d3.select("body").append("div")
        .attr("class", "icicle-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "9999")
      
      function showTooltip(event, d) {
        const productCount = d.children ? d.children.length : 0
        const tooltipText = "<strong>" + d.name + "</strong><br>Total: " + formatDuration(d.value) + "<br>" + productCount + " products"
        
        tooltip
          .style("visibility", "visible")
          .html(tooltipText)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
      }
      
      function hideTooltip() {
        tooltip.style("visibility", "hidden")
      }
    }
    
    // Select a session
    const selectSession = (session) => {
      selectedSession.value = session
      emit('session-selected', session)
      nextTick(() => {
        createBarChart()
      })
    }
    
    // Get session duration from timeline data
    const getSessionDuration = (sessionId) => {
      if (!sessionId || !props.timelineData || props.timelineData.length === 0) {
        return formatDuration(0)
      }
      
      const session = props.timelineData.find(function(s) { 
        return s.session_id.toString() === sessionId.toString() 
      })
      if (session && session.duration_seconds) {
        return formatDuration(session.duration_seconds)
      }
      
      return formatDuration(0)
    }
    
    // Format functions
    const formatDuration = (seconds) => {
      if (!seconds || seconds === 0) return '0s'
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.round(seconds % 60)
      if (minutes > 0) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
      }
      return `${remainingSeconds}s`
    }
    
    const formatSessionDateTime = (dateString) => {
      if (!dateString) return 'Unknown'
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const formatSessionDate = (dateString) => {
      if (!dateString) return 'Unknown'
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
    
    const formatSessionTime = (dateString) => {
      if (!dateString) return 'Unknown'
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    // Auto-select latest session when data changes
    watch(() => recentSessions.value, (sessions) => {
      if (sessions && sessions.length > 0 && !selectedSession.value) {
        selectSession(sessions[0])
      }
    }, { immediate: true })
    
    // Also watch timeline data for any updates
    watch(() => props.timelineData, () => {
      if (selectedSession.value && props.timelineData && props.timelineData.length > 0) {
        nextTick(() => {
          createBarChart()
        })
      }
    })
    
    // Watch for selected session changes
    watch(() => selectedSession.value, () => {
      if (selectedSession.value) {
        nextTick(() => {
          createBarChart()
        })
      }
    })
    
    // Handle window resize
    const handleResize = () => {
      if (selectedSession.value && hierarchicalData.value.children.length > 0) {
        nextTick(() => {
          createBarChart()
        })
      }
    }
    
    return {
      chartContainer,
      selectedSession,
      recentSessions,
      hierarchicalData,
      selectSession,
      formatDuration,
      formatSessionDateTime,
      formatSessionDate,
      formatSessionTime,
      getSessionDuration
    }
  }
}
</script>

<style scoped>
.session-visualization {
  width: 100%;
  margin-bottom: 30px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.3rem;
}

.controls {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
  justify-content: flex-end;
}

.user-display, .session-display {
  color: #6c757d;
  font-size: 14px;
}

.main-content {
  display: flex;
  gap: 20px;
}

.sessions-sidebar {
  width: 280px;
  min-height: 400px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f8f9fa;
  padding: 15px;
  overflow-y: auto;
  max-height: 600px;
}

.sessions-sidebar h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.session-item {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-item:hover {
  border-color: #3498db;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.session-item.selected {
  border-color: #3498db;
  background: #e3f2fd;
  box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);
}

.session-date-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.session-date-time .date {
  font-weight: bold;
  color: #495057;
  font-size: 13px;
}

.session-date-time .time {
  color: #6c757d;
  font-size: 12px;
}

.session-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.session-stats .duration {
  color: #28a745;
  font-weight: bold;
}

.session-stats .product-count {
  color: #6c757d;
}

.no-sessions, .no-data, .no-session-selected {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
  font-style: italic;
  background: #f8f9fa;
  border-radius: 8px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

.chart-area {
  flex: 1;
  min-height: 500px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  position: relative;
  overflow: hidden;
}

.chart-area svg {
  width: 100%;
  height: 100%;
}

/* Tooltip styles */
:global(.icicle-tooltip) {
  background: rgba(0,0,0,0.8) !important;
  color: white !important;
  padding: 8px 12px !important;
  border-radius: 4px !important;
  font-size: 12px !important;
  pointer-events: none !important;
  z-index: 9999 !important;
}
</style>