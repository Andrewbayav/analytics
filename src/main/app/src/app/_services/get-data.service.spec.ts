import { TestBed } from '@angular/core/testing';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { GetDataService } from './get-data.service';
import {CookieService} from 'ngx-cookie-service';

describe('GetDataService', () => {
  let service: GetDataService;

  let p_mass = [];
  let p_url = 'http://localhost:9090/api/tel-status?action=get_specification';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CookieService],
      imports: [HttpClientModule]
    });
    service = TestBed.inject(GetDataService);
  });

  beforeEach(() => {
    service.validate(p_url, p_mass);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });


  it('should fill spec_mass', (done) => {
    setTimeout(() => {
      expect(p_mass.length).not.toBe(0);
      done();
    }, 3000)
  }, 4000);

  it('should get token from api', (done) => {
    setTimeout(() => {
      expect(service.token.length).not.toBe(0);
      done();
    }, 3000)
  }, 4000);

});


// http://localhost:9090/api/tel-status?action=get_specification
