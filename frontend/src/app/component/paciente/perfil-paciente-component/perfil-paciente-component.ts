import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { PacienteService } from '../../../services/paciente-service';
import { Paciente } from '../../../model/interfaces';
import { RoutingService } from '../../../services/routing-service';

@Component({
  selector: 'app-perfil-paciente-component',
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './perfil-paciente-component.html',
  styleUrl: './perfil-paciente-component.css',
})
export class PerfilPacienteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private router = inject(Router);
  private roleRouting = inject(RoutingService);

  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = signal<boolean>(false);
  isLoadingData = signal<boolean>(true);
  paciente = signal<Paciente | null>(null);

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

    this.cargarDatosPaciente();
  }

  cargarDatosPaciente(): void {
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

    this.pacienteService.listarPorDni(dni).subscribe({
      next: (paciente) => {
        console.log('Paciente recibido:', paciente);
        this.paciente.set(paciente);
        this.llenarFormulario(paciente);
        this.isLoadingData.set(false);
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.errorMessage.set('Error al cargar los datos del perfil');
        this.isLoadingData.set(false);
      }
    });
  }

  llenarFormulario(paciente: Paciente): void {
    this.perfilForm.patchValue({
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      dni: paciente.dni,
      fechaNacimiento: paciente.fechaNacimiento,
      genero: paciente.genero,
      distrito: paciente.distrito,
      direccion: paciente.direccion,
      telefono: paciente.telefono,
      email: paciente.email
    });
  }

  onSubmit(): void {
    if (this.perfilForm.invalid) {
      this.errorMessage.set('Por favor, completa todos los campos correctamente');
      return;
    }

    const pacienteActual = this.paciente();
    if (!pacienteActual) {
      this.errorMessage.set('No se encontraron datos del paciente');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const pacienteActualizado: Paciente = {
      ...pacienteActual,
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
      pacienteActualizado.password = passwordValue;
    }

    //  Detectar si cambió email o password
    const cambioCredenciales =
      pacienteActualizado.email !== pacienteActual.email ||
      passwordValue;

    this.pacienteService.modificar(pacienteActualizado).subscribe({
      next: (response) => {
        console.log('Perfil actualizado:', response);
        this.isLoading.set(false);

        //  Si cambió credenciales, cerrar sesión y redirigir
        if (cambioCredenciales) {
          this.successMessage.set('¡Perfil actualizado! Por seguridad, debes iniciar sesión nuevamente.');

          setTimeout(() => {
            this.authService.logout(); // Esto redirige a login automáticamente
          }, 2500);
        } else {
          // Solo actualizar email si cambió sin cerrar sesión
          localStorage.setItem('user_email', response.email);
          this.successMessage.set('¡Perfil actualizado exitosamente!');
          this.paciente.set(response);
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
          this.errorMessage.set('Paciente no encontrado');
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
