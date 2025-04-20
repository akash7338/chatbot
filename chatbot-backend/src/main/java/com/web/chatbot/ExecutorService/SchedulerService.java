package com.web.chatbot.ExecutorService;

import org.springframework.stereotype.Component;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

@Component
public class SchedulerService {

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2); // You can increase pool
                                                                                            // size if needed

    public ScheduledExecutorService getScheduler() {
        return scheduler;
    }
}
