import {Component, inject, OnInit, signal} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import {RoutingService} from '../../services/routing-service';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ContactoService} from '../../services/contacto-service';
import {ContactoMensaje} from '../../model/interfaces';

@Component({
  selector: 'app-contact-component',
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './contact-component.html',
  styleUrl: './contact-component.css',
})
export class ContactComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private roleRouting = inject(RoutingService);
  private router = inject(Router);
  private contactoService = inject(ContactoService);
  contactoForm: FormGroup;

  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  constructor() {
    console.log('ContactoComponent');
    this.contactoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]], // Habilitado y con validaciones
      asunto: ['', Validators.required],
      mensaje: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    console.log('Verificando autenticación...');
    console.log('Token en localStorage:', localStorage.getItem('auth_token'));
    console.log('Email en localStorage:', localStorage.getItem('user_email'));
    console.log('Usuario actual:', this.authService.currentUser());
    this.llenarFormulario();
  }

  llenarFormulario(): void {
    const userEmail = localStorage.getItem('user_email') ||
      this.authService.currentUser()?.email || '';

    this.contactoForm.patchValue({
      email: userEmail,
    });
  }

  onSubmit(): void {
    if (this.contactoForm.invalid) {
      this.errorMessage.set('Por favor, completa todos los campos correctamente');
      Object.keys(this.contactoForm.controls).forEach(key => {
        this.contactoForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    // Obtener valores del formulario (incluso si están deshabilitados)
    const formValue = this.contactoForm.getRawValue();

    const mensaje: ContactoMensaje = {
      idMensaje: 0,
      nombre: formValue.nombre,
      email: formValue.email,
      asunto: formValue.asunto,
      mensaje: formValue.mensaje,
      fecha: new Date().toISOString().substring(0, 10)
    };

    console.log("Mensaje a enviar: ", mensaje);

    this.contactoService.registrar(mensaje).subscribe({
      next: (response) => {
        console.log('Mensaje registrado:', response);
        this.isLoading.set(false);
        this.successMessage.set('¡Mensaje enviado exitosamente! Gracias por contactarnos.');

        // Limpiar el formulario excepto el email
        this.contactoForm.patchValue({
          nombre: '',
          asunto: '',
          mensaje: ''
        });
        this.contactoForm.markAsUntouched();

        // Navegar después de 3 segundos
        const role = this.getRolePath();
        setTimeout(() => {
          this.router.navigate([`/home-${role}`]);
        }, 3000);
      },
      error: (error) => {
        console.error('Error al registrar mensaje:', error);
        this.isLoading.set(false);

        if (error.status === 400) {
          this.errorMessage.set(error.error?.message || 'Datos inválidos. Verifica la información.');
        } else if (error.status === 404) {
          this.errorMessage.set('Email no encontrado en el sistema.');
        } else if (error.status === 500) {
          this.errorMessage.set('Error en el servidor. Intenta nuevamente más tarde.');
        } else {
          this.errorMessage.set('Error al enviar el mensaje. Intenta nuevamente.');
        }
      }
    });
  }

  getRolePath(): string {
    return this.authService.isPaciente() ? 'paciente' : 'psicologo';
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
    const field = this.contactoForm.get(fieldName);

    if (!field?.touched) {
      return null;
    }

    if (field.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (field.hasError('email')) {
      return 'Ingresa un email válido';
    }
    if (field.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    return null;
  }
}
