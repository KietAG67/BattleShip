package com.battleship.presenter.settings;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.io.IOException;

public class SettingsManager {
    private static SettingsManager instance;
    private final File settingsFile = new File("settings.json");
    private final ObjectMapper mapper = new ObjectMapper();
    private GameSettings settings;

    private SettingsManager() {
        loadSettings();
    }

    public static synchronized SettingsManager getInstance() {
        if (instance == null) {
            instance = new SettingsManager();
        }
        return instance;
    }

    public void loadSettings() {
        if (settingsFile.exists()) {
            try {
                this.settings = mapper.readValue(settingsFile, GameSettings.class);
                return;
            } catch (IOException e) {
                System.err.println("Không thể đọc file settings: " + e.getMessage());
            }
        }
        this.settings = new GameSettings();
        saveSettings(this.settings);
    }

    public synchronized void saveSettings(GameSettings newSettings) {
        this.settings = newSettings;
        try {
            mapper.writerWithDefaultPrettyPrinter().writeValue(settingsFile, newSettings);
        } catch (IOException e) {
            System.err.println("Lỗi lưu file settings: " + e.getMessage());
        }
    }

    public GameSettings getSettings() {
        return settings;
    }
}