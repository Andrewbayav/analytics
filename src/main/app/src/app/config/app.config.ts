import {environment} from '../../environments/environment';

export class AppConfig {
    // URL внешнего (доступного из Интернет) адреса сервиса аналитических отчетов.
    public static dataUrl(p_relative) : string {
        let x = environment.dataUrl;
        if (x.length == 0) {
            let from = document.location;
            x = from.protocol.concat('//').concat(from.hostname).concat(':').concat(from.port);
        }

        return x.concat(p_relative);
    }

    // URL внешнего (доступного из Интернет) адреса API.
    public static apiUrl() : string {
        let p = document.location.protocol;
        return (p == 'http:') ? environment.apiIntUrl : environment.apiExtUrl;
    }
}
