package com.web.chatbot.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.web.chatbot.repository.AgentRepository;
import com.web.chatbot.repository.UserRepository;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepo;
    @Autowired
    private AgentRepository agentRepo;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> creds) {
        String username = creds.get("username");
        String password = creds.get("password");
        String role = creds.get("role");

        if ("user".equals(role)) {
            return userRepo.findByUsernameAndPassword(username, password)
                    .map(user -> ResponseEntity.ok(Map.of("status", "success", "role", "user")))
                    .orElse(ResponseEntity.status(401).body(Map.of("status", "unauthorized")));
        } else if ("agent".equals(role)) {
            return agentRepo.findByUsernameAndPassword(username, password)
                    .map(agent -> ResponseEntity.ok(Map.of("status", "success", "role", "agent")))
                    .orElse(ResponseEntity.status(401).body(Map.of("status", "unauthorized")));
        }

        return ResponseEntity.badRequest().body(Map.of("status", "invalid_role"));
    }
}
