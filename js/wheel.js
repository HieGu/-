// Список испытаний
const challenges = [
    "Три раза подряд потерпите неудачу в Святилище Удачи",
    "Иметь при себе три разных активки",
    "Найти Аспект",
    "Выбить предмет с босса",
    "Найти потайную комнату в Заброшенном акведуке",
    "Иметь при себе 6 турелей",
    "Заскрапить 6 турелей/дронов в одном утилизаторе дронов",
    "Вернуться на первый этап",
    "Взять два предмета 'Формованное стекло'",
    "Взять 5 предметов синего качества",
    "Собрать в забеге 2 одинаковых красных предмета",
    "Приготовить у повара 10 предметов",
    "Сделать скрап каждой категории",
    "Приготовить блюдо",
    "Уничтожить себя у Обелиска",
    "Открыть защитный сундук с таймером на месте сбора 'Дельта'",
    "Умереть два раза за один забег",
    "Победите уникального стража Позолоченного берега",
    "Победить Ложного сына",
    "Улучшить Святилище Лесов до предела",
    "Соберите 5 разных дронов",
    "Победите Ложного сына, Сердце Сола, Митрикса и Пустотника за один забег",
    "Победить Сердце Сола",
    "Победить Митрикса",
    "Победить Пустотника",
    "На каждой локации найти алтарь Тритонов и нажать его",
    "Пройти Поля Пустоты",
    "Попасть в Межвременной базар",
    "Попасть в Целостное мгновение",
    "Иметь при себе 5 одинаковых дронов",
    "Пройти игру с артефактом возмездия (Vengeance)",
    "Пройти игру с артефактом эволюции (Evolution)",
    "Пройти игру с артефактом чести (Honor)",
    "Пройти игру с артефактом тайны (Enigma)",
    "Пройти игру с артефактом изменения (Metamorphosis)",
    "Пройти игру с артефактом престижа (Prestige)"
];

const GRID_SIZE = 5;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

// Цвета игроков
const playerColors = [
    { bg: '#ff6b6b', name: 'Красный' },
    { bg: '#4ecdc4', name: 'Бирюзовый' },
    { bg: '#ffe66d', name: 'Желтый' },
    { bg: '#a8e6cf', name: 'Зеленый' },
    { bg: '#ff8c94', name: 'Розовый' }
];

// Состояние игры
let currentBoard = [];
let currentPlayers = [];
let currentPlayerId = null;
let currentRoomId = null;
let currentPlayerColor = null;
let syncInterval = null;

// Генерация случайного поля
function generateRandomBoard() {
    const shuffled = [...challenges];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    currentBoard = shuffled.slice(0, TOTAL_CELLS);
    while (currentBoard.length < TOTAL_CELLS) {
        currentBoard.push("Дополнительное испытание");
    }
    return currentBoard;
}

// Проверка линий для игрока
function checkBingoLinesForPlayer(completedCells) {
    const lines = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        let completed = true;
        for (let col = 0; col < GRID_SIZE; col++) {
            if (!completedCells[row * GRID_SIZE + col]) {
                completed = false;
                break;
            }
        }
        lines.push(completed);
    }
    for (let col = 0; col < GRID_SIZE; col++) {
        let completed = true;
        for (let row = 0; row < GRID_SIZE; row++) {
            if (!completedCells[row * GRID_SIZE + col]) {
                completed = false;
                break;
            }
        }
        lines.push(completed);
    }
    let mainDiagonal = true;
    for (let i = 0; i < GRID_SIZE; i++) {
        if (!completedCells[i * GRID_SIZE + i]) {
            mainDiagonal = false;
            break;
        }
    }
    lines.push(mainDiagonal);
    let secondaryDiagonal = true;
    for (let i = 0; i < GRID_SIZE; i++) {
        if (!completedCells[i * GRID_SIZE + (GRID_SIZE - 1 - i)]) {
            secondaryDiagonal = false;
            break;
        }
    }
    lines.push(secondaryDiagonal);
    return lines.filter(l => l === true).length;
}

