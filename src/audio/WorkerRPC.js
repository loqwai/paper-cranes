export class WorkerRPC {
    constructor(workerName, historySize) {
        this.workerName = workerName
        this.historySize = historySize
        this.lastMessage = this.createDefaultMessage()
    }

    createDefaultMessage = () => ({
        type: 'computedValue',
        workerName: this.workerName,
        value: 0,
        stats: {
            current: 0,
            mean: 0,
            median: 0,
            min: 0,
            max: 0,
            variance: 0,
            standardDeviation: 0,
            zScore: 0,
            normalized: 0,
            slope: 0,
            intercept: 0,
            rSquared: 0,
        },
    })

    validateMessage = (message) => {
        message.workerName = this.workerName
        if (!isFinite(message.value)) message.value = 0
        const stats = message.stats
        if (!isFinite(stats.current)) stats.current = 0
        if (!isFinite(stats.mean)) stats.mean = 0
        if (!isFinite(stats.median)) stats.median = 0
        if (!isFinite(stats.min)) stats.min = 0
        if (!isFinite(stats.max)) stats.max = 0
        if (!isFinite(stats.variance)) stats.variance = 0
        if (!isFinite(stats.standardDeviation)) stats.standardDeviation = 0
        if (!isFinite(stats.zScore)) stats.zScore = 0
        if (!isFinite(stats.normalized)) stats.normalized = 0
        if (!isFinite(stats.slope)) stats.slope = 0
        if (!isFinite(stats.intercept)) stats.intercept = 0
        if (!isFinite(stats.rSquared)) stats.rSquared = 0
        return message
    }

    handleMessage = (event) => {
        if (event.data.type === 'computedValue') {
            this.lastMessage = this.validateMessage(event.data)
        }
    }

    sendData = (fftData) => {
        this.worker.postMessage({
            type: 'fftData',
            id: performance.now(),
            data: { fft: fftData },
        })
    }

    getResult = () => this.lastMessage

    setHistorySize = (historySize) => {
        if(this.historySize !== historySize) {
            this.historySize = historySize
            this.worker.postMessage({
                type: 'config',
                data: { historySize: this.historySize },
            })
        }
    }

    initialize = async () => {
        this.worker = new Worker(new URL('./analyzer.js', import.meta.url), { type: "module" })
        this.worker.onmessage = this.handleMessage
        this.worker.onerror = this.handleError
        this.worker.postMessage({
            type: 'config',
            data: {
                historySize: this.historySize,
                analyzerName: this.workerName,
            },
        })
    }

    handleError = (error) => {
        console.error(`Error in worker ${this.workerName}:`, error)
    }

    terminate = () => {
        this.worker?.terminate()
    }
}
