const VirtualScrollBounding = require('../src/vsb')

let list

describe('vsb', function () {
    beforeEach(function () {
        list = []
        for (var i = 0; i < 1000; i++) {
            list.push(i)
        }
    })

    it('equal difference scrolling', function () {
        let vsb = new VirtualScrollBounding({
            list,
            minRowHeight: 30,
            clientHeight: 300,
            virtualLength: 30,
        })

        vsb.position.cr.should.equal(0)
        // scroll down 20.5 rows
        vsb.scrollTo({
            top: 20 * 30 + 15,
        })

        vsb.position.vh.should.equal(1000 * 30)
        vsb.position.sr.should.equal(11)
        vsb.position.cr.should.equal(21)
        vsb.position.er.should.equal(40)
        vsb.position.top.should.equal(330)
        vsb.position.topRem.should.equal(15)

        // adjusting
        vsb.virtualAdjust = true
        vsb.resetVirtualPosition()
        vsb.scrollTo({
            top: 20 * 30 + 15,
        })
        var ahs = []
        for (var i = 0; i < 30; i++) {
            ahs[i] = 30
        }

        vsb.adjust(ahs)
        vsb.position.vh.should.equal(1000 * 30)
        vsb.position.top.should.equal(330)

        vsb.scrollTo({
            top: 10 * 30 + 15,
        })
        // 前10行变高
        for (var i = 0; i < 30; i++) {
            ahs[i] = i < 10 ? 40 : 30
        }
        var top = vsb.position.scrollY + 15 - 10 * 40 // top 此时的理论值 = -70
        vsb.adjust(ahs)
        vsb.position.vh.should.equal(1000 * 30 + 10 * 10)
        vsb.position.top.should.equal(0) // adjust 之后 top=0
        vsb.position.scrollY.should.equal(10 * 30 + 15 - top) // 反补到 scrollY
    })

    it('equal ratio scrolling', function () {
        let vsb = new VirtualScrollBounding({
            list,
            minRowHeight: 30,
            clientHeight: 300,
            virtualLength: 30,
        })

        vsb.position.cr.should.equal(0)
        // scroll down 40.5 rows
        vsb.scrollTo({
            top: 40 * 30 + 15,
        })

        vsb.position.sr.should.equal(31)
        vsb.position.cr.should.equal(41)
        vsb.position.er.should.equal(60)
        vsb.position.top.should.equal(930)
        vsb.position.topRem.should.equal(15)

        // adjusting
        vsb.virtualAdjust = true
        vsb.resetVirtualPosition()
        vsb.scrollTo({
            top: 40 * 30 + 15,
        })
        var ahs = []
        // the first 10 rows become higher
        for (var i = 0; i < 30; i++) {
            ahs[i] = i < 10 ? 40 : 30
        }
        vsb.adjust(ahs)
        // 索引应当与前一次结果相同（除了top）
        vsb.position.sr.should.equal(31)
        vsb.position.cr.should.equal(41)
        vsb.position.er.should.equal(60)
        vsb.position.top.should.equal(930 - 10 * 10)
        vsb.position.topRem.should.equal(15)
    })
})
