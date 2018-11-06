/**
 * @class SvgZoom
 * Component allows for zooming and moving of a wrapped SVG image (passed in as this.props.children).
 * Can be cofingured with 2 parameters:
 * @param {Number} maxZoom - maximum zoom ratio allowed
 * @param {Number} mouseZoomRatio - zoom ratio applied with each scroll of a mouse
 * Supported events:
 * - mouseWheel and 2 finger pinch for zooming
 * - mouseMove and touchMove for moving (only when SVG is zoomed in)
 * - doubleClick - resets SVG to its original size and position
 */

import React, { Component } from "react"
import PropTypes from "prop-types"
import * as Calc from "SvgZoom/zoomMoveCalculator"

class SvgZoom extends Component {
  constructor(props) {
    super(props)
    this.mouseZoomInRatio = this.props.mouseZoomRatio
    this.mouseZoomOutRatio = 1 / this.props.mouseZoomRatio
    this.svgElement = null
    this.draggable = false
    this.startPoint = { x: null, y: null }
    this.calculateMoveFromStart = null
    this.calculatePinchZoomRatioFromStart = null
    this.calculateCurrentTransformBoundries = null
    this.transformBoundries = {
      zoom: { min: 1, max: props.maxZoom },
      x: { min: 0, max: 0 },
      y: { min: 0, max: 0 }
    }
    this.currentTransformValues = { x: 0, y: 0, zoom: 1 }
  }

  // Helper function for calculating pinch length for touch events
  calculatePincLength = (originStartPoint, originEndPoint) => {
    return Math.hypot(
      Math.abs(originStartPoint.x - originEndPoint.x),
      Math.abs(originStartPoint.y - originEndPoint.y)
    )
  }

  // Helper function calculating pinch center for touch events
  calculatePinchCenter = (originStartPoint, originEndPoint) => {
    return {
      x: (originStartPoint.x + originEndPoint.x) / 2,
      y: (originStartPoint.y + originEndPoint.y) / 2
    }
  }

  // Helper higher order function calculating delta values for move events
  calculateMoveDelta = startPoint => curentPoint => {
    const x = curentPoint.x - startPoint.x
    const y = curentPoint.y - startPoint.y
    startPoint.x = curentPoint.x
    startPoint.y = curentPoint.y
    return { x, y }
  }

  // Helper higer order function calculating delta values for zooming with touch events
  calculatePinchZoomRatio = (originPinchLength, startPinchCenter) => currentPinchLength => {
    const zoomRatio = currentPinchLength / originPinchLength
    return {
      zoomRatio,
      x: startPinchCenter.x,
      y: startPinchCenter.y
    }
  }

  // Does the actual transformation of the SVG keeping the transform values within maximum boundries
  transformSvg = newTranformValues => {
    this.currentTransformValues = Calc.keepTransformValuesInBoundries(this.transformBoundries)(
      newTranformValues
    )
    this.svgElement.style.transform = `matrix(${this.currentTransformValues.zoom}, 0, 0, ${
      this.currentTransformValues.zoom
      }, ${this.currentTransformValues.x}, ${this.currentTransformValues.y})`
  }

  // Moves the SVG
  moovSvg = clientPoint => {
    const delta = this.calculateMoveDeltaFromStart(clientPoint)
    const transformValues = Calc.calculateCurrentTransformValues(this.currentTransformValues, {
      ...delta,
      zoomRatio: 1
    })
    this.transformSvg(transformValues)
  }

  // Zooms the SVG keeping the center point of the zoom in its original position in the viewport
  zoomSvg = (zoomRatio, clientPoint) => {
    // If zoom out of boudries than do nothing
    if (
      !Calc.isZoomInRange(zoomRatio, this.currentTransformValues.zoom, this.transformBoundries.zoom)
    ) {
      return
    }
    // Correct partial zoom ratio to keep the resulting zoom within boundries
    const zoomRatioInBoundries = Calc.calculateZoomRatioInBoundries(
      this.transformBoundries.zoom,
      this.currentTransformValues.zoom,
      zoomRatio
    )
    // Update move boundries after zoom (zoom changes values of boundries)
    this.transformBoundries = this.calculateCurrentTransformBoundries(
      zoomRatioInBoundries * this.currentTransformValues.zoom
    )
    // Calculate move delta to correct position after zoom to keep the center point of the zoom in its original position
    const delta = Calc.calculateMoveAfterZoom(
      zoomRatioInBoundries,
      this.svgElement.getBoundingClientRect(),
      clientPoint
    )
    // Calculate the final transformation values
    const transformValues = Calc.calculateCurrentTransformValues(this.currentTransformValues, delta)
    this.transformSvg(transformValues)
  }

