package com.web.chatbot.controller;

import com.web.chatbot.service.ChatbotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin(origins = "*")
public class ChatbotController {

    @Autowired
    private ChatbotService chatbotService;

    @PostMapping("/message/{sessionId}")
    public ResponseEntity<String> handleMessage(@PathVariable String sessionId, @RequestBody String message) {
        String response = chatbotService.handleStructuredFlow(sessionId, message);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/webhook")
    public Map<String, Object> webhook(@RequestBody Map<String, Object> request) {
        return chatbotService.handleWebhookRequest(request);
    }
}

