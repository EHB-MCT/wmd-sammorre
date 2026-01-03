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
    
    // Create a zoomable icicle chart
    const createIcicleChart = () => {
      if (!chartContainer.value || !selectedSession.value || !hierarchicalData.value.children) {
        console.log('Missing requirements for icicle chart')
        return
      }
      
      console.log('Creating icicle chart with data:', hierarchicalData.value)
      
      // Clear existing chart
      d3.select(chartContainer.value).selectAll("*").remove()
      
      // Chart dimensions - note height > width for vertical layout
      const width = chartContainer.value.clientWidth || 800
      const height = 500
      
      // Create SVG
      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("font", "10px sans-serif")
      
      // Create tooltip
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
      
      // Color scale
      const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, hierarchicalData.value.children.length + 1))
      
      // Prepare the data for partition
      const hierarchy = d3.hierarchy(hierarchicalData.value)
        .sum(d => d.value || 0)
        .sort((a, b) => b.height - a.height || b.value - a.value)
      
      // Create partition layout with vertical orientation (height first, then width)
      const root = d3.partition()
        .size([height, (hierarchy.height + 1) * width / 3])
        (hierarchy)
      
      // Append cells using groups with transforms
      const cell = svg
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.y0},${d.x0})`)
      
      const rect = cell.append("rect")
        .attr("width", d => d.y1 - d.y0 - 1)
        .attr("height", d => rectHeight(d))
        .attr("fill-opacity", 0.6)
        .attr("fill", d => {
          if (!d.depth) return "#ccc"
          if (d.data.category) return categoryColors[d.data.category] || color(d.data.name || d.data)
          // Get parent for consistent coloring
          let parent = d
          while (parent.depth > 1) parent = parent.parent
          return color(parent.data.name || parent.data)
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", d => d.children ? "pointer" : "default")
        .on("click", clicked)
        .on("mouseover", function(event, d) {
          d3.select(this).attr("fill-opacity", 0.8)
          showTooltip(event, d)
        })
        .on("mouseout", function(event, d) {
          d3.select(this).attr("fill-opacity", 0.6)
          hideTooltip()
        })
      
      const text = cell.append("text")
        .style("user-select", "none")
        .attr("pointer-events", "none")
        .attr("x", 4)
        .attr("y", 13)
        .attr("fill-opacity", d => +labelVisible(d))
        .style("font-weight", d => d.depth === 0 ? "bold" : "normal")
        .style("fill", "#fff")
      
      text.append("tspan")
        .text(d => d.data.name || d.data)
      
      const format = d3.format(",d")
      const tspan = text.append("tspan")
        .attr("fill-opacity", d => labelVisible(d) * 0.7)
        .text(d => ` ${format(d.value)}`)
      
      let focus = root
      
      // On click, change focus and transition it into view
      function clicked(event, p) {
        focus = focus === p ? p = p.parent : p
        
        root.each(d => d.target = {
          x0: (d.x0 - p.x0) / (p.x1 - p.x0) * height,
          x1: (d.x1 - p.x0) / (p.x1 - p.x0) * height,
          y0: d.y0 - p.y0,
          y1: d.y1 - p.y0
        })
        
        const t = cell.transition().duration(750)
          .attr("transform", d => `translate(${d.target.y0},${d.target.x0})`)
        
        rect.transition(t).attr("height", d => rectHeight(d.target))
        text.transition(t).attr("fill-opacity", d => +labelVisible(d.target))
        tspan.transition(t).attr("fill-opacity", d => labelVisible(d.target) * 0.7)
        
        // Add back button if not at root
        if (p.depth > 0) {
          svg.selectAll(".back-button").remove()
          svg.append("text")
            .attr("class", "back-button")
            .attr("x", 10)
            .attr("y", 20)
            .attr("fill", "#333")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .attr("cursor", "pointer")
            .text("← Back")
            .on("click", () => {
              focus = root
              root.each(d => d.target = {
                x0: d.x0,
                x1: d.x1,
                y0: d.y0,
                y1: d.y1
              })
              
              const t2 = cell.transition().duration(750)
                .attr("transform", d => `translate(${d.target.y0},${d.target.x0})`)
              
              rect.transition(t2).attr("height", d => rectHeight(d.target))
              text.transition(t2).attr("fill-opacity", d => +labelVisible(d.target))
              tspan.transition(t2).attr("fill-opacity", d => labelVisible(d.target) * 0.7)
              
              d3.select(".back-button").remove()
            })
        } else {
          svg.selectAll(".back-button").remove()
        }
      }
      
      function rectHeight(d) {
        return d.x1 - d.x0 - Math.min(1, (d.x1 - d.x0) / 2)
      }
      
      function labelVisible(d) {
        return d.y1 <= width && d.y0 >= 0 && d.x1 - d.x0 > 16
      }
      
      function showTooltip(event, d) {
        const productCount = d.children ? d.children.length : 0
        const timeDisplay = formatDuration(d.data.value)
        let tooltipText = `<strong>${d.data.name || d.data}</strong><br>Time: ${timeDisplay}<br>`
        
        if (d.depth === 0) {
          tooltipText += `${d.children ? d.children.length : 0} categories`
        } else if (d.children) {
          tooltipText += `${productCount} products`
        } else {
          tooltipText += "Individual product"
        }
        
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
        createIcicleChart()
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
          createIcicleChart()
        })
      }
    })
    
    // Watch for selected session changes
    watch(() => selectedSession.value, () => {
      if (selectedSession.value) {
        nextTick(() => {
          createIcicleChart()
        })
      }
    })
    
    // Handle window resize
    const handleResize = () => {
      if (selectedSession.value && hierarchicalData.value.children.length > 0) {
        nextTick(() => {
          createIcicleChart()
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