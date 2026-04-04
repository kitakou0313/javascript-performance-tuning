import { CoorinateSetWithString } from "./libs/setWithString.js"

const set = new CoorinateSetWithString()

const ADD_COUNT = 1e8
const HAS_COUNT = 1e8
const LIST_COUNT = 1e4
const COORD_RANGE = 1000

// 10^8回の追加
console.time("add")
for (let i = 0; i < ADD_COUNT; i++) {
    set.add(i % COORD_RANGE, i % COORD_RANGE)
}
console.timeEnd("add")

// 10^8回の存在判定
console.time("has")
for (let i = 0; i < HAS_COUNT; i++) {
    set.has(i % COORD_RANGE, i % COORD_RANGE)
}
console.timeEnd("has")

// 10^4回の全値取得
console.time("listAllCoordinates")
for (let i = 0; i < LIST_COUNT; i++) {
    set.listAllCoordinates()
}
console.timeEnd("listAllCoordinates")
