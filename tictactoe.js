const cells = document.querySelectorAll('.cell');
let currentPlayer = 'X';
let board = Array(9).fill(null);
let gameOver = false;
const statusDiv = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const iconSelect1 = document.getElementById('icon1');
const iconSelect2 = document.getElementById('icon2');

let playerIcons = { X: iconSelect1.value, O: iconSelect2.value };

function updateIcons() {
    playerIcons.X = iconSelect1.value;
    playerIcons.O = iconSelect2.value;
}

function updateBoardIcons() {
    cells.forEach((cell, idx) => {
        const mark = board[idx];
        if (mark) {
            cell.textContent = playerIcons[mark];
        }
    });
}

function syncIconOptions() {
    Array.from(iconSelect1.options).forEach(opt => {
        opt.disabled = opt.value === iconSelect2.value;
    });
    Array.from(iconSelect2.options).forEach(opt => {
        opt.disabled = opt.value === iconSelect1.value;
    });
}

function ensureUniqueIcons(changedSelect) {
    const otherSelect = changedSelect === iconSelect1 ? iconSelect2 : iconSelect1;
    if (changedSelect.value === otherSelect.value) {
        for (const option of otherSelect.options) {
            if (option.value !== changedSelect.value) {
                otherSelect.value = option.value;
                break;
            }
        }
    }
    updateIcons();
    syncIconOptions();
}

statusDiv.textContent = `Spelare ${playerIcons[currentPlayer]}s tur`;

function checkWin(player) {
    const combos = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    return combos.some(combo => combo.every(index => board[index] === player));
}

function handleClick(e) {
    const idx = parseInt(e.target.dataset.index);
    if (board[idx] || gameOver) return;
    board[idx] = currentPlayer;
    e.target.textContent = playerIcons[currentPlayer];

    if (checkWin(currentPlayer)) {
        statusDiv.textContent = `Spelare ${playerIcons[currentPlayer]} vinner!`;
        gameOver = true;
    } else if (board.every(Boolean)) {
        statusDiv.textContent = 'Oavgjort!';
        gameOver = true;
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        statusDiv.textContent = `Spelare ${playerIcons[currentPlayer]}s tur`;
    }
}

function resetGame() {
    board = Array(9).fill(null);
    gameOver = false;
    currentPlayer = 'X';
    updateIcons();
    syncIconOptions();
    cells.forEach(cell => {
        cell.textContent = '';
    });
    statusDiv.textContent = `Spelare ${playerIcons[currentPlayer]}s tur`;
}

cells.forEach(cell => cell.addEventListener('click', handleClick));
resetBtn.addEventListener('click', resetGame);
iconSelect1.addEventListener('change', () => {
    ensureUniqueIcons(iconSelect1);
    updateBoardIcons();
    statusDiv.textContent = `Spelare ${playerIcons[currentPlayer]}s tur`;
});
iconSelect2.addEventListener('change', () => {
    ensureUniqueIcons(iconSelect2);
    updateBoardIcons();
    statusDiv.textContent = `Spelare ${playerIcons[currentPlayer]}s tur`;
});

syncIconOptions();
