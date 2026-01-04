<template>
  <div class="session-timeline">
      <div class="chart-header">
       <h3>Top 10 Sessions by Duration (Ranked from Highest to Lowest)</h3>
     </div>
    
    <div ref="chartContainer" class="chart-container"></div>
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
    }
  },
  setup(props) {
    const chartContainer = ref(null)
    
    const createChart = () => {
      if (!chartContainer.value || !props.data || props.data.length === 0) {
        if (chartContainer.value) {
          d3.select(chartContainer.value).selectAll("*").remove()
          d3.select(chartContainer.value)
            .append('div')
            .style('text-align', 'center')
            .style('padding', '60px')
            .style('color', '#999')
            .style('font-style', 'italic')
            .text('No session data available')
        }
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
      
      // Chart dimensions
      const containerWidth = chartContainer.value.clientWidth
      const margin = { top: 40, right: 40, bottom: 80, left: 120 }
      const width = containerWidth - margin.left - margin.right
      const height = Math.max(300, processedData.length * 35 + margin.top + margin.bottom)
      
      // Create SVG
      const svg = d3.select(chartContainer.value)
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', height)
      
      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      
      // Scales
      const maxDuration = d3.max(sortedData, d => d.duration)
      const x = d3.scaleLinear()
        .domain([0, maxDuration * 1.1]) // Add 10% padding
        .range([0, width])
      
      const y = d3.scaleBand()
        .domain(sortedData.map((d, i) => i))
        .range([0, height - margin.top - margin.bottom])
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
      
      g.append('g')
        .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
        .call(xAxis)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height - margin.top - margin.bottom) / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#666')
        .text('Session Duration')
      
      // Y axis (ranking)
      const yAxis = d3.axisLeft(y)
        .tickFormat((d, i) => {
          const session = sortedData[i]
          if (!session) return ''
          return `#${i + 1} Session ${session.session_id}`
        })
      
      g.append('g')
        .call(yAxis)
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#666')
      
      // Bars
      const bars = g.selectAll('.bar')
        .data(sortedData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('y', (d, i) => y(i))
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', d => x(d.duration))
        .attr('fill', d => colorScale(d.duration))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('opacity', 0)
        .on('mouseover', function(event, d) {
          d3.select(this)
            .style('opacity', 0.8)
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
          showTooltip(event, d)
        })
        .on('mouseout', function() {
          d3.select(this)
            .style('opacity', 1)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
          hideTooltip()
        })
      
      // Animate bars
      bars.transition()
        .duration(800)
        .delay((d, i) => i * 50)
        .style('opacity', 1)
      
      // Add ranking labels
      const rankLabels = g.selectAll('.rank-label')
        .data(sortedData)
        .enter().append('text')
        .attr('class', 'rank-label')
        .attr('x', -10)
        .attr('y', (d, i) => y(i) + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .style('text-anchor', 'end')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#666')
        .text((d, i) => `#${i + 1}`)
        .style('opacity', 0)
      
      rankLabels.transition()
        .duration(800)
        .delay((d, i) => i * 50 + 400)
        .style('opacity', 1)
      
      // Add duration labels on bars
      const labels = g.selectAll('.bar-label')
        .data(sortedData.filter(d => x(d.duration) > 40)) // Only show labels for wider bars
        .enter().append('text')
        .attr('class', 'bar-label')
        .attr('x', d => x(d.duration) + 5)
        .attr('y', (d, i) => y(i) + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .style('opacity', 0)
        .text(d => formatTime(d.duration))
      
      labels.transition()
        .duration(800)
        .delay((d, i) => i * 50 + 400)
        .style('opacity', 1)
      
      // Chart title
      svg.append('text')
        .attr('x', containerWidth / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', '#2c3e50')
        .text('Top 10 Sessions by Duration')
      
      // Tooltip functions
      const showTooltip = (event, d) => {
        hideTooltip()
        
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
        
        const sessionDateTime = formatSessionDateTime(d.date, d.hour, d.minute)
        
        const rank = sortedData.findIndex(s => s.session_id === d.session_id) + 1
        tooltip.html(`
          <strong>Rank #${rank} - Session #${d.session_id}</strong><br>
          ${sessionDateTime}<br>
          Duration: ${formatTime(d.duration)}
        `)
        
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      }
      
      const hideTooltip = () => {
        d3.selectAll('.timeline-tooltip').remove()
      }
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
  min-height: 300px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.chart-container svg {
  width: 100%;
  height: 100%;
}
</style>