
package com.web.chatbot.controller;

import com.web.chatbot.service.AgentService;
import com.web.chatbot.service.UserToAgentAssignmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/assign-agent")
@CrossOrigin(origins = "*")
public class UserToAgentAssignmentController {

    @Autowired
    private UserToAgentAssignmentService assignmentService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private AgentService agentService;

    @PostMapping("/{sessionId}")
    public ResponseEntity<?> assignAgent(@PathVariable String sessionId) {
        String assignedAgent = assignmentService.assignAgentToSession(sessionId);

        if (assignedAgent != null) {
            // ✅ Agent status update done here instead of inside the service
            agentService.updateAgentStatus(assignedAgent, "BUSY");

            messagingTemplate.convertAndSend(
                    "/topic/session-assignments-all",
                    Map.of("agent", assignedAgent, "sessionId", sessionId));

            return ResponseEntity.ok(Map.of(
                    "status", "assigned",
                    "agent", assignedAgent));
        } else {
            return ResponseEntity.status(503).body(Map.of(
                    "status", "no_agents_available",
                    "message", "All agents are currently busy or offline."));
        }
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<?> getAssignedAgent(@PathVariable String sessionId) {
        String agent = assignmentService.getAssignedAgent(sessionId);
        if (agent != null) {
            return ResponseEntity.ok(Map.of("agent", agent));
        } else {
            return ResponseEntity.status(404).body(Map.of("error", "No agent assigned"));
        }
    }
}
