import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {TranslateService} from '@ngx-translate/core';

@Component({ selector: 'app', templateUrl: 'app.component.html', styleUrls: ['./app.component.css'] })
export class AppComponent {

  title: string;
  visibleMenu: boolean = true;

  constructor(private router: Router,
              private translate: TranslateService,) {
    if (this.router.routerState.snapshot.url === '/login') this.visibleMenu = false;
    this.title = 'Spring Boot - Login Screen';
    this.translate.setDefaultLang('ru');
  }

}
