import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import {TranslateModule, TranslateLoader} from '@ngx-translate/core';
import {HttpLoaderFactory} from "../app.module";
import { OverviewComponent } from './overview.component';
import { ActivatedRoute } from '@angular/router';
import {MenuComponent} from "../menu/menu.component";
declare var $:any;

describe('OverviewComponent', () => {
  let component: OverviewComponent;
  let fixture: ComponentFixture<OverviewComponent>;
  let p_mass = [];
  let p_url = 'http://localhost:9090/api/tel-status?action=get_specification&test=1';

  //jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OverviewComponent ],
      providers: [ MenuComponent,
        {
          provide: ActivatedRoute, useValue: {
            snapshot: { queryParams: { lang: 'ru' } }
          }
        }
      ],
      imports: [
        HttpClientModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
          }
        }),
      ]
    })
      .compileComponents();


    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  beforeEach(() => {
    component.getDataService().validate(p_url,p_mass);
  });

  it('should create', () => {
    console.log(component)
    expect(component).toBeTruthy();
  });


  it('should fill mass', () => {
    expect(p_mass.length).not.toBe(0);
  });

  it('should have token', () => {
    expect(component.getDataService().getToken().length).not.toBe(0);
  });

  it('should have login', () => {
    expect(component.getDataService().getLogin().length).not.toBe(0);
  });

  // it('should init calendar', () => {
  //   component.initCalendar();
  //   expect(component.calendar).toBeTruthy();
  // });

  it('should set local storage', () => {
    debugger
    let token = component.getDataService().getToken();
    let state = {
      'code' : "10995",
      'date' : "1597760326606"
    };
    component.getLocalStorageService().set(token, state);
    expect(component.getLocalStorageService().localStorage.length).not.toBe(0);
  });

});

// KDSYHDHWVFFTKT7NPDDKZ
// 1

// KDZXI79NTLKTJE7PGL8GJ: "{"code":"10993","date":1597760326606}"
