declare var $: any;

export class Utils {
  static j1957 : number = 2436204.5;
  static rg : number = 180.0 / Math.PI;

  // need for heatmap
  static getWeek (d) {
    let date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    let week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  // need to set up possible years to choose
  static setSelect(http, startYearUrl, callback?) {
    http.get(startYearUrl, {responseType:'text'}).toPromise().then(data => {
      let firstYear = parseInt(data.toString());
      let lastYear = new Date().getFullYear();
      while (firstYear <= lastYear + 1) {
        $('#select').append(new Option(firstYear.toString(), ''+firstYear, true, false));
        firstYear++;
      }
      if (callback) callback();
    }, error => {
      console.error(error.message);
    });
  }

  static getCodes(specificationObjects) {
    let telescopeCodes = '0';
    for (let obj of specificationObjects) {
        telescopeCodes = telescopeCodes.concat(',').concat(obj.code);
    }
    return telescopeCodes;
  }

  static getDaysCountInYear(year) {
    if (year % 400 == 0) return 366;
    if (year % 100 == 0) return 365;
    if (year %   4 == 0) return 366;

    return 365;
  }

  // Time convert from JD to Date
  static julianIntToDate(inJD) : Date {
    let X = parseFloat(inJD) + 0.5;
    let Z = Math.floor(X); //Get day without time
    let F = X - Z; //Get time
    let Y = Math.floor((Z - 1867216.25) / 36524.25);
    let A = Z + 1 + Y - Math.floor(Y / 4);
    let B = A + 1524;
    let C = Math.floor((B - 122.1) / 365.25);
    let D = Math.floor(365.25 * C);
    let G = Math.floor((B - D) / 30.6001);
    //must get number less than or equal to 12)
    let month = (G < 13.5) ? (G - 1) : (G - 13);
    //if Month is January or February, or the rest of year
    let year = (month < 2.5) ? (C - 4715) : (C - 4716);
    month -= 1; //Handle JavaScript month format
    let UT = B - D - Math.floor(30.6001 * G) + F;
    let day = Math.floor(UT);
    //Determine time
    UT -= Math.floor(UT);
    UT *= 24;
    let hour = Math.floor(UT);
    UT -= Math.floor(UT);
    UT *= 60;
    let minute = Math.floor(UT);
    UT -= Math.floor(UT);
    UT *= 60;
    let second = Math.round(UT);

    // Date
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  };

  // Convert Date to String
  static js_yyyy_mm_dd_hh_mm_ss(now : Date) : string {
    return Utils.toString(now, true);
  }

  static twoDigits(x: number) : string {
    return (x <= 9) ? '0'.concat(x.toString()) : x.toString();
  }

  static toString(d: Date, tm? : boolean) : string {
    let r = d.getFullYear().toString()
             .concat('-')
             .concat(Utils.twoDigits(d.getMonth() + 1))
             .concat('-')
             .concat(Utils.twoDigits(d.getDate()));

    if (tm) {
      r = r.concat(' ').concat(Utils.twoDigits(d.getHours()))
           .concat(':').concat(Utils.twoDigits(d.getMinutes()))
           .concat(':').concat(Utils.twoDigits(d.getSeconds()));
    }

    return r;
  }

  static getIdForSelectedCode (code, spec) {
      for (let o of spec) {
        if (o.code == code) return o.id;
      }
      return null;
  }

  static getCodeForSelectedId (id, spec) {
    for (let o of spec) {
      if (o.id == id) return o.code;
    }
    return null;
  }

  // @return {at - азимут, st - длина дуги}
  static pel(FS: number, LS: number, FT: number, LT: number) : number[] {
    const PID : number = 2*Math.PI;
    const M_PI_2 : number = Math.PI/2.0;
    let AtSt = [];
    let SFS : number = Math.sin(FS)
      , SFT : number = Math.sin(FT)
      , CFS : number = Math.cos(FS)
      , CFT : number = Math.cos(FT)
      , CST : number = SFS*SFT + CFS*CFT*Math.cos( LS - LT );

      let st = M_PI_2 - Math.asin( CST );
      let at = (Math.abs(st) < 1e-30) ? 0 : Math.asin( Math.sin( LT-LS )*CFT/Math.sin( st ) );
      if ( SFT < SFS*CST ) at = Math.PI - at;
      if (  at > Math.PI ) at = at - PID;

      AtSt.push(at);
      AtSt.push(st);

      return AtSt;
  }
}
