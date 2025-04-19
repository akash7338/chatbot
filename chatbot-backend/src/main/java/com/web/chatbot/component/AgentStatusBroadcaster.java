package com.web.chatbot.component;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class AgentStatusBroadcaster {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void broadcastStatusUpdate(String username, String status) {
        Map<String, String> payload = new HashMap<>();
        payload.put("username", username);
        payload.put("status", status);

        // Send to a topic, e.g. /topic/agent-status
        messagingTemplate.convertAndSend("/topic/agent-status", payload);
    }
}

