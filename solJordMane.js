import { OrbitControls } from './lib/OrbitControls.js';

const container = document.getElementById('simulation-container');
const playPauseBtn = document.getElementById('playPause');
const speedSlider = document.getElementById('speed');
const dayCountSpan = document.getElementById('dayCount');
const timelineSlider = document.getElementById('timeline');
const earthOrbitCheckbox = document.getElementById('earthOrbit');
const moonOrbitCheckbox = document.getElementById('moonOrbit');
const clearOrbitsBtn = document.getElementById('clearOrbits');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

camera.position.set(120, 60, 120);
controls.update();

const light = new THREE.PointLight(0xffffff, 2);
scene.add(light);
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

// Load textures for the celestial bodies
const textureLoader = new THREE.TextureLoader();
const sunTexture = textureLoader.load('images/sun.png');
const earthTexture = textureLoader.load('images/earth.png');
const moonTexture = textureLoader.load('images/moon.png');

// Create the sun with texture and make it larger relative to the earth
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Create the earth and position it farther from the sun
const earthPivot = new THREE.Object3D();
scene.add(earthPivot);
const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture });
const earth = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), earthMaterial);
earth.position.x = 75;
earthPivot.add(earth);

// Create the moon, orbiting the earth
const moonPivot = new THREE.Object3D();
earth.add(moonPivot);
const moonMaterial = new THREE.MeshPhongMaterial({ map: moonTexture });
const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), moonMaterial);
moon.position.x = 4;
moonPivot.add(moon);

let lastTime = performance.now();
let day = 0;
// Slow down the simulation so the minimum speed is about one fifth of before
let speedFactor = parseFloat(speedSlider.value) * 2; // days per second
let paused = false;
const maxDays = 3650;

const earthOrbitPoints = [];
let earthOrbitLine = null;
const moonOrbitPoints = [];
let moonOrbitLine = null;

function animate(time) {
    requestAnimationFrame(animate);
    const delta = (time - lastTime) / 1000; // seconds
    lastTime = time;

    if (!paused) {
        day += delta * speedFactor;
        if (day > maxDays) {
            day = maxDays;
            paused = true;
            playPauseBtn.textContent = 'Starta';
        }
        if (day < 0) day = 0;
        timelineSlider.value = day.toFixed(1);
    } else {
        // when paused, day may be changed via slider
        day = parseFloat(timelineSlider.value);
    }

    const earthAngle = (day / 365) * Math.PI * 2;
    const moonAngle = (day / 30) * Math.PI * 2;
    earthPivot.rotation.y = earthAngle;
    moonPivot.rotation.y = moonAngle;

    if (earthOrbitCheckbox.checked) {
        const pos = new THREE.Vector3();
        earth.getWorldPosition(pos);
        earthOrbitPoints.push(pos.clone());
        if (!earthOrbitLine) {
            const geom = new THREE.BufferGeometry().setFromPoints(earthOrbitPoints);
            const mat = new THREE.LineBasicMaterial({ color: 0x0000ff });
            earthOrbitLine = new THREE.Line(geom, mat);
            scene.add(earthOrbitLine);
        } else {
            earthOrbitLine.geometry.setFromPoints(earthOrbitPoints);
        }
    }

    if (moonOrbitCheckbox.checked) {
        const pos = new THREE.Vector3();
        moon.getWorldPosition(pos);
        moonOrbitPoints.push(pos.clone());
        if (!moonOrbitLine) {
            const geom = new THREE.BufferGeometry().setFromPoints(moonOrbitPoints);
            const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
            moonOrbitLine = new THREE.Line(geom, mat);
            scene.add(moonOrbitLine);
        } else {
            moonOrbitLine.geometry.setFromPoints(moonOrbitPoints);
        }
    }

    dayCountSpan.textContent = Math.floor(day);

    controls.update();
    renderer.render(scene, camera);
}

playPauseBtn.addEventListener('click', () => {
    paused = !paused;
    playPauseBtn.textContent = paused ? 'Starta' : 'Pausa';
});

speedSlider.addEventListener('input', () => {
    speedFactor = parseFloat(speedSlider.value) * 2;
});

timelineSlider.addEventListener('input', () => {
    day = parseFloat(timelineSlider.value);
});

clearOrbitsBtn.addEventListener('click', () => {
    if (earthOrbitLine) {
        scene.remove(earthOrbitLine);
        earthOrbitLine.geometry.dispose();
        earthOrbitLine.material.dispose();
        earthOrbitLine = null;
        earthOrbitPoints.length = 0;
    }
    if (moonOrbitLine) {
        scene.remove(moonOrbitLine);
        moonOrbitLine.geometry.dispose();
        moonOrbitLine.material.dispose();
        moonOrbitLine = null;
        moonOrbitPoints.length = 0;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

animate(performance.now());
