package com.web.chatbot.entity;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "session_user_agent_assignments")
public class SessionUserAgentAssignment {
    @Id
    private String sessionId;
    private String agentUsername;
    private Instant timestamp;

    public SessionUserAgentAssignment(){}

    public SessionUserAgentAssignment(String sessionId, String agentUsername) {
        this.sessionId = sessionId;
        this.agentUsername = agentUsername;
        this.timestamp =  Instant.now();
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

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
