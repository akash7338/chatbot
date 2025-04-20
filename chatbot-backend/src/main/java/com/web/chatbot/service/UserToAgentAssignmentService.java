package com.web.chatbot.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.web.chatbot.ExecutorService.SchedulerService;
import com.web.chatbot.component.AgentStatusBroadcaster;
import com.web.chatbot.entity.PendingOffer;
import com.web.chatbot.entity.SessionUserAgentAssignment;
import com.web.chatbot.repository.SessionAgentUserAssignmentRepository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Service
public class UserToAgentAssignmentService {

    @Autowired
    private SessionAgentUserAssignmentRepository sessionAgentUserAssignmentRepository;

    @Autowired
    private SchedulerService scheduler;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // @Autowired
    // private AgentStatusBroadcaster agentStatusBroadcaster;

    //Implemeting assign  avaialable agents from Queue one by one
    //no accept decline
    private final Map<String, String> sessionToAgentMap = new ConcurrentHashMap<>();
    private final Queue<String> availableAgents = new LinkedList<>();

    //implementing offer-accept-decline
    private final List<String> availableAgentsList = new ArrayList<>();
    private final Map<String, PendingOffer> pendingOffers = new ConcurrentHashMap<>();
    private final Map<String, ScheduledFuture<?>> offerTimeoutTasks = new ConcurrentHashMap<>();

    private int roundRobinIndex = 0;

    // Called when agent logs in or changes status to live
    // public synchronized void registerLiveAgent(String agentUsername) {
    //     if (!availableAgents.contains(agentUsername)) {
    //         availableAgents.offer(agentUsername);
    //     }
    // }

    // // Called when agent logs out or status changes to busy
    // public synchronized void unregisterLiveAgent(String agentUsername) {
    //     availableAgents.remove(agentUsername);
    // }

    public synchronized void registerLiveAgent(String agentUsername) {
        if (!availableAgents.contains(agentUsername)) {
            System.out.println("Agent "+ agentUsername+" registered to live agent list");
            availableAgentsList.add(agentUsername);
        }
    }

    // Called when agent logs out or status changes to busy
    public synchronized void unregisterLiveAgent(String agentUsername) {
        System.out.println("Agent "+agentUsername+" removed from live agent list");
        availableAgentsList.remove(agentUsername);
    }



    // public synchronized void releaseAgent(String sessionId) {
    //     String agent = sessionToAgentMap.remove(sessionId);
    //     if (agent != null) {
    //         availableAgents.offer(agent); // now agent is free again
    //         sessionAgentUserAssignmentRepository.deleteBySessionId(sessionId);
    //     }
    // }

    // public synchronized String assignAgentToSession(String sessionId) {
    //     // First check if already assigned
    //     if (sessionToAgentMap.containsKey(sessionId)) {
    //         return sessionToAgentMap.get(sessionId);
    //     }

    //     // New assignment
    //     String agent = availableAgents.poll();
    //     if (agent != null) {
    //         sessionToAgentMap.put(sessionId, agent);
    //         // 💾 Save to Mongo
    //         SessionUserAgentAssignment assignment = new SessionUserAgentAssignment(sessionId, agent);
    //         sessionAgentUserAssignmentRepository.save(assignment);
    //     }
    //     return agent;
    // }

    // public String getAssignedAgent(String sessionId) {
    //     // Check in-memory first
    //     if (sessionToAgentMap.containsKey(sessionId)) {
    //         return sessionToAgentMap.get(sessionId);
    //     }

    //     // Fallback to DB
    //     SessionUserAgentAssignment assignment = sessionAgentUserAssignmentRepository.findBySessionId(sessionId);
    //     if (assignment != null) {
    //         sessionToAgentMap.put(sessionId, assignment.getAgentUsername()); // sync back to memory
    //         return assignment.getAgentUsername();
    //     }

    //     return null;
    // }

    // public void clearAssignment(String sessionId) {
    //     sessionToAgentMap.remove(sessionId);
    // }

