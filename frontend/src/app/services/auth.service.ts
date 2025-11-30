import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { Usuario, AuthResponse, LoginRequest } from '../model/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = 'http://localhost:8080/api';
  private readonly TOKEN_KEY = 'auth_token';

  // Estado reactivo con signals
  private currentUserSignal = signal<Usuario | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);

  // Computados
  currentUser = this.currentUserSignal.asReadonly();
  isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  userRoles = computed(() => this.currentUserSignal()?.roles   || []);

  constructor() {
    this.loadUserFromToken();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.setSession(response);
        }),
        catchError(error => {
          console.error('Error en login:', error);
          return throwError(() => error);
        })
      );
  }

  register(data: LoginRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.API_URL}/auth/register`, data);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setSession(authResult: AuthResponse): void {
    console.log('🔐 Guardando sesión:', authResult);

    localStorage.setItem(this.TOKEN_KEY, authResult.token);
    localStorage.setItem('user_dni', authResult.usuario.dni);
    localStorage.setItem('user_email', authResult.usuario.email);

    console.log('Token guardado:', localStorage.getItem(this.TOKEN_KEY));
    console.log('DNI guardado:', localStorage.getItem('user_dni'));

    this.currentUserSignal.set(authResult.usuario);
    this.isAuthenticatedSignal.set(true);
  }

  private loadUserFromToken(): void {
    const token = this.getToken();
    if (token) {
      this.http.get<Usuario>(`${this.API_URL}/usuarios/me`)
        .subscribe({
          next: (user) => {
            this.currentUserSignal.set(user);
            this.isAuthenticatedSignal.set(true);
          },
          error: () => {
            this.logout();
          }
        });
    }
  }

  hasRole(role: string): boolean {
    return this.userRoles().includes(role);
  }

  isPaciente(): boolean {
    return this.hasRole('ROLE_PACIENTE');
  }

  isPsicologo(): boolean {
    return this.hasRole('ROLE_PSICOLOGO');
  }

  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN');
  }

  logout(): void {
    localStorage.clear();
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.router.navigate(['/']);
  }
}
