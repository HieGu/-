const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Хранилище комнат на сервере (в памяти)
const rooms = new Map();

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
    // Добавляем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API для комнат
    if (req.url.startsWith('/api/')) {
        handleApiRequest(req, res);
        return;
    }
    
    // Отдача статических файлов
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }
    
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
    
    if (req.method === 'POST' && action === 'create') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                const playerId = Math.random().toString(36).substring(2, 8);
                
                rooms.set(roomId, {
                    players: [{ id: playerId, name: data.playerName, completedCells: new Array(25).fill(false), color: data.color }],
                    board: data.board,
                    maxPlayers: 2,
                    createdAt: Date.now()
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, roomId: roomId, playerId: playerId }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }
    else if (req.method === 'POST' && action === 'join') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const room = rooms.get(data.roomId);
                
                if (room && room.players.length < room.maxPlayers) {
                    const playerId = Math.random().toString(36).substring(2, 8);
                    room.players.push({ id: playerId, name: data.playerName, completedCells: new Array(25).fill(false), color: data.color });
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        playerId: playerId,
                        board: room.board,
                        players: room.players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells, color: p.color }))
                    }));
                } else {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, error: 'Комната не найдена или заполнена' }));
                }
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }
    else if (req.method === 'GET' && action === 'sync') {
        const roomId = urlParts[3];
        const room = rooms.get(roomId);
        
        if (room) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                players: room.players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells, color: p.color })),
                board: room.board
            }));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ success: false, error: 'Комната не найдена' }));
        }
    }
    else if (req.method === 'POST' && action === 'update') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const room = rooms.get(data.roomId);
                
                if (room) {
                    const player = room.players.find(p => p.id === data.playerId);
                    if (player) {
                        player.completedCells = data.completedCells;
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ success: false, error: 'Игрок не найден' }));
                    }
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ success: false, error: 'Комната не найдена' }));
                }
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }
    else if (req.method === 'POST' && action === 'leave') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const room = rooms.get(data.roomId);
                
                if (room) {
                    const playerIndex = room.players.findIndex(p => p.id === data.playerId);
                    if (playerIndex !== -1) {
                        room.players.splice(playerIndex, 1);
                    }
                    
                    if (room.players.length === 0) {
                        rooms.delete(data.roomId);
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }
    else {
        res.writeHead(404);
        res.end('Not found');
    }
}

// Очистка старых комнат каждые 5 минут
setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms) {
        if (now - room.createdAt > 3600000 && room.players.length === 0) {
            rooms.delete(roomId);
            console.log(`🧹 Очищена старая комната: ${roomId}`);
        }
    }
}, 300000);

server.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🎡 Открой в браузере: http://localhost:${PORT}`);
    console.log(`📊 Активных комнат: 0`);
});