function renderGrid() {
    const grid = document.getElementById('bingoGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    for (let i = 0; i < TOTAL_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        
        // Отмечаем, если текущий игрок отметил клетку
        const myPlayer = currentPlayers.find(p => p.id === currentPlayerId);
        if (myPlayer && myPlayer.completedCells[i]) {
            cell.classList.add('completed');
            cell.style.borderColor = myPlayer.color;
        }
        
        cell.innerHTML = `
            <div class="cell-number">${i + 1}</div>
            <div class="cell-text">${currentBoard[i] || 'Загрузка...'}</div>
            <div class="player-markers" id="markers-${i}"></div>
        `;
        
        cell.addEventListener('click', () => toggleCell(i));
        grid.appendChild(cell);
        
        // Добавляем маркеры игроков
        const markersContainer = document.getElementById(`markers-${i}`);
        if (markersContainer) {
            for (const player of currentPlayers) {
                if (player.completedCells[i]) {
                    const marker = document.createElement('div');
                    marker.className = 'marker';
                    marker.style.background = player.color;
                    marker.title = `${player.name} отметил`;
                    marker.textContent = '✓';
                    markersContainer.appendChild(marker);
                }
            }
        }
    }
    
    // Обновляем информацию о линиях для текущего игрока
    if (myPlayer) {
        const linesCount = checkBingoLinesForPlayer(myPlayer.completedCells);
        const linesContainer = document.getElementById('bingoLines');
        if (linesContainer) {
            linesContainer.innerHTML = `<div class="line-stat">Собрано линий: ${linesCount}</div>`;
            if (linesCount >= 5) {
                showMessage(`🎉 Бинго! ${myPlayer.name} собрал ${linesCount} линий! 🎉`);
            }
        }
    }
    
    updatePlayersDisplay();
}

function toggleCell(index) {
    if (!currentRoomId || !currentPlayerId) return;
    
    const myPlayer = currentPlayers.find(p => p.id === currentPlayerId);
    if (myPlayer) {
        myPlayer.completedCells[index] = !myPlayer.completedCells[index];
        sendUpdateToServer();
        renderGrid();
    }
}

function updatePlayersDisplay() {
    const container = document.getElementById('playersList');
    if (!container) return;
    
    container.innerHTML = '<strong>Игроки:</strong><br>';
    for (const player of currentPlayers) {
        const completedCount = player.completedCells.filter(c => c === true).length;
        const linesCount = checkBingoLinesForPlayer(player.completedCells);
        container.innerHTML += `
            <div class="player-tag" style="background: ${player.color}; ${player.id === currentPlayerId ? 'border: 2px solid white;' : ''}">
                ${player.name} ${player.id === currentPlayerId ? '(вы)' : ''}
                (${completedCount}/25, ${linesCount} линий)
            </div>
        `;
    }
}

async function sendUpdateToServer() {
    if (!currentRoomId || !currentPlayerId) return;
    
    try {
        const response = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: currentRoomId,
                playerId: currentPlayerId,
                completedCells: currentPlayers.find(p => p.id === currentPlayerId).completedCells
            })
        });
        await response.json();
    } catch (err) {
        console.error('Ошибка отправки:', err);
    }
}

async function syncWithServer() {
    if (!currentRoomId) return;
    
    try {
        const response = await fetch(`/api/sync/${currentRoomId}`);
        const data = await response.json();
        if (data.success) {
            currentPlayers = data.players;
            currentBoard = data.board;
            renderGrid();
        }
    } catch (err) {
        console.error('Ошибка синхронизации:', err);
    }
}

async function createRoom() {
    const playerName = prompt('Введите ваше имя:', 'Игрок');
    if (!playerName) return;
    
    const colorIndex = currentPlayers.length % playerColors.length;
    const playerColor = playerColors[colorIndex].bg;
    
    const newBoard = generateRandomBoard();
    
    try {
        const response = await fetch('/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerName: playerName,
                board: newBoard,
                color: playerColor
            })
        });
        const data = await response.json();
        
        if (data.success) {
            currentRoomId = data.roomId;
            currentPlayerId = data.playerId;
            currentPlayerColor = playerColor;
            currentBoard = newBoard;
            currentPlayers = [{ id: currentPlayerId, name: playerName, completedCells: new Array(25).fill(false), color: playerColor }];
            
            document.getElementById('roomCode').textContent = currentRoomId;
            document.getElementById('roomPanel').classList.remove('hidden');
            document.getElementById('mainMenu').classList.add('hidden');
            renderGrid();
            showMessage(`Комната создана! Код: ${currentRoomId}`);
            
            // Запускаем синхронизацию
            if (syncInterval) clearInterval(syncInterval);
            syncInterval = setInterval(syncWithServer, 2000);
        }
    } catch (err) {
        showMessage('Ошибка создания комнаты', true);
    }
}

