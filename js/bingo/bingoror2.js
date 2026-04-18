const challenges = [
    "Три раза подряд потерпите неудачу в Святилище Удачи",
    "Иметь при себе три разных активки", "Найти Аспект", "Выбить предмет с босса",
    "Найти потайную комнату в Заброшенном акведуке", "Иметь при себе 6 турелей",
    "Заскрапить 6 турелей/дронов в одном утилизаторе дронов", "Вернуться на первый этап",
    "Взять два предмета 'Формованное стекло'", "Взять 5 предметов синего качества",
    "Собрать в забеге 2 одинаковых красных предмета", "Приготовить у повара 10 предметов",
    "Сделать скрап каждой категории", "Приготовить блюдо", "Уничтожить себя у Обелиска",
    "Открыть защитный сундук с таймером на месте сбора 'Дельта'", "Умереть два раза за один забег",
    "Победите уникального стража Позолоченного берега", "Победить Ложного сына",
    "Улучшить Святилище Лесов до предела", "Соберите 5 разных дронов",
    "Победите Ложного сына, Сердце Сола, Митрикса и Пустотника за один забег",
    "Победить Сердце Сола", "Победить Митрикса", "Победить Пустотника",
    "На каждой локации найти алтарь Тритонов и нажать его", "Пройти Поля Пустоты",
    "Попасть в Межвременной базар", "Попасть в Целостное мгновение",
    "Иметь при себе 5 одинаковых дронов",
    "Пройти игру с артефактом возмездия (Vengeance)", "Пройти игру с артефактом эволюции (Evolution)",
    "Пройти игру с артефактом чести (Honor)", "Пройти игру с артефактом тайны (Enigma)",
    "Пройти игру с артефактом изменения (Metamorphosis)", "Пройти игру с артефактом престижа (Prestige)"
];

const GRID_SIZE = 5;
const TOTAL_CELLS = 25;

let currentBoard = [];
let currentPlayers = [];
let currentPlayerId = null;
let currentRoomId = null;
let ws = null;

function generateRandomBoard() {
    const shuffled = [...challenges];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    currentBoard = shuffled.slice(0, TOTAL_CELLS);
    while (currentBoard.length < TOTAL_CELLS) currentBoard.push("Дополнительное испытание");
    return currentBoard;
}

function countLines(completedCells) {
    let lines = 0;
    for (let i = 0; i < 5; i++) {
        if (completedCells[i*5] && completedCells[i*5+1] && completedCells[i*5+2] && completedCells[i*5+3] && completedCells[i*5+4]) lines++;
        if (completedCells[i] && completedCells[i+5] && completedCells[i+10] && completedCells[i+15] && completedCells[i+20]) lines++;
    }
    if (completedCells[0] && completedCells[6] && completedCells[12] && completedCells[18] && completedCells[24]) lines++;
    if (completedCells[4] && completedCells[8] && completedCells[12] && completedCells[16] && completedCells[20]) lines++;
    return lines;
}

function renderGrid() {
    const grid = document.getElementById('bingoGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const myPlayer = currentPlayers.find(p => p.id === currentPlayerId);
    
    for (let i = 0; i < TOTAL_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        if (myPlayer && myPlayer.completedCells[i]) cell.classList.add('completed');
        
        cell.innerHTML = `<div class="cell-number">${i + 1}</div>
                         <div class="cell-text">${currentBoard[i] || ''}</div>
                         <div class="player-markers" id="markers-${i}"></div>`;
        cell.addEventListener('click', () => toggleCell(i));
        grid.appendChild(cell);
        
        const markers = document.getElementById(`markers-${i}`);
        if (markers) {
            for (const p of currentPlayers) {
                if (p.completedCells[i]) {
                    const marker = document.createElement('div');
                    marker.className = 'marker';
                    marker.style.background = p.id === currentPlayerId ? '#ff8c42' : '#4ecdc4';
                    marker.title = p.name;
                    marker.textContent = '✓';
                    markers.appendChild(marker);
                }
            }
        }
    }
    
    if (myPlayer) {
        const linesCount = countLines(myPlayer.completedCells);
        document.getElementById('bingoLines').innerHTML = `<div class="line-stat">Собрано линий: ${linesCount}</div>`;
        if (linesCount >= 5) showMessage(`Бинго! ${myPlayer.name} собрал ${linesCount} линий!`);
    }
    
    const playersDiv = document.getElementById('playersList');
    if (playersDiv) {
        playersDiv.innerHTML = '<strong>Игроки:</strong><br>';
        for (const p of currentPlayers) {
            const completed = p.completedCells.filter(c => c).length;
            playersDiv.innerHTML += `<div class="player-tag ${p.id === currentPlayerId ? 'you' : ''}">
                ${p.name} ${p.id === currentPlayerId ? '(вы)' : ''} (${completed}/25, ${countLines(p.completedCells)} линий)
            </div>`;
        }
    }
}

function toggleCell(index) {
    if (!ws || !currentRoomId || !currentPlayerId) return;
    const myPlayer = currentPlayers.find(p => p.id === currentPlayerId);
    if (myPlayer) {
        ws.send(JSON.stringify({
            type: 'toggle_cell',
            cellIndex: index,
            completed: !myPlayer.completedCells[index]
        }));
    }
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Получено:', data.type);
        
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
                document.getElementById('roomCode').textContent = currentRoomId;
                document.getElementById('roomPanel').classList.remove('hidden');
                document.getElementById('mainMenu').classList.add('hidden');
                renderGrid();
                showMessage('Вы присоединились к комнате!');
                break;
                
            case 'player_joined':
                currentPlayers = data.players;
                renderGrid();
                showMessage('Новый игрок присоединился!');
                break;
                
            case 'cell_updated':
                currentPlayers = data.players;
                renderGrid();
                const cell = document.querySelector(`.bingo-cell:nth-child(${data.cellIndex + 1})`);
                if (cell) {
                    cell.style.animation = 'flash 0.3s ease';
                    setTimeout(() => cell.style.animation = '', 300);
                }
                break;
                
            case 'player_left':
                currentPlayers = data.players;
                renderGrid();
                showMessage('Игрок покинул комнату');
                break;
                
            case 'board_updated':
                currentBoard = data.board;
                currentPlayers = data.players;
                renderGrid();
                showMessage('Создано новое поле!');
                break;
                
            case 'game_reset':
                currentPlayers = data.players;
                renderGrid();
                showMessage('Прогресс сброшен!');
                break;
                
            case 'error':
                showMessage(data.message, true);
                break;
        }
    };
    
    ws.onerror = () => showMessage('Ошибка соединения', true);
    ws.onclose = () => {
        if (currentRoomId) showMessage('Соединение потеряно', true);
    };
}

