const map = L.map('map').setView([62, 15], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

const boundaries = {
    1523: [
        [55.3, 12.7], [59.1, 12.5], [62.1, 17.4], [65.7, 23.0],
        [67.8, 24.5], [69.0, 22.2], [69.8, 17.0], [68.9, 14.0],
        [66.0, 12.0], [63.0, 8.0], [59.0, 11.5], [55.3, 12.7]
    ],
    1617: [
        [55.3, 12.7], [59.1, 12.5], [62.1, 17.4], [65.7, 24.0],
        [68.5, 31.0], [66.0, 33.5], [63.0, 32.0], [60.0, 29.0],
        [58.0, 26.0], [56.0, 20.0], [55.3, 12.7]
    ],
    1658: [
        [58.9, 5.5], [63.4, 7.8], [66.4, 11.0], [69.0, 14.5],
        [69.5, 22.0], [63.0, 32.0], [58.0, 30.0], [55.5, 24.0],
        [55.2, 20.0], [55.3, 13.0], [58.9, 5.5]
    ],
    1809: [
        [55.3, 11.0], [59.0, 11.0], [62.2, 14.0], [65.0, 17.0],
        [67.0, 19.0], [68.9, 21.5], [67.5, 24.0], [66.0, 23.5],
        [63.8, 22.0], [60.0, 20.0], [56.0, 15.0], [55.3, 11.0]
    ],
    1905: [
        [55.3, 11.0], [59.0, 11.0], [62.2, 14.0], [65.0, 17.0],
        [67.0, 19.0], [68.9, 21.5], [67.5, 24.0], [66.0, 23.5],
        [63.8, 22.0], [60.0, 20.0], [56.0, 15.0], [55.3, 11.0]
    ]
};

let boundaryLayer;

function updateMap(year) {
    if (boundaryLayer) {
        map.removeLayer(boundaryLayer);
    }
    boundaryLayer = L.polygon(boundaries[year], {
        color: 'blue',
        weight: 1,
        fillOpacity: 0.4
    }).addTo(map);
    map.fitBounds(boundaryLayer.getBounds());
}

document.querySelectorAll('input[name="period"]').forEach(radio => {
    radio.addEventListener('change', e => {
        updateMap(parseInt(e.target.value));
    });
});

const initial = document.querySelector('input[name="period"]:checked').value;
updateMap(parseInt(initial));

