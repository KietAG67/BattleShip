package com.battleship.presenter.dto;

public class FireRequestDTO {
    private String action;
    private int x;
    private int y;

    public FireRequestDTO() {}

    public FireRequestDTO(String action, int x, int y) {
        this.action = action;
        this.x = x;
        this.y = y;
    }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public int getX() { return x; }
    public void setX(int x) { this.x = x; }
    public int getY() { return y; }
    public void setY(int y) { this.y = y; }
}