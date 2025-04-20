package com.web.chatbot.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.web.chatbot.entity.SessionUserAgentAssignment;
import com.web.chatbot.enums.AgentStatus;
import com.web.chatbot.repository.SessionAgentUserAssignmentRepository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserToAgentAssignmentService {

    @Autowired
    private SessionAgentUserAssignmentRepository sessionAgentUserAssignmentRepository;

    @Autowired
    private AgentService agentService;

    private final Map<String, String> sessionToAgentMap = new ConcurrentHashMap<>();
    private final Queue<String> availableAgents = new LinkedList<>();

    // Called when agent logs in or changes status to live
    public synchronized void registerLiveAgent(String agentUsername) {
        if (!availableAgents.contains(agentUsername)) {
            availableAgents.offer(agentUsername);
        }
    }

    // Called when agent logs out or status changes to busy
    public synchronized void unregisterLiveAgent(String agentUsername) {
        availableAgents.remove(agentUsername);
    }

    public synchronized void releaseAgent(String sessionId) {
        String agent = sessionToAgentMap.remove(sessionId);
        if (agent != null) {
            availableAgents.offer(agent); // now agent is free again
            sessionAgentUserAssignmentRepository.deleteBySessionId(sessionId);
        }
    }

    public synchronized String assignAgentToSession(String sessionId) {
        // First check if already assigned
        if (sessionToAgentMap.containsKey(sessionId)) {
            return sessionToAgentMap.get(sessionId);
        }

        // New assignment
        String agent = availableAgents.poll();
        if (agent != null) {
            sessionToAgentMap.put(sessionId, agent);
            // 💾 Save to Mongo
            agentService.updateAgentStatus(agent, AgentStatus.BUSY.name());
            SessionUserAgentAssignment assignment = new SessionUserAgentAssignment(sessionId, agent);
            sessionAgentUserAssignmentRepository.save(assignment);
        }
        return agent;
    }

    public String getAssignedAgent(String sessionId) {
        // Check in-memory first
        if (sessionToAgentMap.containsKey(sessionId)) {
            return sessionToAgentMap.get(sessionId);
        }

        // Fallback to DB
        SessionUserAgentAssignment assignment = sessionAgentUserAssignmentRepository.findBySessionId(sessionId);
        if (assignment != null) {
            sessionToAgentMap.put(sessionId, assignment.getAgentUsername()); // sync back to memory
            return assignment.getAgentUsername();
        }

        return null;
    }

    public void clearAssignment(String sessionId) {
        sessionToAgentMap.remove(sessionId);
    }

    public Map<String, String> getAllAssignments() {
        return sessionToAgentMap;
    }
}
