export class Telescope {
  constructor(p_year, p_code, p_json, name) {
    this.year = p_year;
    this.code = p_code;
    this.tempArray = [];
    this.name = name;
    this.sum = 0;
    this.monday = [];
    this.tuesday = [];
    this.wednesday = [];
    this.thursday = [];
    this.friday = [];
    this.saturday = [];
    this.sunday = [];
    for (let x of p_json) {
      this.tempArray[x.date - 1] = x.count;
    }
  }
}
