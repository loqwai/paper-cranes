export const StatTypes = ['normalized', 'mean', 'median', 'standardDeviation', 'zScore', 'min', 'max']

export function makeCalculateStats(historySize = 500) {
    let queue = []
    let sum = 0
    let sumOfSquares = 0
    let minQueue = []
    let maxQueue = []
    let lowerHalf = [] // Max heap
    let upperHalf = [] // Min heap

    function updateMinMaxQueues(value) {
        while (minQueue.length && minQueue[minQueue.length - 1] > value) {
            minQueue.pop()
        }
        while (maxQueue.length && maxQueue[maxQueue.length - 1] < value) {
            maxQueue.pop()
        }
        minQueue.push(value)
        maxQueue.push(value)
    }

    function removeOldFromMinMaxQueues(oldValue) {
        if (minQueue[0] === oldValue) {
            minQueue.shift()
        }
        if (maxQueue[0] === oldValue) {
            maxQueue.shift()
        }
    }

    function addNumberToHeaps(number) {
        if (lowerHalf.length === 0 || number < lowerHalf[0]) {
            lowerHalf.push(number)
            bubbleUp(lowerHalf, false)
        } else {
            upperHalf.push(number)
            bubbleUp(upperHalf, true)
        }

        // Rebalance heaps
        if (lowerHalf.length > upperHalf.length + 1) {
            upperHalf.push(extractTop(lowerHalf, false))
            bubbleUp(upperHalf, true)
        } else if (upperHalf.length > lowerHalf.length) {
            lowerHalf.push(extractTop(upperHalf, true))
            bubbleUp(lowerHalf, false)
        }
    }

    function removeNumberFromHeaps(number) {
        if (lowerHalf.includes(number)) {
            removeNumber(lowerHalf, number, false)
        } else if (upperHalf.includes(number)) {
            removeNumber(upperHalf, number, true)
        }

        // Rebalance heaps
        if (lowerHalf.length > upperHalf.length + 1) {
            upperHalf.push(extractTop(lowerHalf, false))
            bubbleUp(upperHalf, true)
        } else if (upperHalf.length > lowerHalf.length) {
            lowerHalf.push(extractTop(upperHalf, true))
            bubbleUp(lowerHalf, false)
        }
    }

    function bubbleUp(heap, isMinHeap) {
        let index = heap.length - 1
        while (index > 0) {
            let parentIdx = Math.floor((index - 1) / 2)
            if ((isMinHeap && heap[index] < heap[parentIdx]) || (!isMinHeap && heap[index] > heap[parentIdx])) {
                ;[heap[index], heap[parentIdx]] = [heap[parentIdx], heap[index]]
                index = parentIdx
            } else {
                break
            }
        }
    }

    function extractTop(heap, isMinHeap) {
        if (heap.length === 0) {
            return null
        }
        let top = heap[0]
        heap[0] = heap[heap.length - 1]
        heap.pop()
        sinkDown(heap, isMinHeap)
        return top
    }

    function sinkDown(heap, isMinHeap) {
        let index = 0
        let length = heap.length

        while (index < length) {
            let leftChildIndex = 2 * index + 1
            let rightChildIndex = 2 * index + 2
            let swapIndex = null

            if (leftChildIndex < length) {
                if ((isMinHeap && heap[leftChildIndex] < heap[index]) || (!isMinHeap && heap[leftChildIndex] > heap[index])) {
                    swapIndex = leftChildIndex
                }
            }

            if (rightChildIndex < length) {
                if (
                    (isMinHeap && heap[rightChildIndex] < (swapIndex === null ? heap[index] : heap[leftChildIndex])) ||
                    (!isMinHeap && heap[rightChildIndex] > (swapIndex === null ? heap[index] : heap[leftChildIndex]))
                ) {
                    swapIndex = rightChildIndex
                }
            }

            if (swapIndex === null) {
                break
            }

            ;[heap[index], heap[swapIndex]] = [heap[swapIndex], heap[index]]
            index = swapIndex
        }
    }

    function removeNumber(heap, number, isMinHeap) {
        let index = heap.indexOf(number)
        if (index !== -1) {
            heap[index] = heap[heap.length - 1]
            heap.pop()
            sinkDown(heap, isMinHeap)
        }
    }

    function calculateMedian() {
        if (lowerHalf.length === upperHalf.length) {
            return (lowerHalf[0] + upperHalf[0]) / 2
        } else {
            return lowerHalf[0]
        }
    }

    function calculateMAD(median) {
        let deviations = queue.map((value) => Math.abs(value - median))
        let mad = medianAbsoluteDeviation(deviations)
        return mad
    }

    function medianAbsoluteDeviation(values) {
        if (values.length === 0) {
            return 0
        }
        let median = calculateMedian(values)
        let absoluteDeviations = values.map((value) => Math.abs(value - median))
        let medianAbsoluteDeviation = calculateMedian(absoluteDeviations)
        return medianAbsoluteDeviation
    }

    return function calculateStats(value) {
        if (typeof value !== 'number') throw new Error('Input must be a number')

        updateMinMaxQueues(value)
        addNumberToHeaps(value)

        queue.push(value)
        sum += value
        sumOfSquares += value * value

        if (queue.length > historySize) {
            let removed = queue.shift()
            sum -= removed
            sumOfSquares -= removed * removed
            removeOldFromMinMaxQueues(removed)
            removeNumberFromHeaps(removed)
        }

        let mean = sum / queue.length
        let variance = sumOfSquares / queue.length - mean * mean
        let min = minQueue.length ? minQueue[0] : Infinity
        let max = maxQueue.length ? maxQueue[0] : -Infinity
        let median = calculateMedian()
        let mad = calculateMAD(median)

        return {
            current: value,
            zScore: (variance ? (value - mean) / Math.sqrt(variance) : 0) / 6,
            normalized: mad, // Using MAD normalization as 'normalized'
            standardDeviation: Math.sqrt(variance),
            median,
            mean,
            min,
            max,
        }
    }
}
