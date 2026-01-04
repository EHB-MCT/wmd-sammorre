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
 import { formatTime } from '../utils/timeFormat.js'
 
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
       
       // Simple horizontal bar chart
       const containerWidth = chartContainer.value.clientWidth
       const margin = { top: 40, right: 40, bottom: 60, left: 120 }
       const width = containerWidth - margin.left - margin.right
       const height = Math.max(300, props.data.length * 40 + margin.top + margin.bottom)
       
       const svg = d3.select(chartContainer.value)
         .append('svg')
         .attr('width', containerWidth)
         .attr('height', height)
       
       const g = svg.append('g')
         .attr('transform', `translate(${margin.left},${margin.top})`)
       
       // Create simple horizontal bars
       const maxDuration = Math.max(...props.data.map(d => d.duration_seconds || 0), 0)
       const x = d3.scaleLinear().domain([0, maxDuration * 1.1]).range([0, width])
       
       props.data.forEach((d, i) => {
         const barWidth = x(d.duration_seconds || 0)
         const barHeight = 30
         
         g.append('rect')
           .attr('x', 0)
           .attr('y', i * (barHeight + 5))
           .attr('height', barHeight)
           .attr('width', barWidth)
           .attr('fill', '#1976d2')
           .attr('stroke', '#fff')
           .attr('stroke-width', 1)
         
         // Add rank label
         g.append('text')
           .attr('x', -10)
           .attr('y', i * (barHeight + 5) + barHeight/2)
           .attr('text-anchor', 'end')
           .attr('dy', '0.35em')
           .style('font-size', '12px')
           .style('font-weight', 'bold')
           .style('fill', '#666')
           .text(`#${i + 1}`)
         
         // Add duration label
         if (barWidth > 60) {
           g.append('text')
             .attr('x', barWidth + 5)
             .attr('y', i * (barHeight + 5) + barHeight/2)
             .attr('text-anchor', 'start')
             .style('font-size', '11px')
             .style('fill', '#333')
             .text(`${Math.round((d.duration_seconds || 0) / 60)}m`)
         }
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
     
     // Watch for data changes
     watch(() => props.data, (newData) => {
       nextTick(() => {
         createChart()
       })
     }, { immediate: true })
     
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
   min-height: 400px;
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