import './polyfills';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
.then(ref => {
    const upgrade = (<any>ref.instance).upgrade;
    const router = (<any>ref.instance).router;
  })
.catch(err => console.error(err));
