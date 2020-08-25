import { Component, OnInit } from '@angular/core';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { faChartPie } from '@fortawesome/free-solid-svg-icons';
import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import { faBraille } from '@fortawesome/free-solid-svg-icons';
declare var $: any;

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})

export class MenuComponent implements OnInit {
  donutsIcon = faChartPie;
  overviewIcon = faCalendarAlt;
  amIcon = faChartBar;
  heatmapIcon = faBraille;

  constructor() { }



  ngOnInit(): void {
    if (document.location.pathname.indexOf('/ui/login') != -1)
      $('#nav_menu').hide();
    let location = window.location;
    let icon = location.pathname.replace('/ui/','').concat('Icon');
    document.getElementById(icon).parentElement.classList.add('selected');
  }
}
