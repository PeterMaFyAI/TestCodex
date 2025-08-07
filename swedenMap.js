const map = L.map('map').setView([62, 15], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

let swedenLayer;
let finlandLayer;

Promise.all([
    fetch('swe.geojson').then(r => r.json()),
    fetch('fin.geojson').then(r => r.json())
]).then(([sweData, finData]) => {
    swedenLayer = L.geoJSON(sweData, {style: {color: 'blue', weight: 1, fillOpacity: 0.4}});
    finlandLayer = L.geoJSON(finData, {style: {color: 'blue', weight: 1, fillOpacity: 0.4}});
    map.fitBounds(swedenLayer.getBounds());
    const initial = document.querySelector('input[name="period"]:checked').value;
    updateMap(parseInt(initial));
});

function updateMap(year) {
    if (!swedenLayer || !finlandLayer) return;
    if (!map.hasLayer(swedenLayer)) swedenLayer.addTo(map);
    if (year < 1809) {
        if (!map.hasLayer(finlandLayer)) finlandLayer.addTo(map);
    } else {
        if (map.hasLayer(finlandLayer)) map.removeLayer(finlandLayer);
    }
}

document.querySelectorAll('input[name="period"]').forEach(radio => {
    radio.addEventListener('change', e => {
        updateMap(parseInt(e.target.value));
    });
});