    // public Map<String, String> getAllAssignments() {
    //     return sessionToAgentMap;
    // }

    public synchronized void offerSessionToNextAgent(String sessionId, Set<String> alreadyTriedAgents) {
        if (pendingOffers.containsKey(sessionId)) return;
    
        if (availableAgentsList.isEmpty()) {
            System.out.println("No agents available for session: " + sessionId);
            return;
        }
    
        int attempts = 0;
        String selectedAgent = null;
    
        while (attempts < availableAgentsList.size()) {
            String candidate = availableAgentsList.get(roundRobinIndex);
            roundRobinIndex = (roundRobinIndex + 1) % availableAgentsList.size();
    
            if (!alreadyTriedAgents.contains(candidate)) {
                selectedAgent = candidate;
                break;
            }
    
            attempts++;
        }
    
        if (selectedAgent == null) {
            System.out.println("All agents already tried for session: " + sessionId);
            return;
        }
    
        PendingOffer offer = new PendingOffer(sessionId, selectedAgent);
        offer.setAlreadyTriedAgents(alreadyTriedAgents);
        offer.getAlreadyTriedAgents().add(selectedAgent); // 👈 Mark this one as tried
    
        pendingOffers.put(sessionId, offer);
    
        // 🔔 Notify agent
        System.out.println("Sending session offer to agent: " + selectedAgent + " for session: " + sessionId);

        messagingTemplate.convertAndSend("/topic/session-assignments-all", Map.of(
            "sessionId", sessionId,
            "agent", selectedAgent,
            "expiresIn", 10
        ));
    
        // ⏲ Schedule timeout
        ScheduledFuture<?> task = scheduler.getScheduler().schedule(() -> handleTimeout(sessionId), 10, TimeUnit.SECONDS);
        offerTimeoutTasks.put(sessionId, task);
    }
    

    private synchronized void handleTimeout(String sessionId) {
        PendingOffer offer = pendingOffers.get(sessionId);
        if (offer == null) return;
    
        System.out.println("⏰ Agent " + offer.getAgentUsername() + " did not respond in time. Moving to next...");
    
        // Clean up current offer and timeout
        pendingOffers.remove(sessionId);
        offerTimeoutTasks.remove(sessionId);
    
        // Add current agent to already tried set
        Set<String> alreadyTried = offer.getAlreadyTriedAgents();
        alreadyTried.add(offer.getAgentUsername());
    
        // 🔁 Try offering to the next agent
        offerSessionToNextAgent(sessionId, alreadyTried);
    }
    
    
    public synchronized boolean confirmAgentAssignment(String sessionId, String agentUsername) {
    PendingOffer offer = pendingOffers.get(sessionId);
    if (offer == null || !offer.getAgentUsername().equals(agentUsername)) {
        return false; // ❌ Either no offer or not the current one
    }

    // ✅ Assign agent and mark as BUSY
    sessionToAgentMap.put(sessionId, agentUsername);
    SessionUserAgentAssignment assignment = new SessionUserAgentAssignment(sessionId, agentUsername);
    sessionAgentUserAssignmentRepository.save(assignment);

    // Cleanup
    offerTimeoutTasks.remove(sessionId).cancel(true);
    pendingOffers.remove(sessionId);
    availableAgents.remove(agentUsername); // ⛔️ Not available anymore

    return true;
}

public synchronized void handleDecline(String sessionId, String agentUsername) {
    PendingOffer offer = pendingOffers.get(sessionId);
    if (offer == null || !offer.getAgentUsername().equals(agentUsername)) return;

    offer.getAlreadyTriedAgents().add(agentUsername);

    // ❌ Cancel previous timeout
    ScheduledFuture<?> task = offerTimeoutTasks.remove(sessionId);
    if (task != null) task.cancel(true);

    // 🔁 Offer to next available agent
    offerSessionToNextAgent(sessionId, offer.getAlreadyTriedAgents());
}


    
}
