import {Title} from '@angular/platform-browser';
import {Component, OnInit, ViewChild, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {donutsCustom} from "../custom";
import {Utils} from "../utils/utils";
import {AppConfig} from '../config/app.config';
import {ChartComponent} from "ng-apexcharts";
import {GetDataService} from "../_services/get-data.service";
import {TranslateService} from '@ngx-translate/core';
import {ActivatedRoute} from '@angular/router';
import {LocalStorageService} from "../_services/local-storage.service";

declare var $: any;

@Component({
  selector: 'app-donuts',
  templateUrl: './donuts.component.html',
  styleUrls: ['./donuts.component.css']
})

@Injectable()
export class DonutsComponent implements OnInit {
  @ViewChild("chart") chart: ChartComponent;
  chartOptions;
  chartOptions2;

  years = [];
  hasData = false;
  busy = false;

  s_url = AppConfig.apiUrl().concat('/api/tel-status?action=get_specification');

  donutsJson = AppConfig.dataUrl('/donutsinfo');
  startYearUrl = AppConfig.dataUrl('/startyear');

  specificationObjects = [];
  selectedYear;

  constructor(private http: HttpClient,
              private getData: GetDataService,
              private translate: TranslateService,
              private route: ActivatedRoute,
              private localStorageService: LocalStorageService,
              private titleService: Title) {
    let lang = this.route.snapshot.queryParams['lang'] || 'ru';
    this.translate.setDefaultLang(lang.toString());
    this.translate.get("donuts.title").subscribe((translated: string) => { this.titleService.setTitle(translated) });
  }

  checkDataLoaded() {
    if (this.specificationObjects.length > 0 && this.years.length > 0)
      $('#title').css('visibility', 'visible');
  }

  showWait(p_onOff) {
    this.busy = p_onOff;
    document.getElementById("blockingScreen").style.display = p_onOff ? "block" : "none";
  }

  isLoaded() {
    return this.hasData;
  }

  selectYear(year, noSetState?) {
    this.selectedYear = year;
    if (!noSetState) {
      this.setState();
    }
    this.refresh();
    $('#title').css('visibility', 'visible');
    $('#donuts').css('visibility', 'visible');
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

  makeVisible() {
    document.getElementById('document').style.visibility = 'visible';
  }

  refresh() {
    this.showWait(true);
    //this is how we get json from spring boot
    let url = this.donutsJson.concat('?codes=').concat(Utils.getCodes(this.specificationObjects)).concat('&year=').concat(this.selectedYear.toString());
    this.http.get(url).toPromise().then(data => {
      this.renderDonuts(data);
    }, error => {
       console.error(error.message);
    });
  }

  prepare() {
    this.getData.validate(this.s_url, this.specificationObjects, this.checkState.bind(this));
    this.checkDataLoaded();
  }


  renderDonuts(p_json) {
    this.hasData = true;
    let labels = [];
    let seriesNights = [];
    let seriesMeasurements = [];
    //let colors = [];
    for (let i in this.specificationObjects) {
      let code = this.specificationObjects[i].code;
      if (p_json[code].count != 0 || p_json[code].sum != 0) {
        labels.push(this.specificationObjects[i].name.concat(' (').concat(code).concat(')'));
        seriesNights.push(p_json[code].count);
        seriesMeasurements.push(p_json[code].sum);
        //colors.push(Utils.getRandomColor())
      }
    }

    this.chartOptions = {
      dataLabels: {
        offset: 0,
        minAngleToShowLabel: 1,
        style: {
          colors: [donutsCustom.percentColor]
        },
      },
      chart: {
        type: 'donut'
      },
      colors: donutsCustom.colors,
      series: seriesNights,
      labels: labels,
      plotOptions: {
        pie: {
          customScale: donutsCustom.customScale,
          offsetX: 0,
          offsetY: 0,
          expandOnClick: false,
          donut: {
            size: donutsCustom.donutSize,
            background: 'transparent',
            labels: {
              show: true,
              total: {
                show: true,
                showAlways: true,
                // label: 'Total',
                label: this.translate.instant("donuts.total"),
                fontSize: '33px',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 600,
                color: '#373d3f',
                formatter: function (w) {
                  return w.globals.seriesTotals.reduce((a, b) => {
                    return a + b
                  }, 0)
                }
              }
            }
          },
        }
      }
    };
    this.chartOptions2 = {
      dataLabels: {
        offset: 0,
        minAngleToShowLabel: 1,
        style: {
          colors: [donutsCustom.percentColor]
        },
      },
      chart: {
        type: 'donut'
      },
      colors: donutsCustom.colors,
      labels: labels,
      series: seriesMeasurements,
      plotOptions: {
        pie: {
          customScale: donutsCustom.customScale,
          offsetX: 0,
          offsetY: 0,
          expandOnClick: false,
          donut: {
            size: donutsCustom.donutSize,
            background: 'transparent',
            labels: {
              show: true,
              total: {
                show: true,
                showAlways: true,
                label: this.translate.instant("donuts.total"),
                fontSize: '33px',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 600,
                color: '#373d3f',
                formatter: function (w) {
                  return w.globals.seriesTotals.reduce((a, b) => {
                    return a + b
                  }, 0)
                }
              }
            }
          },
        }
      }
    };
    this.showWait(false);
  }

  ngOnInit(): void {
    Utils.setSelect(this.http, this.startYearUrl, this.prepare.bind(this));
  }
}
