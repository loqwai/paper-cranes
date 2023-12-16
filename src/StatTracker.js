class OptimizedStatTracker {
  constructor (historySize) {
    this.historySize = historySize
    this.queue = [] // To keep the last 'historySize' values
    this.runningSum = 0
    this.runningSumOfSquares = 0
    this.mean = -1
    this.standardDeviation = -1
    this.zScore = -1
    this.min = Infinity
    this.max = -Infinity
  }

  set (value) {
    if (typeof value !== "number") throw new Error("StatTracker can only track numbers")

    // Update min and max
    this.min = Math.min(this.min, value)
    this.max = Math.max(this.max, value)

    // Add new value and update running sums
    this.queue.push(value)
    this.runningSum += value
    this.runningSumOfSquares += value * value

    // Remove oldest value if necessary
    if (this.queue.length > this.historySize) {
      const removedValue = this.queue.shift()
      this.runningSum -= removedValue
      this.runningSumOfSquares -= removedValue * removedValue

      // Check if we need to update min or max
      if (removedValue === this.min || removedValue === this.max) {
        this.recalculateMinMax()
      }
    }

    // Recalculate mean, standard deviation, and z-score
    this.mean = this.runningSum / this.queue.length
    const meanSquare = this.mean * this.mean
    const meanOfSquares = this.runningSumOfSquares / this.queue.length
    this.standardDeviation = Math.sqrt(meanOfSquares - meanSquare)

    const lastValue = this.queue[this.queue.length - 1]
    this.zScore = (lastValue - this.mean) / (this.standardDeviation || 1)
    // set a normalized value between 0 and 1. Guard against division by 0
    this.normalized = (lastValue - this.min) / (this.max - this.min || 1)
    return this.get()
  }

  get () {
    return {
      normalized: this.normalized || -1,
      mean: this.mean || -1,
      standardDeviation: this.standardDeviation || -1,
      zScore: this.zScore || -1,
      min: this.min === Infinity ? -1 : this.min,
      max: this.max === -Infinity ? -1 : this.max,
    }
  }

  recalculateMinMax () {
    this.min = Math.min(...this.queue)
    this.max = Math.max(...this.queue)
  }
}

export { OptimizedStatTracker as StatTracker}
