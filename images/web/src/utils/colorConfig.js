// Genre color configuration - easily modifiable
export const genreColors = {
  'Electronics': '#1f77b4',
  'Clothing': '#ff7f0e', 
  'Books': '#2ca02c',
  'Home': '#d62728',
  'Sports': '#9467bd',
  'Toys': '#8c564b',
  'Food': '#e377c2',
  'Beauty': '#7f7f7f',
  'Automotive': '#bcbd22',
  'Health': '#17becf',
  'Furniture': '#aec7e8',
  'Garden': '#ffbb78',
  'Pet': '#98df8a',
  'Office': '#ff9896',
  'Tools': '#c5b0d5'
}

// Default color for unknown genres
export const defaultGenreColor = '#cccccc'

// Get color for a genre, fallback to default if not found
export const getGenreColor = (genre) => {
  return genreColors[genre] || defaultGenreColor
}

// Add or update a genre color
export const setGenreColor = (genre, color) => {
  genreColors[genre] = color
}

// Get all genre colors as an object (for easy modification)
export const getAllGenreColors = () => {
  return { ...genreColors }
}

// Update multiple genre colors at once
export const updateGenreColors = (colorUpdates) => {
  Object.assign(genreColors, colorUpdates)
}