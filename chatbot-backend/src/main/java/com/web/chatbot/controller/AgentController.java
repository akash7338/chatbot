package com.web.chatbot.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.web.chatbot.service.AgentService;

@RestController
@RequestMapping("/api/agent")
@CrossOrigin(origins = "*")
public class AgentController {

    @Autowired
    private AgentService agentService;

    @PostMapping("/status")
    public ResponseEntity<?> updateStatus(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String status = body.get("status");
        agentService.updateAgentStatus(username, status);

        // Optionally broadcast via WebSocket
        // agentStatusBroadcaster.broadcastStatusUpdate(username, status);

        return ResponseEntity.ok().build();
    }

    // You can add more agent-specific endpoints here later
}
