import {Title} from '@angular/platform-browser';
import {Component, Injectable, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http'
import {ActivatedRoute} from '@angular/router';
import Calendar from 'js-year-calendar';
import 'js-year-calendar/locales/js-year-calendar.ru';
import {overviewCustom} from '../custom';
import {TranslateService} from '@ngx-translate/core';
import {AppConfig} from '../config/app.config';
import {GetDataService} from "../_services/get-data.service";
import {Utils} from "../utils/utils";
import {LocalStorageService} from "../_services/local-storage.service";
import {MenuComponent} from "../menu/menu.component";
import {jsonTest} from '../../test-helper';

declare var $: any;

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})

@Injectable()
export class OverviewComponent implements OnInit {
  s_url = AppConfig.apiUrl().concat('/api/tel-status?action=get_specification');

  calendarJson = AppConfig.dataUrl('/overviewone');

  specificationObjects = [];
  dataSource = [];
  selectedCode = null;
  calendar = null;
  json = null;
  busy = false;
  stateYear = null;

  constructor(private http: HttpClient,
              private getData: GetDataService,
              private translate: TranslateService,
              private route: ActivatedRoute,
              private localStorageService: LocalStorageService,
              private menu: MenuComponent,
              private titleService: Title) {

    let lang = this.route.snapshot.queryParams['lang'] || 'ru';
    this.translate.setDefaultLang(lang.toString());
    this.translate.get("overview.title").subscribe((translated: string) => { this.titleService.setTitle(translated) });
  }

  public getDataService() {
    return this.getData;
  }

  public getLocalStorageService() {
    return this.localStorageService;
  }

  //
  showWait(p_onOff) {
    this.busy = p_onOff;
    document.getElementById("blockingScreen").style.display = p_onOff ? "block" : "none";
  }

  makeVisible() {
    document.getElementById('document').style.visibility = 'visible';
    // document.getElementById('calendar').style.visibility = 'visible';
  }

  // ask for this f from select-html
  selectCode(code, notSetState?) {
    this.selectedCode = code;
    if (!notSetState) {
      this.setState(new Date().getTime())
    }
    this.refresh();
  }

  refresh() {
    this.showWait(true);
    let url = this.calendarJson.concat('?code=').concat(this.selectedCode);
    this.http.get(url, {responseType:'json', withCredentials: true}).toPromise().then(data => {
      this.json = data;
      this.renderCalendar();
      this.showWait(false);
    }, error => {
      console.error(error.message);
    });
  }

  prepare() {
    this.getData.validate(this.s_url, this.specificationObjects, this.checkState.bind(this));
  }

  menuFunction(element, accordion) {
    this.setState(element.startDate.getTime());
    let id = Utils.getIdForSelectedCode(this.selectedCode, this.specificationObjects);
    document.location.href = document.location.origin
      .concat('/am?')
      .concat('id=').concat(id)
      .concat('&YY=').concat(element.startDate.getFullYear())
      .concat('&MM=').concat((element.startDate.getMonth() + 1).toString())
      .concat('&DD=').concat(element.startDate.getDate())
      .concat('&accordion=').concat(accordion);
  }

  public initCalendar() {
    //calendar
    this.calendar = new Calendar('#calendar');
    // if (this.localStorageService.get(this.getData.getToken())) {
    //   let token = this.getData.getToken();
    //   let params = this.localStorageService.get(token).split(' ');
    //   this.calendar.options.startYear = params[1];
    // }
    // setting monday as first day of week
    //$('#calendar').css('visibility', 'visible');
    document.getElementById('calendar').style.visibility = 'visible';
    if (this.translate.getDefaultLang() == "ru") {
      this.calendar.setWeekStart(1);
      this.calendar.setLanguage('ru');
    }
    this.calendar.setStyle('custom');
    this.calendar.setMaxDate(new Date());

    //if we need to enable and set up ContextMenu
    let menuItems = [
      {text: 'transparency', click:  function (element) {
          this.menuFunction(element, 'transparency')
        }.bind(this)},
      {text: 'tracks', click:  function (element) {
          this.menuFunction(element, 'tracks')
        }.bind(this)},
      {text: 'planetarium', click:  function (element) {
          this.menuFunction(element, 'planetarium')
        }.bind(this)},
    ];
    this.calendar.setEnableContextMenu(true);
    this.calendar.setContextMenuItems(menuItems);
    //this is how we can send func as a method param:
    function renderDays(element, date) {
      for (var i = 0; i < this.dataSource.length; i++) {
        if (date.getTime() == new Date(this.dataSource[i]['date']).getTime() - 10800000) {
          if (this.dataSource[i]['count'] > 100)
            $(element).css('background-color', overviewCustom.moreThan100);
          else if (this.dataSource[i]['count'] > 50)
            $(element).css('background-color', overviewCustom.moreThan50);
          else if (this.dataSource[i]['count'] > 25)
            $(element).css('background-color', overviewCustom.moreThan25);
          else
            $(element).css('background-color', overviewCustom.lessThan25);
          $(element).css('border-radius', '15px');
        }
      }
    }

    this.calendar.setCustomDayRenderer(renderDays);
    let measurements = this.translate.instant("overview.measurements");

    //mouseOnDay
    document.querySelector('.calendar').addEventListener('mouseOnDay', function (_e) {
      let content = '';
      let e = (<any>_e);
      for (var x of e.events) {
        content += '<div class="event-tooltip-content">'
          + '<div class="event-name" style="color: #669">' + x.name + '</div>'
          + '<div class="event-location">' + measurements + ' : ' + x.count + '</div>'
          + '</div>';
      }
      $(e.element).popover({ trigger: 'manual', container: 'body', html: true, content: content });
      $(e.element).popover('show');
      $('.bs-popover-right').addClass('right');
    });

    document.querySelector('.calendar').addEventListener('yearChanged', function (e) {
      this.setState(new Date(e.currentYear,0,1).getTime());
    }.bind(this));

    //mouseOutDay
    document.querySelector('.calendar').addEventListener('mouseOutDay', function (e) {
      $((<any>e).element).popover('hide');
      $('.bs-popover-right').removeClass('right');
    });

    //clickOnDay
    document.querySelector('.calendar').addEventListener('dayContextMenu', function(e) {
      $((<any>e).element).popover('hide');
      $('.bs-popover-right').removeClass('right');
    });
  }

  renderCalendar() {
    if (this.calendar == null) {
      this.initCalendar();
    }
    if (this.stateYear != null) {
      let currentStateDay = this.localStorageService.get(this.getData.getToken()).date;
      this.calendar.setYear(this.stateYear);
      this.stateYear = null;
      this.setState(currentStateDay);
    }
    debugger
    this.dataSource = [];
    let x_rows = this.json[this.selectedCode];
    for (let i in x_rows) {
      let x_row = x_rows[i], x_date = new Date(x_row.date);
      let measurement = { id: i, name: x_row.date, startDate: x_date, endDate: x_date, count: x_row.count, date: x_row.date };
      this.dataSource.push(measurement);
    }
    this.calendar.setDataSource(this.dataSource);
  }


  checkState() {
    this.makeVisible();
    let token = this.getData.getToken();
    if (this.localStorageService.get(token)) {
      let params = this.localStorageService.get(token);
      this.stateYear = new Date(params.date).getFullYear();
      this.selectCode(params.code, true);
    }
  }

  setState(day) {
    let state;
    state = {
      'code' : this.selectedCode,
      'date' : day
    };
    this.localStorageService.set(this.getData.getToken(), state);
  }

  ngOnInit(): void {
    this.prepare();
  }
}
