import {Title} from '@angular/platform-browser';
import {Component, Injectable, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Telescope} from './Telescope';
import {Utils} from "../utils/utils";
import {heatmapCustom} from '../custom';
import {ChartComponent} from "ng-apexcharts";
import {AppConfig} from '../config/app.config';
import {GetDataService} from "../_services/get-data.service";
import {TranslateService} from '@ngx-translate/core';
import {ActivatedRoute} from '@angular/router';
import {LocalStorageService} from "../_services/local-storage.service";
import {Observable, of} from 'rxjs';

declare var $: any;

@Component({
  selector: 'app-heatmap',
  templateUrl: 'heatmap.component.html',
  styleUrls: ['heatmap.component.css'],
  encapsulation: ViewEncapsulation.None,
})

@Injectable()
export class HeatmapComponent implements OnInit {
  @ViewChild("chart") chart: ChartComponent;
  chartOptionsArr: Observable<Object[]>;

  static s_url : string = AppConfig.apiUrl().concat('/api/tel-status?action=get_specification');
  static heatmapJson : string = AppConfig.dataUrl('/heatinfo');
  static startYearUrl : string = AppConfig.dataUrl('/startyear');

  selectedYear;
  specificationObjects = [];
  busy = false;

  constructor(private http: HttpClient,
              private getData: GetDataService,
              private route: ActivatedRoute,
              private localStorageService: LocalStorageService,
              private translate: TranslateService,
              private titleService: Title) {
    let lang = this.route.snapshot.queryParams['lang'] || 'ru';
    this.translate.setDefaultLang(lang.toString());
    this.translate.get("heatmap.title").subscribe((translated: string) => { this.titleService.setTitle(translated) });
  }

  //
  showWait(p_onOff) {
    this.busy = p_onOff;
    document.getElementById("blockingScreen").style.display = p_onOff ? "block" : "none";
  }

  makeVisible() {
    document.getElementById('document').style.visibility = 'visible';
  }

  checkState() {
    this.makeVisible();
    let token = this.getData.getToken();
    if (this.localStorageService.get(token)) {
      let year = new Date(this.localStorageService.get(token).date).getFullYear();
      $('#select').val(year);
      this.selectYear(year, true);
    }
  }

  setState(day?, code?) {
    if (day && code) {
      this.localStorageService.set(this.getData.getToken(), {'code' : code, 'date' : day});
    } else {
      let token = this.getData.getToken();
      if (this.localStorageService.get(token)) {
        this.localStorageService.set(this.getData.getToken(), {'code' : this.localStorageService.get(token).code, 'date' : new Date(this.selectedYear,0,1).getTime()});
      } else {
        this.localStorageService.set(this.getData.getToken(), {'code' : 10989, 'date' : new Date(this.selectedYear,0,1).getTime()});
      }
    }
  }

  selectYear(year, noSetState?) {
    this.selectedYear = year;
    if (!noSetState) {
      this.setState();
    }
    this.refresh();
  }

  prepare() {
    this.getData.validate(HeatmapComponent.s_url, this.specificationObjects, this.checkState.bind(this));
  }

  refresh() {
    this.showWait(true);
    let url = HeatmapComponent.heatmapJson.concat('?codes=').concat(Utils.getCodes(this.specificationObjects)).concat('&year=').concat(this.selectedYear.toString());
    this.http.get(url, {responseType:'json'}).toPromise().then(data => {
      this.renderHeatMap(data);
    }, error => {
       console.error(error.message);
    });
  }

  dataSorter(p_date, p_count, telescope) {
    let d = new Date(p_date);
    let cell = {x: Utils.getWeek(d), y: p_count, z: Utils.toString(d), tm: d.getTime()};
    let plug = {x: 1, y: 0, z: '-'};
    telescope.sum += p_count;

    switch (d.getDay()) {
      case 0:
        let sunday = telescope.sunday;
        if (cell.x == 2 && sunday.length == 0) sunday.push(plug);
        sunday.push(cell);
        break;
      case 1:
        let monday = telescope.monday;
        if (cell.x == 2 && monday.length == 0) monday.push(plug);
        monday.push(cell);
        break;
      case 2:
        let tuesday = telescope.tuesday;
        if (cell.x == 2 && tuesday.length == 0) tuesday.push(plug);
        tuesday.push(cell);
        break;
      case 3:
        let wednesday = telescope.wednesday;
        if (cell.x == 2 && wednesday.length == 0) wednesday.push(plug);
        wednesday.push(cell);
        break;
      case 4:
        let thursday = telescope.thursday;
        if (cell.x == 2 && thursday.length == 0) thursday.push(plug);
        thursday.push(cell);
        break;
      case 5:
        let friday = telescope.friday;
        if (cell.x == 2 && friday.length == 0) friday.push(plug);
        friday.push(cell);
        break;
      case 6:
        let saturday = telescope.saturday;
        if (cell.x == 2 && saturday.length == 0) saturday.push(plug);
        saturday.push(cell);
        break;
    }
  }

