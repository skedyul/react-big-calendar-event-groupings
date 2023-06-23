import React, { Component, createRef } from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'
import * as animationFrame from 'dom-helpers/animationFrame'
import memoize from 'memoize-one'

import DayColumn from './DayColumn'
import TimeGutter from './TimeGutter'
import PopOverlay from './PopOverlay'

import getWidth from 'dom-helpers/width'
import getPosition from 'dom-helpers/position'
import { views } from './utils/constants'
import { inRange, sortEvents } from './utils/eventLevels'
import { notify } from './utils/helpers'
import Resources from './utils/Resources'
import { DayLayoutAlgorithmPropType } from './utils/propTypes'

export default class TimeGrid extends Component {
  constructor(props) {
    super(props)

    this.state = { gutterWidth: undefined, isOverflowing: null }

    this.scrollRef = React.createRef()
    this.contentRef = React.createRef()
    this.containerRef = React.createRef()
    this._scrollRatio = null
    this.gutterRef = createRef()
  }

  getSnapshotBeforeUpdate() {
    this.checkOverflow()
    return null
  }

  componentDidMount() {
    if (this.props.width == null) {
      this.measureGutter()
    }

    this.calculateScroll()
    this.applyScroll()

    window.addEventListener('resize', this.handleResize)
  }

  handleScroll = (e) => {
    if (this.scrollRef.current) {
      this.scrollRef.current.scrollLeft = e.target.scrollLeft
    }
  }

  handleResize = () => {
    animationFrame.cancel(this.rafHandle)
    this.rafHandle = animationFrame.request(this.checkOverflow)
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize)

    animationFrame.cancel(this.rafHandle)

