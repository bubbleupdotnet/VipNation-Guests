import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {CheckQueService} from "../../services/check-que.service";
import {count} from "rxjs";
import {SearchService} from "../../services/search.service";
import {DataService} from "../../services/data.service";
import {LogService} from "../../services/log.service";

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  @ViewChild('searchToggle') searchToggle: ElementRef;
  @ViewChild('schemeToggle') schemeToggle: ElementRef;

  isDarkThemeActive: Boolean = true

  public checkCount = 0;
  public waitCount = 0;
  public logCount = 0;
  public refreshDisabled = false;

  public strongSearch = false;

  constructor(
    private checkService: CheckQueService,
    private dataService: DataService,
    private searchService: SearchService
  ) { }

  ngOnInit() {
    this.strongSearch = this.searchService.strongSearch;

    if (document.body.classList.contains('dark')) {
      this.isDarkThemeActive = true;
    }
    else {
      this.isDarkThemeActive = false;
    }

    this.checkService.checks$.subscribe((checks) => {
        this.checkCount = (checks) ? checks.length : 0;

        const notProcessed = checks.filter((check) =>check.processed === false);
        this.waitCount = notProcessed.length;

    });

    LogService.logCount.subscribe((count) => {
      this.logCount = count;
    });
  }

  handleToggleDarkTheme(e) {
    document.body.classList.toggle('dark', e.detail.checked);
  }

  handleToggleSearch(e) {
    this.searchService.strongSearch = e.detail.checked;
  }

  refresh() {
    console.log('refresh started');
    this.refreshDisabled = true;
    this.checkService.processQue().then(async () => {
      console.log('check done');
      await this.dataService.updateCurrentTourDate();
      await this.dataService.uploadLog();
    }).finally(() => {
      this.refreshDisabled = false;
    });
  }

}
