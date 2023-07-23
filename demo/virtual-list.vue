<template>
    <div @scroll="onScroll">
        <div ref="outer">
            <div ref="inner">
                <slot :innerList="virtualPosition.innerList"></slot>
            </div>
        </div>
    </div>
</template>

<script>
import { debounce, throttle } from '../../utils/assist'

// 数组求和
function sum(arr = [], s = 0, e = arr.length - 1) {
    var r = 0

    for (var i = s; i <= e; i++) {
        r += arr[i] || 0
    }
    return r
}
// 重复e元素n次
function repeat(e, n = 0) {
    var r = []
    for (var i = 0; i < n; i++) {
        r.push(e)
    }
    return r
}
// 返回累计值至少达到threshold的索引值
function idxSumUntil(arr = [], threshold = 0) {
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

// 虚拟滚动列表
export default {
    name: 'VirtualList',
    provide() {
        return {
            virtualList: this,
        }
    },
    props: {
        // 最小行高
        minRowHeight: {
            type: Number,
            default: 48,
        },
        // 自适应行高度
        virtualAdjust: {
            type: Boolean,
            default: false,
        },
        // 虚拟滚动长度
        virtualSize: {
            type: Number,
            default: 48,
            validator(val) {
                return val > 1
            },
        },
        // 列表数据
        list: {
            type: Array,
            default: () => [],
        },
        // 初始垂直滚动距离（可选）
        scrollTop: {
            type: Number,
            default: 0,
        },
        // 初始横向滚动距离（可选）
        scrollLeft: {
            type: Number,
            default: 0,
        },
        // 可视视口高度
        clientHeight: {
            type: [String, Number],
            default: 0,
        },
        // 是否禁用
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            // 垂直滚动距离
            scrollY: this.scrollTop,
            // 水平滚动距离
            scrollX: this.scrollLeft,
            // 滚动位置
            virtualPosition: {
                init: false, // 初始化标记
                adjusting: false, // 定位计算中
                vh: 0, // 虚拟内容高度
                rh: 0, // 实际内容高度
                total: 0, // 数据总个数
                top: 0, // 顶部偏移
                lastCalcScrollY: 0, // 上一次计算所使用的滚动距离
                scrollY: 0, // 当前滚动距离
                rem: 0, // 偏移余数（cIdx距离可视窗口顶部的距离）
                sIdx: 0, // 起始索引
                cIdx: 0, // 当前索引
                eIdx: 0, // 结束索引
                hs: [], // 各行高度记录
                innerList: [], // 可视列表
            },
        }
    },
    watch: {
        list(val) {
            // 禁用时，innerList即list
            if (this.disabled) {
                this.virtualPosition.innerList = val
            }
        },
    },
    created() {
        // 计算虚拟滚动位置
        this.calcVirtualPosition = throttle(16 * 3, (force) => {
            var list = this.list,
                clientHeight = parseFloat(this.clientHeight),
                scrollY = this.scrollY

            if (this.virtualPosition.adjusting) {
                return
            }
            if (scrollY < 0) scrollY = 0

            var pos = this.virtualPosition,
                size = this.virtualSize,
                mh = this.minRowHeight,
                strategy, // 滚动策略(等比还是等距)
                dt = scrollY - pos.lastCalcScrollY // 滚动增量

            // 首次计算，需要触发自适应调整
            if (pos.init === false) {
                pos.init = true
                pos.total = list.length
                pos.vh = pos.total * mh
                pos.eIdx = Math.min(this.virtualSize - 1, pos.total - 1)
                pos.innerList = list.slice(pos.sIdx, pos.eIdx + 1)

                if (this.virtualAdjust) pos.adjusting = true
                else {
                    pos.hs = repeat(mh, size)
                    pos.rh = sum(pos.hs)
                }
            }
            // 上一次的计算结果
            const { rh, total, top, sIdx, eIdx, lastCalcScrollY } = pos
            // 更新虚拟高度
            pos.total = list.length
            // 同步滚动距离
            pos.scrollY = scrollY
            // 等比滚动
            function reCalc() {
                strategy = 're'
                // console.log('before', pos.sIdx, pos.eIdx)
                var extra = rh - (pos.eIdx - pos.sIdx + 1) * mh
                // 还原高度
                pos.vh = pos.total * mh
                pos.cIdx = Math.ceil((scrollY - extra) / mh)
                pos.sIdx = Math.max(pos.cIdx - Math.ceil(size / 3), 0)
                pos.eIdx = Math.min(pos.sIdx + size - 1, pos.total - 1)
                pos.rem = pos.cIdx * mh - scrollY + extra
            }
            // 等距滚动
            function relativeCalc() {
                strategy = 'relative'
                // console.log('before', pos.sIdx, pos.eIdx)
                pos.cIdx = idxSumUntil(pos.hs, scrollY - top) + sIdx + 1
                pos.rem = sum(pos.hs, 0, pos.cIdx - pos.sIdx - 1) - (scrollY - top)
                pos.sIdx = Math.max(pos.cIdx - Math.ceil(size / 3), 0)
                pos.eIdx = Math.min(pos.sIdx + size - 1, pos.total - 1)
            }
            // prettier-ignore
            // console.log('dt: ', dt, ' >', (rh - (lastCalcScrollY - top) - clientHeight)* 0.8)

            // 数据长度发生了变化或者强制计算
            if (total !== pos.total || force) {
                reCalc()
            }
            // 相对向下滚动（相对于上一次的计算位置）
            else if (dt > 0) {
                // 超过原下半部阈值
                // prettier-ignore
                if (dt > (rh - (lastCalcScrollY - top) - clientHeight) * 0.8 ) {
                    // 在等距计算范围内
                    if (scrollY - top <= rh) {
                        relativeCalc()
                    } else {
                        reCalc()
                    }
                }
            }
            // 相对向上滚动
            else if (dt < 0) {
                // 超过原上半部阈值
                if (dt < -(lastCalcScrollY - top) * 0.8) {
                    // 在等距计算范围内
                    if (scrollY - top > 0) {
                        relativeCalc()
                    } else {
                        reCalc()
                    }
                }
            }

            // innerList change
            // prettier-ignore
            if (sIdx !== pos.sIdx || eIdx !== pos.eIdx || total !== pos.total || force) {
                pos.lastCalcScrollY = scrollY
                if (strategy === 'relative') {
                    this._setInnerList(pos.sIdx, pos.eIdx + 1)
                } else {
                    this._setInnerListDelay(pos.sIdx, pos.eIdx + 1)
                }
            }
            // console.timeEnd("calcVirtualPosition")
        })
        // 惰性修改 innerList
        this._setInnerListDelay = debounce(16 * 4, this._setInnerList)
    },
    mounted() {
        var { outer, inner } = this.$refs,
            pos = this.virtualPosition

        // 启用/禁用
        this.$watch(
            'disabled',
            function (val) {
                if (val) {
                    outer.style.position = 'static'
                    inner.style.position = 'static'
                    this.resetVirtualPosition()
                } else {
                    outer.style.position = 'relative'
                    inner.style.position = 'absolute'
                    inner.style.top = '0'
                    inner.style.left = '0'
                    this.calcVirtualPosition()
                }
            },
            {
                immediate: true,
            }
        )
        // 随滚动偏移
        this.$watch(
            function () {
                return {
                    vh: pos.vh,
                    top: pos.top,
                }
            },
            function () {
                if (this.disabled) return

                outer.style.height = pos.vh + 'px'
                inner.style.top = pos.top + 'px'
                // console.log('change top to', pos.top)
            },
            {
                immediate: true,
            }
        )
        // 数据发生变化
        this.$watch('list', function () {
            if (this.disabled) return

            // 强制重新计算
            this.calcVirtualPosition(true)
        })
    },
    // beforeUpdate() {
    //     console.log('virtual-list beforeUpdate')
    // },
    methods: {
        // 设置内置列表
        _setInnerList(sIdx, eIdx) {
            var pos = this.virtualPosition
            pos.innerList = this.list.slice(sIdx, eIdx + 1)
            if (this.virtualAdjust) pos.adjusting = true
            else {
                // 修正实际高度
                var len = pos.eIdx > pos.sIdx ? pos.eIdx - pos.sIdx + 1 : 0,
                    mh = this.minRowHeight
                pos.hs = repeat(mh, len)
                pos.rh = len * mh
                this.virtualScrollTo()
            }
        },
        // 位置发生了变化
        _emitScroll() {
            // 参数即为发生变化的属性
            this.$emit('scroll', {
                scrollTop: this.scrollY,
                scrollLeft: this.scrollX,
                top: this.virtualPosition.top,
            })
        },
        // 滚动事件
        onScroll(e) {
            var { scrollTop, scrollLeft } = e.target
            this.scrollY = scrollTop
            this.scrollX = scrollLeft
            if (!this.disabled) this.calcVirtualPosition()
            this._emitScroll()
        },
        // 自适应高度修正
        adjustVirtualHeight(hs = []) {
            if (this.virtualPosition.adjusting === false) {
                return
            }
            // console.time("calcVirtualPosition")
            // console.time("adjustVirtualHeight")
            var pos = this.virtualPosition,
                mh = this.minRowHeight

            // 实际高度补差
            pos.hs = hs
            pos.rh = sum(hs)
            // 虚拟高度补差
            pos.vh = pos.total * mh + pos.rh - hs.length * mh
            //
            this.virtualScrollTo()
            // end
            pos.adjusting = false
            // console.log('after', pos.sIdx, pos.eIdx)
            // console.timeEnd("adjustVirtualHeight")
        },
        // 虚拟滚动
        virtualScrollTo() {
            var pos = this.virtualPosition,
                { sIdx, cIdx, scrollY } = pos

            // 虚拟偏移
            pos.top = sIdx > 0 ? scrollY - sum(pos.hs, 0, cIdx - sIdx - 1) + pos.rem : 0
            // 向上滚动距离不足
            if (pos.top < 0) {
                pos.scrollY += -pos.top
                pos.top = 0
                pos.lastCalcScrollY = pos.scrollY
                this.$el.scrollTop = pos.scrollY
            }
            // prettier-ignore
            // console.log(`total: ${pos.total}, cIdx: ${pos.cIdx}, sIdx: ${pos.sIdx}, eIdx: ${pos.eIdx}, top: ${Math.round(pos.top)}, scrollY: ${pos.scrollY}`)
            this._emitScroll()
        },
        // 还原初始位置
        resetVirtualPosition() {
            Object.assign(this.virtualPosition, {
                init: false,
                adjusting: false,
                vh: 0,
                rh: 0,
                top: 0,
                lastCalcScrollY: 0,
                scrollY: 0,
                sIdx: 0,
                cIdx: 0,
                eIdx: this.virtualSize - 1,
                hs: [],
                innerList: this.list,
            })
        },
    },
}
</script>
