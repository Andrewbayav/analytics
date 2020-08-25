import {environment} from './environments/environment';

import 'core-js/features/reflect';
import 'zone.js/dist/zone';

if (environment.production) {
  if (window.console) { var console = {log:function(){},warn:function(){},info:function(){}}}
  window.console.log=window.console.warn=window.console.info=function(){};
}