  // Resets SVG to its original values (100% zoom)
  resetSvg = () => {
    this.currentTransformValues = { x: 0, y: 0, zoom: 1 }
    this.transformBoundries = {
      zoom: { min: 1, max: this.props.maxZoom },
      x: { min: 0, max: 0 },
      y: { min: 0, max: 0 }
    }
    this.svgElement.style.transform = `matrix(1, 0, 0, 1, 0, 0)`
  }

  // Event handlers start here
  onWheel = evt => {
    evt.preventDefault()
    const zoomRatio = evt.deltaY < 0 ? this.mouseZoomInRatio : this.mouseZoomOutRatio
    this.zoomSvg(zoomRatio, { x: evt.clientX, y: evt.clientY })
  }

  onMouseMove = evt => {
    evt.preventDefault()
    if (this.isDraggable) {
      this.moovSvg({ x: evt.clientX, y: evt.clientY })
    }
  }

  onMouseDown = evt => {
    this.isDraggable = true
    // Partially apply the calculateMoveDelta function to keep track of the starting point
    this.calculateMoveDeltaFromStart = this.calculateMoveDelta({ x: evt.clientX, y: evt.clientY })
  }

  cancelMove = evt => {
    this.isDraggable = false
  }

  onTouchMove = evt => {
    evt.preventDefault()
    const ts = evt.touches

    // if number of touches = 1 it is a move event, if more it's a pinch
    if (ts.length === 1) {
      if (this.isDraggable) {
        this.moovSvg({ x: ts[0].clientX, y: ts[0].clientY })
      }
    } else {
      const currentStartPoint = { x: ts[0].clientX, y: ts[0].clientY }
      const currentEndPoint = { x: ts[1].clientX, y: ts[1].clientY }
      const currentPinchLength = this.calculatePincLength(currentStartPoint, currentEndPoint)
      const pinchValues = this.calculatePinchZoomRatioFromStart(currentPinchLength)
      this.zoomSvg(pinchValues.zoomRatio, { x: pinchValues.x, y: pinchValues.y })
    }
  }

  onTouchStart = evt => {
    evt.preventDefault()
    const ts = evt.touches
    // if number of touches = 1 it is a move event, if more it's a pinch
    if (ts.length === 1) {
      this.isDraggable = true

      // Partially apply the calculateMoveDelta function to keep track of the starting point
      this.calculateMoveDeltaFromStart = this.calculateMoveDelta({
        x: ts[0].clientX,
        y: ts[0].clientY
      })
    } else {
      const originStartPoint = { x: ts[0].clientX, y: ts[0].clientY }
      const originEndPoint = { x: ts[1].clientX, y: ts[1].clientY }
      const originPinchLength = this.calculatePincLength(originStartPoint, originEndPoint)
      const originPinchCenter = this.calculatePinchCenter(originStartPoint, originEndPoint)

      // Partially apply the calculatePinchZoomRatio function to keep track of the starting pinch values
      this.calculatePinchZoomRatioFromStart = this.calculatePinchZoomRatio(
        originPinchLength,
        originPinchCenter
      )
    }
  }

  render() {
    return (
      <div
        id="SVGZoomManipulator"
        style={{ overflow: "hidden" }}
        onWheel={this.onWheel}
        onMouseDown={this.onMouseDown}
        onMouseMove={this.onMouseMove}
        onMouseLeave={this.cancelMove}
        onMouseUp={this.cancelMove}
        onTouchStart={this.onTouchStart}
        onTouchEnd={this.cancelMove}
        onTouchCancel={this.cancelMove}
        onDoubleClick={this.resetSvg}
      >
        {this.props.children}
      </div>
    )
  }

  componentDidMount = () => {
    this.svgElement = document.querySelector("#SVGZoomManipulator > svg")

    // Partially apply the calculateTransformBoundries to pre-load it with initial values
    this.calculateCurrentTransformBoundries = Calc.calculateTransformBoundries(
      this.svgElement.getBoundingClientRect(),
      this.props.maxZoom
    )

    // Touchmove added in a non-react way to add passive = false to enable preventDefault in Chrome
    this.svgElement.addEventListener("touchmove", this.onTouchMove, { passive: false })

    // Resize event is currently not supoorted in React
    this.svgElement.addEventListener("resize", this.resetSvg)
  }

  componentWillUnmount() {
    this.svgElement.removeEventListener("touchmove", this.onTouchMove, { passive: false })
    this.svgElement.removeEventListener("resize", this.resetSvg)
  }
}

SvgZoom.defaultProps = {
  mouseZoomRatio: 1.5,
  maxZoom: 2
}

SvgZoom.propTypes = {
  mouseZoomRatio: PropTypes.number,
  maxZoom: PropTypes.number
}

export default SvgZoom
