import * as THREE from 'three';
const container = document.getElementById('container');
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const scene = new THREE.Scene();
const clock = new THREE.Clock();
const uniforms = {
    u_time: { value: 1.0 },
    u_resolution: { value: new THREE.Vector2() },
    u_mouse: { value: new THREE.Vector2() }
};
let renderer; // Declare renderer outside the init function

init();
animate();

function init() {
    camera.position.z = 1;
    const geometry = new THREE.PlaneGeometry(2, 2);

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer(); // Initialize renderer here
    renderer.setPixelRatio(window.devicePixelRatio);

    container.appendChild(renderer.domElement);

    onWindowResize();
    window.addEventListener('resize', onWindowResize);

    document.onmousemove = (e) => {
        uniforms.u_mouse.value.x = (e.clientX / window.innerWidth) * 2 - 1;
        uniforms.u_mouse.value.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.u_resolution.value.x = renderer.domElement.width;
    uniforms.u_resolution.value.y = renderer.domElement.height;
}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    uniforms.u_time.value += clock.getDelta();
    renderer.render(scene, camera);
}
