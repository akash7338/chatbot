import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AgentService } from './agent.service';
import { WebSocketService } from '../services/websocket.service';
import { ChatService, ChatMessage } from '../services/chat.service';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-agent',
  imports: [CommonModule, FormsModule],
  templateUrl: './agent.component.html',
  styleUrls: ['./agent.component.css'],
  providers: [AgentService]
})
export class AgentComponent implements OnInit, OnDestroy {
  role: string = 'agent';
  status: string = 'live';
  username: string = '';
  isUserTyping = false;
  typingUsername: string = '';
  typingTimeout: any;
  inputText = '';
  messages: ChatMessage[] = [];
  assignedSessionId: string | null = null;
  pendingSessionOffer: { sessionId: string; expiresIn: number } | null = null;
  showOfferPopup = false;
  countdown = 0;
  timerRef: any;
  offerCountdown = 10; // Default countdown time for session offers

  constructor(
    private http: HttpClient,
    private agentService: AgentService,
    private wsService: WebSocketService,
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnDestroy() {
    if (this.timerRef) clearInterval(this.timerRef);
    this.wsService.disconnect();
  }

  ngOnInit() {
    this.username = this.authService.getUsername() || '';

    this.agentService.getAgentStatus(this.username).subscribe({
      next: (res) => {
        console.log('[Status from backend]', res.status.toLowerCase());
        this.status = res.status.toLowerCase();
      },
      error: () => this.status = 'live'
    });

    this.setupWebSocketConnection();
    this.setupChatSubscriptions();
  }

  setupChatSubscriptions() {
    this.chatService.getMessages().subscribe(messages => {
      this.messages = messages;
    });

    this.chatService.getTypingStatus().subscribe(status => {
      this.isUserTyping = status.isTyping;
      this.typingUsername = status.username;
    });
  }

  setupWebSocketConnection() {
    console.log('[Agent] Attempting to connect to WebSocket...');
    this.wsService.connect(this.username).then(() => {
      console.log('[Agent] Connected ✅');
      console.log('[Agent] Username:', this.username);

      // Subscribe to agent status updates
      console.log('[Agent] Subscribing to status updates...');
      this.wsService.subscribe('/topic/agent-status', (data) => {
        console.log("[Agent] Status update received:", data);
        if (data.username === this.username) {
          this.status = data.status.toLowerCase();
          console.log("[Agent] Status updated to:", this.status);
        }
      });

      // Subscribe to session offers
      const offerTopic = '/topic/session-offers/' + this.username;
      console.log('[Agent] Subscribing to offers on:', offerTopic);
      this.wsService.subscribe(offerTopic, (data) => {
        console.log('[Agent] ====== Received Session Offer ======');
        console.log('[Agent] Offer data:', data);
        this.pendingSessionOffer = {
          sessionId: data.sessionId,
          expiresIn: data.expiresIn || 10
        };
        this.showOfferPopup = true;
        this.startCountdownTimer(data.expiresIn);
        console.log('[Agent] ====== Offer Processed ======');
      });
    }).catch(error => {
      console.error('[Agent WS] Connection error:', error);
    });
  }

  sendMessage() {
    if (!this.inputText.trim() || !this.assignedSessionId) return;
    this.chatService.sendMessage(this.username, this.inputText, this.assignedSessionId);
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
    if (this.assignedSessionId) {
      this.chatService.sendTyping(this.username, this.role, isTyping, this.assignedSessionId);
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
    this.authService.handleLogout();
  }
  
  startCountdownTimer(seconds: number) {
    this.countdown = seconds;
    this.timerRef = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.clearOfferPopup();
      }
    }, 1000);
  }

  clearOfferPopup() {
    this.pendingSessionOffer = null;
    this.showOfferPopup = false;
    clearInterval(this.timerRef);
  }

  acceptOffer() {
    if (!this.pendingSessionOffer) return;
    const sessionId = this.pendingSessionOffer.sessionId;
  
    this.agentService.acceptOffer(sessionId, this.username).subscribe(() => {
      console.log('[Agent] Session accepted:', sessionId);
      this.assignedSessionId = sessionId;
      this.chatService.subscribeToSession(sessionId, this.role);
      this.clearOfferPopup();
    });
  }
  
  declineOffer() {
    if (!this.pendingSessionOffer) return;
    const sessionId = this.pendingSessionOffer.sessionId;
  
    this.agentService.declineOffer(sessionId, this.username).subscribe(() => {
      this.clearOfferPopup();
    });
  }
}
