package com.battleship.presenter.settings;

public class GameSettings {
    private String language = "vi"; // "vi" hoặc "en"
    private int masterVolume = 80;  // 0 -> 100

    public GameSettings() {}

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public int getMasterVolume() { return masterVolume; }
    public void setMasterVolume(int masterVolume) { this.masterVolume = masterVolume; }
}