async function joinRoom() {
    const roomId = document.getElementById('roomIdInput').value.toUpperCase();
    if (!roomId) {
        showMessage('Введите код комнаты', true);
        return;
    }
    
    const playerName = prompt('Введите ваше имя:', 'Игрок');
    if (!playerName) return;
    
    try {
        const response = await fetch('/api/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: roomId,
                playerName: playerName,
                color: playerColors[1].bg
            })
        });
        const data = await response.json();
        
        if (data.success) {
            currentRoomId = roomId;
            currentPlayerId = data.playerId;
            currentBoard = data.board;
            currentPlayers = data.players;
            
            document.getElementById('roomCode').textContent = currentRoomId;
            document.getElementById('roomPanel').classList.remove('hidden');
            document.getElementById('mainMenu').classList.add('hidden');
            renderGrid();
            showMessage('Вы присоединились к комнате!');
            
            // Запускаем синхронизацию
            if (syncInterval) clearInterval(syncInterval);
            syncInterval = setInterval(syncWithServer, 2000);
        } else {
            showMessage(data.error || 'Не удалось присоединиться', true);
        }
    } catch (err) {
        showMessage('Ошибка подключения к комнате', true);
    }
}

async function leaveRoom() {
    if (currentRoomId && currentPlayerId) {
        try {
            await fetch('/api/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: currentRoomId,
                    playerId: currentPlayerId
                })
            });
        } catch (err) {}
    }
    
    if (syncInterval) clearInterval(syncInterval);
    currentRoomId = null;
    currentPlayerId = null;
    currentPlayers = [];
    document.getElementById('roomPanel').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    currentBoard = generateRandomBoard();
    renderGrid();
}

function copyRoomCode() {
    const code = document.getElementById('roomCode').textContent;
    navigator.clipboard.writeText(code);
    showMessage('Код скопирован!');
}

let roomCodeHidden = false;
function hideCode() {
    const codeElement = document.getElementById('roomCode');
    if (roomCodeHidden) {
        codeElement.textContent = currentRoomId;
        roomCodeHidden = false;
    } else {
        codeElement.textContent = '••••••';
        roomCodeHidden = true;
    }
}

function newGame() {
    if (currentRoomId) {
        showMessage('В режиме комнаты новое поле создает создатель комнаты', true);
    } else {
        if (confirm('Создать новое поле?')) {
            currentBoard = generateRandomBoard();
            renderGrid();
            showMessage('Создано новое поле!');
        }
    }
}

function resetProgress() {
    if (currentRoomId) {
        showMessage('В режиме комнаты прогресс сбрасывается индивидуально', true);
    } else if (confirm('Сбросить все отметки?')) {
        // В одиночном режиме просто пересоздаем поле
        currentBoard = generateRandomBoard();
        renderGrid();
        showMessage('Прогресс сброшен!');
    }
}

function showMessage(text, isError = false) {
    const message = document.createElement('div');
    message.className = 'message';
    message.textContent = text;
    message.style.background = isError ? '#ff4444' : '#ff8c42';
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 3000);
}

// Оффлайн режим
function initOffline() {
    const savedBoard = localStorage.getItem('ror2_bingo_board');
    if (savedBoard) {
        currentBoard = JSON.parse(savedBoard);
    } else {
        currentBoard = generateRandomBoard();
    }
    renderGrid();
}

// Инициализация
function init() {
    document.getElementById('roomPanel').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    
    initOffline();
    
    document.getElementById('newGameBtn').addEventListener('click', newGame);
    document.getElementById('resetProgressBtn').addEventListener('click', resetProgress);
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    document.getElementById('leaveRoomBtn').addEventListener('click', leaveRoom);
    document.getElementById('copyCodeBtn').addEventListener('click', copyRoomCode);
    document.getElementById('hideCodeBtn').addEventListener('click', hideCode);
}

init();