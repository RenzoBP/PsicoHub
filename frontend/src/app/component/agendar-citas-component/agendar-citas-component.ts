import {Component, inject, OnInit, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule ,FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../services/auth.service';
import {CitaService} from '../../services/cita-service';
import {RoutingService} from '../../services/routing-service';
import {Router, RouterModule} from '@angular/router';
import {Cita} from '../../model/interfaces';
import {PacienteService} from '../../services/paciente-service';
import {PsicologoService} from '../../services/psicologo-service';
import {EspecialidadService} from '../../services/especialidad-service';

@Component({
  selector: 'app-agendar-citas-component',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule,CommonModule,FormsModule],
  templateUrl: './agendar-citas-component.html',
  styleUrl: './agendar-citas-component.css',
})
export class AgendarCitasComponent implements OnInit {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private roleRouting = inject(RoutingService);
  private router = inject(Router);

  private citaService = inject(CitaService);
  private pacienteService = inject(PacienteService);
  private psicologoService = inject(PsicologoService);
  private especialidadService = inject(EspecialidadService);

  citaForm: FormGroup;

  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  pacientes: any[] = [];
  psicologos: any[] = [];
  especialidades: any[] = [];

  ngOnInit() {
    console.log('Verificando autenticación...');
    console.log('Token en localStorage:', localStorage.getItem('auth_token'));
    console.log('Email en localStorage:', localStorage.getItem('user_email'));
    console.log('Usuario actual:', this.authService.currentUser());
    this.cargarPacientes();
    this.cargarPsicologos();
    this.cargarEspecialidades();
  }

  cargarPacientes() {
    this.pacienteService.listarPacientes().subscribe({
      next: (data) => this.pacientes = data,
      error: (err) => console.error("Error cargando pacientes", err)
    });
  }

  cargarPsicologos() {
    this.psicologoService.listarPsicologos().subscribe({
      next: (data) => this.psicologos = data,
      error: (err) => console.error("Error cargando psicólogos", err)
    });
  }

  cargarEspecialidades() {
    this.especialidadService.listarEspecialidades().subscribe({
      next: (data) => this.especialidades = data,
      error: (err) => console.error("Error cargando especialidades", err)
    });
  }

  constructor() {
    console.log('CitaComponent');
    this.citaForm = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(2)]],
      paciente: ['', Validators.required],
      psicologo: ['', Validators.required],
      especialidad: ['', Validators.required],
      hora: ['', Validators.required],
      precio: ['', Validators.required],
      descripcion: ['', Validators.required]
    })
  }

  onSubmit() {
    if (this.citaForm.invalid) {
      this.errorMessage.set('Por favor, completa todos los campos correctamente');
      Object.keys(this.citaForm.controls).forEach(key => {
        this.citaForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const cita: Cita = new Cita();
    cita.idCita = 0;
    cita.codigo = this.citaForm.value.codigo;
    cita.paciente = { idPaciente: this.citaForm.value.paciente };
    cita.psicologo = { idPsicologo: this.citaForm.value.psicologo };
    cita.especialidad = { idEspecialidad: this.citaForm.value.especialidad };
    cita.hora = this.citaForm.value.hora;
    cita.precio = this.citaForm.value.precio;
    cita.descripcion = this.citaForm.value.descripcion;
    cita.estado = "pendiente";

    console.log("Cita a agendar: ", cita);

    this.citaService.registrar(cita).subscribe({
      next: (response): void => {
        console.log('Registro exitoso:', cita);
        this.isLoading.set(false);
        this.successMessage.set('¡Cita agendada exitosamente!');

        this.citaForm.patchValue({
          codigo: '',
          paciente: '',
          psicologo: '',
          especialidad: '',
          hora: '',
          precio: '',
          descripcion: '',
          estado: ''
        });
        this.citaForm.markAsUntouched();

        // Navegar después de 3 segundos
        const role = this.getRolePath();
        setTimeout(() => {
          this.router.navigate([`/home-${role}`]);
        }, 3000);
      },
      error: (error) => {
        console.error('Error en registro:', error);
        this.isLoading.set(false);

        if (error.error?.message) {
          this.errorMessage.set(error.error.message);
        } else {
          this.errorMessage.set('Error al registrar. Verifica los datos e intenta nuevamente.');
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
    const field = this.citaForm.get(fieldName);

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
