import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Component({
  standalone: true,
  selector: 'app-agent',
  imports: [CommonModule, FormsModule],
  templateUrl: './agent.component.html',
  styleUrls: ['./agent.component.css']
})
export class AgentComponent implements OnInit {
  role: string = 'Agent';
  inputText = '';
  messages: { sender: string; text: string }[] = [];

  stompClient!: Client;

  ngOnInit() {
    this.setupWebSocketConnection();
  }

  setupWebSocketConnection() {
    try {
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8080/chat-websocket'),
        reconnectDelay: 5000,
        debug: (msg) => console.log('[Agent WS]', msg),
        onConnect: () => {
          console.log('[Agent] Connected ✅');

          this.stompClient.subscribe('/topic/messages', (message) => {
            const received = JSON.parse(message.body);
            this.messages.push({ sender: received.sender, text: received.message });
          });
        },
        onStompError: (frame) => {
          console.error('[Agent WS] STOMP error:', frame.headers['message']);
        }
      });

      this.stompClient.activate();
    } catch (e) {
      console.error('[Agent WS] Setup failed:', e);
    }
  }

  sendMessage() {
    if (!this.inputText.trim()) return;

    const payload = {
      sender: this.role,
      message: this.inputText.trim(),
      timestamp: new Date()
    };

    //this.messages.push({ sender: 'Agent', text: payload.message });

    this.stompClient.publish({
      destination: '/app/sendMessage',
      body: JSON.stringify(payload)
    });

    this.inputText = '';
  }
}
