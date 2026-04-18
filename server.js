const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// ПОРТ - Render.com сам задаёт переменную PORT
const PORT = process.env.PORT || 3000;

// MIME типы для правильной отдачи файлов
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

// СОЗДАЁМ HTTP СЕРВЕР
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    
    // Если запрос к корню - отдаём index.html
    if (filePath === './') {
        filePath = './index.html';
    }
    
    // Получаем расширение файла
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // Читаем файл
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

// СОЗДАЁМ WEBSOCKET СЕРВЕР (с поддержкой Render.com)
const wss = new WebSocket.Server({ 
    server,
    // Эта опция решает проблему с WebSocket на Render
    handleProtocols: (protocols, request) => {
        return protocols[0] || 'ws';
    }
});

// Хранилище комнат
const rooms = new Map();

// ОБРАБОТКА WEBSOCKET СОЕДИНЕНИЙ
wss.on('connection', (ws, req) => {
    console.log('🔌 Новое WebSocket соединение');
    let currentRoom = null;
    let currentPlayerId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 Получено сообщение:', data.type);
            
            switch (data.type) {
                case 'create_room':
                    // Создаём новую комнату с уникальным 6-значным кодом
                    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                    const playerId = Math.random().toString(36).substring(2, 8);
                    const board = data.board;
                    
                    rooms.set(roomId, {
                        players: [{ id: playerId, ws: ws, name: data.playerName, completedCells: new Array(25).fill(false) }],
                        board: board,
                        maxPlayers: 2,
                        gameStarted: false
                    });
                    
                    currentRoom = roomId;
                    currentPlayerId = playerId;
                    
                    ws.send(JSON.stringify({
                        type: 'room_created',
                        roomId: roomId,
                        playerId: playerId,
                        board: board,
                        players: rooms.get(roomId).players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells }))
                    }));
                    console.log(`✅ Комната создана: ${roomId}`);
                    break;
                    
                case 'join_room':
                    const room = rooms.get(data.roomId);
                    if (room && room.players.length < room.maxPlayers && !room.gameStarted) {
                        const playerId = Math.random().toString(36).substring(2, 8);
                        room.players.push({ id: playerId, ws: ws, name: data.playerName, completedCells: new Array(25).fill(false) });
                        currentRoom = data.roomId;
                        currentPlayerId = playerId;
                        
                        // Отправляем новому игроку текущее состояние
                        ws.send(JSON.stringify({
                            type: 'room_joined',
                            playerId: playerId,
                            board: room.board,
                            players: room.players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells }))
                        }));
                        
                        // Уведомляем остальных игроков
                        room.players.forEach(player => {
                            if (player.ws !== ws && player.ws.readyState === WebSocket.OPEN) {
                                player.ws.send(JSON.stringify({
                                    type: 'player_joined',
                                    players: room.players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells }))
                                }));
                            }
                        });
                        console.log(`✅ Игрок ${data.playerName} присоединился к комнате ${data.roomId}`);
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: room ? 'Комната заполнена или игра уже началась' : 'Комната не найдена'
                        }));
                        console.log(`❌ Ошибка присоединения к комнате ${data.roomId}`);
                    }
                    break;
                    
                case 'toggle_cell':
                    const roomData = rooms.get(currentRoom);
                    if (roomData) {
                        const player = roomData.players.find(p => p.id === currentPlayerId);
                        if (player) {
                            player.completedCells[data.cellIndex] = data.completed;
                            
                            // Рассылаем обновление всем в комнате
                            roomData.players.forEach(p => {
                                if (p.ws.readyState === WebSocket.OPEN) {
                                    p.ws.send(JSON.stringify({
                                        type: 'cell_updated',
                                        cellIndex: data.cellIndex,
                                        completed: data.completed,
                                        playerId: currentPlayerId,
                                        playerName: player.name,
                                        players: roomData.players.map(pl => ({ id: pl.id, name: pl.name, completedCells: pl.completedCells }))
                                    }));
                                }
                            });
                        }
                    }
                    break;
                    
                case 'reset_game':
                    const resetRoom = rooms.get(currentRoom);
                    if (resetRoom && resetRoom.players.find(p => p.id === currentPlayerId)) {
                        resetRoom.players.forEach(player => {
                            player.completedCells = new Array(25).fill(false);
                        });
                        
                        resetRoom.players.forEach(player => {
                            if (player.ws.readyState === WebSocket.OPEN) {
                                player.ws.send(JSON.stringify({
                                    type: 'game_reset',
                                    players: resetRoom.players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells }))
                                }));
                            }
                        });
                        console.log(`🔄 Прогресс сброшен в комнате ${currentRoom}`);
                    }
                    break;
                    
                case 'new_board':
                    const newBoardRoom = rooms.get(currentRoom);
                    if (newBoardRoom && newBoardRoom.players.find(p => p.id === currentPlayerId)) {
                        const newBoard = data.board;
                        newBoardRoom.board = newBoard;
                        
                        newBoardRoom.players.forEach(player => {
                            player.completedCells = new Array(25).fill(false);
                        });
                        
                        newBoardRoom.players.forEach(player => {
                            if (player.ws.readyState === WebSocket.OPEN) {
                                player.ws.send(JSON.stringify({
                                    type: 'new_board_created',
                                    board: newBoard,
                                    players: newBoardRoom.players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells }))
                                }));
                            }
                        });
                        console.log(`🆕 Новое поле в комнате ${currentRoom}`);
                    }
                    break;
                    
                case 'leave_room':
                    const leaveRoom = rooms.get(currentRoom);
                    if (leaveRoom) {
                        const playerIndex = leaveRoom.players.findIndex(p => p.id === currentPlayerId);
                        if (playerIndex !== -1) {
                            leaveRoom.players.splice(playerIndex, 1);
                        }
                        
                        if (leaveRoom.players.length === 0) {
                            rooms.delete(currentRoom);
                            console.log(`🗑️ Комната ${currentRoom} удалена (пуста)`);
                        } else {
                            leaveRoom.players.forEach(player => {
                                if (player.ws.readyState === WebSocket.OPEN) {
                                    player.ws.send(JSON.stringify({
                                        type: 'player_left',
                                        players: leaveRoom.players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells }))
                                    }));
                                }
                            });
                            console.log(`👋 Игрок покинул комнату ${currentRoom}`);
                        }
                    }
                    break;
            }
        } catch (err) {
            console.error('❌ Ошибка обработки сообщения:', err);
        }
    });
    
    ws.on('close', () => {
        console.log(`🔌 WebSocket соединение закрыто`);
        if (currentRoom) {
            const room = rooms.get(currentRoom);
            if (room) {
                const playerIndex = room.players.findIndex(p => p.id === currentPlayerId);
                if (playerIndex !== -1) {
                    room.players.splice(playerIndex, 1);
                }
                
                if (room.players.length === 0) {
                    rooms.delete(currentRoom);
                    console.log(`🗑️ Комната ${currentRoom} удалена (соединение закрыто)`);
                } else {
                    room.players.forEach(player => {
                        if (player.ws.readyState === WebSocket.OPEN) {
                            player.ws.send(JSON.stringify({
                                type: 'player_left',
                                players: room.players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells }))
                            }));
                        }
                    });
                }
            }
        }
    });
});

// ЗАПУСК СЕРВЕРА
server.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🎡 Открой в браузере: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket сервер готов к работе`);
    console.log(`📊 Активных комнат: 0`);
});