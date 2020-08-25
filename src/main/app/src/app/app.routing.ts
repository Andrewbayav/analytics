import {Routes, RouterModule} from '@angular/router';
import {environment} from '../environments/environment';

import {LoginComponent} from './login';
import {OverviewComponent} from "./overview/overview.component";
import {HeatmapComponent} from "./heatmap/heatmap.component";
import {DonutsComponent} from "./donuts/donuts.component";
import {AmComponent} from "./am/am.component";

const routes: Routes = [
  { path: 'overview', component: OverviewComponent },
  { path: 'login', component: LoginComponent },
  { path: 'heatmap', component: HeatmapComponent },
  { path: 'donuts', component: DonutsComponent },
  { path: 'am', component: AmComponent },
];

export const appRoutingModule = RouterModule.forRoot(routes, {enableTracing: !environment.production});

