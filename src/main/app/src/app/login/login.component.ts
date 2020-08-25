import {CookieService} from 'ngx-cookie-service';
import {Component, Injectable, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AuthenticationService} from '../_services';
import {AppConfig} from '../config/app.config';

@Component({
  templateUrl: 'login.component.html',
  styleUrls: ['./login.component.css']
})

@Injectable()
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  originalUrl: string;

  constructor(
    private cookieService: CookieService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private auth: AuthenticationService
  ) {
  }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    // get return s_url from route parameters or default to '/'
    this.originalUrl = this.route.snapshot.queryParams['originalUrl'] || '';
  }

  // convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.auth.login(AppConfig.dataUrl("/auth?originalUrl=").concat(this.originalUrl), this.f.username.value, this.f.password.value, this.originalUrl)
             .subscribe(
                data => {
                  this.loading = false;
                  if (data.token) {
                    for (let p of ['/', '/ui']) {
                      this.cookieService.set('token', data.token, 365, p, );
                      this.cookieService.set('login', this.f.username.value, 365, p);
                    }
                    document.location.href = atob(this.originalUrl);
                  } else {
                    let e = document.getElementById('auth-result');
                    if (e) { e.style.display = 'block'; e.innerText = data.message; }
                  }
                },
                error => {
                  this.loading = false;
                  let e = document.getElementById('auth-result');
                  if (e) { e.style.display = 'block'; e.innerText = error.message; }
                }
             );
  }
}
