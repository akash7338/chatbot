package com.web.chatbot.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.web.chatbot.entity.Agent;
import com.web.chatbot.entity.User;
import com.web.chatbot.repository.AgentRepository;
import com.web.chatbot.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private AgentRepository agentRepo;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Optional<User> userOpt = userRepo.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            return org.springframework.security.core.userdetails.User
                    .withUsername(user.getUsername())
                    .password(user.getPassword())
                    .roles("USER")
                    .build();
        }

        Optional<Agent> agentOpt = agentRepo.findByUsername(username);
        if (agentOpt.isPresent()) {
            Agent agent = agentOpt.get();
            return org.springframework.security.core.userdetails.User
                    .withUsername(agent.getUsername())
                    .password(agent.getPassword())
                    .roles("AGENT")
                    .build();
        }

        throw new UsernameNotFoundException("User not found");
    }
}

