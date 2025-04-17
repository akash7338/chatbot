import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'chat',
    pathMatch: 'full'
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./chat/chat.component').then(m => m.ChatComponent)
  },
  {
    path: 'agent',
    loadComponent: () =>
      import('./agent/agent.component').then(m => m.AgentComponent)
  }
  
];
