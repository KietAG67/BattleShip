package com.battleship.presenter.dto;

public class AttackResultDTO {
    private String status; // "HIT", "MISS", "SUNK", "INVALID"
    private int x;
    private int y;
    private boolean isSunk;
    private boolean gameOver;

    public AttackResultDTO() {}

    public AttackResultDTO(String status, int x, int y, boolean isSunk, boolean gameOver) {
        this.status = status;
        this.x = x;
        this.y = y;
        this.isSunk = isSunk;
        this.gameOver = gameOver;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getX() { return x; }
    public void setX(int x) { this.x = x; }
    public int getY() { return y; }
    public void setY(int y) { this.y = y; }
    public boolean isSunk() { return isSunk; }
    public void setSunk(boolean isSunk) { this.isSunk = isSunk; }
    public boolean isGameOver() { return gameOver; }
    public void setGameOver(boolean gameOver) { this.gameOver = gameOver; }
}