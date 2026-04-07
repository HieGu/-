// Универсальный модуль для работы колеса и истории (localStorage)

let spinning = false;
let animationId = null;
let currentRotation = 0;
let targetRotation = 0;
let spinStartTime = 0;
let spinDuration = 2000; // 2 секунды вращения

function initWheel(wheelsArray, gameKey) {
    let currentWheelIndex = 0;
    let spinCount = 0;
    let history = [];
    let canvas = document.getElementById('wheelCanvas');
    let ctx = canvas ? canvas.getContext('2d') : null;
    
    // Размер canvas
    let size = 500;
    if (canvas) {
        canvas.width = size;
        canvas.height = size;
    }
    
    let centerX = size / 2;
    let centerY = size / 2;
    let radius = size / 2 - 10;
    
    const wheelSelect = document.getElementById('wheelSelect');
    const spinBtn = document.getElementById('spinBtn');
    const resultSpan = document.getElementById('result');
    const countSpan = document.getElementById('count');
    const historyList = document.getElementById('historyList');
    const clearBtn = document.getElementById('clearHistoryBtn');

    // Новая палитра однотонных, но различимых цветов (пастельные тона)
    const colors = [
        '#FFB3BA', // пастельный розовый
        '#B5EAD7', // пастельный зеленый
        '#FFDAC1', // пастельный оранжевый
        '#E2F0CB', // пастельный салатовый
        '#B5E3FF', // пастельный голубой
        '#FFC8DD', // пастельный розовый
        '#C7E9FB', // пастельный синий
        '#FFF5BA', // пастельный желтый
        '#D4B8D4', // пастельный фиолетовый
        '#FFB7B2', // пастельный коралловый
        '#B5E3D6', // пастельный мятный
        '#FFD6B5', // пастельный персиковый
        '#C5E0D4', // пастельный мятный
        '#FFC7C7', // пастельный красный
        '#E0D4FF', // пастельный лавандовый
        '#FFDFBF', // пастельный абрикосовый
        '#BDE0FE', // пастельный голубой
        '#FBC8B5', // пастельный лососевый
        '#C1E1C1', // пастельный зеленый
        '#FFB5A7'  // пастельный коралловый
    ];

    // Загрузка данных из localStorage
    function loadData() {
        const saved = localStorage.getItem(`wheel_${gameKey}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                spinCount = data.spinCount || 0;
                history = data.history || [];
                currentWheelIndex = data.currentWheelIndex || 0;
                if (wheelSelect) wheelSelect.value = currentWheelIndex;
            } catch(e) {}
        }
        updateUI();
        drawWheel();
    }

    function saveData() {
        const data = {
            spinCount: spinCount,
            history: history,
            currentWheelIndex: currentWheelIndex
        };
        localStorage.setItem(`wheel_${gameKey}`, JSON.stringify(data));
    }

    function updateUI() {
        countSpan.textContent = spinCount;
        renderHistory();
    }

    function renderHistory() {
        if (!historyList) return;
        historyList.innerHTML = '';
        const recent = [...history].reverse().slice(0, 20);
        recent.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.item} (${item.wheelName})`;
            historyList.appendChild(li);
        });
    }

    function addToHistory(item, wheelName) {
        history.push({
            item: item,
            wheelName: wheelName,
            timestamp: Date.now()
        });
        if (history.length > 100) history.shift();
        saveData();
        updateUI();
    }

    function getCurrentWheelItems() {
        const idx = wheelSelect ? parseInt(wheelSelect.value) : currentWheelIndex;
        if (isNaN(idx)) return [];
        return wheelsArray[idx] || [];
    }

    function getCurrentWheelName() {
        const idx = wheelSelect ? parseInt(wheelSelect.value) : currentWheelIndex;
        if (wheelSelect && wheelSelect.options[idx]) {
            return wheelSelect.options[idx].text;
        }
        return `Колесо ${idx+1}`;
    }

    // Улучшенная функция определения выбранного элемента по углу вращения
    function getSelectedItem(rotation) {
        const items = getCurrentWheelItems();
        if (items.length === 0) return null;
        
        const angleStep = (Math.PI * 2) / items.length;
        
        // Указатель находится сверху (12 часов) - угол -90 градусов или 270 градусов в радианах
        const pointerAngle = -Math.PI / 2; // -90 градусов
        
        // Получаем угол, на который повернуто колесо
        let wheelRotation = rotation % (Math.PI * 2);
        
        // Вычисляем, какой сегмент находится под указателем
        let segmentAngle = (pointerAngle - wheelRotation + Math.PI * 2) % (Math.PI * 2);
        
        // Определяем индекс сегмента
        let selectedIndex = Math.floor(segmentAngle / angleStep);
        
        // Проверка на граничные случаи
        if (segmentAngle % angleStep < 0.01) {
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        }
        
        selectedIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));
        
        return {
            index: selectedIndex,
            item: items[selectedIndex],
            angle: segmentAngle,
            step: angleStep
        };
    }

    // Отрисовка колеса с однотонными сегментами
    function drawWheel() {
        if (!ctx) return;
        
        const items = getCurrentWheelItems();
        if (items.length === 0) {
            ctx.clearRect(0, 0, size, size);
            ctx.fillStyle = '#f0e0c0';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#666';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Нет данных', centerX, centerY);
            return;
        }
        
        const angleStep = (Math.PI * 2) / items.length;
        
        ctx.clearRect(0, 0, size, size);
        
        // Рисуем сегменты
        for (let i = 0; i < items.length; i++) {
            const startAngle = i * angleStep + currentRotation;
            const endAngle = (i + 1) * angleStep + currentRotation;
            
            // Рисуем сегмент
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            
            // Однотонные цвета
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            
            // Черная обводка для четкого разделения
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Рисуем разделительные линии (белые)
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle);
            ctx.lineTo(centerX, centerY);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        // Рисуем текст на сегментах
        for (let i = 0; i < items.length; i++) {
            const startAngle = i * angleStep + currentRotation;
            const midAngle = startAngle + angleStep / 2;
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(midAngle);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            let text = items[i];
            // Укорачиваем текст если слишком длинный
            if (text.length > 18) {
                text = text.substring(0, 15) + '...';
            }
            
            ctx.font = "bold 13px 'Segoe UI', Arial";
            ctx.fillStyle = "#2c3e50"; // Темный текст для читаемости
            ctx.shadowBlur = 0;
            
            // Добавляем белую обводку для лучшей читаемости
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 3;
            ctx.fillText(text, radius * 0.7, 4);
            ctx.shadowBlur = 0;
            ctx.fillText(text, radius * 0.7, 4);
            ctx.restore();
        }
        
        // Рисуем центральный круг
        ctx.beginPath();
        ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#d98c2b';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Центральная иконка
        ctx.fillStyle = '#d98c2b';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎲', centerX, centerY);
        
        // Внутреннее кольцо для красоты
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.strokeStyle = '#d98c2b';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Подсветка выбранного сектора (только когда не крутится)
        if (!spinning) {
            const selected = getSelectedItem(currentRotation);
            if (selected && selected.index !== undefined) {
                const startAngle = selected.index * angleStep + currentRotation;
                const endAngle = (selected.index + 1) * angleStep + currentRotation;
                
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius + 3, startAngle, endAngle);
                ctx.closePath();
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 4;
                ctx.stroke();
                
                // Добавляем свечение
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#FFD700';
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
    }
    
    // Анимация вращения
    function animateSpin(now) {
        const elapsed = now - spinStartTime;
        const progress = Math.min(1, elapsed / spinDuration);
        
        // EasyOutCubic анимация
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        const currentRotationTarget = targetRotation * easeOut;
        currentRotation = currentRotationTarget;
        
        drawWheel();
        
        if (progress < 1) {
            animationId = requestAnimationFrame(animateSpin);
        } else {
            // Анимация завершена
            spinning = false;
            animationId = null;
            
            // Получаем выбранный элемент
            const selected = getSelectedItem(currentRotation);
            
            if (selected && selected.item) {
                const wheelName = getCurrentWheelName();
                
                // Обновляем текстовый результат
                resultSpan.textContent = selected.item;
                
                // Сохраняем в историю
                spinCount++;
                addToHistory(selected.item, wheelName);
                
                // Визуальная обратная связь
                resultSpan.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    resultSpan.style.transform = 'scale(1)';
                }, 200);
                
                // Перерисовываем с подсветкой
                drawWheel();
                
                console.log(`🎡 Выпало: ${selected.item}`);
            } else {
                console.error('❌ Не удалось определить результат');
                resultSpan.textContent = "Ошибка!";
            }
            
            spinBtn.disabled = false;
            if (wheelSelect) wheelSelect.disabled = false;
        }
    }
    
    function spin() {
        if (spinning) return;
        
        const items = getCurrentWheelItems();
        if (items.length === 0) {
            resultSpan.textContent = "Нет элементов!";
            return;
        }
        
        spinning = true;
        spinBtn.disabled = true;
        if (wheelSelect) wheelSelect.disabled = true;
        
        // Случайное количество полных оборотов
        const fullRotations = (Math.random() * 15 + 15) * Math.PI * 2;
        const randomOffset = Math.random() * Math.PI * 2;
        targetRotation = currentRotation + fullRotations + randomOffset;
        
        spinStartTime = performance.now();
        animationId = requestAnimationFrame(animateSpin);
    }
    
    function clearHistory() {
        if (confirm('Очистить всю историю выпадений?')) {
            history = [];
            spinCount = 0;
            saveData();
            updateUI();
            resultSpan.textContent = '—';
            drawWheel();
        }
    }
    
    // Event Listeners
    if (spinBtn) spinBtn.addEventListener('click', spin);
    if (clearBtn) clearBtn.addEventListener('click', clearHistory);
    if (wheelSelect) {
        wheelSelect.addEventListener('change', () => {
            currentWheelIndex = parseInt(wheelSelect.value);
            drawWheel();
            saveData();
            resultSpan.textContent = '—';
        });
    }
    
    if (canvas) {
        canvas.addEventListener('click', spin);
    }
    
    loadData();
    
    if (history.length > 0 && resultSpan.textContent === '—') {
        resultSpan.textContent = history[history.length-1].item;
    }
}