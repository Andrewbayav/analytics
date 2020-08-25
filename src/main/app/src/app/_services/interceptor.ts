import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs/internal/Observable';
import {catchError} from 'rxjs/operators';
import {Injectable} from '@angular/core';
import {AppConfig} from "../config/app.config";

@Injectable()
export class RedirectInterceptor implements HttpInterceptor {
  static sRoot: string = AppConfig.dataUrl('/');

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.indexOf(RedirectInterceptor.sRoot) >= 0 && !req.withCredentials) {
      req = req.clone({withCredentials: true});
    }

    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse, caught: Observable<HttpEvent<any>>) => {
        if (!err.ok && err.status == 200 && err.url.indexOf('/ui/login') > 0) {
          document.location.href = err.url;
        }

        return caught;
      })
    );
  }
}
