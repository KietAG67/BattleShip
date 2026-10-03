package com.battleship.presenter;

import com.battleship.presenter.dto.AttackResultDTO;
import com.battleship.presenter.dto.FireRequestDTO;
import com.battleship.presenter.settings.GameSettings;
import com.battleship.presenter.settings.SettingsManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/game")
@CrossOrigin(origins = "*") // Hỗ trợ dev local không bị chặn CORS
public class GameController{

    private final GameManager gameManager = GameManager.getInstance();
    private final SettingsManager settingsManager = SettingsManager.getInstance();

    @PostMapping("/start")
    public ResponseEntity<String> startGame() {
        gameManager.startGame();
        return ResponseEntity.ok("GAME_STARTED");
    }

    @PostMapping("/fire")
    public ResponseEntity<AttackResultDTO> fire(@RequestBody FireRequestDTO request) {
        AttackResultDTO result = gameManager.handlePlayerFire(request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/enemy-fire")
    public ResponseEntity<AttackResultDTO> enemyFire() {
        AttackResultDTO result = gameManager.handleEnemyTurn();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/settings")
    public ResponseEntity<GameSettings> getSettings() {
        return ResponseEntity.ok(settingsManager.getSettings());
    }

    @PostMapping("/settings")
    public ResponseEntity<String> updateSettings(@RequestBody GameSettings settings) {
        settingsManager.saveSettings(settings);
        return ResponseEntity.ok("SETTINGS_SAVED");
    }
}