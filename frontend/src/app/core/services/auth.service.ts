import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private logueadoSubject = new BehaviorSubject<boolean>(this.tieneToken());
  logueado$ = this.logueadoSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<any> {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    return this.http.post(`${environment.apiUrl}/auth/login`, formData).pipe(
      tap((respuesta: any) => {
        localStorage.setItem('token', respuesta.access_token);
        this.logueadoSubject.next(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.logueadoSubject.next(false);
    this.router.navigate(['/admin/login']);
  }

  tieneToken(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}