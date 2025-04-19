package com.web.chatbot.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.web.chatbot.enums.AgentStatus;

@Document(collection = "agents")
public class Agent {
    @Id
    private String id;
    private String username;
    private String password;
    private String role; // "agent
    private AgentStatus status;
    public String getId() {
        return id;
    }
    public void setId(String id) {
        this.id = id;
    }
    public String getUsername() {
        return username;
    }
    public void setUsername(String username) {
        this.username = username;
    }
    public String getPassword() {
        return password;
    }
    public void setPassword(String password) {
        this.password = password;
    }
    public String getRole() {
        return role;
    }
    public void setRole(String role) {
        this.role = role;
    }
    public AgentStatus getStatus() {
        return status;
    }
    public void setStatus(AgentStatus status) {
        this.status = status;
    }

    
}
