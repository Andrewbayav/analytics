import {BrowserModule} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpClient, HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';
import {AmChartsModule} from "@amcharts/amcharts3-angular";

import {appRoutingModule} from './app.routing';
import {AppComponent} from './app.component';
import {LoginComponent} from './login';
import {OverviewComponent} from './overview/overview.component';
import {CookieService} from 'ngx-cookie-service';
import {HeatmapComponent} from './heatmap/heatmap.component';
import {NgApexchartsModule} from 'ng-apexcharts';
import {DonutsComponent} from './donuts/donuts.component';
import {AmComponent} from './am/am.component';
import {RedirectInterceptor} from './_services/interceptor';
import { MenuComponent } from './menu/menu.component';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    OverviewComponent,
    HeatmapComponent,
    DonutsComponent,
    AmComponent,
    MenuComponent,
  ],
  imports: [
    BrowserModule,
    NoopAnimationsModule,
    ReactiveFormsModule,
    HttpClientModule,
    appRoutingModule,
    NgApexchartsModule,
    FormsModule,
    AmChartsModule,
    FontAwesomeModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })

  ],
  exports: [
    MenuComponent
  ],
  providers: [
    CookieService,
    MenuComponent,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RedirectInterceptor,
      multi: true
    }
    ],
  bootstrap: [AppComponent]
})

export class AppModule {
}

// required for AOT compilation
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
