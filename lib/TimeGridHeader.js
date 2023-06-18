'use strict'

var _interopRequireDefault =
  require('@babel/runtime/helpers/interopRequireDefault').default
Object.defineProperty(exports, '__esModule', {
  value: true,
})
exports.default = void 0
var _classCallCheck2 = _interopRequireDefault(
  require('@babel/runtime/helpers/classCallCheck')
)
var _createClass2 = _interopRequireDefault(
  require('@babel/runtime/helpers/createClass')
)
var _inherits2 = _interopRequireDefault(
  require('@babel/runtime/helpers/inherits')
)
var _createSuper2 = _interopRequireDefault(
  require('@babel/runtime/helpers/createSuper')
)
var _clsx = _interopRequireDefault(require('clsx'))
var _scrollbarSize = _interopRequireDefault(
  require('dom-helpers/scrollbarSize')
)
var _react = _interopRequireDefault(require('react'))
var _DateContentRow = _interopRequireDefault(require('./DateContentRow'))
var _Header = _interopRequireDefault(require('./Header'))
var _helpers = require('./utils/helpers')
var TimeGridHeader = /*#__PURE__*/ (function (_React$Component) {
  ;(0, _inherits2.default)(TimeGridHeader, _React$Component)
  var _super = (0, _createSuper2.default)(TimeGridHeader)
  function TimeGridHeader() {
    var _this
    ;(0, _classCallCheck2.default)(this, TimeGridHeader)
    for (
      var _len = arguments.length, args = new Array(_len), _key = 0;
      _key < _len;
      _key++
    ) {
      args[_key] = arguments[_key]
    }
    _this = _super.call.apply(_super, [this].concat(args))
    _this.handleHeaderClick = function (date, view, e) {
      e.preventDefault()
      ;(0, _helpers.notify)(_this.props.onDrillDown, [date, view])
    }
    _this.groupBy = function (data, key) {
      // Function to access nested object properties
      var resolvePath = function resolvePath(object, path) {
        return path.split('.').reduce(function (o, k) {
          return (o instanceof Array ? o[0] : o || {})[k]
        }, object)
      }
      return data.reduce(function (accumulator, item) {
        // Handle special case for arrays
        if (key.includes('[]')) {
          var splitKey = key.split('[]')
          var array = resolvePath(item, splitKey[0])
          if (Array.isArray(array)) {
            array.forEach(function (subItem) {
              var newKey = splitKey[1]
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
          var newKey = resolvePath(item, key)
          if (!accumulator[newKey]) {
            accumulator[newKey] = []
          }
          accumulator[newKey].push(item)
        }
        return accumulator
      }, {})
    }
    _this.renderRow = function (resource) {
      var _this$props = _this.props,
        events = _this$props.events,
        rtl = _this$props.rtl,
        selectable = _this$props.selectable,
        getNow = _this$props.getNow,
        range = _this$props.range,
        getters = _this$props.getters,
        localizer = _this$props.localizer,
        accessors = _this$props.accessors,
        components = _this$props.components,
        resizable = _this$props.resizable
      var resourceId = accessors.resourceId(resource)
      var eventsToDisplay = resource
        ? events.filter(function (event) {
            return accessors.resource(event) === resourceId
          })
        : events
      return /*#__PURE__*/ _react.default.createElement(
        _DateContentRow.default,
        {
          isAllDay: true,
          rtl: rtl,
          getNow: getNow,
          minRows: 2,
          // Add +1 to include showMore button row in the row limit
          maxRows: _this.props.allDayMaxRows + 1,
          range: range,
          events: eventsToDisplay,
          resourceId: resourceId,
          className: 'rbc-allday-cell',
          selectable: selectable,
          selected: _this.props.selected,
          components: components,
          accessors: accessors,
          getters: getters,
          localizer: localizer,
          onSelect: _this.props.onSelectEvent,
          onShowMore: _this.props.onShowMore,
          onDoubleClick: _this.props.onDoubleClickEvent,
          onKeyPress: _this.props.onKeyPressEvent,
          onSelectSlot: _this.props.onSelectSlot,
          longPressThreshold: _this.props.longPressThreshold,
          resizable: resizable,
        }
      )
    }
    return _this
  }
  ;(0, _createClass2.default)(TimeGridHeader, [
    {
      key: 'renderHeaderCells',
      value: function renderHeaderCells(range) {
        var _this2 = this
        var _this$props2 = this.props,
          localizer = _this$props2.localizer,
          getDrilldownView = _this$props2.getDrilldownView,
          getNow = _this$props2.getNow,
          dayProp = _this$props2.getters.dayProp,
          _this$props2$componen = _this$props2.components.header,
          HeaderComponent =
            _this$props2$componen === void 0
              ? _Header.default
              : _this$props2$componen
        var today = getNow()
        return range.map(function (date, i) {
          var drilldownView = getDrilldownView(date)
          var label = localizer.format(date, 'dayFormat')
          var _dayProp = dayProp(date),
            className = _dayProp.className,
            style = _dayProp.style
          var header = /*#__PURE__*/ _react.default.createElement(
            HeaderComponent,
            {
              date: date,
              label: label,
              localizer: localizer,
            }
          )
          return /*#__PURE__*/ _react.default.createElement(
            'div',
            {
              key: i,
              style: style,
              className: (0, _clsx.default)(
                'rbc-header',
                className,
                localizer.isSameDate(date, today) && 'rbc-today'
              ),
            },
            drilldownView
              ? /*#__PURE__*/ _react.default.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'rbc-button-link',
                    onClick: function onClick(e) {
                      return _this2.handleHeaderClick(date, drilldownView, e)
                    },
                  },
                  header
                )
              : /*#__PURE__*/ _react.default.createElement('span', null, header)
          )
        })
      },
    },
    {
      key: 'render',
      value: function render() {
        var _this$props3 = this.props,
          width = _this$props3.width,
          rtl = _this$props3.rtl,
          groups = _this$props3.groups,
          scrollRef = _this$props3.scrollRef,
          isOverflowing = _this$props3.isOverflowing,
          HeaderGroup = _this$props3.components.headerGroup
        var style = {}
        if (isOverflowing) {
          style[rtl ? 'marginLeft' : 'marginRight'] = ''.concat(
            (0, _scrollbarSize.default)() - 1,
            'px'
          )
        }
        return /*#__PURE__*/ _react.default.createElement(
          'div',
          {
            style: style,
            ref: scrollRef,
            className: (0, _clsx.default)(
              'rbc-time-header',
              isOverflowing && 'rbc-overflowing'
            ),
          },
          /*#__PURE__*/ _react.default.createElement('div', {
            className: 'rbc-label rbc-time-header-gutter',
            style: {
              width: width,
              minWidth: width,
              maxWidth: width,
            },
          }),
          /*#__PURE__*/ _react.default.createElement(
            'div',
            {
              className: 'rbc-time-header-content',
            },
            /*#__PURE__*/ _react.default.createElement(
              'div',
              {
                className: 'rbc-header-group',
              },
              groups.map(function (group) {
                return /*#__PURE__*/ _react.default.createElement(
                  'div',
                  {
                    key: group || 'not-set-group',
                    className: 'rbc-group-slot',
                  },
                  HeaderGroup && HeaderGroup(group),
                  !HeaderGroup &&
                    /*#__PURE__*/ _react.default.createElement(
                      'div',
                      null,
                      group || 'Not Set'
                    )
                )
              })
            )
          )
        )
      },
    },
  ])
  return TimeGridHeader
})(_react.default.Component)
var _default = TimeGridHeader
exports.default = _default