  renderHeatMap(p_json) {
    let telescopeObjects = [], charData = [];
    let daysInYear = Utils.getDaysCountInYear(this.selectedYear);
    let t0 = new Date(this.selectedYear, 0, 1).getTime();
    for (let obj of this.specificationObjects) {
      let telescope = new Telescope(this.selectedYear, obj.code, p_json[obj.code], obj.name);
      for (let j = 0; j < daysInYear; ++j) {
        let c = telescope.tempArray[j] || 0;
        this.dataSorter(t0 + j * 86400000, c, telescope);
      }
      telescopeObjects.push(telescope);
    }

    telescopeObjects.sort(function (a, b) {
        if (a.sum > b.sum) return -1;
        if (a.sum < b.sum) return 1;
        return 0;
      }
    );

    for (let obj of telescopeObjects) {
      if (obj.sum <= 0) continue;

      let chartOptions = {
        tooltip: {
          style: {
            fontSize: '12px',
            fontFamily: undefined
          },
          enabled: true,
          y: {
            formatter: undefined,
            title: {
              formatter: (seriesName) => (this.translate.instant("heatmap.measurements") + seriesName),
            },
          },
          z: {
            formatter: undefined,
            title: this.translate.instant("heatmap.date").concat(': ')
          },
        },
        series: [
          {name: '', data: obj.sunday},
          {name: '', data: obj.saturday},
          {name: '', data: obj.friday},
          {name: '', data: obj.thursday},
          {name: '', data: obj.wednesday},
          {name: '', data: obj.tuesday},
          {name: '', data: obj.monday}
        ],
        xaxis: {
          labels: {
            show: false,
          }
        },

        chart: {
          height: 200,
          type: 'heatmap',
          toolbar: { show: false },
          markers: { size: 0 },
          zoom: { enabled: false },
          dropShadow: { enabled: false },
          redrawOnParentResize: false,
          animations: {
            enabled: false, speed: 0,
            animateGradually: { enabled: false, delay: 0 },
            dynamicAnimation: { enabled: false, speed: 0 }
          },
          events: {
            dataPointSelection: function (event, chartContext, config) {
              if (event.button != 2 || chartContext == null) {
                event.preventDefault();
                return;
              }
              let id = chartContext.titleSubtitle.w.config.title.telescopeId;
              let leftToRight = event.target.getAttribute('j');
              let downToUp = event.target.getAttribute('i');
              var date = config.w.config.series[downToUp].data[leftToRight].tm;
              let oldCL = document.oncontextmenu;

              document.oncontextmenu = function contextMenuListener(id, date, chartContext, oldCL, event) {
                let contextElement = document.getElementById("context-menu");
                contextElement.style.top = event.clientY + "px";
                contextElement.style.left = (event.clientX + 150 > $(document).width()) ? (event.clientX - 150) + "px" : (event.clientX + 10) + "px";
                contextElement.classList.add("active");

                event.preventDefault();
                document.oncontextmenu = oldCL;

                document.addEventListener("click", function(id, p_date, p_event) {
                  //let reverseDate = Utils.reverseDateArray(date);
                  this.setState(p_date, Utils.getCodeForSelectedId(id, this.specificationObjects));
                  let cmd = '';
                  if (p_event.target.tagName === 'DIV') cmd = p_event.target.id;
                  if (p_event.target.tagName === 'I') cmd = p_event.target.parentElement.id;

                  if (cmd != 'transparency' && cmd != 'tracks' && cmd != 'planetarium') {
                    p_event.preventDefault();
                    document.getElementById("context-menu").classList.remove("active");
                    return;
                  }
                  let d = new Date(p_date);
                  document.getElementById("context-menu").classList.remove("active");
                  document.location.href = document.location.origin
                    .concat('/am?')
                    .concat('id=').concat(id)
                    .concat('&YY=').concat(d.getFullYear().toString())
                    .concat('&MM=').concat((d.getMonth() + 1).toString())
                    .concat('&DD=').concat(d.getDate().toString())
                    .concat('&accordion=').concat(cmd);
                }.bind(this, id, date));
              }.bind(this, id, date, chartContext, oldCL);
            }.bind(this),
          }
        },
        colors: [heatmapCustom.colors],
        title: {
          text: obj.name.concat(' (').concat(obj.code).concat(')'),
          telescopeId: Utils.getIdForSelectedCode(obj.code, this.specificationObjects)
        },
      };

      charData.push(chartOptions);
    } // for

    this.chartOptionsArr = of(charData);
    this.showWait(false);
  }

  ngOnInit(): void {
    Utils.setSelect(this.http, HeatmapComponent.startYearUrl, this.prepare.bind(this));

    $(function(){
      $('a.trigger').on('click', function(){
        $('.SiteHeader').toggleClass('is-open');
      });
    });

  }
}
