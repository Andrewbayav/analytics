import {Component, NgZone, OnInit} from '@angular/core';
import {AmChart, AmChartsService} from "@amcharts/amcharts3-angular";
import {Utils} from "../utils/utils";
import * as am4core from "@amcharts/amcharts4/core";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";
import * as anychart from "../../anymap/anychart-base.min.js";
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {AppConfig} from "../config/app.config";
import {GetDataService} from "../_services/get-data.service";
import {TranslateService} from '@ngx-translate/core';
import {Title} from '@angular/platform-browser';
import {LocalStorageService} from "../_services/local-storage.service";

am4core.useTheme(am4themes_animated);
declare var $: any;

@Component({
  selector: 'app-am',
  templateUrl: './am.component.html',
  styleUrls: ['./am.component.css']
})

export class AmComponent implements OnInit {
  private chartAtm: AmChart;
  private chartGuidance: AmChart;
  private chartTelPos: AmChart;

  constructor(private zone: NgZone,
              private AmCharts: AmChartsService,
              private http: HttpClient,
              private translate: TranslateService,
              private route: ActivatedRoute,
              private localStorageService: LocalStorageService,
              private getData: GetDataService,
              private titleService: Title) {

    this.LANG = this.route.snapshot.queryParams['lang'] || 'ru';
    this.translate.setDefaultLang(this.LANG.toString());
    this.translate.get("overview.title").subscribe((translated: string) => { this.titleService.setTitle(translated) });
  }
  roundParam = 3;
  specificationObjects = [];
  GET_TRACKS = AppConfig.dataUrl('/getTracks');
  GET_TOR = AppConfig.dataUrl('/getTOR');
  GET_IDENTIFICATION = AppConfig.dataUrl('/getIdentification');
  LANG = null;

  // charts
  chartIdent = null;
  chartTrackError = null;
  chartTrackAltAz = null;
  Hist_dT = [];
  Hist_dAlong = [];
  Hist_dAcross = [];
  Hist_Dist = [];
  Hist_Mag = [];
  TelescopeValidPose = [];
  AtmosphereTransparency = [];
  AtmosphereBrExist = true;
  trackPointIdentFull = [];
  PlanPoints = [];
  RealPoints = [];
  DiffPoints = [];
  IdentTracks = [];
  CurrentTelescopeID = "";
  CurrentTelescopeLNG : number = 0;
  CurrentTelescopeLAT : number = 0;
  CurrentTelescopeCode : number = 0;


  ngOnInit(): void {
    this.accordion();
    let url = AppConfig.apiUrl().concat('/api/tel-status?action=get_specification');
    this.getData.validate(url, this.specificationObjects, this.getInfo.bind(this));
  }

