// 👇 Fix for SockJS expecting 'global'
(window as any).global = window;
