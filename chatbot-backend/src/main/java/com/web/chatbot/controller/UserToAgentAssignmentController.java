
package com.web.chatbot.controller;

import com.web.chatbot.component.AgentStatusBroadcaster;
import com.web.chatbot.enums.AgentStatus;
import com.web.chatbot.service.AgentService;
import com.web.chatbot.service.UserToAgentAssignmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.Map;

// @RestController
// @RequestMapping("/api/assign-agent")
// @CrossOrigin(origins = "*")
// public class UserToAgentAssignmentController {

//     @Autowired
//     private UserToAgentAssignmentService assignmentService;

//     @Autowired
//     private SimpMessagingTemplate messagingTemplate;

//     @Autowired
//     private AgentService agentService;

//     @Autowired
//     AgentStatusBroadcaster agentStatusBroadcaster;

//     @PostMapping("/{sessionId}")
//     public ResponseEntity<?> assignAgent(@PathVariable String sessionId) {
//         String assignedAgent = assignmentService.assignAgentToSession(sessionId);

//         if (assignedAgent != null) {
//             // ✅ Agent status update done here instead of inside the service
//             agentService.updateAgentStatus(assignedAgent, AgentStatus.BUSY.name());
//             agentStatusBroadcaster.broadcastStatusUpdate(assignedAgent, AgentStatus.BUSY.name());

//             messagingTemplate.convertAndSend(
//                     "/topic/session-assignments-all",
//                     Map.of("agent", assignedAgent, "sessionId", sessionId));

//             return ResponseEntity.ok(Map.of(
//                     "status", "assigned",
//                     "agent", assignedAgent));
//         } else {
//             return ResponseEntity.status(503).body(Map.of(
//                     "status", "no_agents_available",
//                     "message", "All agents are currently busy or offline."));
//         }
//     }

//     @GetMapping("/{sessionId}")
//     public ResponseEntity<?> getAssignedAgent(@PathVariable String sessionId) {
//         String agent = assignmentService.getAssignedAgent(sessionId);
//         if (agent != null) {
//             return ResponseEntity.ok(Map.of("agent", agent));
//         } else {
//             return ResponseEntity.status(404).body(Map.of("error", "No agent assigned"));
//         }
//     }
// }

@RestController
@RequestMapping("/api/assign-agent")
@CrossOrigin(origins = "*")
public class UserToAgentAssignmentController {

    @Autowired
    private UserToAgentAssignmentService assignmentService;

    @Autowired
    private AgentService agentService;

    @Autowired
    AgentStatusBroadcaster agentStatusBroadcaster;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping("/{sessionId}")
    public ResponseEntity<?> offerAgent(@PathVariable String sessionId) {
        // 🔁 Kick off round-robin offer to next available agent
        assignmentService.offerSessionToNextAgent(sessionId, new HashSet<>());
        return ResponseEntity.ok(Map.of("status", "offer_sent"));
    }

    @PostMapping("/accept")
    public ResponseEntity<?> acceptOffer(@RequestBody Map<String, String> body) {
        String sessionId = body.get("sessionId");
        String agent = body.get("agent");

        boolean success = assignmentService.confirmAgentAssignment(sessionId, agent);
        if (success) {
            // ✅ Agent is now officially assigned — mark as BUSY
            agentService.updateAgentStatus(agent, AgentStatus.BUSY.name());
            agentStatusBroadcaster.broadcastStatusUpdate(agent, AgentStatus.BUSY.name());

            // when agent accepts offer then send a message to chat component and then subscribe
            messagingTemplate.convertAndSend(
                    "/topic/session-assigned/" + sessionId,
                    Map.of("agent", agent));

            return ResponseEntity.ok(Map.of("status", "confirmed"));
        } else {
            return ResponseEntity.status(403).body(Map.of("error", "Not allowed or already assigned"));
        }
    }

    @PostMapping("/decline")
    public ResponseEntity<?> declineOffer(@RequestBody Map<String, String> body) {
        String sessionId = body.get("sessionId");
        String agent = body.get("agent");

        assignmentService.handleDecline(sessionId, agent); // → Retry next agent
        return ResponseEntity.ok(Map.of("status", "declined"));
    }

    // @GetMapping("/{sessionId}")
    // public ResponseEntity<?> getAssignedAgent(@PathVariable String sessionId) {
    // String agent = assignmentService.getAssignedAgent(sessionId);
    // if (agent != null) {
    // return ResponseEntity.ok(Map.of("agent", agent));
    // } else {
    // return ResponseEntity.status(404).body(Map.of("error", "No agent assigned"));
    // }
    // }
}
