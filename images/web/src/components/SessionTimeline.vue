<template>
  <div class="session-timeline">
      <div class="chart-header">
       <h3>Top 10 Sessions by Duration (Horizontal Bars)</h3>
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
      console.log('SessionTimeline: createChart called with data:', props.data?.length || 0)
      
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
      
      // Simple horizontal bar chart implementation
      console.log('SessionTimeline: Creating horizontal chart with data:', props.data?.length || 0)
      
      const containerWidth = chartContainer.value.clientWidth
      const margin = { top: 40, right: 40, bottom: 60, left: 120 }
      const width = containerWidth - margin.left - margin.right
      const height = Math.max(300, sortedData.length * 40 + margin.top + margin.bottom)
      
      const svg = d3.select(chartContainer.value)
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', height)
      
      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      
      // Create simple horizontal bars
      const maxDuration = Math.max(...sortedData.map(d => d.duration), 0)
      const x = d3.scaleLinear().domain([0, maxDuration]).range([0, width])
      
      sortedData.forEach((d, i) => {
        const barHeight = 30
        const barWidth = x(d.duration)
        
        g.append('rect')
          .attr('x', 0)
          .attr('y', i * (barHeight + 5))
          .attr('width', barWidth)
          .attr('height', barHeight)
          .attr('fill', '#1976d2')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
        
        // Add rank label
        g.append('text')
          .attr('x', -10)
          .attr('y', i * (barHeight + 5) + barHeight/2)
          .attr('text-anchor', 'end')
          .style('font-size', '12px')
          .style('fill', '#666')
          .text(`#${i + 1}`)
        
        // Add session label
        g.append('text')
          .attr('x', barWidth + 5)
          .attr('y', i * (barHeight + 5) + barHeight/2)
          .attr('text-anchor', 'start')
          .style('font-size', '11px')
          .style('fill', '#333')
          .text(`Session ${d.session_id}: ${Math.round(d.duration/60)}m`)
      })
      
      // Add x-axis
      g.append('g')
        .attr('transform', `translate(0,${height - margin.bottom + margin.top})`)
        .call(d3.axisBottom(x).tickFormat(d => {
          const minutes = Math.floor(d / 60)
          const seconds = Math.round(d % 60)
          return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
        }))
      
      // Add x-axis label
      svg.append('text')
        .attr('x', containerWidth / 2)
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#2c3e50')
        .text('Duration (minutes)')
      
      // Add title
      svg.append('text')
        .attr('x', containerWidth / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', '#2c3e50')
        .text('Top 10 Sessions by Duration')
    }
      
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
      
      // Chart dimensions (horizontal layout)
      const containerWidth = chartContainer.value.clientWidth
      const margin = { top: 40, right: 40, bottom: 80, left: 120 }
      const width = containerWidth - margin.left - margin.right
      const height = Math.max(300, sortedData.length * 60 + margin.top + margin.bottom) // Taller for horizontal bars
      
      // Create SVG
      const svg = d3.select(chartContainer.value)
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', height)
      
      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      
      // Scales (horizontal layout)
      const maxDuration = d3.max(sortedData, d => d.duration)
      const x = d3.scaleLinear()
        .domain([0, maxDuration * 1.1]) // Add 10% padding
        .range([0, width]) // Horizontal axis (duration)
      
      const y = d3.scaleBand()
        .domain(sortedData.map((d, i) => i))
        .range([0, height - margin.top - margin.bottom])
        .padding(0.1)
      
      // Color scale for duration
      const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, maxDuration])
      
      // Create gradient for horizontal bars
      const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'duration-gradient')
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0) // Horizontal gradient
        .attr('x2', 0).attr('y2', y.bandwidth()) // Vertical orientation
      
      // X axis (duration) - now horizontal axis
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
        .attr('transform', 'translate(${width/2}, ${height + 40})') // Move title below
        .attr('y', 0)
        .attr('x', 0)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#666')
        .text('Session Duration (minutes)')
      
      // Y axis (ranking) - now vertical axis for horizontal bars
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
      
      // Bars (horizontal layout)
      const bars = g.selectAll('.bar')
        .data(sortedData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', 0) // Start at y-axis
        .attr('y', (d, i) => y(i))
        .attr('height', y.bandwidth())
        .attr('width', d => {
          const width = x(d.duration)
          console.log(`Bar ${d.session_id}: width=${width}, duration=${d.duration}`)
          return width
        })
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
        .data(sortedData.filter(d => x(d.duration) > 60)) // Only show labels for wider bars
        .enter().append('text')
        .attr('class', 'bar-label')
        .attr('x', d => x(d.duration) + 5) // Position at end of horizontal bar
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
        .text('Top 10 Sessions by Duration (Horizontal)')
      
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
  min-height: 400px; /* Increased height for horizontal layout */
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.chart-container svg {
  width: 100%;
  height: 100%;
}

.bar {
  min-height: 20px; /* Ensure bars are visible even with small values */
}
</style>