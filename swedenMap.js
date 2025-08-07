const map = L.map('map').setView([62, 15], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

const boundaryFiles = {
    1523: ['swe.geojson', 'fin.geojson'],
    1617: ['swe.geojson', 'fin.geojson', 'estonia.geojson'],
    1658: ['swe.geojson', 'fin.geojson', 'estonia.geojson', 'latvia.geojson', 'pomerania.geojson', 'trondelag.geojson', 'ingria.geojson'],
    1809: ['swe.geojson', 'pomerania.geojson'],
    1905: ['swe.geojson']
};

let boundaryLayer;

async function updateMap(year) {
    if (boundaryLayer) {
        map.removeLayer(boundaryLayer);
    }
    const layers = await Promise.all(boundaryFiles[year].map(async file => {
        const response = await fetch(file);
        const geojson = await response.json();
        return L.geoJSON(geojson, {
            style: {
                color: 'blue',
                weight: 1,
                fillOpacity: 0.4
            }
        });
    }));
    boundaryLayer = L.layerGroup(layers).addTo(map);
    map.fitBounds(boundaryLayer.getBounds());
}

document.querySelectorAll('input[name="period"]').forEach(radio => {
    radio.addEventListener('change', e => {
        updateMap(parseInt(e.target.value));
    });
});

const initial = document.querySelector('input[name="period"]:checked').value;
updateMap(parseInt(initial));