  accordion() {
    let acc = document.getElementsByClassName("accordion");
    let i;

    for (i = 0; i < acc.length; i++) {
      acc[i].addEventListener("click", function() {
        this.classList.toggle("active");
        let panel = this.nextElementSibling;
        if (panel.style.maxHeight){
          panel.style.maxHeight = null;
        } else {
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      });
    }
  }

  makeVisible() {
    document.getElementById('document').style.visibility = 'visible';
  }

  getInfo() : void {
    this.makeVisible();
    let now = new Date;
    let url = new URLSearchParams(window.location.search.toLowerCase()); // результат - строка запроса без адреса страницы "id=someName&userMail=some@mail.com&usText=MemoText"

    // теперь брать по очереди
    let token = this.getData.getToken();
    let stateId;
    let stateDay;
    let stateMonth;
    let stateYear;
    let state = this.localStorageService.get(token);
    if (state) {
      stateId = Utils.getIdForSelectedCode(state.code, this.specificationObjects);
      stateDay = new Date(state.date).getDate();
      stateMonth = new Date(state.date).getMonth()+1;
      stateYear = new Date(state.date).getFullYear();

    }

    let id = url.get('id') || stateId || "chilegenon";
    let YY = url.get('yy') || stateYear || now.getFullYear();
    let MM = url.get('mm') || stateMonth || now.getMonth() + 1;
    let DD = url.get('dd') || stateDay || now.getDate();
    let activeAccordion = url.get('accordion') || '' ;
    if (activeAccordion != '') {
      document.getElementById(activeAccordion).click();
    }
    document.getElementById('telescope').innerHTML = id + ' ' + DD + '.' + MM + '.' + YY;


    let year = "" + YY;
    let month = "" + MM;
    if (month.length == 1) { month = "0" + month; }
    let day = "" + DD;
    if (day.length == 1) { day = "0" + day; }
    this.CurrentTelescopeID = id;

    for (let i in this.specificationObjects) {
      if (this.specificationObjects[i].id === this.CurrentTelescopeID) {
        this.CurrentTelescopeLNG =  this.specificationObjects[i].lng;
        this.CurrentTelescopeLAT = this.specificationObjects[i].lat;
        this.CurrentTelescopeCode = this.specificationObjects[i].code;
      }
    }

    let qident = this.GET_TRACKS + "?id=" + this.CurrentTelescopeID + "&year=" + YY + "&month=" + MM + "&day=" + DD;
    this.httpGet(qident, this.parseIdentification.bind(this));

    let qatm = this.GET_TOR + "?q=add&id=" + this.CurrentTelescopeID + "&year=" + YY + "&month=" + MM + "&day=" + DD + "&lng=" + this.CurrentTelescopeLNG;
    this.fillAtmosphereTransparency(qatm);

    let qobsreal = this.GET_TOR + "?q=obs-real&id=" + this.CurrentTelescopeID + "&year=" + YY + "&month=" + MM + "&day=" + DD + "&lng=" + this.CurrentTelescopeLNG;
    this.fillObsReal(qobsreal);

    let qidentfull = this.GET_IDENTIFICATION + "?q=ident&id=" + this.CurrentTelescopeID + "&year=" + YY + "&month=" + MM + "&day=" + DD + "&lng=" + this.CurrentTelescopeLNG  + "&lat=" + this.CurrentTelescopeLAT;
    this.getIdentification(qidentfull);

    let qidentshort = this.GET_IDENTIFICATION + "?q=protocolShort&id=" + this.CurrentTelescopeID + "&year=" + YY + "&month=" + MM + "&day=" + DD + "&lng=" + this.CurrentTelescopeLNG  + "&lat=" + this.CurrentTelescopeLAT;
    this.getIdentificationShort(qidentshort);
  }

  getIdentification(p_url) {
    this.http.get(p_url, {responseType:'json'}).toPromise().then((p_data : Array<any>) => {
      for (let data of p_data) {
        let blips = [];
        let ngood = data.ngood;
        let trackPt = {
          "id": data.id,
          "nkobest": data.norad,
          "ngood": ngood,
          "dist": data.dist,
          "filename": data.filename
        }

        let blipPoint = data.blips;
        for (let p of blipPoint) {
          let bp = {
            "dt" : p.dt,
            "dTalong": p.dtalong,
            "Along": p.along,
            "Across": p.across,
            "Alt": p.alt,
            "Az": p.az,
            "Mag": p.mag,
          };
          blips.push(bp);
        }

        this.trackPointIdentFull.push(blips);

        // add to IdentTracks
        for (let trk of this.IdentTracks) {
          if (trk['filename'] == trackPt['filename']) {
            trk['blips'] = blips;
            trk['track2'] = trackPt;
            trk['ngood'] = ngood;

            if (trk['points_count'] - ngood > 3) {
              trk['color'] = "#0000FF"
            }
            break;
          }
        }
      }
      this.makePolarChart();
    }, error => {
      console.error(error.message);
    });
  }

  getIdentificationShort(p_url) {
    this.http.get(p_url, {responseType: 'json'}).toPromise().then((p_data: Array<any>) => {
      for (let data of p_data) {
        let mode = data.mode;
        let objArr = [];
        let min = {
          "country": 'min',
          "visits": data.min
        };
        let q005 = {
          "country": 'q005',
          "visits": data.q005
        };
        let q010 = {
          "country": 'q010',
          "visits": data.q010
        };
        let q050 = {
          "country": 'q050',
          "visits": data.q050
        };
        let q090 = {
          "country": 'q090',
          "visits": data.q090
        }
        let q095 = {
          "country": 'q095',
          "visits": data.q095
        };
        let max = {
          "country": 'max',
          "visits": data.max
        };
        objArr.push(min,q005,q010,q050,q090,q095,max);

        switch (mode) {
          case 'dtalong'    : this.Hist_dT = objArr;      break;
          case 'dist'       : this.Hist_Dist = objArr;    break;
          case 'brightness' : this.Hist_Mag = objArr;     break;
          case 'along'      : this.Hist_dAlong = objArr;  break;
          case 'across'     : this.Hist_dAcross = objArr; break;
        }
      }
      this.DrawHistStat();
    }, error => {
      console.error(error.message);
    });
  }

  httpGet(p_url, p_callback) {
    this.http.get(p_url, {responseType:'json'}).toPromise().then(p_data => { p_callback(p_data) }, error => { console.error(error.message) });
  }

  fillAtmosphereTransparency(url) {
    this.http.get(url, {responseType:'json'}).toPromise().then((p_data : Array<any>) => {
      for (let data of p_data) {
        let Pt = {
          "date": data.date,
          "atm_m": data.atm_m,
          "atm_05": data.atm_05,
          "atm_95": data.atm_95,
          "atm_n": data.atm_n,
          "atm_br": data.atm_br,
        };
        this.AtmosphereTransparency.push(Pt);
      }
      this.makeGuidanceChart();
      this.makeNoiseChart();
      this.makeAtmosphereChart();
    }, error => {
      console.error(error.message);
    });
  }

  pointsToColor(n : number) : string {
    if      (n <= 1) return "#ff6600";
    else if (n <= 4) return "#ffcc00"
    else if (n <= 8) return "#99cc00";
    else             return "#006600";
  }

  fillObsReal(p_url) {
    this.http.get(p_url,{responseType:'json'}).toPromise().then((p_data : Object) => {
      const zeroTm : number = 5.0/86400.0;
      let last_id : number = -1;
      let countP : number = 0, countF : number = 0;
      let firstP : number = -1, firstF : number = -1;
      let lastP : number = -1, lastF : number = -1;

      let tracks : Array<any> = p_data['data'];
      this.roundParam = p_data['roundParam'] || 3;

      let i, sz;
      for (i = 0, sz = tracks.length; i < sz; ++i) {
        let track = tracks[i];

        let sat_id = Number(track.noradid);
        let plan_ra = Number(track.plan_ra);
        let plan_dec = Number(track.plan_dec);
        let fact_ra = Number(track.fact_ra);
        let fact_dec = Number(track.fact_dec);
        let move_time = Number(track.movejd);
        let stop_time = Number(track.stopjd);

        //
        if (plan_ra && plan_dec) countP++;
        if (fact_ra && fact_dec) countF++;

        // setup start value
        if (firstP < 0 && plan_ra && plan_dec) firstP = move_time;
        if (firstF < 0 && fact_ra && fact_dec) firstF = move_time;
        if (last_id < 0) last_id = sat_id;

        // collect differences
        if (plan_ra && fact_ra && plan_dec && fact_dec) {
          let AtSt: number[] = Utils.pel(plan_dec, plan_ra, fact_dec, fact_ra);
          this.DiffPoints.push({"date": Utils.js_yyyy_mm_dd_hh_mm_ss(Utils.julianIntToDate(stop_time || move_time + zeroTm)), "d": AtSt[1]});
        }

        // next or latest satellite detected
        if (sat_id != last_id || i == sz - 1) {
          if (!stop_time) stop_time = move_time + zeroTm;
          if (lastP < 0) lastP = stop_time;
          if (lastF < 0) lastF = stop_time;

          let deltaP = Math.floor(86400 * (lastP - firstP));
          let deltaF = Math.floor(86400 * (lastF - firstF));
          let startP = Utils.js_yyyy_mm_dd_hh_mm_ss(Utils.julianIntToDate(firstP));
          let startF = Utils.js_yyyy_mm_dd_hh_mm_ss(Utils.julianIntToDate(firstF));
          let stopP  = Utils.js_yyyy_mm_dd_hh_mm_ss(Utils.julianIntToDate(lastP));
          let stopF  = Utils.js_yyyy_mm_dd_hh_mm_ss(Utils.julianIntToDate(lastF));

          this.PlanPoints.push({"sat_id":last_id, "start_time":startP, "end_time":stopP, "points_count":countP, "delta":deltaP, "color": this.pointsToColor(countP), "file":""});
          this.RealPoints.push({"sat_id":last_id, "start_time":startF, "end_time":stopF, "points_count":countF, "delta":deltaF, "color": this.pointsToColor(countF), "file":""});

          // set new sat view
          firstP = firstF = -1;
          last_id = sat_id;

          // mark next point
          countP = (plan_ra && plan_dec) ? 1 : 0;
          countF = (fact_ra && fact_dec) ? 1 : 0;
          firstP = (plan_ra && plan_dec) ? move_time : -1;
          firstF = (fact_ra && fact_dec) ? move_time : -1;
          lastP = lastF = -1;
        } else {
          if (move_time) lastP = lastF = move_time;
          if (stop_time) lastP = lastF = stop_time;
        }
      }

      this.prepareValidationTelPos();
      this.makeTimeLineChart();
    }, error => {
      console.error(error.message);
    });
  }

  parseIdentification(jdata) {
    for (let track of jdata) {
      let start_time = Number(track.start_jd);
      let end_time = Number(track.end_jd);
      let points_count = Number(track.points_count);
      let norad_id = Number(track.norad_id);

      let cl = "#727d6f"
      if      (  norad_id == 0  ) cl = "#991100"
      else if (points_count <= 1) cl = "#727d6f"
      else if (points_count <= 4) cl = "#ffcc00"
      else if (points_count <= 8) cl = "#99cc00"
      else                        cl = "#006600";

      let trackPt = {
        "sat_id": norad_id,
        "start_time": track.start_time,
        "end_time": track.end_time,
        // "start_time": Utils.js_yyyy_mm_dd_hh_mm_ss(Utils.julianIntToDate(start_time)),
        // "end_time": Utils.js_yyyy_mm_dd_hh_mm_ss(Utils.julianIntToDate(end_time)),
        "points_count": points_count,
        "delta": Math.floor(86400 * (end_time - start_time)),
        "color": cl,
        "file": track.origin.replace('.dat', '.jpg'),
        "filename": track.origin,
        "ngood": points_count
      }
      this.IdentTracks.push(trackPt)
    }

    console.log("Identification parse: ok");
    this.makeAtmosphereChart();
  }

  //prepare
  prepareValidationTelPos() {
    const maxval : number = 200.0;

    for (let p of this.DiffPoints) {
      let d = p.d * Utils.rg;

      if      (d > maxval) d = maxval;
      else if (d < -maxval) d = -maxval;

      this.TelescopeValidPose.push({"date": p.date, "diff": d.toFixed(this.roundParam)});
    }

    this.makeTelPositionChart();
  }

  generateChartData(id_track) {
    let chartData = [];

    // find track
    for (let t of this.IdentTracks) {
      if (t['filename'] == id_track) {
        if ("blips" in t) {
          for (let b of t['blips']) {
            chartData.push({
              date:    Utils.js_yyyy_mm_dd_hh_mm_ss(Utils.julianIntToDate(b['dt'])),
              dtalong: b['dTalong'],
              along:   b['Along'],
              across:  b['Across'],
              mag:     b['Mag'],
              alt:     b['Alt'],
              az:      b['Az']
            });
          }
        }
        break;
      }
    }

    return chartData;
  }

  // Draw Bars
  DrawHistStat() {
    this.DrawBar('chartdivbar1', this.Hist_dT, this.translate.instant('am.time'), this.translate.instant('am.timeDiscrepancy'));
    this.DrawBar('chartdivbar2', this.Hist_dAlong, this.translate.instant('am.offset'),  this.translate.instant('am.longitudinalDiscrepancy'));
    this.DrawBar('chartdivbar3', this.Hist_dAcross, this.translate.instant('am.offset'),this.translate.instant('am.transverseDiscrepancy'));
    this.DrawBar('chartdivbar4', this.Hist_Dist, this.translate.instant('am.range'), this.translate.instant('am.rangeHistogram'));
    this.DrawBar('chartdivbar5', this.Hist_Mag, this.translate.instant('am.magnitude'), this.translate.instant('am.magnitudeHistogram'));
  }

  DrawBar(divName, dataBar, titleY, header) {
    let chart = this.AmCharts.makeChart(divName, {
      "type": "serial",
      "theme": "light",
      "dataProvider": dataBar,
      "valueAxes": [{
        "gridColor": "#000000",
        "gridAlpha": 0.2,
        "dashLength": 0,
        "axisAlpha": 0,
        "position": "left",
        "title": titleY
      }],
      "titles": [{
        "size": 12,
        "text": header
      }],
      "gridAboveGraphs": true,
      "startDuration": 0,
      "graphs": [{
        "balloonText": "[[category]]: <b>[[value]]</b>",
        "fillAlphas": 0.8,
        "lineAlpha": 0.2,
        "type": "column",
        "valueField": "visits"
      }],
      "chartCursor": {
        "categoryBalloonEnabled": false,
        "cursorAlpha": 0,
        "zoomable": false
      },
      "categoryField": "country",
      "categoryAxis": {
        "gridPosition": "start",
        //"gridAlpha": 1,
        "tickPosition": "start",
        "tickLength": 20
      },
      "export": {
        "enabled": false
      }
    });
  }
  // Draw charts
  makePolarChart() {
    let chart = anychart.polar();
    // set chart yScale settings
    chart.yScale().minimum(0).maximum(90);
    chart.yScale().ticks().interval(5);

    // set chart xScale settings
    chart.xScale().minimum(0);
    chart.xScale().maximum(360);
    chart.xScale().ticks().interval(20);

    // set xAxis labels settings
    chart.xAxis().labels().format('{%Value}.00');

    // tracks
    for (let track of this.trackPointIdentFull) {
      // blips
      let graphData = [];
      for (let b of track) {
        let alt = 90 - b.Alt;
        let az = b.Az;

        let point = [];
        point.push(az);
        point.push(alt);
        graphData.push(point)
      }

      // create line series
      let series1 = chart.polyline(graphData);
      series1.closed(false).markers(true);
    }

    // set container id for the chart
    chart.container('chartdivaltaz');

    // initiate chart drawing
    chart.draw();
  }

  makeAtmosphereChart() {
    let chartConfig = {
      "language" : this.LANG,
      "type": "serial",
      "theme": "light",
      "marginRight": 80,
      "valueAxes": [{
        "position": "left",
        "fontSize": 12,
        "title": this.translate.instant('am.transparency')
      }],
      "titles": [{
        "size": 12,
        "text": this.translate.instant('am.transparencyChart')
      }],
      "graphs": [{
        "id": "g1",
        "fillAlphas": 0.4,
        "valueField": "atm_m",
        "balloonText": "<div style='margin:5px; font-size:12px;'>" + (this.translate.instant('am.median')) + ": <b>[[value]]</b></div>"
      },
        {
          "id": "g2",
          "fillAlphas": 0.4,
          "valueField": "atm_05",
          "balloonText": "<div style='margin:5px; font-size:12px;'>0.05: <b>[[value]]</b></div>"
        },
        {
          "id": "g3",
          "fillAlphas": 0.4,
          "valueField": "atm_95",
          "balloonText": "<div style='margin:5px; font-size:12px;'>0.95: <b>[[value]]</b></div>"
        }
      ],
      "chartScrollbar": {
        "graph": "g1",
        "scrollbarHeight": 60,
        "backgroundAlpha": 0,
        "selectedBackgroundAlpha": 0.1,
        "selectedBackgroundColor": "#888888",
        "graphFillAlpha": 0,
        "graphLineAlpha": 0.5,
        "selectedGraphFillAlpha": 0,
        "selectedGraphLineAlpha": 1,
        "autoGridCount": true,
        "color": "#AAAAAA",
        //"enabled": false
      },

      "chartCursor": {
        "categoryBalloonDateFormat": "JJ:NN, DD MMMM",
        "cursorPosition": "mouse"
      },
      "categoryField": "date",
      "categoryAxis": {
        "minPeriod": "mm",
        "parseDates": true
      },
      "export": {
        "enabled": true,
        "dateFormat": "YYYY-MM-DD HH:NN:SS"
      },

      "listeners": [{
        "event": "zoomed",
      }]
    };
    chartConfig["dataProvider"] = this.AtmosphereTransparency;
    this.chartAtm = this.AmCharts.makeChart("chartdivatm", chartConfig);
  }

  makeGuidanceChart() {
    let vField = "atm_n";
    let title = "Noise in the frame"
    // let titlex = "Noise"
    let titlex = this.translate.instant('am.noise')
    if (this.AtmosphereBrExist)
    {
      vField = "atm_br";
      title = this.translate.instant('am.brightnessChart');
      title = this.translate.instant('am.brightness');
    }
    let chartConfig = {
      "language" : this.LANG,
      "type": "serial",
      "theme": "light",
      "marginRight": 80,
      "valueAxes": [{
        "position": "left",
        "fontSize": 12,
        "title": titlex
      }],
      "titles": [{
        "size": 12,
        "text": title
      }],
      "graphs": [{
        "id": "g1",
        "valueField": vField,
        "balloonText": "<div style='margin:5px; font-size:12px;'>" + this.translate.instant('am.value') + " : <b>[[value]]</b></div>"
      }],
      "chartScrollbar": {
        "graph": "g1",
        "scrollbarHeight": 60,
        "backgroundAlpha": 0,
        "selectedBackgroundAlpha": 0.1,
        "selectedBackgroundColor": "#888888",
        "graphFillAlpha": 0,
        "graphLineAlpha": 0.5,
        "selectedGraphFillAlpha": 0,
        "selectedGraphLineAlpha": 1,
        "autoGridCount": true,
        "color": "#AAAAAA",
        "enabled": false
      },

      "chartCursor": {
        "categoryBalloonDateFormat": "JJ:NN, DD MMMM",
        "cursorPosition": "mouse"
      },
      "categoryField": "date",
      "categoryAxis": {
        "minPeriod": "mm",
        "parseDates": true
      },
      "export": {
        "enabled": true,
        "dateFormat": "YYYY-MM-DD HH:NN:SS"
      },
    }
    chartConfig["dataProvider"] = this.AtmosphereTransparency;
    this.chartGuidance = this.AmCharts.makeChart("chartdivguidance", chartConfig);
  }

  makeNoiseChart() {
    let vField = "atm_n";
    let title = this.translate.instant('am.noiseChart');
    let titlex = this.translate.instant('am.noise');
    let chartConfig = {
      "language" : this.LANG,
      "type": "serial",
      "theme": "light",
      "marginRight": 80,
      "valueAxes": [{
        "position": "left",
        "fontSize": 12,
        "title": titlex
      }],
      "titles": [{
        "size": 12,
        "text": title
      }],
      "graphs": [{
        "id": "g1",
        //"fillAlphas": 0.4,
        "valueField": vField,
        "balloonText": "<div style='margin:5px; font-size:12px;'>" + this.translate.instant('am.value') + ": <b>[[value]]</b></div>"
      }],
      "chartScrollbar": {
        "graph": "g1",
        "scrollbarHeight": 60,
        "backgroundAlpha": 0,
        "selectedBackgroundAlpha": 0.1,
        "selectedBackgroundColor": "#888888",
        "graphFillAlpha": 0,
        "graphLineAlpha": 0.5,
        "selectedGraphFillAlpha": 0,
        "selectedGraphLineAlpha": 1,
        "autoGridCount": true,
        "color": "#AAAAAA",
        "enabled": false
      },

      "chartCursor": {
        "categoryBalloonDateFormat": "JJ:NN, DD MMMM",
        "cursorPosition": "mouse"
      },
      "categoryField": "date",
      "categoryAxis": {
        "minPeriod": "mm",
        "parseDates": true
      },
      "export": {
        "enabled": true,
        "dateFormat": "YYYY-MM-DD HH:NN:SS"
      },
    }
    chartConfig["dataProvider"] = this.AtmosphereTransparency;
    this.chartGuidance = this.AmCharts.makeChart("chartnoise", chartConfig);
  }

  makeTelPositionChart() {
    let chartConfig = {
      "language" : this.LANG,
      "type": "serial",
      "theme": "light",
      "marginRight": 80,
      "valueAxes": [{
        "position": "left",
        "fontSize": 12,
        "title": this.translate.instant('am.accuracy')
      }],
      "titles": [{
        "size": 12,
        "text": this.translate.instant('am.accuracyChart')
      }],
      "graphs": [
        {
          "id": "g1",
          "fillAlphas": 0,
          "valueField": "diff",
          "balloonText": "<div style='margin:5px; font-size:12px;'>error: <b>[[value]]</b></div>"
        },
      ],
      "chartCursor": {
        "categoryBalloonDateFormat": "JJ:NN, DD MMMM",
        "cursorPosition": "mouse"
      },
      "categoryField": "date",
      "categoryAxis": {
        "minPeriod": "ss",
        "parseDates": true
      },
      "export": {
        "enabled": true,
        "dateFormat": "YYYY-MM-DD HH:NN:SS"
      },
    }
    chartConfig["dataProvider"] = this.TelescopeValidPose;
    this.chartTelPos = this.AmCharts.makeChart("chartdivtelpos", chartConfig);
  }

  makeTimeLineChart() {
    let ObserverPlan = {
      "observer_name": this.translate.instant('am.plan'),
      "tracks": this.PlanPoints
    };
    let ObserverFact = {
      "observer_name": this.translate.instant('am.real'),
      "tracks": this.RealPoints
    };
    let ObserverTracks = {
      "observer_name": this.translate.instant('am.tracks'),
      "tracks": this.IdentTracks
    };

    let ObserverPlans = [];
    ObserverPlans.push(ObserverPlan);
    ObserverPlans.push(ObserverFact);
    ObserverPlans.push(ObserverTracks);

    let chartConfig = {
      "language" : this.LANG,
      "type": "gantt",
      "theme": "light",
      "marginRight": 70,
      "minPeriod": "ss",
      "dataDateFormat": "YYYY-MM-DD HH:NN:SS",
      "columnWidth": 0.5,
      "valueAxis": {
        "type": "date",
      },
      "brightnessStep": 0,
      "graph": {
        "lineAlpha": 1,
        "lineColor": "#fff",
        "fillAlphas": 0.95,
        "balloonText": "<b>" + this.translate.instant('am.norad') + ": [[sat_id]]</b><br />" + this.translate.instant('am.points') + " " + "[[ngood]]" + " " +  this.translate.instant('am.from') + " [[points_count]]<br />" + this.translate.instant('am.duration') + " [[delta]] сек<br />[[start_time]] - [[end_time]]<br/>[[file]]",
        "labelText": "[[sat_id]]<br>" + this.translate.instant("am.points") + " [[points_count]]",
        "labelPosition": "inside"
      },
      "balloon": {
        "adjustBorderColor": true,
        "color": "#000000",
        "cornerRadius": 5,
        "fillColor": "#CCCCAA",
        "animationDuration": 0.5,
        "maxWidth": 1200
      },

      "rotate": true,
      "categoryField": "observer_name",
      "segmentsField": "tracks",
      "colorField": "color",
      "startDateField": "start_time",
      "endDateField": "end_time",
      "valueScrollbar": {
        "autoGridCount": true
      },

      "chartCursor": {
        "cursorColor": "#55bb76",
        "valueBalloonsEnabled": false,
        "cursorAlpha": 0,
        "valueLineAlpha": 0.5,
        "valueLineBalloonEnabled": true,
        "valueLineEnabled": true,
        "zoomable": false,
        "valueZoomable": true
      },
      "export": {
        "enabled": true
      },
      "listeners": [
        {
          "event": "clickGraphItem",
          "method":   function (e) {
            // e.graph.customData holds exactly same segment data as it was defined in dataProvider
            let item = e.graph.customData;
            if (typeof item.clickTimeout === "undefined") {
              // This is a first click
              // Let's time click action - if another click on the same element does not occur within 200ms it will execute
              item.clickTimeout = setTimeout(function () {
                item.clickTimeout = undefined;

                let imagePath = item['file']
                if (imagePath.length > 10) {
                  let jpgUrl = AppConfig.apiUrl().concat('/api/image/get_image')
                                               .concat('?login=').concat(this.getData.getLogin())
                                               .concat('&token=').concat(this.getData.getToken())
                                               .concat('&id=').concat(this.CurrentTelescopeCode)
                                               .concat('&name=').concat(imagePath);
                  this.http.get(jpgUrl, {responseType:'json'}).toPromise().then(p_data => {
                    let tag = '';
                    if (p_data && p_data.data) {
                      tag = '<img src="data:image/jpg;base64,'.concat(p_data.data).concat('" alt="Снимки трека">');
                    } else if (p_data && p_data.message) {
                      tag = 'Error: '.concat(p_data.message);
                    }
                    document.getElementById('outclick').innerHTML = tag + '<br>';
                  }, error => {
                     console.error(error.message);
                  });

                  let filename = item['filename'];
                  let chartData = this.generateChartData(filename);
                  this.DrawLineGraph(chartData);
                  this.DrawLineGraphAltAz(chartData);
                } else {
                  document.getElementById('outclick').innerHTML = ''
                }
              }.bind(this), 200);
            } else {
              clearTimeout(item.clickTimeout);
              item.clickTimeout = undefined;
            }
          }.bind(this)
        }]
    };
    chartConfig["dataProvider"] = ObserverPlans;
    this.chartIdent = this.AmCharts.makeChart("chartdivident", chartConfig);
  }
  DrawLineGraph(chartData) {
    if (this.chartTrackError != null) {
      this.chartTrackError.clear()
      this.chartTrackError = null
    }

    let tracksPanelSize = parseInt(document.getElementById('tracksPanel').style.cssText.replace("max-height:",'').replace('px;','').trim());
    document.getElementById('chartdiverrors').style.height = '300px';
    document.getElementById('tracksPanel').style.cssText = 'max-height: ' + (tracksPanelSize + 300) + 'px;';

    this.chartTrackError = this.AmCharts.makeChart("chartdiverrors", {
      "type": "serial",
      "theme": "light",
      "marginTop": 1,
      "marginBottom" : 1,
      "legend": {
        "useGraphSettings": true,
        "position": "left"
      },
      "dataProvider": chartData,
      "synchronizeGrid": true,
      "titles": [{
        "size": 12,
        "text": this.translate.instant('am.discrepancyParsedChart')
      }],
      "valueAxes": [{
        "id": "v1",
        "axisColor": "#FF6600",
        "axisThickness": 2,
        "axisAlpha": 1,
        "position": "left",
        "title": this.translate.instant('am.time')
      }, {
        "id": "v2",
        "axisColor": "#FCD202",
        "axisThickness": 2,
        "axisAlpha": 1,
        "position": "right",
        "title": this.translate.instant('am.longitudinal')
      }, {
        "id": "v3",
        "axisColor": "#B0DE09",
        "axisThickness": 2,
        //"gridAlpha": 0,
        "offset": 80,
        "axisAlpha": 1,
        "position": "left",
        "title": this.translate.instant('am.transversal')
      }, {
        "id": "v4",
        "axisColor": "#B0DECC",
        "axisThickness": 2,
        //"gridAlpha": 0,
        "offset": 80,
        "axisAlpha": 1,
        "position": "right",
        "title": this.translate.instant('am.magnitude')
      }],
      "graphs": [{
        // "balloonText": "By time: <b>[[value]]</b>",
        "balloonText": this.translate.instant('am.bytime') + " : <b>[[value]]</b>",
        "valueAxis": "v1",
        "lineColor": "#FF6600",
        "bullet": "round",
        "bulletBorderThickness": 1,
        "hideBulletsCount": 30,
        "title": this.translate.instant('am.timeDiscrepancy'),
        "valueField": "dtalong",
        "fillAlphas": 0
      }, {
        // "balloonText": "Longitudinal: <b>[[value]]</b>",
        "balloonText": this.translate.instant('am.longitudinal') + " : <b>[[value]]</b>",
        "valueAxis": "v2",
        "lineColor": "#FCD202",
        "bullet": "square",
        "bulletBorderThickness": 1,
        "hideBulletsCount": 30,
        "title": this.translate.instant('am.longitudinalDiscrepancy'),
        "valueField": "along",
        "fillAlphas": 0
      }, {
        // "balloonText": "Transversal: <b>[[value]]</b>",
        "balloonText": this.translate.instant('am.transversal') + " : <b>[[value]]</b>",
        "valueAxis": "v3",
        "lineColor": "#B0DE09",
        "bullet": "triangleUp",
        "bulletBorderThickness": 1,
        "hideBulletsCount": 30,
        "title": this.translate.instant('am.discrepancyTransverse'),
        "valueField": "across",
        "fillAlphas": 0
      }, {
        // "balloonText": "Magnitude: <b>[[value]]</b>",
        "balloonText": this.translate.instant('am.magnitude') + " : <b>[[value]]</b>",
        "valueAxis": "v4",
        "lineColor": "#B0DECC",
        "bullet": "triangleUp",
        "bulletBorderThickness": 1,
        "hideBulletsCount": 30,
        "title": this.translate.instant('am.magnitude'),
        "valueField": "mag",
        "fillAlphas": 0
      }],
      "chartScrollbar": {
        "enabled": false
      },
      "chartCursor": {
        "cursorPosition": "mouse"
      },
      "categoryField": "date",
      "categoryAxis": {
        "parseDates": true,
        "minPeriod": "ss",
        "axisColor": "#DADADA",
      },
      "export": {
        "enabled": false,
        "position": "bottom-right"
      }
    });
  }
  DrawLineGraphAltAz(chartData) {

    if (this.chartTrackAltAz != null) {
      this.chartTrackAltAz.clear()
      this.chartTrackAltAz = null
    }

    let tracksPanelSize = parseInt(document.getElementById('tracksPanel').style.cssText.replace("max-height:",'').replace('px;','').trim());
    document.getElementById('chartdivaltaztrack').style.height = '300px';
    document.getElementById('tracksPanel').style.cssText = 'max-height: ' + (tracksPanelSize + 600) + 'px;';

    this.chartTrackAltAz = this.AmCharts.makeChart("chartdivaltaztrack", {
      "type": "serial",
      "theme": "light",
      "marginTop": 1,
      "marginBottom": 1,
      //"borderAlpha": 1,
      //"borderColor": "#777777",
      "legend": {
        "useGraphSettings": true,
        "position": "left"
      },
      "dataProvider": chartData,
      "synchronizeGrid": true,
      "titles": [{
        "size": 12,
        "text": this.translate.instant('am.angularCoordinatesChart')
      }],
      "valueAxes": [{
        "id": "v1",
        "axisColor": "#FF6600",
        "axisThickness": 2,
        "axisAlpha": 1,
        "position": "left",
        "title": this.translate.instant('am.azimuthDeg')
      }, {
        "id": "v2",
        "axisColor": "#FCD202",
        "axisThickness": 2,
        "axisAlpha": 1,
        "position": "right",
        "title": this.translate.instant('am.angleOfPlaceDeg')
      }],
      "graphs": [{
        // "balloonText": "Azimuth: <b>[[value]]</b>",
        "balloonText": this.translate.instant('am.azimuth') + " : <b>[[value]]</b>",
        "valueAxis": "v1",
        "lineColor": "#FF6600",
        "bullet": "round",
        "bulletBorderThickness": 1,
        "hideBulletsCount": 30,
        "title": this.translate.instant('am.azimuth'),
        "valueField": "az",
        "fillAlphas": 0
      }, {
        // "balloonText": "Angle of place: <b>[[value]]</b>",
        "balloonText": this.translate.instant('am.angleOfPlace') + " : <b>[[value]]</b>",
        "valueAxis": "v2",
        "lineColor": "#FCD202",
        "bullet": "square",
        "bulletBorderThickness": 1,
        "hideBulletsCount": 30,
        "title": this.translate.instant('am.angleOfPlace'),
        "valueField": "alt",
        "fillAlphas": 0
      }],
      "chartScrollbar": {
        "enabled": false
      },
      "chartCursor": {
        "cursorPosition": "mouse"
      },
      "categoryField": "date",
      "categoryAxis": {
        "parseDates": true,
        "minPeriod": "ss",
        "axisColor": "#DADADA",
      },
      "export": {
        "enabled": false,
        "position": "bottom-right"
      }
    });
  }
}
