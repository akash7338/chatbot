package com.web.chatbot.entity;

import java.util.HashSet;
import java.util.Set;

public class PendingOffer {
    private String sessionId;
    private String agentUsername;
    private long offerTimestamp; // epoch millis
    public Set<String> alreadyTriedAgents;

    public PendingOffer(String sessionId, String agentUsername) {
        this.sessionId = sessionId;
        this.agentUsername = agentUsername;
        this.offerTimestamp = System.currentTimeMillis();
        this.alreadyTriedAgents = new HashSet<>();
        this.alreadyTriedAgents.add(agentUsername);
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getAgentUsername() {
        return agentUsername;
    }

    public void setAgentUsername(String agentUsername) {
        this.agentUsername = agentUsername;
    }

    public long getOfferTimestamp() {
        return offerTimestamp;
    }

    public void setOfferTimestamp(long offerTimestamp) {
        this.offerTimestamp = offerTimestamp;
    }

    public Set<String> getAlreadyTriedAgents() {
        return alreadyTriedAgents;
    }

    public void setAlreadyTriedAgents(Set<String> alreadyTriedAgents) {
        this.alreadyTriedAgents = alreadyTriedAgents;
    }

}
