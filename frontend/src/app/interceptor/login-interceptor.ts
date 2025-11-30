import { HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const loginInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Leer token - considera usar un servicio en lugar de localStorage directo
  const token = localStorage.getItem('auth_token');

  console.log('🔒 Interceptor ejecutado');
  console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');
  console.log('🌐 URL de la petición:', req.url);

  // Clonar la request solo si tenemos token y no es una ruta pública
  let authReq = req;
  if (token && !isPublicRoute(req.url)) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError(error => {
      console.error('❌ Error HTTP:', {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        message: error.message
      });

      switch (error.status) {
        case HttpStatusCode.Unauthorized: // 401
          console.warn('Token inválido o expirado - Redirigiendo al login');
          handleUnauthorized(router);
          break;

        case HttpStatusCode.Forbidden: // 403
          console.warn('Acceso denegado - Permisos insuficientes');
          break;

        case HttpStatusCode.InternalServerError: // 500
          console.error('Error del servidor');
          // Puedes agregar manejo específico para errores 500
          break;

        case HttpStatusCode.NotFound: // 404
          console.warn('Recurso no encontrado');
          break;
      }

      return throwError(() => error);
    })
  );
};

// Función para manejar rutas públicas (opcional)
function isPublicRoute(url: string): boolean {
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/public/'
  ];
  return publicRoutes.some(route => url.includes(route));
}

// Función para manejar errores 401
function handleUnauthorized(router: Router): void {
  // Limpiar todos los datos de autenticación
  const authItems = [
    'auth_token',
    'user_dni',
    'user_email',
    'user_role',
    'user_name'
  ];

  authItems.forEach(item => localStorage.removeItem(item));

  // Redirigir al login
  router.navigate(['/login'], {
    queryParams: {
      sessionExpired: true,
      redirectUrl: router.url
    }
  });
}
