package com.web.chatbot.controller;

import com.web.chatbot.entity.ChatMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Date;
import java.util.Map;

@Controller
public class WebSocketController {

    @MessageMapping("/sendMessage")
    @SendTo("/topic/messages")
    public ChatMessage send(ChatMessage message) {
        message.setTimestamp(new Date());
        System.out.println("[WebSocket] Message received: " + message);
        return message;
    }

    @MessageMapping("/typing")
    @SendTo("/topic/typing")
    public Map<String, String> handleIsTyping(Map<String, String> payload) {
        System.out.println("[WebSocket] Typing payload received: " + payload);
        return payload;
    }

    @MessageMapping("/ping")
    @SendTo("/topic/agent-status")
    public String handlePing(String message) {
        return "Received: " + message;
    }

}
