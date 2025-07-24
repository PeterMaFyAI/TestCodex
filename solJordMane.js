const container = document.getElementById('simulation-container');
const playPauseBtn = document.getElementById('playPause');
const speedSlider = document.getElementById('speed');
const dayCountSpan = document.getElementById('dayCount');
const timelineSlider = document.getElementById('timeline');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

camera.position.set(40, 20, 40);
controls.update();

const light = new THREE.PointLight(0xffffff, 2);
scene.add(light);

const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

const earthPivot = new THREE.Object3D();
scene.add(earthPivot);
const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x2233ff });
const earth = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), earthMaterial);
earth.position.x = 15;
earthPivot.add(earth);

const moonPivot = new THREE.Object3D();
earthPivot.add(moonPivot);
const moonMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), moonMaterial);
moon.position.x = 4;
moonPivot.add(moon);

let lastTime = performance.now();
let day = 0;
let speedFactor = parseFloat(speedSlider.value); // days per second
let paused = false;
const maxDays = 3650;

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

    dayCountSpan.textContent = Math.floor(day);

    controls.update();
    renderer.render(scene, camera);
}

playPauseBtn.addEventListener('click', () => {
    paused = !paused;
    playPauseBtn.textContent = paused ? 'Starta' : 'Pausa';
});

speedSlider.addEventListener('input', () => {
    speedFactor = parseFloat(speedSlider.value);
});

timelineSlider.addEventListener('input', () => {
    day = parseFloat(timelineSlider.value);
});

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

animate(performance.now());
