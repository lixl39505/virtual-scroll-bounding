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

    // 虚拟滚动计算模型
    function VirtualScrollBounding(options) {
        // params
        options = assign(
            {
                list: [], // @required 实际列表数据
                minRowHeight: 48, // @required 最小行高(px)
                minColWidth: 100, // @required 最小列宽(px)
                virtualLength: 48, // 虚拟列表长度
                clientHeight: 0, // 视口高度(px)
                adjustRowHeight: false, // 自适应行高
            },
            options
        )
        this.list = options.list
        this.minRowHeight = options.minRowHeight
        this.adjustRowHeight = options.adjustRowHeight
        this.virtualLength = options.virtualLength
        this.clientHeight = options.clientHeight
        // state
        this.scrollY = 0 // 滚动距离
        this.position = {
            init: false, //
            adjusting: false, //
            vh: 0, // virtual height
            ah: 0, // actual height
            rows: [], // actual rows
            columns: [], // actual headers
            ahs: [], // actual height array
            aws: [], // actual width array
            rowCount: 0, //
            colCount: 0, //
            top: 0, //
            left: 0, //
            topRem: 0, // distance of the first row from the top of the viewport
            leftRem: 0, // distance of the first column from the left of the viewport
            scrollY: 0, //
            scrollX: 0, //
            lastCalcScrollY: 0, // scrollY of last calculation
            lastCalcScrollX: 0, // scrollX of last calculation
            sr: 0, // start row index
            cr: 0, // current row index
            er: 0, // end row index
        }
    }

    assign(VirtualScrollBounding.prototype, {
        // 计算虚拟滚动位置
        _calc() {
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
                dt = scrollY - pos.lastCalcScrollY // 滚动增量

            // 首次计算
            if (pos.init === false) {
                pos.init = true
                pos.rowCount = list.length
                pos.vh = pos.rowCount * mh
                pos.er = Math.min(this.virtualLength - 1, pos.rowCount - 1)
                pos.rows = list.slice(pos.sr, pos.er + 1)
                pos.ahs = repeat(mh, size)
                pos.ah = sum(pos.ahs)
            }
            // 上一次的计算结果
            var ah = pos.ah,
                rowCount = pos.rowCount,
                top = pos.top,
                sr = pos.sr,
                er = pos.er,
                lastCalcScrollY = pos.lastCalcScrollY

            // 更新虚拟高度
            pos.rowCount = list.length
            // 同步滚动距离
            pos.scrollY = scrollY
            // 等比滚动
            function reCalc() {
                // console.log('before', pos.sr, pos.er)
                var extra = ah - (pos.er - pos.sr + 1) * mh
                // 还原高度
                pos.vh = pos.rowCount * mh
                pos.cr = Math.ceil((scrollY - extra) / mh)
                pos.sr = Math.max(pos.cr - Math.ceil(size / 3), 0)
                pos.er = Math.min(pos.sr + size - 1, pos.rowCount - 1)
                pos.topRem = pos.cr * mh - scrollY + extra
            }
            // 等距滚动
            function relativeCalc() {
                // console.log('before', pos.sr, pos.er)
                pos.cr = idxSumUntil(pos.ahs, scrollY - top) + sr + 1
                pos.topRem =
                    sum(pos.ahs, 0, pos.cr - pos.sr - 1) - (scrollY - top)
                pos.sr = Math.max(pos.cr - Math.ceil(size / 3), 0)
                pos.er = Math.min(pos.sr + size - 1, pos.rowCount - 1)
            }

            // 数据长度发生了变化
            if (rowCount !== pos.rowCount) {
                reCalc()
            }
            // 相对向下滚动（相对于上一次的计算位置）
            else if (dt > 0) {
                // 超过原下半部阈值
                if (dt > (ah - (lastCalcScrollY - top) - clientHeight) / 2) {
                    // 在等距计算范围内
                    if (scrollY - top <= ah) {
                        relativeCalc()
                    } else {
                        reCalc()
                    }
                }
            }
            // 相对向上滚动
            else if (dt < 0) {
                // 超过原上半部阈值
                if (dt < -(lastCalcScrollY - top) / 2) {
                    // 在等距计算范围内
                    if (scrollY - top > 0) {
                        relativeCalc()
                    } else {
                        reCalc()
                    }
                }
            }

            // 数据范围发生了改变
            if (sr !== pos.sr || er !== pos.er || rowCount !== pos.rowCount) {
                pos.lastCalcScrollY = scrollY
                pos.rows = this.list.slice(pos.sr, pos.er + 1)

                this._virtualScrollTo()
                if (this.adjustRowHeight) pos.adjusting = true
            }
            // console.timeEnd("calcposition")
        },
        // 虚拟滚动
        _virtualScrollTo() {
            var pos = this.position,
                sr = pos.sr,
                cr = pos.cr,
                scrollY = pos.scrollY

            // 虚拟偏移
            pos.top =
                sr > 0 ? scrollY - sum(pos.ahs, 0, cr - sr - 1) + pos.topRem : 0

            // 虚拟滚动距离不足
            if (pos.top < 0) {
                pos.scrollY += -pos.top
                pos.top = 0
                pos.lastCalcScrollY = pos.scrollY
            }
        },
        // 虚拟列表各行高度自适应调整
        adjust(ahs) {
            if (this.position.adjusting === false) {
                return
            }
            if (!ahs || !ahs.splice) {
                throw new Error('ahs must be array number')
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
        },
        // 触发滚动
        scrollTo(x, y) {
            // ({ top: number, left: number})
            if (typeof x === 'object') {
                y = x.top
                x = x.left
            }
            if (!isNullOrUnDef(x)) this.scrollX = x
            if (!isNullOrUnDef(y)) this.scrollY = y

            this._calc()
        },
    })

    return VirtualScrollBounding
})
