<template>
  <div class="session-visualization">
    <div class="chart-header">
      <h3>Session Visualization</h3>
      <div class="controls">
        <div v-if="selectedUser" class="user-display">
          <small>User: <strong>{{ selectedUser }}</strong></small>
        </div>
      </div>
    </div>
    
    <div class="main-content">
      <!-- Recent Sessions Sidebar -->
      <div class="sessions-sidebar">
        <h4>Recent Sessions</h4>
        <div v-if="recentSessions.length === 0" class="no-sessions">
          No sessions found for this user
        </div>
        <div v-for="(session, index) in recentSessions" :key="session.id" class="session-item">
          <div class="session-date">{{ formatDate(session.session_date) }}</div>
          <div class="session-products">
            <span v-for="product in session.products" :key="product" class="product-tag">
              {{ product }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Main Visualization Area -->
      <div ref="chartContainer" class="chart-area">
        <div v-if="processedData.nodes.length === 0" class="no-data">
          No product data available for this user
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
    }
  },
  setup(props) {
    const chartContainer = ref(null)
    
    // Process session data into nodes and links
    const processedData = computed(() => {
      const nodes = new Map()
      const links = []
      
      props.data.forEach(session => {
        const products = session.products || []
        products.forEach((product, index) => {
          if (!nodes.has(product)) {
            nodes.set(product, {
              id: product,
              name: product,
              views: 0,
              sessions: [],
              genre: ''
            })
          }
          nodes.get(product).views += (session.total_time || 60)
          nodes.get(product).sessions.push(session.id)
          
          // Create links between products in same session
          if (index > 0) {
            links.push({
              source: products[index - 1],
              target: product,
              sessionId: session.id
            })
          }
        })
      })
      
      return {
        nodes: Array.from(nodes.values()),
        links: links
      }
    })
    
    // Get recent sessions for sidebar
    const recentSessions = computed(() => {
      return props.data
        .slice()
        .sort((a, b) => new Date(b.session_date) - new Date(a.session_date))
        .slice(0, 10)
    })
    
    const initializeChart = () => {
      if (!chartContainer.value || processedData.value.nodes.length === 0) return
      
      // Clear existing chart
      d3.select(chartContainer.value).selectAll("*").remove()
      
      // Chart dimensions
      const containerWidth = chartContainer.value.clientWidth || 800
      const width = containerWidth - 300 // Account for sidebar
      const height = 600
      
      // Create color scale
      const color = d3.scaleOrdinal(d3.schemeTableau10)
      
      // Create force simulation
      const simulation = d3.forceSimulation(processedData.value.nodes)
        .force("link", d3.forceLink(processedData.value.links).id(d => d.id).distance(50))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
      
      // Create SVG
      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
      
      // Create arrow marker for links
      svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#999")
      
      // Create links
      const link = svg.append("g")
        .selectAll("line")
        .data(processedData.value.links)
        .join("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrowhead)")
      
      // Create nodes
      const node = svg.append("g")
        .selectAll("circle")
        .data(processedData.value.nodes)
        .join("circle")
        .attr("r", d => Math.min(20, 5 + d.views / 100))
        .attr("fill", (d, i) => color(i))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended))
      
      // Add labels
      const label = svg.append("g")
        .selectAll("text")
        .data(processedData.value.nodes)
        .join("text")
        .text(d => d.name)
        .style("font-size", "10px")
        .style("font-family", "sans-serif")
        .style("fill", "#333")
        .style("text-anchor", "middle")
        .style("pointer-events", "none")
      
      // Add tooltips
      node.append("title")
        .text(d => `${d.name}\nViews: ${d.views}\nSessions: ${d.sessions.length}`)
      
      // Update positions on simulation tick
      simulation.on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y)
        
        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y)
        
        label
          .attr("x", d => d.x)
          .attr("y", d => d.y - 25)
      })
    }
    
    const dragstarted = (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }
    
    const dragged = (event, d) => {
      d.fx = event.x
      d.fy = event.y
    }
    
    const dragended = (event, d) => {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return 'No date'
      return new Date(dateString).toLocaleDateString()
    }
    
    // Watch for data changes
    watch(() => processedData.value, () => {
      if (props.data.length > 0) {
        nextTick(() => {
          initializeChart()
        })
      }
    }, { immediate: true })
    
    // Handle window resize
    const handleResize = () => {
      if (processedData.value.nodes.length > 0) {
        nextTick(() => {
          initializeChart()
        })
      }
    }
    
    return {
      chartContainer,
      recentSessions,
      processedData,
      formatDate
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

.user-display {
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
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e9ecef;
}

.session-item:last-child {
  border-bottom: none;
}

.session-date {
  font-weight: bold;
  color: #495057;
  margin-bottom: 8px;
  font-size: 12px;
}

.session-products {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.product-tag {
  background: #3498db;
  color: white;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  border-radius: 4px;
}

.no-sessions, .no-data {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
  font-style: italic;
  background: #f8f9fa;
  border-radius: 8px;
}

.chart-area {
  flex: 1;
  min-height: 500px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  position: relative;
}

.chart-area svg {
  width: 100%;
  height: 100%;
}
</style>