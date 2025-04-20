package com.web.chatbot.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.web.chatbot.component.AgentStatusBroadcaster;
import com.web.chatbot.service.AgentService;

@RestController
@RequestMapping("/api/agent")
@CrossOrigin(origins = "*")
public class AgentController {

    @Autowired
    private AgentService agentService;

    @Autowired
    private AgentStatusBroadcaster agentStatusBroadcaster;

    @PostMapping("/status")
    public ResponseEntity<?> updateStatus(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String status = body.get("status");
        agentService.updateAgentStatus(username, status);
        System.out.println("Status updated for "+username+ " status "+status);

        // Optionally broadcast via WebSocket
         agentStatusBroadcaster.broadcastStatusUpdate(username, status);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/status/{username}")
    public ResponseEntity<?> getStatus(@PathVariable String username) {
        String status = agentService.getAgentStatus(username);
        System.out.println("The status for "+username+" is"+" "+status);
        return ResponseEntity.ok(Map.of("status", status));
    }
}
