package com.web.chatbot.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.web.chatbot.entity.User;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsernameAndPassword(String username, String password);
}
