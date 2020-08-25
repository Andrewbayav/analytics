package com.mak.util;


public class DateHelper {

    public static double unixToJD(double unix) {
        return (unix / 86400000) + 2440587.5;
    }

    public static double JDToUnix(double jd) {
        return (jd - 2440587.5) * 86400000;
    }


}
