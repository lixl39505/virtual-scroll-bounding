# 简介

默认使用等比滚动算法。如果行高是可变的，那么等比滚动时，虚拟列表的滚动速度就会比滚动条要快（行比标准高度越高，则滚动的越快）。

如果滚动速率不一致是无法接受的，可以开启 adjustRowHeight 选项以启用等差滚动算法。但是等差滚动会导致虚拟列表的滚动距离与实际滚动距离不一致。为了修补这个问题，需要在每次等差滚动后手动调用 adjust 方法。

adjust 的计算依据是列表各行的实际高度，不过该算法不包含 DOM 部分，因此各行实际高度需要调用者自行提供。