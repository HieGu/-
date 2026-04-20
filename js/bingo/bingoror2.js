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
    "Пройти игру с артефактом изменения (Metamorphosis)", "Пройти игу с артефактом престижа (Prestige)"
];

const GRID_SIZE = 5;
const TOTAL_CELLS = 25;

let currentBoard = [];
let completedCells = [];
let currentSeed = null;
let seedExpireTimer = null;

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
    
    for (let i = 0; i < TOTAL_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = `bingo-cell ${completedCells[i] ? 'completed' : ''}`;
        cell.innerHTML = `
            <div class="cell-number">${i + 1}</div>
            <div class="cell-text">${currentBoard[i] || ''}</div>
        `;
        cell.addEventListener('click', () => toggleCell(i));
        grid.appendChild(cell);
    }
    
    const linesCount = countLines(completedCells);
    const linesContainer = document.getElementById('bingoLines');
    if (linesContainer) {
        linesContainer.innerHTML = `<div class="line-stat">Собрано линий: ${linesCount}</div>`;
        if (linesCount >= 5) showMessage(`Бинго! Вы собрали ${linesCount} линий!`);
    }
}

function toggleCell(index) {
    completedCells[index] = !completedCells[index];
    saveProgress();
    renderGrid();
    
    const linesCount = countLines(completedCells);
    if (linesCount >= 5 && completedCells.some(cell => cell === true)) {
        showMessage(`Бинго! Вы собрали ${linesCount} линий!`);
    }
}

function saveProgress() {
    localStorage.setItem('ror2_bingo_progress', JSON.stringify(completedCells));
    if (currentSeed) {
        localStorage.setItem('ror2_bingo_current_seed', currentSeed);
    }
}

function loadProgress() {
    const saved = localStorage.getItem('ror2_bingo_progress');
    if (saved) {
        completedCells = JSON.parse(saved);
    } else {
        completedCells = new Array(TOTAL_CELLS).fill(false);
    }
    
    const savedSeed = localStorage.getItem('ror2_bingo_current_seed');
    if (savedSeed) {
        currentSeed = savedSeed;
        updateSeedDisplay();
    }
}

function saveBoard() {
    localStorage.setItem('ror2_bingo_board', JSON.stringify(currentBoard));
}

function loadBoard() {
    const saved = localStorage.getItem('ror2_bingo_board');
    if (saved) {
        currentBoard = JSON.parse(saved);
    } else {
        currentBoard = generateRandomBoard();
        saveBoard();
    }
}

// Замените функции createSeed и loadSeed на эти:

async function createSeed() {
    // Кодируем поле бинго в строку для передачи в URL
    const boardString = JSON.stringify(currentBoard);
    const encodedBoard = btoa(encodeURIComponent(boardString));
    
    // Создаем короткий сид из первых 6 символов хеша
    let hash = 0;
    for (let i = 0; i < encodedBoard.length; i++) {
        hash = ((hash << 5) - hash) + encodedBoard.charCodeAt(i);
        hash = hash & hash;
    }
    const seed = Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
    
    // Сохраняем поле в localStorage с этим сидом
    const boardData = {
        board: currentBoard,
        createdAt: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 60 * 1000)
    };
    localStorage.setItem(`seed_${seed}`, JSON.stringify(boardData));
    
    currentSeed = seed;
    localStorage.setItem('ror2_bingo_current_seed', currentSeed);
    updateSeedDisplay();
    
    // Создаем ссылку с сидом в URL
    const url = `${window.location.origin}${window.location.pathname}?seed=${seed}`;
    navigator.clipboard.writeText(url);
    
    showMessage(`Сид ${seed} создан! Ссылка скопирована. Действует 5 часов.`);
}

async function loadSeed() {
    const seedInput = document.getElementById('seedInput');
    const seed = seedInput.value.trim().toUpperCase();
    
    if (!seed || seed.length !== 6) {
        showMessage('Введите 6-значный сид', true);
        return;
    }
    
    // Пытаемся загрузить поле из localStorage
    const savedData = localStorage.getItem(`seed_${seed}`);
    
    if (savedData) {
        const data = JSON.parse(savedData);
        const now = Date.now();
        
        if (data.expiresAt > now) {
            currentBoard = data.board;
            currentSeed = seed;
            completedCells = new Array(TOTAL_CELLS).fill(false);
            saveBoard();
            saveProgress();
            localStorage.setItem('ror2_bingo_current_seed', currentSeed);
            renderGrid();
            updateSeedDisplay();
            
            const hoursLeft = Math.floor((data.expiresAt - now) / (60 * 60 * 1000));
            const minutesLeft = Math.floor(((data.expiresAt - now) % (60 * 60 * 1000)) / (60 * 1000));
            showMessage(`Поле загружено! Сид: ${seed} (действует ещё ${hoursLeft}ч ${minutesLeft}м)`);
            
            seedInput.value = '';
        } else {
            localStorage.removeItem(`seed_${seed}`);
            showMessage('Сид истёк (5 часов прошло)', true);
        }
    } else {
        showMessage('Сид не найден. Убедитесь, что вы правильно скопировали код.', true);
    }
}

