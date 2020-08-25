package com.mak.entity;

public class TelescopeDonut {

    private int code;
    private int v_year;
    private int count;
    private int sum;


    public TelescopeDonut(int code, int v_year, int count, int sum) {
        this.code = code;
        this.v_year = v_year;
        this.count = count;
        this.sum = sum;
    }


    public int getCode() {
        return code;
    }

    public int getV_year() {
        return v_year;
    }

    public int getCount() {
        return count;
    }

    public int getSum() {
        return sum;
    }
}
