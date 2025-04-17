import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http'; // ✅ required for ChatService
import { provideClientHydration, withEventReplay } from '@angular/platform-browser'; // optional for SSR later

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(), // ✅ enables HttpClient
    provideClientHydration(withEventReplay()) // ✅ optional but helpful for modern hydration
  ]
};
