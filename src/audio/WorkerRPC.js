const inputAllZeros = (fftData) => {
    return fftData.every((value) => value === 0)
}


export class WorkerRPC {
    constructor(workerName, historySize, timeout = 50) {
        this.workerName = workerName
        this.historySize = historySize
        this.timeout = timeout
        this.currentMessageId = 0
        this.resolveMessage = null
        this.lastMessage = this.createDefaultMessage()
        this.responseZeroesInARow = 0
    }

    createDefaultMessage = () => ({
        type: 'computedValue',
        workerName: this.workerName,
        value: 0.5,
        stats: {
            current: 0.5,
            mean: 0.5,
            median: 0.5,
            min: 0,
            max: 1,
            variance: 0.25,
            standardDeviation: 0.5,
            zScore: 0.1,
            normalized: 0.5,
        },
    })

    validateStats = (stats = {}) => ({
        current: isFinite(stats.current) ? stats.current : 0,
        mean: isFinite(stats.mean) ? stats.mean : 0,
        median: isFinite(stats.median) ? stats.median : 0,
        min: isFinite(stats.min) ? stats.min : 0,
        max: isFinite(stats.max) ? stats.max : 0,
        variance: isFinite(stats.variance) ? stats.variance : 0,
        standardDeviation: isFinite(stats.standardDeviation) ? stats.standardDeviation : 0,
        zScore: isFinite(stats.zScore) ? stats.zScore : 0,
        normalized: isFinite(stats.normalized) ? stats.normalized : 0,
    })

    validateMessage = (message) => ({
        ...message,
        workerName: this.workerName,
        value: isFinite(message.value) ? message.value : 0.5,
        stats: this.validateStats(message.stats),
    })

    handleMessage = (event) => {
        if(event.data.type === 'debug') {
            console.log(`${this.workerName} debug:`, event.data.value)
            return
        }
        if(event.data.type !== 'computedValue') return
        const validatedMessage = this.validateMessage(event.data)
        this.responseZeroesInARow++
        if(validatedMessage.value !== 0) this.responseZeroesInARow = 0
        this.lastMessage = validatedMessage

        if (this.resolveMessage && event.data.id === this.currentMessageId) {
            this.resolveMessage(validatedMessage)
            this.resolveMessage = null
        }
        if(this.responseZeroesInARow >50) {
            // console.error(`${this.workerName} returned a value of ${validatedMessage.value} ${this.responseZeroesInARow} times in a row`)
        }
    }

    processData = async (fftData) => {
        if (inputAllZeros(fftData)) {
            this.inputZeroesInARow++
            if(this.inputZeroesInARow > 100) {
                console.error(`${this.workerName} input is all zeros`)
                // pause forever
                return new Promise(console.log);
            }
        } else {
            this.inputZeroesInARow = 0
        }
        if (this.resolveMessage) {
            console.log(`${this.workerName} abandoning message after ${performance.now() - this.currentMessageId}ms`)
            this.resolveMessage()
        }

        const messageId = (this.currentMessageId = performance.now())

        const messagePromise = Promise.race([
            new Promise((resolve) => {
                this.resolveMessage = resolve
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Worker ${this.workerName} timed out`)), this.timeout)).catch(() => {
                if (this.currentMessageId === messageId) {
                    this.resolveMessage = null
                }
                return this.lastMessage
            }),
        ])

        this.worker.postMessage({
            type: 'fftData',
            id: messageId,
            data: { fft: fftData },
        })

        return messagePromise
    }

    setHistorySize = (historySize) => {
        if(this.historySize !== historySize) {
            this.historySize = historySize
            this.worker.postMessage({
                type: 'config',
                config: { historySize: this.historySize },
            })
        }
    }

    initialize = async () => {
        const workerUrl = new URL(`/src/audio/analyzers/${this.workerName}.js`, import.meta.url)
        const response = await fetch(workerUrl)
        if (!response.ok) {
            console.error(`Failed to fetch ${this.workerName} worker: ${response.statusText}`)
        }

        const code = await response.text()
        const blob = new Blob([code], { type: 'application/javascript' })
        this.worker = new Worker(URL.createObjectURL(blob), { type: 'module' })

        this.worker.onmessage = this.handleMessage
        this.worker.onerror = this.handleError

        this.responseZeroesInARow = 0
        this.inputZeroesInARow = 0

        this.worker.postMessage({
            type: 'config',
            config: { historySize: this.historySize },
        })
    }

    handleError = (error) => {
        console.error(`Error in worker ${this.workerName}:`, error)
    }

    terminate = () => {
        this.worker?.terminate()
    }
}
