<template>
  <div class="session-bar-chart">
    <div class="chart-header">
      <h3>Users Ranked by Total Sessions</h3>
    </div>
    
    <div ref="chartContainer" class="chart-container">
      <div v-if="loading" class="loading">Loading data...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="!data || data.length === 0" class="no-data">
        No session data available
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'

export default {
  name: 'SessionBarChart',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const chartContainer = ref(null)
    
    const createChart = () => {
      if (!chartContainer.value || !props.data || props.data.length === 0) {
        return
      }
      
      // Clear existing chart
      d3.select(chartContainer.value).selectAll("*").remove()
      
      // Chart dimensions
      const containerWidth = chartContainer.value.clientWidth
      const margin = { top: 20, right: 30, bottom: 60, left: 80 }
      const containerHeight = 400
      const width = containerWidth - margin.left - margin.right
      const height = containerHeight - margin.top - margin.bottom
      
      // Create SVG
      const svg = d3.select(chartContainer.value)
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight)
      
      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      
      // Scales
      const x = d3.scaleBand()
        .domain(props.data.map(d => d.user))
        .range([0, width])
        .padding(0.1)
      
      const maxSessions = d3.max(props.data, d => d.session_count)
      const yMax = maxSessions + 2
      
      const y = d3.scaleLinear()
        .domain([0, yMax])
        .range([height, 0])
      
      // X axis
      g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '12px')
      
      // Y axis
      g.append('g')
        .call(d3.axisLeft(y).ticks(yMax + 1).tickFormat(d3.format("d")))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Total Sessions')
      
      // Bars
      g.selectAll('.bar')
        .data(props.data)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.user))
        .attr('width', x.bandwidth())
        .attr('y', d => y(d.session_count))
        .attr('height', d => height - y(d.session_count))
        .attr('fill', '#4CAF50')
        .on('mouseover', function(event, d) {
          d3.select(this).attr('fill', '#45a049')
        })
        .on('mouseout', function() {
          d3.select(this).attr('fill', '#4CAF50')
        })
      
      // Value labels on bars
      g.selectAll('.bar-label')
        .data(props.data)
        .enter().append('text')
        .attr('class', 'bar-label')
        .attr('x', d => x(d.user) + x.bandwidth() / 2)
        .attr('y', d => y(d.session_count) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(d => d.session_count)
    }
    
    // Watch for data changes
    watch(() => props.data, (newData) => {
      if (newData && newData.length > 0) {
        nextTick(() => {
          createChart()
        })
      }
    }, { immediate: true })
    
    // Handle window resize
    const handleResize = () => {
      if (props.data && props.data.length > 0) {
        nextTick(() => {
          createChart()
        })
      }
    }
    
    onMounted(() => {
      window.addEventListener('resize', handleResize)
    })
    
    return {
      chartContainer
    }
  }
}
</script>

<style scoped>
.session-bar-chart {
  width: 100%;
  margin-bottom: 30px;
}

.chart-header {
  margin-bottom: 15px;
}

.chart-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.3rem;
}

.chart-container {
  width: 100%;
  height: 400px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  position: relative;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

.error {
  background-color: #fee;
  color: #c33;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #fcc;
  margin: 20px;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
  font-style: italic;
  font-size: 16px;
}

.chart-container svg {
  width: 100%;
  height: 100%;
}
</style>