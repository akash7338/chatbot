package com.web.chatbot.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.web.chatbot.entity.Agent;

public interface AgentRepository extends MongoRepository<Agent, String> {
    Optional<Agent> findByUsernameAndPassword(String username, String password);
}

