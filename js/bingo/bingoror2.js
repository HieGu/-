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
let completedCells = [];

// Загрузка сохраненного состояния
function loadSavedState() {
    const savedBoard = localStorage.getItem('ror2_bingo_board');
    const savedProgress = localStorage.getItem('ror2_bingo_progress');
    
    if (savedBoard) {
        currentBoard = JSON.parse(savedBoard);
    } else {
        generateRandomBoard();
    }
    
    if (savedProgress) {
        completedCells = JSON.parse(savedProgress);
    } else {
        completedCells = new Array(TOTAL_CELLS).fill(false);
    }
}

// Генерация случайного поля без повторений
function generateRandomBoard() {
    // Перемешиваем массив испытаний
    const shuffled = [...challenges];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Берем первые 25 испытаний
    currentBoard = shuffled.slice(0, TOTAL_CELLS);
    
    // Если не хватает испытаний (мало в списке), добавляем заглушки
    while (currentBoard.length < TOTAL_CELLS) {
        currentBoard.push("Дополнительное испытание");
    }
    
    saveBoard();
}

// Сохранение поля
function saveBoard() {
    localStorage.setItem('ror2_bingo_board', JSON.stringify(currentBoard));
}

// Сохранение прогресса
function saveProgress() {
    localStorage.setItem('ror2_bingo_progress', JSON.stringify(completedCells));
}

// Проверка бинго линий
function checkBingoLines() {
    const lines = [];
    
    // Горизонтальные линии
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
    
    // Вертикальные линии
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
    
    // Главная диагональ
    let mainDiagonal = true;
    for (let i = 0; i < GRID_SIZE; i++) {
        if (!completedCells[i * GRID_SIZE + i]) {
            mainDiagonal = false;
            break;
        }
    }
    lines.push({ type: 'diag', index: 'main', completed: mainDiagonal });
    
    // Побочная диагональ
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

// Подсчет количества завершенных линий
function getCompletedLinesCount() {
    const lines = checkBingoLines();
    return lines.filter(line => line.completed).length;
}

// Отображение линий бинго
function renderBingoLines() {
    const lines = checkBingoLines();
    const container = document.getElementById('bingoLines');
    
    const lineNames = {
        'row-0': 'Строка 1',
        'row-1': 'Строка 2',
        'row-2': 'Строка 3',
        'row-3': 'Строка 4',
        'row-4': 'Строка 5',
        'col-0': 'Столбец 1',
        'col-1': 'Столбец 2',
        'col-2': 'Столбец 3',
        'col-3': 'Столбец 4',
        'col-4': 'Столбец 5',
        'diag-main': 'Главная диагональ',
        'diag-secondary': 'Побочная диагональ'
    };
    
    container.innerHTML = lines.map(line => {
        const key = `${line.type}-${line.index}`;
        const name = lineNames[key] || `${line.type} ${line.index}`;
        return `<div class="line-stat ${line.completed ? 'completed' : ''}">${name} ${line.completed ? '✓' : ''}</div>`;
    }).join('');
}

// Отображение сетки бинго
function renderGrid() {
    const grid = document.getElementById('bingoGrid');
    grid.innerHTML = '';
    
    for (let i = 0; i < TOTAL_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = `bingo-cell ${completedCells[i] ? 'completed' : ''}`;
        cell.innerHTML = `
            <div class="cell-number">${i + 1}</div>
            <div class="cell-text">${currentBoard[i] || 'Загрузка...'}</div>
        `;
        cell.addEventListener('click', () => toggleCell(i));
        grid.appendChild(cell);
    }
    
    renderBingoLines();
}

// Переключение состояния клетки
function toggleCell(index) {
    completedCells[index] = !completedCells[index];
    saveProgress();
    renderGrid();
    
    // Проверяем, собрал ли игрок бинго
    const completedLines = getCompletedLinesCount();
    if (completedLines > 0 && completedCells.some(cell => cell === true)) {
        showMessage(`🎉 Бинго! Вы собрали ${completedLines} линий! 🎉`);
    }
}

// Новая игра (рандомизация поля)
function newGame() {
    if (confirm('Создать новое поле? Весь текущий прогресс будет потерян.')) {
        generateRandomBoard();
        completedCells = new Array(TOTAL_CELLS).fill(false);
        saveProgress();
        renderGrid();
        showMessage('🔄 Создано новое поле бинго!');
    }
}

// Сброс прогресса (очистка зачеркиваний)
function resetProgress() {
    if (confirm('Сбросить все зачеркивания? Испытания на поле останутся те же.')) {
        completedCells = new Array(TOTAL_CELLS).fill(false);
        saveProgress();
        renderGrid();
        showMessage('🗑️ Прогресс сброшен!');
    }
}

// Показать временное сообщение
function showMessage(text) {
    const message = document.createElement('div');
    message.className = 'message';
    message.textContent = text;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Инициализация
function init() {
    loadSavedState();
    renderGrid();
    
    document.getElementById('newGameBtn').addEventListener('click', newGame);
    document.getElementById('resetProgressBtn').addEventListener('click', resetProgress);
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', init);