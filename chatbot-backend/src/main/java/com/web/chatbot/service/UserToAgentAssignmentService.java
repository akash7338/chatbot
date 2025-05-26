package com.web.chatbot.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.web.chatbot.ExecutorService.SchedulerService;
import com.web.chatbot.entity.PendingOffer;
import com.web.chatbot.entity.SessionUserAgentAssignment;
import com.web.chatbot.repository.SessionAgentUserAssignmentRepository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Service responsible for managing the assignment of agents to user sessions.
 * Handles both direct assignment and offer-accept-decline workflows.
 */
@Service
public class UserToAgentAssignmentService {

    // Repository for persisting session-agent assignments
    @Autowired
    private SessionAgentUserAssignmentRepository sessionAgentUserAssignmentRepository;

    // Service for scheduling timeout tasks
    @Autowired
    private SchedulerService scheduler;

    // Template for sending WebSocket messages to clients
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Data structures for the old direct assignment system
    private final Map<String, String> sessionToAgentMap = new ConcurrentHashMap<>();  // Maps session IDs to assigned agents
    private final Queue<String> availableAgents = new LinkedList<>();  // Queue of available agents

    // Data structures for the new offer-accept-decline system
    private final List<String> availableAgentsList = new ArrayList<>();  // List of available agents
    private final Map<String, PendingOffer> activeSessionOffers = new ConcurrentHashMap<>();  // Maps session IDs to their current offers
    private final Map<String, ScheduledFuture<?>> offerTimeoutTasks = new ConcurrentHashMap<>();  // Maps session IDs to their timeout tasks

    // Index for round-robin agent selection
    private int roundRobinIndex = 0;

    /**
     * Registers an agent as available for new sessions.
     * Adds them to the available agents list if they're not already there.
     * @param agentUsername The username of the agent to register
     */
    public synchronized void registerLiveAgent(String agentUsername) {
        if (!availableAgentsList.contains(agentUsername)) {
            System.out.println("[Agent] ====== Registering Live Agent ======");
            System.out.println("[Agent] Username: " + agentUsername);
            availableAgentsList.add(agentUsername);
            System.out.println("[Agent] Current available agents: " + availableAgentsList);
                    }
    }

    /**
     * Unregisters an agent, removing them from the available agents list.
     * @param agentUsername The username of the agent to unregister
     */
    public synchronized void unregisterLiveAgent(String agentUsername) {
        System.out.println("Agent "+agentUsername+" removed from live agent list");
        availableAgentsList.remove(agentUsername);
        System.out.println("[Agent] Updated available agents: " + availableAgentsList);
        System.out.println("[Agent] ====== Agent Unregistered ======");
    }

    /**
     * Offers a session to the next available agent using round-robin selection.
     * @param sessionId The ID of the session to offer
     * @param alreadyTriedAgents Set of agents who have already been offered this session
     */
    public synchronized void offerSessionToNextAgent(String sessionId, Set<String> alreadyTriedAgents) {
        if (activeSessionOffers.containsKey(sessionId)) return;  //not a necessary check
    
        if (availableAgentsList.isEmpty()) {
            System.out.println("No agents available for session: " + sessionId);
            return;
        }
    
        int attempts = 0;
        String selectedAgent = null;
    
        // Try to find an agent who hasn't been offered this session yet
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
    
        // Create and store the offer
        PendingOffer offer = new PendingOffer(sessionId, selectedAgent);
        offer.setAlreadyTriedAgents(alreadyTriedAgents);
        offer.getAlreadyTriedAgents().add(selectedAgent); // Mark this agent as tried
    
        activeSessionOffers.put(sessionId, offer);
    
        // Notify the agent about the offer using regular topic
        System.out.println("Sending session offer to agent: " + selectedAgent);
        System.out.println("[Offer] Destination: /topic/session-offers/" + selectedAgent);

        messagingTemplate.convertAndSend("/topic/session-offers/" + selectedAgent, Map.of(
                "sessionId", sessionId,
                "expiresIn", 10
            )
        );
        System.out.println("[Offer] ====== Offer Sent ======");
    
        // Schedule a timeout task to handle non-response
        ScheduledFuture<?> task = scheduler.getScheduler().schedule(() -> handleTimeout(sessionId), 10, TimeUnit.SECONDS);
        offerTimeoutTasks.put(sessionId, task);
    }
    
    /**
     * Handles the timeout of an offer when an agent doesn't respond.
     * Cleans up the offer and tries the next available agent.
     * @param sessionId The ID of the session whose offer timed out
     */
    private synchronized void handleTimeout(String sessionId) {
        PendingOffer offer = activeSessionOffers.get(sessionId);
        if (offer == null) return;
    
        System.out.println("⏰ Agent " + offer.getAgentUsername() + " did not respond in time. Moving to next...");
    
        // Clean up current offer and timeout
        activeSessionOffers.remove(sessionId);
        offerTimeoutTasks.remove(sessionId);
    
        // Add current agent to already tried set
        Set<String> alreadyTried = offer.getAlreadyTriedAgents();
        alreadyTried.add(offer.getAgentUsername());
    
        // Try offering to the next agent
        offerSessionToNextAgent(sessionId, alreadyTried);
    }
    
    /**
     * Confirms an agent's acceptance of a session offer.
     * @param sessionId The ID of the session
     * @param agentUsername The username of the accepting agent
     * @return true if the assignment was successful, false otherwise
     */
    public synchronized boolean confirmAgentAssignment(String sessionId, String agentUsername) {
        PendingOffer offer = activeSessionOffers.get(sessionId);
        if (offer == null || !offer.getAgentUsername().equals(agentUsername)) {
            return false; // Either no offer or not the current one
        }

        // Assign agent and save to database
        sessionToAgentMap.put(sessionId, agentUsername);
        SessionUserAgentAssignment assignment = new SessionUserAgentAssignment(sessionId, agentUsername);
        sessionAgentUserAssignmentRepository.save(assignment);

        // Cleanup
        offerTimeoutTasks.remove(sessionId).cancel(true);
        activeSessionOffers.remove(sessionId);
        availableAgentsList.remove(agentUsername); // Remove agent from available list since they're now busy

        return true;
    }

    /**
     * Handles an agent's decline of a session offer.
     * @param sessionId The ID of the session
     * @param agentUsername The username of the declining agent
     */
    public synchronized void handleDecline(String sessionId, String agentUsername) {
        // Get the current offer for this session
        PendingOffer offer = activeSessionOffers.get(sessionId);
        if (offer == null || !offer.getAgentUsername().equals(agentUsername)) return;

        // Add this agent to the list of agents who have already been tried
        // This prevents them from being offered the same session again
        offer.getAlreadyTriedAgents().add(agentUsername);

        // Note: The following code is commented out because we want to let the timeout handler
        // manage the cleanup and next agent assignment. This ensures consistent behavior
        // whether an agent declines or doesn't respond.

        // // ❌ Cancel previous timeout
        // ScheduledFuture<?> task = offerTimeoutTasks.remove(sessionId);
        // if (task != null) task.cancel(true);

        // // 🔁 Offer to next available agent
        // offerSessionToNextAgent(sessionId, offer.getAlreadyTriedAgents());
    }
}
