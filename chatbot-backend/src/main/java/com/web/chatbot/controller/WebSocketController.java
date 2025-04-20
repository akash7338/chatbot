package com.web.chatbot.controller;

import com.web.chatbot.entity.ChatMessage;
import com.web.chatbot.service.UserToAgentAssignmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Date;
import java.util.Map;

@Controller
public class WebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private UserToAgentAssignmentService assignmentService;


    // ✅ Relays message to session-specific topic
    @MessageMapping("/sendMessage")
    public void send(@Payload ChatMessage message) {
        message.setTimestamp(new Date());

        String sessionId = message.getSessionId(); // must be part of ChatMessage
        //String sender = message.getSender();

       // String assignedAgent = assignmentService.getAssignedAgent(sessionId);


        // if (assignedAgent == null) {
        //     System.out.println("[WebSocket] No assigned agent for session: " + sessionId);
        //     return;
        // }
    
        // // ✅ Block only if agent is sending and is not assigned
        // if (sender.toLowerCase().startsWith("agent") && !sender.equals(assignedAgent)) {
        //     System.out.println("[WebSocket] Unauthorized agent: " + sender + " tried to send to session: " + sessionId);
        //     return;
        // }
        System.out.println("➡ Received message: " + message.getMessage() + " for session: " + sessionId);

        System.out.println("[WebSocket] Forwarding to session: " + sessionId);
        messagingTemplate.convertAndSend("/topic/messages/" + sessionId, message);
    }

    @MessageMapping("/typing")
    public void handleIsTyping(@Payload Map<String, String> payload) {
        String sessionId = payload.get("sessionId");
        if (sessionId != null) {
            messagingTemplate.convertAndSend("/topic/typing/" + sessionId, payload);
        }
    }

    @MessageMapping("/ping")
    @SendTo("/topic/agent-status")
    public String handlePing(String message) {
        return "Received: " + message;
    }
}
