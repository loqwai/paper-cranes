const STORAGE_KEY = 'seed'

const params = new URLSearchParams(window.location.search)

const findOrCreate = () => {
    const paramSeed = params.get(STORAGE_KEY)
    if (paramSeed !== null) return parseFloat(paramSeed)

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return parseFloat(stored)

    const seed = Math.random()
    localStorage.setItem(STORAGE_KEY, seed.toString())
    return seed
}

export const seed = findOrCreate()
