<template>
  <div id="app">
    <div class="container">
      <div class="header">
        <h1>WMD Data Visualization</h1>
        <p>Interactive data visualization powered by Vue.js and D3.js</p>
      </div>
      
      <div class="visualization-container">
        <h2>Sample Data Visualization</h2>
        <div class="chart" ref="chartContainer">
          <div v-if="loading" class="loading">Loading data...</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else>Chart will be rendered here</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import * as d3 from 'd3'

export default {
  name: 'App',
  setup() {
    const chartContainer = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const data = ref(null)

    const fetchData = async () => {
      try {
        console.log('🔄 Starting data fetch...')
        loading.value = true
        
        console.log('Making API request to /api/user-sessions')
        const response = await axios.get('/api/user-sessions')
        
        console.log('✅ API Response received:', response.data)
        console.log('Users count:', response.data.data?.length || 0)
        console.log('Success status:', response.data.success)
        
        data.value = response.data
      } catch (err) {
        console.error('❌ API Error:', err)
        console.error('Error details:', err.message)
        console.error('Failed URL:', err.config?.url)
        error.value = 'Failed to fetch data: ' + err.message
      } finally {
        loading.value = false
        console.log('Data fetch completed, loading set to false')
      }
    }

    const createChart = () => {
      if (!data.value || !chartContainer.value) {
        console.log('⚠️ Cannot create chart - missing data or container')
        return
      }
      
      console.log('Creating D3.js bar chart...')
      console.log('Chart container:', chartContainer.value)
      console.log('Data for chart:', data.value)
      
      if (!data.value.data || data.value.data.length === 0) {
        console.log('⚠️ No session data available for visualization')
        chartContainer.value.innerHTML = '<div>No session data available</div>'
        return
      }
      
      console.log('Users with sessions:', data.value.data.length)
      data.value.data.forEach((item, index) => {
        console.log(`User ${index + 1}:`, {
          name: item.user,
          sessions: item.session_count
        })
      })
      
      // Clear any existing chart
      d3.select(chartContainer.value).selectAll("*").remove()
      
      // Chart dimensions
      const margin = { top: 20, right: 30, bottom: 60, left: 80 }
      const containerWidth = chartContainer.value.clientWidth
      const containerHeight = 400
      const width = containerWidth - margin.left - margin.right
      const height = containerHeight - margin.top - margin.bottom
      
      console.log('📐 Chart dimensions:', { width, height })
      
      // Create SVG
      const svg = d3.select(chartContainer.value)
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight)
      
      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      
      // Scales
      const x = d3.scaleBand()
        .domain(data.value.data.map(d => d.user))
        .range([0, width])
        .padding(0.1)
      
      const maxSessions = d3.max(data.value.data, d => d.session_count)
      const yMax = maxSessions + 2
      
      const y = d3.scaleLinear()
        .domain([0, yMax])
        .range([height, 0])
      
      console.log('📏 X scale domain:', data.value.data.map(d => d.user))
      console.log('📏 Y scale domain:', [0, yMax], '(max sessions + 2)')
      
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
        .data(data.value.data)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.user))
        .attr('width', x.bandwidth())
        .attr('y', d => y(d.session_count))
        .attr('height', d => height - y(d.session_count))
        .attr('fill', '#4CAF50')
        .on('mouseover', function(event, d) {
          d3.select(this).attr('fill', '#45a049')
          console.log('🖱️ Hover over:', { user: d.user, sessions: d.session_count })
        })
        .on('mouseout', function() {
          d3.select(this).attr('fill', '#4CAF50')
        })
      
      // Value labels on bars
      g.selectAll('.bar-label')
        .data(data.value.data)
        .enter().append('text')
        .attr('class', 'bar-label')
        .attr('x', d => x(d.user) + x.bandwidth() / 2)
        .attr('y', d => y(d.session_count) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(d => d.session_count)
      
      // Chart title
      svg.append('text')
        .attr('x', containerWidth / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text('Users Ranked by Total Sessions')
      
      console.log('✅ D3.js bar chart created successfully')
    }

    onMounted(async () => {
      console.log('App mounted - initializing...')
      console.log('Chart container ref:', chartContainer)
      
      await fetchData()
      createChart()
      
      console.log('✅ App initialization complete')
    })

    return {
      chartContainer,
      loading,
      error
    }
  }
}
</script>