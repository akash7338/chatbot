package com.web.chatbot.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.web.chatbot.entity.SessionUserAgentAssignment;

public interface SessionAgentUserAssignmentRepository extends MongoRepository<SessionUserAgentAssignment, String> {
    SessionUserAgentAssignment findBySessionId(String sessionId);

    void deleteBySessionId(String sessionId);
}