    if (this.measureGutterAnimationFrameRequest) {
      window.cancelAnimationFrame(this.measureGutterAnimationFrameRequest)
    }
  }

  componentDidUpdate() {
    this.applyScroll()
  }

  handleKeyPressEvent = (...args) => {
    this.clearSelection()
    notify(this.props.onKeyPressEvent, args)
  }

  handleSelectEvent = (...args) => {
    //cancel any pending selections so only the event click goes through.
    this.clearSelection()
    notify(this.props.onSelectEvent, args)
  }

  handleDoubleClickEvent = (...args) => {
    this.clearSelection()
    notify(this.props.onDoubleClickEvent, args)
  }

  handleShowMore = (events, date, cell, slot, target) => {
    const {
      popup,
      onDrillDown,
      onShowMore,
      getDrilldownView,
      doShowMoreDrillDown,
    } = this.props
    this.clearSelection()

    if (popup) {
      let position = getPosition(cell, this.containerRef.current)

      this.setState({
        overlay: {
          date,
          events,
          position: { ...position, width: '200px' },
          target,
        },
      })
    } else if (doShowMoreDrillDown) {
      notify(onDrillDown, [date, getDrilldownView(date) || views.DAY])
    }

    notify(onShowMore, [events, date, slot])
  }

  handleSelectAllDaySlot = (slots, slotInfo) => {
    const { onSelectSlot } = this.props

    const start = new Date(slots[0])
    const end = new Date(slots[slots.length - 1])
    end.setDate(slots[slots.length - 1].getDate() + 1)

    notify(onSelectSlot, {
      slots,
      start,
      end,
      action: slotInfo.action,
      resourceId: slotInfo.resourceId,
    })
  }

  groupBy = (data, key) => {
    // Function to access nested object properties
    const resolvePath = (object, path) =>
      path
        .split('.')
        .reduce((o, k) => (o instanceof Array ? o[0] : o || {})[k], object)

    return data.reduce((accumulator, item) => {
      // Handle special case for arrays
      if (key.includes('[]')) {
        const splitKey = key.split('[]')
        const array = resolvePath(item, splitKey[0])

        if (Array.isArray(array)) {
          array.forEach((subItem) => {
            const newKey = splitKey[1]
              ? resolvePath(subItem, splitKey[1])
              : subItem.id

            if (!accumulator[newKey]) {
              accumulator[newKey || undefined] = []
            }
            accumulator[newKey || undefined].push(item)
          })
        }
      } else {
        // Handle normal case
        const newKey = resolvePath(item, key)

        if (!accumulator[newKey]) {
          accumulator[newKey || undefined] = []
        }
        accumulator[newKey || undefined].push(item)
      }

      return accumulator
    }, {})
  }

  renderEvents(range, events, backgroundEvents, now, groupKey, groups) {
    let { min, max, components, accessors, localizer, dayLayoutAlgorithm } =
      this.props

    const resources = this.memoizedResources(this.props.resources, accessors)
    const groupedEvents = resources.groupEvents(events)
    const groupedBackgroundEvents = resources.groupEvents(backgroundEvents)

    return resources.map(([id, resource], i) =>
      range.map((date, jj) => {
        let daysEvents = (groupedEvents.get(id) || []).filter((event) =>
          localizer.inRange(
            date,
            accessors.start(event),
            accessors.end(event),
            'day'
          )
        )

        let daysBackgroundEvents = (
          groupedBackgroundEvents.get(id) || []
        ).filter((event) =>
          localizer.inRange(
            date,
            accessors.start(event),
            accessors.end(event),
            'day'
          )
        )
        const result = this.groupBy(daysEvents, groupKey)

        return groups.map((group) => {
          return (
            <div className="rbc-group-content">
              <div className="rbc-custom-header-gutter">
                {components.headerGroup(group)}
              </div>
              <DayColumn
                {...this.props}
                localizer={localizer}
                min={localizer.merge(date, min)}
                max={localizer.merge(date, max)}
                resource={resource && id}
                components={components}
                isNow={localizer.isSameDate(date, now)}
                key={i + '-' + jj + '-' + (group?.id || 'undefined')}
                date={date}
                events={result[group?.id || 'undefined'] || []}
                backgroundEvents={groupKey ? [] : daysBackgroundEvents}
                dayLayoutAlgorithm={dayLayoutAlgorithm}
              />
            </div>
          )
        })
      })
    )
  }

  render() {
    let {
      events,
      backgroundEvents,
      range,
      getNow,
      resources,
      components,
      accessors,
      getters,
      localizer,
      min,
      max,
      showMultiDayTimes,
      groupKey,
      groups,
    } = this.props

    let start = range[0],
      end = range[range.length - 1]

    this.slots = range.length

    let allDayEvents = [],
      rangeEvents = [],
      rangeBackgroundEvents = []

    events.forEach((event) => {
      if (inRange(event, start, end, accessors, localizer)) {
        let eStart = accessors.start(event),
          eEnd = accessors.end(event)

        if (
          accessors.allDay(event) ||
          localizer.startAndEndAreDateOnly(eStart, eEnd) ||
          (!showMultiDayTimes && !localizer.isSameDate(eStart, eEnd))
        ) {
          allDayEvents.push(event)
        } else {
          rangeEvents.push(event)
        }
      }
    })

    backgroundEvents.forEach((event) => {
      if (inRange(event, start, end, accessors, localizer)) {
        rangeBackgroundEvents.push(event)
      }
    })

    allDayEvents.sort((a, b) => sortEvents(a, b, accessors, localizer))

    return (
      <div
        className={clsx(
          'rbc-time-view',
          resources && 'rbc-time-view-resources'
        )}
        ref={this.containerRef}
      >
        {this.props.popup && this.renderOverlay()}
        <div
          ref={this.contentRef}
          className="rbc-time-content"
          onScroll={this.handleScroll}
        >
          <TimeGutter
            date={start}
            ref={this.gutterRef}
            localizer={localizer}
            min={localizer.merge(start, min)}
            max={localizer.merge(start, max)}
            step={this.props.step}
            getNow={this.props.getNow}
            timeslots={this.props.timeslots}
            components={components}
            className="rbc-time-gutter"
            getters={getters}
          />
          {this.renderEvents(
            range,
            rangeEvents,
            rangeBackgroundEvents,
            getNow(),
            groupKey,
            groups
          )}
        </div>
      </div>
    )
  }

  renderOverlay() {
    let overlay = this.state?.overlay ?? {}
    let {
      accessors,
      localizer,
      components,
      getters,
      selected,
      popupOffset,
      handleDragStart,
    } = this.props

    const onHide = () => this.setState({ overlay: null })

    return (
      <PopOverlay
        overlay={overlay}
        accessors={accessors}
        localizer={localizer}
        components={components}
        getters={getters}
        selected={selected}
        popupOffset={popupOffset}
        ref={this.containerRef}
        handleKeyPressEvent={this.handleKeyPressEvent}
        handleSelectEvent={this.handleSelectEvent}
        handleDoubleClickEvent={this.handleDoubleClickEvent}
        handleDragStart={handleDragStart}
        show={!!overlay.position}
        overlayDisplay={this.overlayDisplay}
        onHide={onHide}
      />
    )
  }

  overlayDisplay = () => {
    this.setState({
      overlay: null,
    })
  }

  clearSelection() {
    clearTimeout(this._selectTimer)
    this._pendingSelection = []
  }

  measureGutter() {
    if (this.measureGutterAnimationFrameRequest) {
      window.cancelAnimationFrame(this.measureGutterAnimationFrameRequest)
    }
    this.measureGutterAnimationFrameRequest = window.requestAnimationFrame(
      () => {
        const width = this.gutterRef?.current
          ? getWidth(this.gutterRef.current)
          : undefined

        if (width && this.state.gutterWidth !== width) {
          this.setState({ gutterWidth: width })
        }
      }
    )
  }

  applyScroll() {
    // If auto-scroll is disabled, we don't actually apply the scroll
    if (this._scrollRatio != null && this.props.enableAutoScroll === true) {
      const content = this.contentRef.current
      content.scrollTop = content.scrollHeight * this._scrollRatio
      // Only do this once
      this._scrollRatio = null
    }
  }

  calculateScroll(props = this.props) {
    const { min, max, scrollToTime, localizer } = props

    const diffMillis = localizer.diff(
      localizer.merge(scrollToTime, min),
      scrollToTime,
      'milliseconds'
    )
    const totalMillis = localizer.diff(min, max, 'milliseconds')

    this._scrollRatio = diffMillis / totalMillis
  }

  checkOverflow = () => {
    if (this._updatingOverflow) return

    const content = this.contentRef.current
    let isOverflowing = content.scrollHeight > content.clientHeight

    if (this.state.isOverflowing !== isOverflowing) {
      this._updatingOverflow = true
      this.setState({ isOverflowing }, () => {
        this._updatingOverflow = false
      })
    }
  }

  memoizedResources = memoize((resources, accessors) =>
    Resources(resources, accessors)
  )
}

