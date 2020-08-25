import {CookieService} from 'ngx-cookie-service';
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {AppConfig} from "../config/app.config";
import {specificationTest} from '../../test-helper';

@Injectable({ providedIn: 'root' })
export class GetDataService {
  token : string = '';
  login : string = '';

  constructor(private http: HttpClient, private cookieService: CookieService) {
  }

  getToken() : string { return this.token; }
  getLogin() : string { return this.login; }

  getData(p_url, p_specificationObjects, p_callback?) {
    this.http.get(p_url).toPromise().then(data => {
      for (let key in data) {
        if (data.hasOwnProperty(key)) {
          data[key].forEach((val) => {
            p_specificationObjects.push(val);
          });
        }
      }
      if (p_callback) p_callback();
    }, error => {
       console.error(error.message);
    });
  }

  validate(p_url, p_mass, p_callback?) {
    this.login = this.cookieService.get('login');
    this.token = this.cookieService.get('token');
    let url = AppConfig.apiUrl().concat('/api/authorize?action=validate&token=').concat(this.token).concat('&login=').concat(this.login);
    this.http.get(url).toPromise().then(data => {
      if (data['message'] == 'Invalid token') {
        let originalUrl = "?originalUrl=".concat(btoa(document.location.href));
        document.location.href = AppConfig.dataUrl('/auth').concat(originalUrl);
      } else {
        let url = p_url.concat('&token=').concat(this.token).concat('&login=').concat(this.login);
        this.getData(url, p_mass, p_callback);
      }
    }, error => {
      this.token = this.login = '';
      let originalUrl = "?originalUrl=".concat(btoa(document.location.href));
      document.location.href = AppConfig.dataUrl('/auth').concat(originalUrl);
    });
  }
}
