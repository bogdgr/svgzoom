// Helper function for updating maximum move values (used after zooming SVG)
export const calculateTransformBoundries = (initialSize, maxZoom) => currentZoom => {
  const deltaX = (initialSize.width * currentZoom - initialSize.width) / 2
  const deltaY = (initialSize.height * currentZoom - initialSize.height) / 2
  return {
    zoom: { min: 1, max: maxZoom },
    x: { min: -deltaX, max: deltaX },
    y: { min: -deltaY, max: deltaY }
  }
}

// Helper functions checking if zoom operation should be performed for these parameters
export const isZoomInRange = (zoomRatio, currentZoom, zoomBoundries) => {
  if (zoomRatio > 1) {
    return currentZoom < zoomBoundries.max
  } else if (zoomRatio < 1) {
    return currentZoom > zoomBoundries.min
  }
  if (zoomRatio === 1) return true
}

// Helper function ensuring that SVG stays within boundries
export const keepTransformValuesInBoundries = boundries => transformValues => {
  return {
    x: Math.min(Math.max(transformValues.x, boundries.x.min), boundries.x.max),
    y: Math.min(Math.max(transformValues.y, boundries.y.min), boundries.y.max),
    zoom: Math.min(Math.max(transformValues.zoom, boundries.zoom.min), boundries.zoom.max)
  }
}

// Helper function calculating the resulting transform values based on current values and delta
export const calculateCurrentTransformValues = (currentValues, delta) => {
  return {
    x: currentValues.x + delta.x,
    y: currentValues.y + delta.y,
    zoom: currentValues.zoom * delta.zoomRatio
  }
}

// Helper function calculating move values after zoom to keep the center point of the zoom in it's original position
export const calculateMoveAfterZoom = (zoomRatio, boundingRect, clientPoint) => {
  const centerPoint = {
    x: boundingRect.left + boundingRect.width / 2,
    y: boundingRect.top + boundingRect.height / 2
  }

  const oldDistanceX = clientPoint.x - centerPoint.x
  const oldDistanceY = clientPoint.y - centerPoint.y
  const x = oldDistanceX - oldDistanceX * zoomRatio
  const y = oldDistanceY - oldDistanceY * zoomRatio
  return { x, y, zoomRatio }
}

// Helper function calculating partial zoom ratio to keep the resulting zoom within boundries
export const calculateZoomRatioInBoundries = (zoomBoundries, currentZoom, zoomRatio) => {
  const maxZoomRatio = zoomBoundries.max / currentZoom
  const minZoomRatio = zoomBoundries.min / currentZoom
  return Math.min(Math.max(minZoomRatio, zoomRatio), maxZoomRatio)
}
