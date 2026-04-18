let spinning = false;
let animationId = null;
let currentRotation = 0;
let targetRotation = 0;
let spinStartTime = 0;
let spinDuration = 2000;

function initWheel(wheelsArray, gameKey) {
    let currentWheelIndex = 0;
    let spinCount = 0;
    let history = [];
    let canvas = document.getElementById('wheelCanvas');
    let ctx = canvas ? canvas.getContext('2d') : null;
    
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

    const colors = [
        '#FFB3BA', '#B5EAD7', '#FFDAC1', '#E2F0CB', '#B5E3FF',
        '#FFC8DD', '#C7E9FB', '#FFF5BA', '#D4B8D4', '#FFB7B2',
        '#B5E3D6', '#FFD6B5', '#C5E0D4', '#FFC7C7', '#E0D4FF',
        '#FFDFBF', '#BDE0FE', '#FBC8B5', '#C1E1C1', '#FFB5A7'
    ];

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

    function getSelectedItem(rotation) {
        const items = getCurrentWheelItems();
        if (items.length === 0) return null;
        
        const angleStep = (Math.PI * 2) / items.length;
        const pointerAngle = -Math.PI / 2;
        let wheelRotation = rotation % (Math.PI * 2);
        let segmentAngle = (pointerAngle - wheelRotation + Math.PI * 2) % (Math.PI * 2);
        let selectedIndex = Math.floor(segmentAngle / angleStep);
        
        if (segmentAngle % angleStep < 0.01) {
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        }
        selectedIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));
        
        return {
            index: selectedIndex,
            item: items[selectedIndex]
        };
    }

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
        
        for (let i = 0; i < items.length; i++) {
            const startAngle = i * angleStep + currentRotation;
            const endAngle = (i + 1) * angleStep + currentRotation;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle);
            ctx.lineTo(centerX, centerY);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        for (let i = 0; i < items.length; i++) {
            const startAngle = i * angleStep + currentRotation;
            const midAngle = startAngle + angleStep / 2;
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(midAngle);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            let text = items[i];
            if (text.length > 18) text = text.substring(0, 15) + '...';
            
            ctx.font = "bold 13px 'Segoe UI', Arial";
            ctx.fillStyle = "#2c3e50";
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 3;
            ctx.fillText(text, radius * 0.7, 4);
            ctx.shadowBlur = 0;
            ctx.fillText(text, radius * 0.7, 4);
            ctx.restore();
        }
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#d98c2b';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.fillStyle = '#d98c2b';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', centerX, centerY);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.strokeStyle = '#d98c2b';
        ctx.lineWidth = 2;
        ctx.stroke();
        
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
                
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#FFD700';
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
    }
    
    function animateSpin(now) {
        const elapsed = now - spinStartTime;
        const progress = Math.min(1, elapsed / spinDuration);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRotationTarget = targetRotation * easeOut;
        currentRotation = currentRotationTarget;
        drawWheel();
        
        if (progress < 1) {
            animationId = requestAnimationFrame(animateSpin);
        } else {
            spinning = false;
            animationId = null;
            
            const selected = getSelectedItem(currentRotation);
            
            if (selected && selected.item) {
                const wheelName = getCurrentWheelName();
                resultSpan.textContent = selected.item;
                spinCount++;
                addToHistory(selected.item, wheelName);
                
                resultSpan.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    resultSpan.style.transform = 'scale(1)';
                }, 200);
                
                drawWheel();
                console.log(`Выпало: ${selected.item}`);
            } else {
                console.error('Не удалось определить результат');
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