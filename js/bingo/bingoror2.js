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

// Состояние игры
let currentBoard = [];
let currentPlayers = [];
let currentPlayerId = null;
let currentRoomId = null;
let ws = null;
let roomCodeHidden = false;

// DOM элементы
let currentBoardData = [];

// Генерация случайного поля без повторений
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

// Получить клетки игрока
function getPlayerCompletedCells(playerId) {
    const player = currentPlayers.find(p => p.id === playerId);
    return player ? player.completedCells : new Array(TOTAL_CELLS).fill(false);
}

// Проверка бинго линий для конкретного игрока
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
        lines.push({ type: 'row', index: row, completed });
    }
    
    for (let col = 0; col < GRID_SIZE; col++) {
        let completed = true;
        for (let row = 0; row < GRID_SIZE; row++) {
            if (!completedCells[row * GRID_SIZE + col]) {
                completed = false;
                break;
            }
        }
        lines.push({ type: 'col', index: col, completed });
    }
    
    let mainDiagonal = true;
    for (let i = 0; i < GRID_SIZE; i++) {
        if (!completedCells[i * GRID_SIZE + i]) {
            mainDiagonal = false;
            break;
        }
    }
    lines.push({ type: 'diag', index: 'main', completed: mainDiagonal });
    
    let secondaryDiagonal = true;
    for (let i = 0; i < GRID_SIZE; i++) {
        if (!completedCells[i * GRID_SIZE + (GRID_SIZE - 1 - i)]) {
            secondaryDiagonal = false;
            break;
        }
    }
    lines.push({ type: 'diag', index: 'secondary', completed: secondaryDiagonal });
    
    return lines;
}

function getCompletedLinesCountForPlayer(completedCells) {
    const lines = checkBingoLinesForPlayer(completedCells);
    return lines.filter(line => line.completed).length;
}

function renderBingoLinesForPlayer(completedCells) {
    const lines = checkBingoLinesForPlayer(completedCells);
    const container = document.getElementById('bingoLines');
    
    const lineNames = {
        'row-0': 'Строка 1', 'row-1': 'Строка 2', 'row-2': 'Строка 3',
        'row-3': 'Строка 4', 'row-4': 'Строка 5',
        'col-0': 'Столбец 1', 'col-1': 'Столбец 2', 'col-2': 'Столбец 3',
        'col-3': 'Столбец 4', 'col-4': 'Столбец 5',
        'diag-main': 'Главная диагональ',
        'diag-secondary': 'Побочная диагональ'
    };
    
    container.innerHTML = lines.map(line => {
        const key = `${line.type}-${line.index}`;
        const name = lineNames[key] || `${line.type} ${line.index}`;
        return `<div class="line-stat ${line.completed ? 'completed' : ''}">${name} ${line.completed ? '✓' : ''}</div>`;
    }).join('');
}

function renderGrid() {
    const grid = document.getElementById('bingoGrid');
    grid.innerHTML = '';
    
    const myCompletedCells = getPlayerCompletedCells(currentPlayerId);
    
    for (let i = 0; i < TOTAL_CELLS; i++) {
        const cell = document.createElement('div');
        const isCompleted = myCompletedCells[i];
        cell.className = `bingo-cell ${isCompleted ? 'completed' : ''}`;
        cell.innerHTML = `
            <div class="cell-number">${i + 1}</div>
            <div class="cell-text">${currentBoard[i] || 'Загрузка...'}</div>
        `;
        
        // Показываем кто отметил клетку
        const markedBy = [];
        for (const player of currentPlayers) {
            if (player.completedCells[i]) {
                markedBy.push(player.name);
            }
        }
        if (markedBy.length > 0) {
            const markerDiv = document.createElement('div');
            markerDiv.style.cssText = 'font-size: 0.6rem; color: #ff8c42; margin-top: 0.3rem;';
            markerDiv.textContent = `✓ ${markedBy.join(', ')}`;
            cell.appendChild(markerDiv);
        }
        
        cell.addEventListener('click', () => toggleCell(i));
        grid.appendChild(cell);
    }
    
    renderBingoLinesForPlayer(myCompletedCells);
    
    // Обновляем список игроков
    updatePlayersDisplay();
}

function toggleCell(index) {
    if (ws && currentRoomId) {
        const currentCompleted = getPlayerCompletedCells(currentPlayerId)[index];
        ws.send(JSON.stringify({
            type: 'toggle_cell',
            cellIndex: index,
            completed: !currentCompleted
        }));
    }
}

