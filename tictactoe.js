const cells = document.querySelectorAll('.cell');
let currentPlayer = 'X';
let board = Array(9).fill(null);
let gameOver = false;
const statusDiv = document.getElementById('status');
const resetBtn = document.getElementById('reset');

statusDiv.textContent = `Spelare ${currentPlayer}s tur`;

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
    e.target.textContent = currentPlayer;

    if (checkWin(currentPlayer)) {
        statusDiv.textContent = `Spelare ${currentPlayer} vinner!`;
        gameOver = true;
    } else if (board.every(Boolean)) {
        statusDiv.textContent = 'Oavgjort!';
        gameOver = true;
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        statusDiv.textContent = `Spelare ${currentPlayer}s tur`;
    }
}

function resetGame() {
    board = Array(9).fill(null);
    gameOver = false;
    currentPlayer = 'X';
    cells.forEach(cell => {
        cell.textContent = '';
    });
    statusDiv.textContent = `Spelare ${currentPlayer}s tur`;
}

cells.forEach(cell => cell.addEventListener('click', handleClick));
resetBtn.addEventListener('click', resetGame);
