// if the module has no dependencies, the above pattern can be simplified to
;(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory)
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory()
    } else {
        // Browser globals (root is window)
        root.VirtualScrollBounding = factory()
    }
})(typeof self !== 'undefined' ? self : this, function () {
    // 数组求和
    function sum(arr, s, e) {
        arr = arr || []
        if (s === undefined) s = 0
        if (e === undefined) e = arr.length - 1

        var r = 0

        for (var i = s; i <= e; i++) {
            r += arr[i] || 0
        }
        return r
    }
    // 创建一个重复e元素n次的数组
    function repeat(e, n) {
        if (n === undefined) n = 0
        var r = []
        for (var i = 0; i < n; i++) {
            r.push(e)
        }
        return r
    }
    // 返回累计值至少达到threshold的索引值
    function idxSumUntil(arr, threshold) {
        arr = arr || []
        if (threshold === undefined) threshold = 0

        var r = 0,
            s = 0,
            e = arr.length - 1,
            i

        for (i = s; i <= e; i++) {
            r += arr[i]
            if (r > threshold) {
                return i
            }
        }

        return i
    }
    // 空判断
    function isNullOrUnDef(v) {
        return v === null || v === undefined
    }
    // shallow extend
    var hasOwnProperty = Object.prototype.hasOwnProperty
    function assign() {
        var to = arguments[0],
            arr = Array.prototype.slice.call(arguments, 1)

        if (!to || typeof to !== 'object') {
            throw new Error(to + ' must be object')
        }

        for (var i = 0; i < arr.length; i++) {
            var from = arr[i]

            for (var k in from) {
                if (hasOwnProperty.call(from, k)) {
                    to[k] = from[k]
                }
            }
        }

        return to
    }

    // cosnts
    var EQUAL_RATIO = 1,
        EQUAL_DIFF = 2

    // 虚拟滚动计算模型
    function VirtualScrollBounding(options) {
        // props
        options = assign(
            {
                list: [], // @required 实际列表数据
                minRowHeight: 48, // @required 最小行高
                minColWidth: 100, // @required 最小列宽
                virtualLength: 36, // 虚拟列表长度
                virtualSpan: 10, // 虚拟列表跨度
                clientHeight: 0, // 视口高度
                clientWidth: 0, // 视口宽度
                virtualAdjust: false, // 适应可变行高/列宽
            },
            options
        )
        this.list = options.list
        this.minRowHeight = options.minRowHeight
        this.minColWidth = options.minColWidth
        this.virtualAdjust = options.virtualAdjust
        this.virtualLength = options.virtualLength
        this.virtualSpan = options.virtualSpan
        this.clientHeight = options.clientHeight
        // events
        this.events = {}
        // state
        this.scrollY = 0 // dom srcollY
        this.scrollX = 0 // dom scrollX
        this.position = {
            init: false, //
            adjusting: false, //
            strategy: null,
            // axis Y
            vh: 0, // virtual height
            ah: 0, // actual height
            ahs: [], // actual height array
            top: 0, // offset top
            scrollY: 0, // current scrollY
            lastCalcScrollY: 0, // scrollY of last calculation
            topRem: 0, // distance of the first row from the top of the viewport
            sr: 0, // start row index
            cr: 0, // current row index
            er: 0, // end row index
            rows: [], // actual rows
            rowCount: 0, //
            // axis X
            vw: 0, // virtual width
            aw: 0, // actual width
            aws: [], // actual width array
            left: 0, // offset left
            scrollX: 0, // current scrollX
            lastCalcScrollX: 0, // scrollX of last calculation
            leftRem: 0, // distance of the first column from the left of the viewport
            sc: 0, // start col index
            cc: 0, // current col index
            ec: 0, // end col index
            columns: [], // actual columns
            colCount: 0, //
        }
    }
    // static
    VirtualScrollBounding.EQUAL_RATIO = EQUAL_RATIO // 等比
    VirtualScrollBounding.EQUAL_DIFF = EQUAL_DIFF // 等差

    var proto = VirtualScrollBounding.prototype
    // 设置虚拟列表
    proto._setInnerList = function (sr, er, sc, ec) {
        var pos = this.position
        pos.rows = this.list.slice(sr, er + 1)

        if (this.virtualAdjust) pos.adjusting = true
        else {
            // 修正实际高度
            var len = pos.er > pos.sr ? pos.er - pos.sr + 1 : 0,
                mh = this.minRowHeight

            pos.ahs = repeat(mh, len)
            pos.ah = len * mh

            this._virtualScrollTo()
        }
    }
    // 虚拟滚动
    proto._virtualScrollTo = function () {
        var pos = this.position,
            sr = pos.sr,
            cr = pos.cr,
            scrollY = pos.scrollY,
            scrollX = pos.scrollX

        // 虚拟偏移
        pos.top = sr > 0 ? scrollY - sum(pos.ahs, 0, cr - sr - 1) + pos.topRem : 0
        // virtualScrollTop > scrollTop（虚拟>实际，在adjust场景可能会出现）
        // ps: virtualScrollTop < scrollTop 不考虑是因为最小行高的限制，只可能出现多而不会少
        if (pos.top < 0) {
            pos.scrollY += -pos.top // 反补，增加 scrollY
            pos.top = 0
            pos.lastCalcScrollY = pos.scrollY
            // 滚动条位置发生了变化
            this.emit('rescroll', { scrollY: pos.scrollY, scrollX: pos.scrollX })
        }
        // prettier-ignore
        // console.log(`rowCount: ${pos.rowCount}, cr: ${pos.cr}, sr: ${pos.sr}, er: ${pos.er}, top: ${Math.round(pos.top)}, scrollY: ${pos.scrollY}`)
        this._emitUpdate()
    }
    // 虚拟滚动参数更新事件
    proto._emitUpdate = function () {
        var pos = this.position

        this.emit('update', {
            scrollY: this.scrollY,
            scrollX: this.scrollX,
            strategy: pos.strategy,
            top: pos.top,
            left: pos.left,
            rows: pos.rows,
            columns: pos.columns,
        })
    }

    // API
    // 发射事件
    proto.emit = function () {
        var args = Array.prototype.slice.call(arguments, 0)
        var name = args.splice(0, 1)
        var list = this.events[name]

        if (list) {
            list.forEach(function (sub) {
                sub.handler.apply(sub.ctx, args)
            })

            // 移除once
            for (var i = 0; i < list.length; ) {
                if (list[i].handler.__expired__) {
                    list.splice(i, 1)
                } else {
                    i++
                }
            }
        }
    }
    // 监听事件
    proto.on = function (name, cb, ctx) {
        var sub = {
            handler: cb,
            ctx: ctx || null,
        }

        if (this.events[name]) {
            this.events[name].push(sub)
        } else {
            this.events[name] = [sub]
        }
    }
    // 移除事件
    proto.off = function (name, cb) {
        var list = this.events[name]

        if (list) {
            if (cb) {
                var index = list.findIndex(function (sub) {
                    return sub.handler == cb
                })

                if (index >= 0) {
                    list.splice(index, 1)
                }
            } else {
                list.splice(0, list.length)
            }
        }
    }
    // 更新虚拟列表
    proto._update = function (force) {
        var list = this.list,
            clientHeight = this.clientHeight,
            scrollY = this.scrollY

        if (this.position.adjusting) {
            return
        }
        if (scrollY < 0) scrollY = 0

        var pos = this.position,
            size = this.virtualLength,
            mh = this.minRowHeight,
            deltaY = scrollY - pos.lastCalcScrollY // 垂直滚动增量

        // 首次计算
        if (pos.init === false) {
            pos.init = true
            pos.rowCount = list.length
            pos.vh = pos.rowCount * mh
            pos.er = Math.min(this.virtualLength - 1, pos.rowCount - 1)
            pos.rows = list.slice(pos.sr, pos.er + 1)
            pos.ahs = repeat(mh, size)
            pos.ah = sum(pos.hs)
        }
        // 上一次的计算结果
        var ah = pos.ah,
            rowCount = pos.rowCount,
            top = pos.top,
            sr = pos.sr,
            er = pos.er,
            lastCalcScrollY = pos.lastCalcScrollY

        // 同步实际数据
        pos.rowCount = list.length
        pos.scrollY = scrollY
        // 等比滚动
        function reCalc() {
            pos.strategy = EQUAL_RATIO
            // console.log('before', pos.sr, pos.er)
            var extra = ah - (pos.er - pos.sr + 1) * mh
            // 还原高度
            pos.vh = pos.rowCount * mh
            pos.cr = Math.ceil((scrollY - extra) / mh)
            pos.sr = Math.max(pos.cr - Math.ceil(size / 3), 0)
            pos.er = Math.min(pos.sr + size - 1, pos.rowCount - 1)
            pos.topRem = pos.cr * mh - (scrollY - extra)
        }
        // 等差滚动
        function relativeCalc() {
            pos.strategy = EQUAL_DIFF
            // console.log('before', pos.sr, pos.er)
            pos.cr = idxSumUntil(pos.ahs, scrollY - top) + sr + 1
            pos.topRem = sum(pos.ahs, 0, pos.cr - pos.sr - 1) - (scrollY - top)
            pos.sr = Math.max(pos.cr - Math.ceil(size / 3), 0)
            pos.er = Math.min(pos.sr + size - 1, pos.rowCount - 1)
        }
        // prettier-ignore
        // console.log('deltaY: ', deltaY, ' >', (ah - (lastCalcScrollY - top) - clientHeight)* 0.8)

        // 数据长度发生了变化
        if (rowCount !== pos.rowCount || force) {
            reCalc() 
        }
        // 相对向下滚动（相对于上一次的计算位置）
        else if (deltaY > 0) {
            // 超过原下半部阈值
            if (deltaY > (ah - (lastCalcScrollY - top) - clientHeight) * 0.8) {
                // 在等差计算范围内
                if (scrollY - top <= ah) {
                    relativeCalc()
                } else {
                    reCalc()
                }
            }
        }
        // 相对向上滚动
        else if (deltaY < 0) {
            // 超过原上半部阈值
            if (deltaY < -(lastCalcScrollY - top) * 0.8) {
                // 在等差计算范围内
                if (scrollY - top > 0) {
                    relativeCalc()
                } else {
                    reCalc()
                }
            }
        }

        // 虚拟列表确有变化
        if (sr !== pos.sr || er !== pos.er || rowCount !== pos.rowCount || force) {
            pos.lastCalcScrollY = scrollY
            this._setInnerList(pos.sr, pos.er + 1)
        }
        // console.timeEnd("calcposition")
    }
    // 虚拟列表各行高度自适应调整
    proto.adjust = function (ahs) {
        if (this.position.adjusting === false) {
            return
        }
        if (!ahs || !ahs.splice) {
            throw new Error('ahs must be array<Number>')
        }
        // console.time("calcposition")
        // console.time("adjust")
        var pos = this.position,
            mh = this.minRowHeight

        // 实际高度补差
        pos.ahs = ahs
        pos.ah = sum(ahs)
        // 虚拟高度补差
        pos.vh = pos.rowCount * mh + pos.ah - ahs.length * mh
        //
        this._virtualScrollTo()
        // end
        pos.adjusting = false
        // console.log('after', pos.sr, pos.er)
        // console.timeEnd("adjust")
    }
    // 实际滚动
    proto.scrollTo = function (x, y) {
        // ({ top: number, left: number})
        if (typeof x === 'object') {
            y = x.top
            x = x.left
        }
        if (!isNullOrUnDef(x)) this.scrollX = x
        if (!isNullOrUnDef(y)) this.scrollY = y

        this._update()
        this._emitUpdate()
    }
    // 还原初始位置
    proto.resetVirtualPosition = function () {
        assign(this.position, {
            init: false,
            adjusting: false,
            strategy: null,
            //
            vh: 0,
            ah: 0,
            ahs: [],
            top: 0,
            scrollY: 0,
            lastCalcScrollY: 0,
            topRem: 0,
            sr: 0,
            cr: 0,
            er: this.virtualLength - 1,
            rows: [],
            rowCount: 0,
            //
            vw: 0,
            aw: 0,
            aws: [],
            left: 0,
            scrollX: 0,
            lastCalcScrollX: 0,
            leftRem: 0,
            sc: 0,
            cc: 0,
            ec: this.virtualSpan - 1,
            columns: [],
            colCount: 0,
        })
    }

    return VirtualScrollBounding
})
