import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { HttpClient } from '@angular/common/http';
import { AgentService } from './agent.service';

@Component({
  standalone: true,
  selector: 'app-agent',
  imports: [CommonModule, FormsModule],
  templateUrl: './agent.component.html',
  styleUrls: ['./agent.component.css'],
  providers: [AgentService] // ✅ provide the service
})
export class AgentComponent implements OnInit {
  role: string = 'Agent';
  status: string = 'live'; // "live" by default
  username: string = '';
  isUserTyping = false;
  typingTimeout: any;
  inputText = '';
  messages: { sender: string; text: string }[] = [];

  stompClient!: Client;
  constructor(private http: HttpClient, private agentService: AgentService) { }

  ngOnInit() {
    this.username = localStorage.getItem('username') || '';

    this.agentService.getAgentStatus(this.username).subscribe({
      next: (res) => {
        console.log('[Status from backend]', res.status.toLowerCase());
        this.status = res.status.toLowerCase();
      },
      error: () => this.status = 'live'
    });
    
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

          this.stompClient.subscribe('/topic/typing', (message) => {
            const data = JSON.parse(message.body);
            console.log('[Typing] Received in agent:', data);
            // Only care if someone else (i.e. agent) is typing
            if (data.sender !== this.role) {
              this.isUserTyping = data.typing === 'true' || data.typing === true;
            }
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

  handleTyping() {
    this.sendTyping(true);

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.sendTyping(false);
    }, 1000);
  }

  sendTyping(isTyping: boolean) {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: '/app/typing',
        body: JSON.stringify({
          sender: this.role,
          typing: isTyping
        })
      });
    }
  }

  updateAgentStatus(status: string) {
    const username = localStorage.getItem('username')!;
    this.agentService.updateStatus(username, status).subscribe({
      next: () => console.log('Status updated'),
      error: (err) => console.error('Failed to update status', err)
    });
  }

  onStatusChange() {
    this.updateAgentStatus(this.status);
  }
  


  logout() {
    localStorage.clear(); // or localStorage.removeItem('role') / 'username' if needed
    window.location.href = '/login'; // OR use: this.router.navigate(['/login']);
  }

}
