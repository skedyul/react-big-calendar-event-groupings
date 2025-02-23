import PropTypes from 'prop-types'
import clsx from 'clsx'
import scrollbarSize from 'dom-helpers/scrollbarSize'
import React from 'react'

import DateContentRow from './DateContentRow'
import Header from './Header'
import { notify } from './utils/helpers'

class TimeGridHeader extends React.Component {
  handleHeaderClick = (date, view, e) => {
    e.preventDefault()
    notify(this.props.onDrillDown, [date, view])
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
              accumulator[newKey] = []
            }
            accumulator[newKey].push(item)
          })
        }
      } else {
        // Handle normal case
        const newKey = resolvePath(item, key)
        if (!accumulator[newKey]) {
          accumulator[newKey] = []
        }
        accumulator[newKey].push(item)
      }

      return accumulator
    }, {})
  }

  renderHeaderCells(range) {
    let {
      localizer,
      getDrilldownView,
      getNow,
      getters: { dayProp },
      components: { header: HeaderComponent = Header },
    } = this.props

    const today = getNow()

    return range.map((date, i) => {
      let drilldownView = getDrilldownView(date)
      let label = localizer.format(date, 'dayFormat')

      const { className, style } = dayProp(date)

      let header = (
        <HeaderComponent date={date} label={label} localizer={localizer} />
      )

      return (
        <div
          key={i}
          style={style}
          className={clsx(
            'rbc-header',
            className,
            localizer.isSameDate(date, today) && 'rbc-today'
          )}
        >
          {drilldownView ? (
            <button
              type="button"
              className="rbc-button-link"
              onClick={(e) => this.handleHeaderClick(date, drilldownView, e)}
            >
              {header}
            </button>
          ) : (
            <span>{header}</span>
          )}
        </div>
      )
    })
  }
  renderRow = (resource) => {
    let {
      events,
      rtl,
      selectable,
      getNow,
      range,
      getters,
      localizer,
      accessors,
      components,
      resizable,
    } = this.props

    const resourceId = accessors.resourceId(resource)
    let eventsToDisplay = resource
      ? events.filter((event) => accessors.resource(event) === resourceId)
      : events

    return (
      <DateContentRow
        isAllDay
        rtl={rtl}
        getNow={getNow}
        minRows={2}
        // Add +1 to include showMore button row in the row limit
        maxRows={this.props.allDayMaxRows + 1}
        range={range}
        events={eventsToDisplay}
        resourceId={resourceId}
        className="rbc-allday-cell"
        selectable={selectable}
        selected={this.props.selected}
        components={components}
        accessors={accessors}
        getters={getters}
        localizer={localizer}
        onSelect={this.props.onSelectEvent}
        onShowMore={this.props.onShowMore}
        onDoubleClick={this.props.onDoubleClickEvent}
        onKeyPress={this.props.onKeyPressEvent}
        onSelectSlot={this.props.onSelectSlot}
        longPressThreshold={this.props.longPressThreshold}
        resizable={resizable}
      />
    )
  }

  render() {
    let {
      width,
      rtl,
      groups,
      scrollRef,
      isOverflowing,
      components: { headerGroup: HeaderGroup },
    } = this.props

    let style = {}
    if (isOverflowing) {
      style[rtl ? 'marginLeft' : 'marginRight'] = `${scrollbarSize() - 1}px`
    }

    return (
      <div
        style={style}
        ref={scrollRef}
        className={clsx('rbc-time-header', isOverflowing && 'rbc-overflowing')}
      >
        <div
          className="rbc-label rbc-time-header-gutter"
          style={{ width, minWidth: width, maxWidth: width }}
        ></div>

        <div className="rbc-time-header-content">
          <div className="rbc-header-group">
            {groups.map((group) => (
              <div
                key={group?.id || 'not-set-group'}
                className="rbc-group-slot"
              >
                {HeaderGroup && HeaderGroup(group)}
                {!HeaderGroup && <div>{group?.id || 'Not Set'}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
}

TimeGridHeader.propTypes = {
  range: PropTypes.array.isRequired,
  events: PropTypes.array.isRequired,
  resources: PropTypes.object,
  getNow: PropTypes.func.isRequired,
  isOverflowing: PropTypes.bool,

  rtl: PropTypes.bool,
  resizable: PropTypes.bool,
  width: PropTypes.number,

  localizer: PropTypes.object.isRequired,
  accessors: PropTypes.object.isRequired,
  components: PropTypes.object.isRequired,
  getters: PropTypes.object.isRequired,

  selected: PropTypes.object,
  selectable: PropTypes.oneOf([true, false, 'ignoreEvents']),
  longPressThreshold: PropTypes.number,

  allDayMaxRows: PropTypes.number,

  onSelectSlot: PropTypes.func,
  onSelectEvent: PropTypes.func,
  onDoubleClickEvent: PropTypes.func,
  onKeyPressEvent: PropTypes.func,
  onDrillDown: PropTypes.func,
  onShowMore: PropTypes.func,
  getDrilldownView: PropTypes.func.isRequired,
  scrollRef: PropTypes.any,
  groupKey: PropTypes.string,
}

export default TimeGridHeader