TimeGrid.propTypes = {
  events: PropTypes.array.isRequired,
  backgroundEvents: PropTypes.array.isRequired,
  resources: PropTypes.array,

  step: PropTypes.number,
  timeslots: PropTypes.number,
  range: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  min: PropTypes.instanceOf(Date).isRequired,
  max: PropTypes.instanceOf(Date).isRequired,
  getNow: PropTypes.func.isRequired,

  scrollToTime: PropTypes.instanceOf(Date).isRequired,
  enableAutoScroll: PropTypes.bool,
  showMultiDayTimes: PropTypes.bool,

  rtl: PropTypes.bool,
  resizable: PropTypes.bool,
  width: PropTypes.number,

  accessors: PropTypes.object.isRequired,
  components: PropTypes.object.isRequired,
  getters: PropTypes.object.isRequired,
  localizer: PropTypes.object.isRequired,

  allDayMaxRows: PropTypes.number,

  selected: PropTypes.object,
  selectable: PropTypes.oneOf([true, false, 'ignoreEvents']),
  longPressThreshold: PropTypes.number,

  onNavigate: PropTypes.func,
  onSelectSlot: PropTypes.func,
  onSelectEnd: PropTypes.func,
  onSelectStart: PropTypes.func,
  onSelectEvent: PropTypes.func,
  onShowMore: PropTypes.func,
  onDoubleClickEvent: PropTypes.func,
  onKeyPressEvent: PropTypes.func,
  onDrillDown: PropTypes.func,
  getDrilldownView: PropTypes.func.isRequired,

  dayLayoutAlgorithm: DayLayoutAlgorithmPropType,

  showAllEvents: PropTypes.bool,
  doShowMoreDrillDown: PropTypes.bool,

  popup: PropTypes.bool,
  handleDragStart: PropTypes.func,

  popupOffset: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    }),
  ]),
}

TimeGrid.defaultProps = {
  step: 30,
  timeslots: 2,
}
