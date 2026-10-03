package com.battleship.presenter;

import com.battleship.presenter.dto.AttackResultDTO;
import com.battleship.presenter.dto.FireRequestDTO;
import com.battleship.presenter.state.GameState;

import java.util.Random;

public class GameManager {
    private static GameManager instance;

    private GameState currentState;
    private final boolean[][] playerFiredGrid = new boolean[10][10];
    private final boolean[][] enemyFiredGrid = new boolean[10][10];
    
    // Tạm thời mô phỏng số ô tàu còn lại (Tổng độ dài 5+4+3+2 = 14 ô)
    private int playerRemainingShipCells = 14;
    private int enemyRemainingShipCells = 14;

    private GameManager() {
        this.currentState = GameState.STATE_INIT;
    }

    public static synchronized GameManager getInstance() {
        if (instance == null) {
            instance = new GameManager();
        }
        return instance;
    }

    public synchronized void startGame() {
        this.currentState = GameState.STATE_PLAYER_TURN;
        this.playerRemainingShipCells = 14;
        this.enemyRemainingShipCells = 14;
        for (int i = 0; i < 10; i++) {
            for (int j = 0; j < 10; j++) {
                playerFiredGrid[i][j] = false;
                enemyFiredGrid[i][j] = false;
            }
        }
    }

    /**
     * Xử lý lượt bắn của Player vào lưới của Enemy
     */
    public synchronized AttackResultDTO handlePlayerFire(FireRequestDTO req) {
        int x = req.getX();
        int y = req.getY();

        // 1. Kiểm tra trạng thái máy: Chỉ cho phép bắn khi đang là lượt của người chơi
        if (this.currentState != GameState.STATE_PLAYER_TURN) {
            return new AttackResultDTO("INVALID", x, y, false, false);
        }

        // 2. Kiểm tra biên tọa độ [0, 9] và bắn trùng
        if (x < 0 || x > 9 || y < 0 || y > 9 || playerFiredGrid[x][y]) {
            return new AttackResultDTO("INVALID", x, y, false, false);
        }

        playerFiredGrid[x][y] = true;

        // Giả lập logic kiểm tra: Khi Dev 1 hoàn thiện, thay bằng: dev1Model.receiveAttack(x, y)
        boolean isHit = mockCheckHit(x, y);

        if (isHit) {
            enemyRemainingShipCells--;
            boolean isGameOver = (enemyRemainingShipCells <= 0);

            if (isGameOver) {
                this.currentState = GameState.STATE_END;
                return new AttackResultDTO("SUNK", x, y, true, true);
            }

            // Luật chơi: Bắn trúng (HIT/SUNK) được bắn tiếp, giữ nguyên STATE_PLAYER_TURN
            return new AttackResultDTO("HIT", x, y, false, false);
        } else {
            // Bắn trượt (MISS): Chuyển quyền sang lượt của Bot
            this.currentState = GameState.STATE_ENEMY_TURN;
            return new AttackResultDTO("MISS", x, y, false, false);
        }
    }

    /**
     * Xử lý lượt bắn của AI Bot vào lưới của Player
     */
    public synchronized AttackResultDTO handleEnemyTurn() {
        if (this.currentState != GameState.STATE_ENEMY_TURN) {
            return new AttackResultDTO("INVALID", -1, -1, false, false);
        }

        // Giả lập lượt bắn ngẫu nhiên của Bot (Sau này Dev 1 sẽ thay bằng BotStrategy)
        Random rand = new Random();
        int x, y;
        do {
            x = rand.nextInt(10);
            y = rand.nextInt(10);
        } while (enemyFiredGrid[x][y]);

        enemyFiredGrid[x][y] = true;
        boolean isHit = mockCheckHit(x, y);

        if (isHit) {
            playerRemainingShipCells--;
            boolean isGameOver = (playerRemainingShipCells <= 0);
            if (isGameOver) {
                this.currentState = GameState.STATE_END;
                return new AttackResultDTO("SUNK", x, y, true, true);
            }
            // Bot bắn trúng tiếp tục giữ lượt
            return new AttackResultDTO("HIT", x, y, false, false);
        } else {
            // Bot bắn trượt -> Chuyển lại lượt cho Player
            this.currentState = GameState.STATE_PLAYER_TURN;
            return new AttackResultDTO("MISS", x, y, false, false);
        }
    }

    private boolean mockCheckHit(int x, int y) {
        // Mock: tạm thời coi các ô có (x + y) chia hết cho 3 là trúng để test UI
        return (x + y) % 3 == 0;
    }

    public GameState getCurrentState() { return currentState; }
    public void setCurrentState(GameState currentState) { this.currentState = currentState; }
}