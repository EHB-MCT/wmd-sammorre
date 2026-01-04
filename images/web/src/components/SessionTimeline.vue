<template>
  <div class="session-timeline">
    <div class="chart-header">
      <h3>Top 10 Sessions by Duration</h3>
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
import { formatTime, formatSessionDateTime } from '../utils/timeFormat.js'

export default {
  name: 'SessionTimeline',
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
      
      // Process data
      const processedData = props.data.map(session => ({
        ...session,
        duration: session.duration_seconds || 0,
        dateObj: new Date(`${session.date} ${session.hour}:${session.minute}:00`)
      })).filter(session => session.duration >= 0) // Include all sessions, even 0 duration
      
      // Sort by duration (highest to lowest) and limit to top 10
      const sortedData = processedData.sort((a, b) => b.duration - a.duration).slice(0, 10)
      
      if (sortedData.length === 0) {
        d3.select(chartContainer.value)
          .append('div')
          .style('text-align', 'center')
          .style('padding', '60px')
          .style('color', '#999')
          .style('font-style', 'italic')
          .text('No session data available')
        return
      }
      
      // Chart dimensions - match SessionBarChart style
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
      const maxDuration = d3.max(sortedData, d => d.duration)
      const x = d3.scaleLinear()
        .domain([0, maxDuration * 1.1]) // Add 10% padding
        .range([0, width])
      
      const y = d3.scaleBand()
        .domain(sortedData.map((d, i) => `#${i + 1} ${d.session_id || `Session ${i + 1}`}`))
        .range([0, height])
        .padding(0.1)
      
      // Color scale for duration
      const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, maxDuration])
      
      // Create gradient for bars
      const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'duration-gradient')
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', width).attr('y2', 0)
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#e3f2fd')
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#1976d2')
      
      // X axis (duration)
      const xAxis = d3.axisBottom(x)
        .tickFormat(d => {
          if (d === 0) return '0m'
          const minutes = Math.floor(d / 60)
          const seconds = Math.round(d % 60)
          return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
        })
      
      // X axis (duration) - format as minutes
      g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => {
          const minutes = Math.floor(d / 60)
          return `${minutes}m`
        }))
        .selectAll('text')
        .style('font-size', '12px')
      
      // X axis label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#666')
        .text('Duration (minutes)')
      
      // Y axis (session ranking)
      g.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#666')
      
      // Bars - horizontal orientation like SessionBarChart
      g.selectAll('.bar')
        .data(sortedData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('y', (d, i) => y(`#${i + 1} ${d.session_id || `Session ${i + 1}`}`))
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', d => x(d.duration))
        .attr('fill', d => colorScale(d.duration))
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('fill', '#1976d2')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('fill', d => colorScale(d.duration))
            .attr('stroke', 'none')
            .attr('stroke-width', 0)
        })
      
      // Duration labels on bars - similar to SessionBarChart
      g.selectAll('.bar-label')
        .data(sortedData.filter(d => x(d.duration) > 50)) // Only show labels for wider bars
        .enter().append('text')
        .attr('class', 'bar-label')
        .attr('x', d => x(d.duration) + 5)
        .attr('y', (d, i) => y(`#${i + 1} ${d.session_id || `Session ${i + 1}`}`) + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(d => `${Math.round(d.duration / 60)}m`)
      
      // Add tooltips
      const tooltip = d3.select('body').append('div')
        .attr('class', 'timeline-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0,0,0,0.8)')
        .style('color', 'white')
        .style('padding', '8px 12px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '9999')
        .style('opacity', 0)
      
      g.selectAll('.bar')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('fill', '#1976d2')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
          
          tooltip
            .style('opacity', 1)
            .html(`
              <strong>Session ${d.session_id || 'N/A'}</strong><br>
              Date: ${d.date || 'N/A'}<br>
              Duration: ${formatTime(d.duration)}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('fill', d => colorScale(d.duration))
            .attr('stroke', 'none')
            .attr('stroke-width', 0)
          
          tooltip.style('opacity', 0)
        })
    }
    
    // Watch for data changes
    watch(() => props.data, (newData) => {
      nextTick(() => {
        createChart()
      })
    }, { immediate: true })
    
    // Handle window resize
    const handleResize = () => {
      nextTick(() => {
        createChart()
      })
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
.session-timeline {
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