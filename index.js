import * as THREE from 'three'
import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { Visualizer } from './src/Visualizer.js'

const events = ['click', 'touchstart', 'keydown']

events.forEach((event) => {
    document.addEventListener(event, main, { once: true })
})

const setupAudio = async () => {
    const audioContext = new AudioContext()
    await audioContext.resume()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const sourceNode = audioContext.createMediaStreamSource(stream)
    const audioProcessor = new AudioProcessor(audioContext, sourceNode)
    return audioProcessor
}

const updateUI = () => {}

const main = async () => {
    if (window.viz) return // Prevent multiple calls
    const audio = await setupAudio()

    const canvas = document.getElementById('visualizer')

    const params = new URLSearchParams(window.location.search)
    const shader = params.get('shader') ?? 'beat-trip'
    const initialImageUrl = params.get('image') ?? 'https://i.imgur.com/2f2QX9A.jpg'

    const video = new Visualizer(canvas, shader, initialImageUrl)
    await video.init()
    updateUI()
    requestAnimationFrame(() => render({ video, audio }))
}

const container = document.getElementById('container')
const camera = new THREE.PerspectiveCamera(75, container.width / container.height, 0.1, 1000)
const scene = new THREE.Scene()
const clock = new THREE.Clock()
const uniforms = {
    u_time: { value: 1.0 },
    u_resolution: { value: new THREE.Vector2() },
    u_mouse: { value: new THREE.Vector2() },
}
let renderer // Declare renderer outside the init function

init()
animate()

function init() {
    camera.position.z = 1
    const geometry = new THREE.PlaneGeometry(2, 2)

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('three-visualizer'),
    }) // Initialize renderer here
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.autoResize = false

    container.appendChild(renderer.domElement)

    onWindowResize()
    window.addEventListener('resize', onWindowResize)

    document.onmousemove = (e) => {
        uniforms.u_mouse.value.x = (e.clientX / window.innerWidth) * 2 - 1
        uniforms.u_mouse.value.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
}

function onWindowResize() {
    camera.aspect = renderer.domElement.width / renderer.domElement.height
    camera.updateProjectionMatrix()
    uniforms.u_resolution.value.x = renderer.domElement.width
    uniforms.u_resolution.value.y = renderer.domElement.height
}

function animate() {
    requestAnimationFrame(animate)
    render()
    onWindowResize()
}

function render() {
    uniforms.u_time.value += clock.getDelta()
    renderer.render(scene, camera)
}