function updatePlayersDisplay() {
    const container = document.getElementById('playersList');
    if (!container) return;
    
    container.innerHTML = `<strong>Игроки (${currentPlayers.length}/2):</strong><br>`;
    for (const player of currentPlayers) {
        const completedCount = player.completedCells.filter(c => c === true).length;
        const linesCount = getCompletedLinesCountForPlayer(player.completedCells);
        container.innerHTML += `<div class="player-tag ${player.id === currentPlayerId ? 'you' : ''}">
            ${player.name} ${player.id === currentPlayerId ? '(вы)' : ''}
            <span class="player-progress">(${completedCount}/25 клеток, ${linesCount} линий)</span>
        </div>`;
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

// WebSocket функции
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'room_created':
                currentRoomId = data.roomId;
                currentPlayerId = data.playerId;
                currentBoard = data.board;
                currentPlayers = data.players;
                document.getElementById('roomCode').textContent = currentRoomId;
                document.getElementById('roomPanel').classList.remove('hidden');
                document.getElementById('mainMenu').classList.add('hidden');
                renderGrid();
                showMessage(`Комната создана! Код: ${currentRoomId}`);
                break;
                
            case 'room_joined':
                currentRoomId = data.roomId;
                currentPlayerId = data.playerId;
                currentBoard = data.board;
                currentPlayers = data.players;
                document.getElementById('roomPanel').classList.remove('hidden');
                document.getElementById('mainMenu').classList.add('hidden');
                renderGrid();
                showMessage('Вы присоединились к комнате!');
                break;
                
            case 'player_joined':
                currentPlayers = data.players;
                renderGrid();
                showMessage(`Новый игрок присоединился!`);
                break;
                
            case 'cell_updated':
                currentPlayers = data.players;
                renderGrid();
                // Анимация обновления
                const cells = document.querySelectorAll('.bingo-cell');
                if (cells[data.cellIndex]) {
                    cells[data.cellIndex].classList.add('cell-updated');
                    setTimeout(() => cells[data.cellIndex].classList.remove('cell-updated'), 500);
                }
                showMessage(`${data.playerName} ${data.completed ? 'отметил' : 'снял отметку'} с клетки ${data.cellIndex + 1}`);
                break;
                
            case 'player_left':
                currentPlayers = data.players;
                renderGrid();
                showMessage('Игрок покинул комнату');
                break;
                
            case 'game_reset':
                currentPlayers = data.players;
                renderGrid();
                showMessage('Прогресс сброшен!');
                break;
                
            case 'new_board_created':
                currentBoard = data.board;
                currentPlayers = data.players;
                renderGrid();
                showMessage('Создано новое поле бинго!');
                break;
                
            case 'error':
                showMessage(data.message, true);
                break;
        }
    };
}

function createRoom() {
    const playerName = prompt('Введите ваше имя:', 'Игрок');
    if (!playerName) return;
    
    const newBoard = generateRandomBoard();
    connectWebSocket();
    
    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'create_room',
            playerName: playerName,
            board: newBoard
        }));
    };
}

function joinRoom() {
    const roomId = document.getElementById('roomIdInput').value.toUpperCase();
    if (!roomId) {
        showMessage('Введите код комнаты', true);
        return;
    }
    
    const playerName = prompt('Введите ваше имя:', 'Игрок');
    if (!playerName) return;
    
    connectWebSocket();
    
    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'join_room',
            roomId: roomId,
            playerName: playerName
        }));
    };
}

function leaveRoom() {
    if (ws) {
        ws.send(JSON.stringify({ type: 'leave_room' }));
        ws.close();
    }
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
    showMessage('Код скопирован в буфер обмена!');
}

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
    if (currentRoomId && ws) {
        if (confirm('Создать новое поле? Весь текущий прогресс будет потерян.')) {
            const newBoard = generateRandomBoard();
            ws.send(JSON.stringify({
                type: 'new_board',
                board: newBoard
            }));
        }
    } else {
        if (confirm('Создать новое поле? Весь текущий прогресс будет потерян.')) {
            currentBoard = generateRandomBoard();
            renderGrid();
            showMessage('🔄 Создано новое поле бинго!');
        }
    }
}

function resetProgress() {
    if (currentRoomId && ws) {
        if (confirm('Сбросить все зачеркивания?')) {
            ws.send(JSON.stringify({ type: 'reset_game' }));
        }
    } else {
        if (confirm('Сбросить все зачеркивания?')) {
            // В оффлайн режиме просто сбрасываем локальный прогресс
            showMessage('В одиночном режиме используйте "Новая игра" для создания нового поля');
        }
    }
}

// Инициализация оффлайн режима
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
    // Скрываем панель комнаты по умолчанию
    document.getElementById('roomPanel').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    
    // Загружаем оффлайн режим
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