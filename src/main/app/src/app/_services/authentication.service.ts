import { map } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  constructor(private http: HttpClient) {
  }

  login(p_url, p_login, p_password, p_originalUrl) {
    const body = "user=" + p_login + "&pwd=" + p_password + "&url=" + p_originalUrl;
    const hdr = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    return this.http.post<any>(p_url, body, { headers: hdr });
  }
}
