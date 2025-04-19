package com.web.chatbot.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.web.chatbot.entity.AuthRequest;
import com.web.chatbot.enums.AgentStatus;
import com.web.chatbot.service.AgentService;
import com.web.chatbot.service.JwtService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthenticationManager authManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AgentService agentService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            Authentication auth = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(), request.getPassword()));

            UserDetails userDetails = (UserDetails) auth.getPrincipal();
            String role = userDetails.getAuthorities().iterator().next().getAuthority(); // "ROLE_USER" or "ROLE_AGENT"
            // ✅ If agent, set status to live
            if (role.equals("ROLE_AGENT")) {
                agentService.updateAgentStatus(userDetails.getUsername(), AgentStatus.LIVE.name());
            }

            String token = jwtService.generateToken(userDetails.getUsername(), role);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "token", token,
                    "role", role));

        } catch (AuthenticationException e) {
            return ResponseEntity.status(401).body(Map.of("status", "unauthorized"));
        }
    }
}
