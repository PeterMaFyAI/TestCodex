const puzzle = document.getElementById('puzzle');
const size = 4;
let tiles = [];

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function isSolvable(arr) {
    let inversions = 0;
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] && arr[j] && arr[i] > arr[j]) inversions++;
        }
    }
    const rowFromBottom = size - Math.floor(arr.indexOf(null) / size);
    if (size % 2 === 0) {
        return (rowFromBottom % 2 === 0) !== (inversions % 2 === 0);
    }
    return inversions % 2 === 0;
}

function init() {
    const numbers = [...Array(15).keys()].map(n => n + 1);
    do {
        shuffle(numbers);
    } while (!isSolvable(numbers));
    numbers.push(null);
    tiles = numbers;
    render();
}

function render() {
    puzzle.innerHTML = '';
    tiles.forEach((num, idx) => {
        const div = document.createElement('div');
        div.classList.add('tile');
        div.dataset.index = idx;
        if (num === null) {
            div.classList.add('empty');
        } else {
            div.textContent = num;
            div.draggable = true;
            div.addEventListener('dragstart', dragStart);
        }
        puzzle.appendChild(div);
    });
    const emptyTile = document.querySelector('.tile.empty');
    emptyTile.addEventListener('dragover', e => e.preventDefault());
    emptyTile.addEventListener('drop', dropOnEmpty);
}

function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
    e.target.classList.add('dragging');
}

function dropOnEmpty(e) {
    e.preventDefault();
    const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const to = tiles.indexOf(null);
    const [fx, fy] = [from % size, Math.floor(from / size)];
    const [tx, ty] = [to % size, Math.floor(to / size)];
    if (Math.abs(fx - tx) + Math.abs(fy - ty) === 1) {
        [tiles[from], tiles[to]] = [tiles[to], tiles[from]];
        render();
        if (checkSolved()) {
            setTimeout(() => alert('Grattis! Du löste pusslet!'), 10);
        }
    }
}

function checkSolved() {
    for (let i = 0; i < 15; i++) {
        if (tiles[i] !== i + 1) return false;
    }
    return true;
}

init();
