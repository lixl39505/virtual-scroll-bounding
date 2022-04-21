const VirtualScrollBounding = require('../vsb')

let list

describe('vsb', function () {
    beforeEach(function () {
        list = []
        for (var i = 0; i < 1000; i++) {
            list.push(i)
        }
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
    })

    it('equal difference scrolling', function () {
        let vsb = new VirtualScrollBounding({
            list,
            minRowHeight: 30,
            clientHeight: 300,
            virtualLength: 30,
            adjustRowHeight: true,
        })

        vsb.position.cr.should.equal(0)
        // scroll down 10.5 rows
        vsb.scrollTo({
            top: 10 * 30 + 15,
        })
        vsb.position.vh.should.equal(1000 * 30)
        vsb.position.sr.should.equal(1)
        vsb.position.cr.should.equal(11)
        vsb.position.er.should.equal(30)
        vsb.position.top.should.equal(30)
        vsb.position.topRem.should.equal(15)
        // adjusting
        var ahs = []
        // the first 10 rows become higher
        for (var i = 0; i < 30; i++) {
            ahs[i] = i < 10 ? 40 : 30
        }

        var dtop = vsb.position.scrollY + 15 - 10 * 40
        vsb.adjust(ahs)
        vsb.position.vh.should.equal(1000 * 30 + 10 * 10)
        vsb.position.top.should.equal(0)
        vsb.position.scrollY.should.equal(10 * 30 + 15 - dtop)
    })
})
