package com.web.chatbot.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.web.chatbot.entity.Agent;
import com.web.chatbot.enums.AgentStatus;

public interface AgentRepository extends MongoRepository<Agent, String> {
    Optional<Agent> findByUsernameAndPassword(String username, String password);

    Optional<Agent> findByUsername(String username);

    List<Agent> findByStatus(AgentStatus status);
}