function createRoom() {
    const playerName = prompt('Введите ваше имя:', 'Игрок');
    if (!playerName) return;
    
    const newBoard = generateRandomBoard();
    connectWebSocket();
    
    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'create_room', playerName: playerName, board: newBoard }));
    };
}

function joinRoom() {
    const roomId = document.getElementById('roomIdInput').value;
    if (!roomId) { showMessage('Введите код комнаты', true); return; }
    
    const playerName = prompt('Введите ваше имя:', 'Игрок');
    if (!playerName) return;
    
    connectWebSocket();
    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join_room', roomId: roomId, playerName: playerName }));
    };
}

function leaveRoom() {
    if (ws) ws.send(JSON.stringify({ type: 'leave_room' }));
    if (ws) ws.close();
    currentRoomId = null;
    currentPlayerId = null;
    currentPlayers = [];
    document.getElementById('roomPanel').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    initOffline();
}

function copyRoomCode() {
    const code = document.getElementById('roomCode').textContent;
    navigator.clipboard.writeText(code);
    showMessage('Код скопирован!');
}

function newGame() {
    if (currentRoomId && ws) {
        const newBoard = generateRandomBoard();
        ws.send(JSON.stringify({ type: 'new_board', board: newBoard }));
    } else {
        if (confirm('Создать новое поле?')) {
            currentBoard = generateRandomBoard();
            renderGrid();
            showMessage('Новое поле создано!');
        }
    }
}

function resetProgress() {
    if (currentRoomId && ws) {
        ws.send(JSON.stringify({ type: 'reset_game' }));
    } else if (confirm('Сбросить все отметки?')) {
        currentBoard = generateRandomBoard();
        renderGrid();
        showMessage('Прогресс сброшен!');
    }
}

function initOffline() {
    const saved = localStorage.getItem('ror2_bingo_board');
    currentBoard = saved ? JSON.parse(saved) : generateRandomBoard();
    currentPlayers = [{ id: 'offline', name: 'Вы', completedCells: new Array(25).fill(false) }];
    currentPlayerId = 'offline';
    renderGrid();
}

function showMessage(text, isError = false) {
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = text;
    msg.style.background = isError ? '#ff4444' : '#ff8c42';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

function init() {
    const roomPanel = document.getElementById('roomPanel');
    const mainMenu = document.getElementById('mainMenu');
    
    if (roomPanel && mainMenu) {
        roomPanel.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    }
    
    initOffline();
    
    const createBtn = document.getElementById('createRoomBtn');
    const joinBtn = document.getElementById('joinRoomBtn');
    const leaveBtn = document.getElementById('leaveRoomBtn');
    const copyBtn = document.getElementById('copyCodeBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const resetBtn = document.getElementById('resetProgressBtn');
    
    if (createBtn) createBtn.onclick = createRoom;
    if (joinBtn) joinBtn.onclick = joinRoom;
    if (leaveBtn) leaveBtn.onclick = leaveRoom;
    if (copyBtn) copyBtn.onclick = copyRoomCode;
    if (newGameBtn) newGameBtn.onclick = newGame;
    if (resetBtn) resetBtn.onclick = resetProgress;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}