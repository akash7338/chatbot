import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from '../services/websocket.service';
import { ChatService, ChatMessage } from '../services/chat.service';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-user',
  imports: [CommonModule, FormsModule],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit, OnDestroy {
  role: string = 'user';
  username: string = '';
  isAgentTyping = false;
  typingUsername: string = '';
  typingTimeout: any;
  inputText = '';
  messages: ChatMessage[] = [];
  sessionId: string | null = null;
  isWaitingForAgent = false;
  showOptions = true;
  selectedFlow = '';

  constructor(
    private http: HttpClient,
    private wsService: WebSocketService,
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnDestroy() {
    this.wsService.disconnect();
  }

  ngOnInit() {
    this.username = this.authService.getUsername() || '';
    this.setupWebSocketConnection();
    this.setupChatSubscriptions();

    const selectedFlow = localStorage.getItem('selectedFlow');
    if (selectedFlow) {
      this.selectedFlow = selectedFlow;
      this.showOptions = false;
      if (selectedFlow !== 'Agent') {
        this.messages.push({ sender: 'bot', text: 'Welcome back! Continue your session.' });
      }
    } else {
      this.messages.push({ sender: 'bot', text: 'Hi! I\'m your assistant 🤖. What can I help you with today?' });
    }
  }

  setupChatSubscriptions() {
    this.chatService.getMessages().subscribe(messages => {
      this.messages = messages;
    });

    this.chatService.getTypingStatus().subscribe(status => {
      this.isAgentTyping = status.isTyping;
      this.typingUsername = status.username;
    });
  }

  setupWebSocketConnection() {
    this.wsService.connect(this.username).then(() => {
      console.log('[User] Connected ✅');
      if (this.selectedFlow === 'Agent') {
        this.createSession();
      }
    }).catch(error => {
      console.error('[User WS] Connection error:', error);
    });
  }

  selectOption(option: string) {
    this.selectedFlow = option;
    localStorage.setItem('selectedFlow', option);
    const displayText = option === 'Agent' ? 'Talk to an Agent' : option;
    this.messages.push({ sender: this.username, text: displayText });
    this.showOptions = false;

    if (option === 'Agent') {
      this.messages.push({ sender: 'bot', text: 'Connecting you to a live agent...' });
      this.createSession();
    } else {
      this.chatService.sendMessageHttp(this.sessionId || 'new', option).subscribe({
        next: (response) => {
          this.messages.push({ sender: 'bot', text: response });
        },
        error: (error) => {
          console.error('[User] Bot response error:', error);
          this.messages.push({ sender: 'bot', text: 'Sorry, I encountered an error. Please try again.' });
        }
      });
    }
  }

  createSession() {
    this.isWaitingForAgent = true;
    this.sessionId = this.username + '_' + Date.now(); // Generate a unique session ID
    this.chatService.subscribeToSession(this.sessionId, this.role);
    this.wsService.subscribe(`/topic/session-assigned/${this.sessionId}`, (data) => {
      console.log('[User] Agent assigned:', data);
      const agent = data.agent;
      this.messages.push({ sender: 'bot', text: `Agent ${agent} accepted your request. ✅` });
    });
    this.http.post(`http://localhost:8080/api/assign-agent/${this.sessionId}`, {}).subscribe({
      next: () => {
        console.log('[User] Offer process started');
        this.messages.push({ sender: 'bot', text: 'Waiting for an available agent to accept...' });
      },
      error: (error) => {
        console.error('[User] Failed to start offer process:', error);
        this.messages.push({ sender: 'bot', text: 'All agents are currently busy. Please try again later.' });
      }
    });
    this.isWaitingForAgent = false;
  }

  sendMessage() {
    if (!this.inputText.trim() || !this.sessionId) return;

    if (this.selectedFlow === 'Agent') {
      this.chatService.sendMessage(this.username, this.inputText, this.sessionId);
    } else {
      this.chatService.sendMessageHttp(this.sessionId, this.inputText).subscribe({
        next: (response) => {
          this.messages.push({ sender: 'bot', text: response });
        },
        error: (error) => {
          console.error('[User] Bot response error:', error);
          this.messages.push({ sender: 'bot', text: 'Sorry, I encountered an error. Please try again.' });
        }
      });
    }
    this.inputText = '';
  }

  handleTyping() {
    if (this.selectedFlow === 'Agent') {
      this.sendTyping(true);
      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        this.sendTyping(false);
      }, 1000);
    }
  }

  sendTyping(isTyping: boolean) {
    if (this.sessionId) {
      this.chatService.sendTyping(this.username, this.role, isTyping, this.sessionId);
    }
  }

  logout() {
    this.authService.handleLogout();
  }
}
