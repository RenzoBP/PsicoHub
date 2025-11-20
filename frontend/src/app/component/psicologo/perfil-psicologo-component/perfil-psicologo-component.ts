import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {Router, RouterLinkActive, RouterModule} from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { PsicologoService } from '../../../services/psicologo-service';
import { RoutingService } from '../../../services/routing-service';
import { Psicologo } from '../../../model/interfaces';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-perfil-psicologo-component',
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './perfil-psicologo-component.html',
  styleUrl: './perfil-psicologo-component.css',
})
export class PerfilPsicologoComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private psicologoService = inject(PsicologoService);
  private router = inject(Router);
  private roleRouting = inject(RoutingService);

  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = signal<boolean>(false);
  isLoadingData = signal<boolean>(true);
  psicologo = signal<Psicologo | null>(null);

  perfilForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    dni: [{ value: '', disabled: true }], // Campo deshabilitado permanentemente
    fechaNacimiento: ['', Validators.required],
    genero: ['', Validators.required],
    distrito: ['', Validators.required],
    direccion: ['', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]] // Password opcional
  });

  ngOnInit(): void {
    console.log('Verificando autenticación...');
    console.log('Token en localStorage:', localStorage.getItem('token'));
    console.log('DNI en localStorage:', localStorage.getItem('user_dni'));
    console.log('Usuario actual:', this.authService.currentUser());

    this.cargarDatosPsicologo();
  }

  cargarDatosPsicologo(): void {
    const user = this.authService.currentUser();

    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const dni = localStorage.getItem('user_dni');

    if (!dni) {
      this.errorMessage.set('No se encontró el DNI del usuario');
      this.isLoadingData.set(false);
      return;
    }

    console.log('DNI a enviar:', dni);

    this.psicologoService.listarPorDni(dni).subscribe({
      next: (psicologo) => {
        console.log('Psicologo recibido:', psicologo);
        this.psicologo.set(psicologo);
        this.llenarFormulario(psicologo);
        this.isLoadingData.set(false);
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.errorMessage.set('Error al cargar los datos del perfil');
        this.isLoadingData.set(false);
      }
    });
  }

  llenarFormulario(psicologo: Psicologo): void {
    this.perfilForm.patchValue({
      nombre: psicologo.nombre,
      apellido: psicologo.apellido,
      dni: psicologo.dni,
      fechaNacimiento: psicologo.fechaNacimiento,
      genero: psicologo.genero,
      distrito: psicologo.distrito,
      direccion: psicologo.direccion,
      telefono: psicologo.telefono,
      email: psicologo.email
    });
  }

  onSubmit(): void {
    if (this.perfilForm.invalid) {
      this.errorMessage.set('Por favor, completa todos los campos correctamente');
      return;
    }

    const psicologoActual = this.psicologo();
    if (!psicologoActual) {
      this.errorMessage.set('No se encontraron datos del psicologo');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const psicologoActualizado: Psicologo = {
      ...psicologoActual,
      nombre: this.perfilForm.value.nombre!,
      apellido: this.perfilForm.value.apellido!,
      fechaNacimiento: this.perfilForm.value.fechaNacimiento!,
      genero: this.perfilForm.value.genero!,
      distrito: this.perfilForm.value.distrito!,
      direccion: this.perfilForm.value.direccion!,
      telefono: this.perfilForm.value.telefono!,
      email: this.perfilForm.value.email!
    };

    const passwordValue = this.perfilForm.value.password?.trim();
    if (passwordValue && passwordValue.length > 0) {
      psicologoActualizado.password = passwordValue;
    }

    // ✅ Detectar si cambió email o password
    const cambioCredenciales =
      psicologoActualizado.email !== psicologoActual.email ||
      passwordValue;

    this.psicologoService.modificar(psicologoActualizado).subscribe({
      next: (response) => {
        console.log('Perfil actualizado:', response);
        this.isLoading.set(false);

        // ✅ Si cambió credenciales, cerrar sesión y redirigir
        if (cambioCredenciales) {
          this.successMessage.set('¡Perfil actualizado! Por seguridad, debes iniciar sesión nuevamente.');

          setTimeout(() => {
            this.authService.logout();
          }, 2500);
        } else {
          localStorage.setItem('user_email', response.email);
          this.successMessage.set('¡Perfil actualizado exitosamente!');
          this.psicologo.set(response);
          this.perfilForm.patchValue({ password: '' });

          setTimeout(() => {
            this.successMessage.set('');
          }, 5000);
        }
      },
      error: (error) => {
        console.error('Error al actualizar perfil:', error);
        this.isLoading.set(false);

        if (error.status === 400) {
          this.errorMessage.set(error.error?.message || 'Datos inválidos');
        } else if (error.status === 404) {
          this.errorMessage.set('Psicologo no encontrado');
        } else if (error.status === 409) {
          this.errorMessage.set('El email ya está en uso');
        } else {
          this.errorMessage.set(error.error?.message || 'Error al actualizar el perfil');
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  goHome() {
    this.roleRouting.goHome();
  }

  goPerfil() {
    this.roleRouting.goPerfil();
  }

  getFieldError(fieldName: string): string | null {
    const field = this.perfilForm.get(fieldName);

    if (!field?.touched) {
      return null;
    }

    if (field.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (field.hasError('email')) {
      return 'Email inválido';
    }
    if (field.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    if (field.hasError('pattern')) {
      if (fieldName === 'telefono') {
        return 'Teléfono debe tener 9 dígitos';
      }
    }
    return null;
  }
}
