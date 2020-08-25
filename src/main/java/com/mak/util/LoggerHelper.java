package com.mak.util;

import java.util.logging.LogRecord;
import java.util.logging.Logger;

public class LoggerHelper {
    public static Logger forName(String p_name) {
        Logger lg = Logger.getLogger(p_name);
        lg.setFilter(InferFilter.self);
        return lg;
    }

    // Filter is used specially to force LogRecord.inferCaller() call
    // to be sure that source class and name are not null
    private static final class InferFilter implements java.util.logging.Filter {
        private static final InferFilter self = new InferFilter();

        public boolean isLoggable(LogRecord record) {
            record.getSourceMethodName();
            return true;
        }
    }
}