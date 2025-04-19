package com.web.chatbot.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.web.chatbot.entity.Agent;
import com.web.chatbot.enums.AgentStatus;
import com.web.chatbot.repository.AgentRepository;

@Service
public class AgentService {

    @Autowired
    private AgentRepository agentRepository;

    public void updateAgentStatus(String username, String statusStr) {
        Optional<Agent> agentOpt = agentRepository.findByUsername(username);
        if (agentOpt.isPresent()) {
            Agent agent = agentOpt.get();
            AgentStatus status = AgentStatus.valueOf(statusStr.toUpperCase());
            agent.setStatus(status);
            agentRepository.save(agent);
        }
    }

    public List<Agent> getLiveAgents() {
        return agentRepository.findByStatus(AgentStatus.LIVE);
    }
}
