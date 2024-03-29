import {Injectable} from "@angular/core";
import {Observable, from, throwError, of, Subject, BehaviorSubject, Subscription} from "rxjs";
import {catchError, tap, map, flatMap, mergeMap} from "rxjs/operators";
import {IUserItem} from "../interfaces/user";
import {IUserAuth} from "../interfaces/user-auth.interface";
import {DataHelper} from "../helpers/data.helper";
import {Router} from "@angular/router";
import {GraphqlService} from "./graphql.service";
import {ConnectService} from "./connect.service";
import {UserService} from "./user.service";
import {isExternalUrl} from "../helpers/route.helper";
import {PlatformService} from "./platform.service";
import {App} from "@capacitor/app";
import {DataService} from "./data.service";
import {CheckQueService} from "./check-que.service";
import {LoadingController} from "@ionic/angular";
import {LogService} from "./log.service";


@Injectable({
  providedIn: "root"
})
export class AuthService {

  public isAuthed: boolean = false;

  public isAuthed$: Observable<boolean>;
  public isAuthedSubject$: BehaviorSubject<boolean>;

  public userAuth$: Observable<IUserAuth> | undefined;
  public userAuthData: IUserAuth | undefined;

//  protected loggedFromSite = false;


  constructor(
    private userService: UserService,
    private connectService: ConnectService,
    private dataService: DataService,
    private graphqlService: GraphqlService,
    private checkService: CheckQueService,
    private platformService: PlatformService,
    private loadingCtrl: LoadingController,
    private router: Router
  ) {
    this.isAuthedSubject$ = new BehaviorSubject(this.isAuthed);
    this.isAuthed$ = this.isAuthedSubject$.asObservable();
    this.isAuthedSubject$.next(this.isAuthed);
  }


  isAuthenticated(): Observable<boolean> {
    return this.isAuthed$;
  }

  checkCurrentUser(): Observable<IUserItem | null> {
    return of(null);

    // this.redux.dispatch(initCurrentUserRequest());
    //
    // return from(this.connectService.isUserAuthenticated()).pipe(
    //   flatMap(() => this.getCachedUser()),
    //   tap((user: IUserItem) => {
    //     const normalizrUser: INormalizrUserItem = normalize(user, userSchema);
    //     this.redux.dispatch(initCurrentUserSuccess(normalizrUser));
    //     return of(user);
    //   }),
    //   catchError(err => {
    //     this.logout()
    //       .pipe(
    //         tap(() => this.totalApiService.getAllPagesContentList().subscribe())
    //       )
    //       .subscribe(() => {});
    //     return of(null);
    //   })
    // );
  }

  protected checkUserAuthIsExpired(expiresAt) {
    const expirationTime = DataHelper.getDateFromString(expiresAt);

    return (new Date() > expirationTime);
  }

  protected getAuthData() {

    let userAuth: any = localStorage.getItem('auth');
    if (userAuth) {

      userAuth = JSON.parse(userAuth);

      if (userAuth) {

        if (this.checkUserAuthIsExpired(userAuth.expiresAt)) {
//          this.clearAuthData();
        }

//        this.loggedFromSite = !!(userAuth['loggedFromSite']);

        this.connectService.currentUserEmail = userAuth.name;

        this.graphqlService.userAuthToken =
          userAuth.accessToken;
        this.graphqlService.userAuthTokenExpirationDate = DataHelper.getDateFromString(
          userAuth.expiresAt
        );
        this.graphqlService.userRefreshToken =
          userAuth.refreshToken;

        this.isAuthed = true;
        this.isAuthedSubject$.next(this.isAuthed);
        return true;
      }
    }

    return false;
  }

  async initUser() {
    const loaded = this.getAuthData();
    if (loaded) {

      const loading = await this.loadingCtrl.create({
        message: 'Loadind Data',
        spinner: 'dots',
      });

      // loading.present();
      this.dataService.loadContent().subscribe(() => {
          console.log('All events loaded');

          this.userService.initCurrentUser(true).subscribe(() => {
            },
            (error) => {
              if (DataHelper.isNotEmpty(error.graphQLErrors)) {
                const code = (error.graphQLErrors[0] && error.graphQLErrors[0]['code']) ? error.graphQLErrors[0]['code'] : 200;
                if (code == 401) {
                  this.logoutWithRedirect();
                }
              }
            });
        },
        (err) => {
          console.log('error fetch');
          // loading.dismiss();
          return;
        },
        () => {
          // loading.dismiss();
          // console.log('run periodical checks');
          // this.checkService.runPeriodicalChecks();
        });


    }
    return loaded;
  }

  public subscribeToAppResume() {
    if (this.platformService.isMobileApp) {
      App.addListener('resume', () => {
        console.log('App resume event');
        // this.userService.callMeApi('ios','').subscribe( (userData) => {
        //   this.userService.parseUser(userData);
        // });
      });
    }
  }

  public unsubscribeFromAppEvents() {
    if (this.platformService.isMobileApp) {
      App.removeAllListeners();
    }
  }


  public logoutWithRedirect() {
    this.logout().subscribe((url) => {
      if (isExternalUrl(url)) {
        window.location.href = url;
      } else {
        this.router.navigateByUrl(url, {replaceUrl: true});
      }
    });
  }

  protected clearAuthData() {
    localStorage.removeItem('auth');
  }

  protected saveAuthData(data) {
    localStorage.setItem('auth', JSON.stringify(data));
  }

  // loginByToken(token): Observable<IUserAuth> {
  //
  //   return from(
  //     this.connectService.getUserTokenByToken(token).pipe(
  //       tap((data: any) => {
  //
  //         const token = data.data.getUserTokenByToken.token;
  //         token.loggedFromSite = true;
  //         this.loggedFromSite = true;
  //
  //         this.saveAuthData(tхэъ-0oken);
  //         this.isAuthed = true;
  //         this.isAuthedSubject$.next(this.isAuthed);
  //
  //         return data;
  //       }),
  //
  //       catchError(err => {
  //         return throwError(err);
  //       })));
  // }

  login(email, password): Observable<IUserAuth> {

    return from(
      this.connectService.getUserTokenByCredentials(email, password).pipe(
        tap((data: any) => {

          const token = data.data.getUserToken.token;
//          token.loggedFromSite = false;

          this.saveAuthData(token);
          this.dataService.removeSelectedTdFromStorage().then(() => {
            this.isAuthed = true;
            this.isAuthedSubject$.next(this.isAuthed);
          });

          return data;
        }),

        catchError(err => {
          return throwError(err);
        })));
  }


  logout(): Observable<string> {
    return from(this.connectService.logout()).pipe(
      tap(() => {

        this.clearAuthData();
        LogService.log('user log out');
        LogService.setUserId(null);
        LogService.regenerateSessionId();
        this.isAuthed = false;
        this.isAuthedSubject$.next(this.isAuthed);
      }),
      mergeMap((val) => {
        // const isLoggedFromSite = this.loggedFromSite;
        // this.loggedFromSite = false;
        return of('/login')
      }),
    );
  }

  // async resetUserPassword(token, newPassword) {
  //   const result = await this.graphqlService.runMutation(ResetPasswordMutation, {
  //     token: token,
  //     newPassword: newPassword
  //   });
  //
  //   return (<any>result.data).resetPassword;
  // }


}