// Функция для загрузки сида из URL
function loadSeedFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const seed = urlParams.get('seed');
    
    if (seed) {
        const savedData = localStorage.getItem(`seed_${seed}`);
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.expiresAt > Date.now()) {
                currentBoard = data.board;
                currentSeed = seed;
                completedCells = new Array(TOTAL_CELLS).fill(false);
                saveBoard();
                saveProgress();
                localStorage.setItem('ror2_bingo_current_seed', currentSeed);
                renderGrid();
                updateSeedDisplay();
                showMessage(`Автоматически загружено поле по сиду: ${seed}`);
            } else {
                localStorage.removeItem(`seed_${seed}`);
                showMessage('Сид истёк (5 часов прошло)', true);
            }
        } else {
            // Если сид не найден в localStorage, пробуем восстановить из ссылки
            showMessage(`Сид ${seed} не найден. Возможно, он был создан на другом устройстве.`, true);
        }
        // Очищаем URL от параметров
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// В функцию init() добавьте вызов:
function init() {
    loadBoard();
    loadProgress();
    renderGrid();
    loadSeedFromURL();
    
    // Остальной код инициализации кнопок...
    const createSeedBtn = document.getElementById('createSeedBtn');
    const loadSeedBtn = document.getElementById('loadSeedBtn');
    const copySeedBtn = document.getElementById('copySeedBtn');
    const clearSeedBtn = document.getElementById('clearSeedBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const resetBtn = document.getElementById('resetProgressBtn');
    
    if (createSeedBtn) createSeedBtn.onclick = createSeed;
    if (loadSeedBtn) loadSeedBtn.onclick = loadSeed;
    if (copySeedBtn) copySeedBtn.onclick = copySeed;
    if (clearSeedBtn) clearSeedBtn.onclick = clearSeed;
    if (newGameBtn) newGameBtn.onclick = newGame;
    if (resetBtn) resetBtn.onclick = resetProgress;
}
function updateSeedDisplay() {
    const seedPanel = document.getElementById('seedPanel');
    const mainMenu = document.getElementById('mainMenu');
    const seedCode = document.getElementById('seedCode');
    const seedInfo = document.getElementById('seedInfo');
    
    if (currentSeed) {
        seedPanel.classList.remove('hidden');
        mainMenu.classList.add('hidden');
        seedCode.textContent = currentSeed;
        seedInfo.innerHTML = `Сид активен 5 часов с момента создания`;
        startSeedTimer();
    } else {
        seedPanel.classList.add('hidden');
        mainMenu.classList.remove('hidden');
        if (seedExpireTimer) clearInterval(seedExpireTimer);
    }
}

function startSeedTimer() {
    if (seedExpireTimer) clearInterval(seedExpireTimer);
    
    seedExpireTimer = setInterval(async () => {
        if (currentSeed) {
            try {
                const response = await fetch(`/api/info/${currentSeed}`);
                const data = await response.json();
                
                if (data.exists === false) {
                    clearSeed();
                    showMessage(`Сид ${currentSeed} истек. Создайте новый.`, true);
                } else if (data.exists && data.timeLeftMs) {
                    const hours = Math.floor(data.timeLeftMs / (60 * 60 * 1000));
                    const minutes = Math.floor((data.timeLeftMs % (60 * 60 * 1000)) / (60 * 1000));
                    const seedInfo = document.getElementById('seedInfo');
                    if (seedInfo) {
                        seedInfo.innerHTML = `Сид активен ещё ${hours}ч ${minutes}м`;
                    }
                }
            } catch (err) {
                console.error('Ошибка проверки сида:', err);
            }
        }
    }, 60000);
}

function clearSeed() {
    currentSeed = null;
    localStorage.removeItem('ror2_bingo_current_seed');
    updateSeedDisplay();
    showMessage('Сид очищен');
}

function copySeed() {
    if (currentSeed) {
        navigator.clipboard.writeText(currentSeed);
        showMessage('Сид скопирован');
    }
}

function newGame() {
    if (confirm('Создать новое поле? Весь текущий прогресс будет потерян.')) {
        currentBoard = generateRandomBoard();
        completedCells = new Array(TOTAL_CELLS).fill(false);
        currentSeed = null;
        saveBoard();
        saveProgress();
        localStorage.removeItem('ror2_bingo_current_seed');
        updateSeedDisplay();
        renderGrid();
        showMessage('Создано новое поле бинго');
    }
}

function resetProgress() {
    if (confirm('Сбросить все зачеркивания? Испытания на поле останутся те же.')) {
        completedCells = new Array(TOTAL_CELLS).fill(false);
        saveProgress();
        renderGrid();
        showMessage('Прогресс сброшен');
    }
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
    loadBoard();
    loadProgress();
    renderGrid();
    
    const savedSeed = localStorage.getItem('ror2_bingo_current_seed');
    if (savedSeed) {
        currentSeed = savedSeed;
        updateSeedDisplay();
    }
    
    document.getElementById('createSeedBtn').onclick = createSeed;
    document.getElementById('loadSeedBtn').onclick = loadSeed;
    document.getElementById('copySeedBtn').onclick = copySeed;
    document.getElementById('clearSeedBtn').onclick = clearSeed;
    document.getElementById('newGameBtn').onclick = newGame;
    document.getElementById('resetProgressBtn').onclick = resetProgress;
}

init();