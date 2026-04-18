const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

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
    console.log(`Запрос: ${req.method} ${req.url}`);
    
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

const wss = new WebSocket.Server({ server });

const rooms = new Map();

wss.on('connection', (ws) => {
    console.log('WebSocket соединение установлено');
    let currentRoom = null;
    let currentPlayerId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Получено:', data.type);
            
            switch (data.type) {
                case 'create_room':
                    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
                    const playerId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
                    
                    rooms.set(roomId, {
                        players: [{ id: playerId, ws: ws, name: data.playerName, completedCells: new Array(25).fill(false) }],
                        board: data.board,
                        maxPlayers: 2
                    });
                    
                    currentRoom = roomId;
                    currentPlayerId = playerId;
                    
                    ws.send(JSON.stringify({
                        type: 'room_created',
                        roomId: roomId,
                        playerId: playerId,
                        board: data.board,
                        players: [{ id: playerId, name: data.playerName, completedCells: new Array(25).fill(false) }]
                    }));
                    console.log(`Комната создана: ${roomId}`);
                    break;
                    
                case 'join_room':
                    const room = rooms.get(data.roomId);
                    if (room && room.players.length < 2) {
                        const playerId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
                        room.players.push({ id: playerId, ws: ws, name: data.playerName, completedCells: new Array(25).fill(false) });
                        currentRoom = data.roomId;
                        currentPlayerId = playerId;
                        
                        ws.send(JSON.stringify({
                            type: 'room_joined',
                            playerId: playerId,
                            board: room.board,
                            players: room.players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells }))
                        }));
                        
                        const firstPlayer = room.players.find(p => p.id !== playerId);
                        if (firstPlayer && firstPlayer.ws.readyState === WebSocket.OPEN) {
                            firstPlayer.ws.send(JSON.stringify({
                                type: 'player_joined',
                                players: room.players.map(p => ({ id: p.id, name: p.name, completedCells: p.completedCells }))
                            }));
                        }
                        console.log(`Игрок ${data.playerName} присоединился к ${data.roomId}`);
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: room ? 'Комната заполнена' : 'Комната не найдена'
                        }));
                    }
                    break;
                    
                case 'toggle_cell':
                    const roomData = rooms.get(currentRoom);
                    if (roomData) {
                        const player = roomData.players.find(p => p.id === currentPlayerId);
                        if (player) {
                            player.completedCells[data.cellIndex] = data.completed;
                            
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
                    
                case 'new_board':
                    const boardRoom = rooms.get(currentRoom);
                    if (boardRoom) {
                        boardRoom.board = data.board;
                        boardRoom.players.forEach(p => {
                            p.completedCells = new Array(25).fill(false);
                        });
                        
                        boardRoom.players.forEach(p => {
                            if (p.ws.readyState === WebSocket.OPEN) {
                                p.ws.send(JSON.stringify({
                                    type: 'board_updated',
                                    board: data.board,
                                    players: boardRoom.players.map(pl => ({ id: pl.id, name: pl.name, completedCells: pl.completedCells }))
                                }));
                            }
                        });
                    }
                    break;
                    
                case 'reset_game':
                    const resetRoom = rooms.get(currentRoom);
                    if (resetRoom) {
                        resetRoom.players.forEach(p => {
                            p.completedCells = new Array(25).fill(false);
                        });
                        
                        resetRoom.players.forEach(p => {
                            if (p.ws.readyState === WebSocket.OPEN) {
                                p.ws.send(JSON.stringify({
                                    type: 'game_reset',
                                    players: resetRoom.players.map(pl => ({ id: pl.id, name: pl.name, completedCells: pl.completedCells }))
                                }));
                            }
                        });
                    }
                    break;
                    
                case 'leave_room':
                    const leaveRoom = rooms.get(currentRoom);
                    if (leaveRoom) {
                        const index = leaveRoom.players.findIndex(p => p.id === currentPlayerId);
                        if (index !== -1) leaveRoom.players.splice(index, 1);
                        
                        if (leaveRoom.players.length === 0) {
                            rooms.delete(currentRoom);
                        } else {
                            leaveRoom.players.forEach(p => {
                                if (p.ws.readyState === WebSocket.OPEN) {
                                    p.ws.send(JSON.stringify({
                                        type: 'player_left',
                                        players: leaveRoom.players.map(pl => ({ id: pl.id, name: pl.name, completedCells: pl.completedCells }))
                                    }));
                                }
                            });
                        }
                    }
                    break;
            }
        } catch (err) {
            console.error('Ошибка:', err);
        }
    });
    
    ws.on('close', () => {
        if (currentRoom) {
            const room = rooms.get(currentRoom);
            if (room) {
                const index = room.players.findIndex(p => p.id === currentPlayerId);
                if (index !== -1) room.players.splice(index, 1);
                
                if (room.players.length === 0) {
                    rooms.delete(currentRoom);
                } else {
                    room.players.forEach(p => {
                        if (p.ws.readyState === WebSocket.OPEN) {
                            p.ws.send(JSON.stringify({
                                type: 'player_left',
                                players: room.players.map(pl => ({ id: pl.id, name: pl.name, completedCells: pl.completedCells }))
                            }));
                        }
                    });
                }
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});