const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Хранилище сидов (в памяти сервера)
// Структура: { seed: { board: [], expiresAt: timestamp } }
const seeds = new Map();

// Очистка просроченных сидов каждые 10 минут
setInterval(() => {
    const now = Date.now();
    for (const [seed, data] of seeds) {
        if (data.expiresAt < now) {
            seeds.delete(seed);
            console.log(`Сид ${seed} удалён (истек срок)`);
        }
    }
}, 600000); // 10 минут

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API для сидов
    if (req.url.startsWith('/api/')) {
        handleApiRequest(req, res);
        return;
    }
    
    // Отдача статических файлов
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 - Страница не найдена');
            } else {
                res.writeHead(500);
                res.end('500 - Ошибка сервера: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

function handleApiRequest(req, res) {
    const urlParts = req.url.split('/');
    const action = urlParts[2];
    
    // Создание сида (генерация нового поля)
    if (req.method === 'POST' && action === 'create') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                // Генерируем 6-значный сид
                const seed = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = Date.now() + (5 * 60 * 60 * 1000); // 5 часов
                
                seeds.set(seed, {
                    board: data.board,
                    expiresAt: expiresAt,
                    createdAt: Date.now()
                });
                
                console.log(`Сид ${seed} создан, истекает через 5 часов`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    seed: seed,
                    expiresIn: 5 * 60 * 60 * 1000
                }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }
    
    // Получение поля по сиду
    else if (req.method === 'GET' && action === 'load') {
        const seed = urlParts[3];
        const seedData = seeds.get(seed);
        
        if (seedData) {
            const now = Date.now();
            if (seedData.expiresAt > now) {
                const timeLeft = seedData.expiresAt - now;
                const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    board: seedData.board,
                    expiresIn: { hours: hoursLeft, minutes: minutesLeft }
                }));
                console.log(`Сид ${seed} загружен (осталось ${hoursLeft}ч ${minutesLeft}м)`);
            } else {
                seeds.delete(seed);
                res.writeHead(404);
                res.end(JSON.stringify({ success: false, error: 'Сид истёк (5 часов прошло)' }));
                console.log(`Сид ${seed} истёк`);
            }
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ success: false, error: 'Сид не найден' }));
            console.log(`Сид ${seed} не найден`);
        }
    }
    
    // Получение информации о сиде (время жизни)
    else if (req.method === 'GET' && action === 'info') {
        const seed = urlParts[3];
        const seedData = seeds.get(seed);
        
        if (seedData) {
            const now = Date.now();
            if (seedData.expiresAt > now) {
                const timeLeft = seedData.expiresAt - now;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    exists: true,
                    expiresAt: seedData.expiresAt,
                    timeLeftMs: timeLeft,
                    createdAt: seedData.createdAt
                }));
            } else {
                seeds.delete(seed);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, exists: false, reason: 'expired' }));
            }
        } else {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, exists: false, reason: 'not_found' }));
        }
    }
    
    else {
        res.writeHead(404);
        res.end('Not found');
    }
}

server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Система сидов активна (время жизни: 5 часов)`);
    console.log(`http://localhost:${PORT}`);
});