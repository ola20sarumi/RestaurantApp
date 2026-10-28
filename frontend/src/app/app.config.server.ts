import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { SERVER_API_BASE_URL } from './services/server-api.interceptor';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRouting(serverRoutes),
    // e.g. http://api:8080/api in docker-compose; unset, the server calls API_BASE_URL like the browser does.
    { provide: SERVER_API_BASE_URL, useValue: process.env['API_INTERNAL_URL'] || null }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
